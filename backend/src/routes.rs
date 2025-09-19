use axum::{
    Json, Router,
    extract::{Path, Query, State},
    http::{HeaderMap, HeaderValue, StatusCode},
    response::{IntoResponse, Response},
    routing::{get, post, put},
};
use chrono::Utc;
use serde_json::Value;
use sqlx::{Postgres, QueryBuilder, Transaction};
use tracing::instrument;
use uuid::Uuid;

// cookie crate used for parsing request cookies
use password_hash::{PasswordHash, PasswordVerifier, PasswordHasher, SaltString};
use argon2::{Argon2, password_hash::rand_core::OsRng};
use sqlx::Row;
// no Extension used currently

use crate::{
    app_state::AppState,
    dto::{
        CreateEventRequest, CreateOrganizerRequest, ListAuditLogsQuery, ListEventsQuery,
        UpdateEventRequest, UpdateOrganizerRequest, LoginRequest, InitAccountRequest, ChangePasswordRequest,
    },
    error::AppError,
    models::{AuditLogEntry, AuditType, Event, Organizer},
    responses::{HealthResponse, AuthUserResponse, SetupTokenResponse},
};

pub fn api_router() -> Router<AppState> {
    Router::new()
        // Public
        .route("/healthcheck", get(health_check))
        .route("/auth/login", post(login))
        .route("/auth/init", post(init_account))
        .route("/auth/me", get(me))
        .route("/events", get(list_events).post(create_event))
        .route("/events/{id}", get(get_event).put(update_event).delete(delete_event))
        .route("/organizers", get(list_organizers).post(create_organizer))
        .route(
            "/organizers/{id}",
            get(get_organizer)
                .put(update_organizer)
                .delete(delete_organizer),
        )
        .route("/organizers/{id}/setup-token", get(generate_setup_token).post(generate_setup_token))
        .route("/audit-logs", get(list_audit_logs))
        // Auth utils
        .route("/auth/logout", post(logout))
        .route("/auth/change-password", post(change_password))
}

#[utoipa::path(
    post,
    path = "/api/v1/auth/login",
    tag = "Auth",
    request_body = LoginRequest,
    responses(
        (status = 200, description = "Logged in; cookie set", body = AuthUserResponse),
        (status = 401, description = "Invalid credentials"),
    )
)]
#[instrument(skip(state, payload))]
pub(crate) async fn login(
    State(state): State<AppState>,
    Json(payload): Json<LoginRequest>,
) -> Result<Response, AppError> {
    let rec = sqlx::query(
        r#"SELECT id, name, password_hash FROM organizers WHERE email = $1"#,
    )
    .bind(&payload.email)
    .fetch_optional(&state.db)
    .await?;

    let Some(row) = rec else {
        return Err(AppError::unauthorized("invalid e-mail or password"));
    };

    let id: i64 = row.try_get("id").unwrap_or_default();
    let name: String = row.try_get::<String, _>("name").unwrap_or_default();
    let stored_hash: Option<String> = row.try_get("password_hash").ok();
    let Some(stored_hash) = stored_hash else {
        return Err(AppError::unauthorized("invalid e-mail or password"));
    };

    let parsed_hash = PasswordHash::new(&stored_hash)
        .map_err(|_| AppError::unauthorized("invalid e-mail or password"))?;
    Argon2::default()
        .verify_password(payload.password.as_bytes(), &parsed_hash)
        .map_err(|_| AppError::unauthorized("invalid e-mail or password"))?;

    let session_id = Uuid::new_v4();
    // 7 days expiry
    let expires_at = Utc::now() + chrono::Duration::days(7);
    sqlx::query(
        r#"INSERT INTO sessions (id, organizer_id, expires_at) VALUES ($1, $2, $3)"#,
    )
    .bind(session_id)
    .bind(id)
    .bind(expires_at)
    .execute(&state.db)
    .await?;

    let attrs = session_cookie_attributes();
    let cookie_str = format!(
        "session_id={}; {}; Max-Age={}",
        session_id,
        attrs,
        7 * 24 * 60 * 60
    );
    let body = Json(AuthUserResponse { id, name });
    let mut resp = (StatusCode::OK, body).into_response();
    resp.headers_mut().append(
        axum::http::header::SET_COOKIE,
        HeaderValue::from_str(&cookie_str).unwrap(),
    );
    Ok(resp)
}

#[utoipa::path(
    post,
    path = "/api/v1/auth/init",
    tag = "Auth",
    request_body = InitAccountRequest,
    responses(
        (status = 200, description = "Initialized; cookie set", body = AuthUserResponse),
        (status = 400, description = "Already initialized or invalid token"),
    )
)]
#[instrument(skip(state, payload))]
pub(crate) async fn init_account(
    State(state): State<AppState>,
    Json(payload): Json<InitAccountRequest>,
) -> Result<Response, AppError> {
    let row = sqlx::query(
        r#"SELECT id, name, password_hash FROM organizers WHERE setup_token = $1"#,
    )
    .bind(&payload.token)
    .fetch_optional(&state.db)
    .await?;

    let Some(row) = row else {
        return Err(AppError::validation("invalid setup token"));
    };

    let existing: Option<String> = row.try_get("password_hash").ok();
    if existing.is_some() {
        return Err(AppError::validation("account already initialized"));
    }
    let id: i64 = row.try_get("id").unwrap();
    let name: String = row.try_get::<String, _>("name").unwrap_or_default();

    let salt = SaltString::generate(&mut OsRng);
    let hash = Argon2::default()
        .hash_password(payload.password.as_bytes(), &salt)
        .map_err(|_| AppError::validation("failed to hash password"))?
        .to_string();

    sqlx::query(
        r#"
        UPDATE organizers
        SET email = $1, password_hash = $2, setup_token = NULL, updated_at = NOW()
        WHERE id = $3
        "#,
    )
    .bind(&payload.email)
    .bind(&hash)
    .bind(id)
    .execute(&state.db)
    .await?;

    // Create session
    let session_id = Uuid::new_v4();
    let expires_at = Utc::now() + chrono::Duration::days(7);
    sqlx::query(
        r#"INSERT INTO sessions (id, organizer_id, expires_at) VALUES ($1, $2, $3)"#,
    )
    .bind(session_id)
    .bind(id)
    .bind(expires_at)
    .execute(&state.db)
    .await?;

    let attrs = session_cookie_attributes();
    let cookie_str = format!(
        "session_id={}; {}; Max-Age={}",
        session_id,
        attrs,
        7 * 24 * 60 * 60
    );

    let body = Json(AuthUserResponse { id, name });
    let mut resp = (StatusCode::OK, body).into_response();
    resp.headers_mut().append(
        axum::http::header::SET_COOKIE,
        HeaderValue::from_str(&cookie_str).unwrap(),
    );
    Ok(resp)
}

#[utoipa::path(
    post,
    path = "/api/v1/auth/logout",
    tag = "Auth",
    responses((status = 204, description = "Logged out"))
)]
#[instrument(skip(state, headers))]
pub(crate) async fn logout(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Response, AppError> {
    if let Some(session_id) = get_cookie(&headers, "session_id") {
        if let Ok(uuid) = Uuid::parse_str(&session_id) {
            let _ = sqlx::query("DELETE FROM sessions WHERE id = $1")
                .bind(uuid)
                .execute(&state.db)
                .await?;
        }
        let attrs = session_cookie_attributes();
        let expired = format!("session_id=; {}; Max-Age=0", attrs);
        let mut resp = StatusCode::NO_CONTENT.into_response();
        resp.headers_mut().append(
            axum::http::header::SET_COOKIE,
            HeaderValue::from_str(&expired).unwrap(),
        );
        return Ok(resp);
    }

    Ok(StatusCode::NO_CONTENT.into_response())
}

#[utoipa::path(
    get,
    path = "/api/v1/auth/me",
    tag = "Auth",
    responses(
        (status = 200, description = "Current user", body = AuthUserResponse),
        (status = 401, description = "Not authenticated")
    )
)]
#[instrument(skip(state, headers))]
pub(crate) async fn me(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<AuthUserResponse>, AppError> {
    let Some(session_id) = get_cookie(&headers, "session_id") else {
        return Err(AppError::unauthorized("missing session"));
    };

    let uuid = Uuid::parse_str(&session_id).map_err(|_| AppError::unauthorized("invalid session format"))?;
    let rec = sqlx::query(
        r#"
        SELECT o.id, o.name
        FROM sessions s
        JOIN organizers o ON o.id = s.organizer_id
        WHERE s.id = $1 AND s.expires_at > NOW()
        "#,
    )
    .bind(uuid)
    .fetch_optional(&state.db)
    .await?;

    let Some(row) = rec else {
        return Err(AppError::unauthorized("invalid or expired session"));
    };

    let id: i64 = row.try_get("id").unwrap_or_default();
    let name: String = row.try_get("name").unwrap_or_default();
    Ok(Json(AuthUserResponse { id, name }))
}

fn get_cookie(headers: &HeaderMap, name: &str) -> Option<String> {
    let cookie_header = headers.get(axum::http::header::COOKIE)?;
    let cookie_str = cookie_header.to_str().ok()?;
    for c in cookie::Cookie::split_parse(cookie_str) {
        if let Ok(cookie) = c {
            if cookie.name() == name {
                return Some(cookie.value().to_string());
            }
        }
    }
    None
}

fn session_cookie_attributes() -> String {
    let secure = std::env::var("SESSION_COOKIE_SECURE")
        .ok()
        .and_then(|v| v.parse::<bool>().ok())
        .unwrap_or(true);
    if secure {
        "Path=/; HttpOnly; SameSite=Lax; Secure".to_string()
    } else {
        "Path=/; HttpOnly; SameSite=Lax".to_string()
    }
}

#[derive(Clone, Debug)]
pub(crate) struct AuthedUser {
    id: i64,
    name: String,
}

async fn current_user_from_headers(headers: &HeaderMap, state: &AppState) -> Result<AuthedUser, AppError> {
    let Some(session_id) = get_cookie(headers, "session_id") else {
        return Err(AppError::unauthorized("missing session"));
    };
    let uuid = Uuid::parse_str(&session_id)
        .map_err(|_| AppError::unauthorized("invalid session format"))?;
    let rec = sqlx::query(
        r#"
        SELECT o.id, o.name
        FROM sessions s
        JOIN organizers o ON o.id = s.organizer_id
        WHERE s.id = $1 AND s.expires_at > NOW()
        "#,
    )
    .bind(uuid)
    .fetch_optional(&state.db)
    .await?;
    let Some(row) = rec else {
        return Err(AppError::unauthorized("invalid or expired session"));
    };
    Ok(AuthedUser { id: row.try_get("id").unwrap_or_default(), name: row.try_get("name").unwrap_or_default() })
}

#[utoipa::path(
    post,
    path = "/api/v1/auth/change-password",
    tag = "Auth",
    request_body = ChangePasswordRequest,
    responses((status = 204, description = "Password changed"))
)]
#[instrument(skip(state, payload))]
pub(crate) async fn change_password(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(payload): Json<ChangePasswordRequest>,
) -> Result<StatusCode, AppError> {
    let user = current_user_from_headers(&headers, &state).await?;
    let rec = sqlx::query(
        r#"SELECT password_hash FROM organizers WHERE id = $1"#,
    )
    .bind(user.id)
    .fetch_one(&state.db)
    .await?;

    let stored_hash: Option<String> = rec.try_get("password_hash").ok();
    let Some(stored) = stored_hash else {
        return Err(AppError::validation("account not initialized"));
    };

    let parsed_hash = PasswordHash::new(&stored)
        .map_err(|_| AppError::unauthorized("invalid current password"))?;
    Argon2::default()
        .verify_password(payload.current_password.as_bytes(), &parsed_hash)
        .map_err(|_| AppError::unauthorized("invalid current password"))?;

    let salt = SaltString::generate(&mut OsRng);
    let new_hash = Argon2::default()
        .hash_password(payload.new_password.as_bytes(), &salt)
        .map_err(|_| AppError::validation("failed to hash password"))?
        .to_string();

    let mut tx = state.db.begin().await?;
    sqlx::query(
        r#"UPDATE organizers SET password_hash = $1, updated_at = NOW() WHERE id = $2"#,
    )
    .bind(&new_hash)
    .bind(user.id)
    .execute(&mut *tx)
    .await?;
    // Invalidate all existing sessions for this user
    sqlx::query(
        r#"DELETE FROM sessions WHERE organizer_id = $1"#,
    )
    .bind(user.id)
    .execute(&mut *tx)
    .await?;
    tx.commit().await?;

    Ok(StatusCode::NO_CONTENT)
}

#[utoipa::path(
    post,
    path = "/api/v1/organizers/{id}/setup-token",
    tag = "Organizers",
    params(("id" = i64, Path, description = "Organizer identifier")),
    responses((status = 200, description = "Setup token generated", body = SetupTokenResponse))
)]
#[instrument(skip(state))]
pub(crate) async fn generate_setup_token(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<i64>,
) -> Result<Json<SetupTokenResponse>, AppError> {
    let user = current_user_from_headers(&headers, &state).await?;
    if user.id != id {
        return Err(AppError::unauthorized("cannot generate token for another organizer"));
    }
    let token = Uuid::new_v4().to_string();
    let result = sqlx::query(
        r#"UPDATE organizers SET setup_token = $1, updated_at = NOW() WHERE id = $2"#,
    )
    .bind(&token)
    .bind(id)
    .execute(&state.db)
    .await?;
    if result.rows_affected() == 0 {
        return Err(AppError::not_found("Organizer not found"));
    }
    Ok(Json(SetupTokenResponse { setup_token: token }))
}

#[utoipa::path(
    get,
    path = "/api/v1/healthcheck",
    tag = "Health",
    responses((status = 200, description = "API is ready", body = HealthResponse))
)]
pub(crate) async fn health_check() -> impl IntoResponse {
    Json(HealthResponse {
        status: "ok".to_string(),
        message: "API Services".to_string(),
    })
}

#[utoipa::path(
    get,
    path = "/api/v1/organizers",
    tag = "Organizers",
    responses((status = 200, description = "List organizers", body = [Organizer]))
)]
#[instrument(skip(state))]
pub(crate) async fn list_organizers(
    State(state): State<AppState>,
) -> Result<Json<Vec<Organizer>>, AppError> {
    let organizers = sqlx::query_as::<_, Organizer>(
        r#"
        SELECT id, name, description_de, description_en, website_url, instagram_url, created_at, updated_at
        FROM organizers
        ORDER BY name
        "#,
    )
    .fetch_all(&state.db)
    .await?;

    Ok(Json(organizers))
}

#[utoipa::path(
    post,
    path = "/api/v1/organizers",
    tag = "Organizers",
    request_body = CreateOrganizerRequest,
    responses((status = 201, description = "Organizer created", body = Organizer))
)]
#[instrument(skip(state, payload))]
pub(crate) async fn create_organizer(
    State(state): State<AppState>,
    Json(payload): Json<CreateOrganizerRequest>,
) -> Result<impl IntoResponse, AppError> {
    let organizer = sqlx::query_as::<_, Organizer>(
        r#"
        INSERT INTO organizers (name, description_de, description_en, website_url, instagram_url)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, name, description_de, description_en, website_url, instagram_url, created_at, updated_at
        "#,
    )
    .bind(payload.name)
    .bind(payload.description_de)
    .bind(payload.description_en)
    .bind(payload.website_url)
    .bind(payload.instagram_url)
    .fetch_one(&state.db)
    .await?;

    Ok((StatusCode::CREATED, Json(organizer)))
}

#[utoipa::path(
    get,
    path = "/api/v1/organizers/{id}",
    tag = "Organizers",
    params(("id" = i64, Path, description = "Organizer identifier")),
    responses((status = 200, description = "Organizer details", body = Organizer))
)]
#[instrument(skip(state))]
pub(crate) async fn get_organizer(
    State(state): State<AppState>,
    Path(id): Path<i64>,
) -> Result<Json<Organizer>, AppError> {
    let organizer = sqlx::query_as::<_, Organizer>(
        r#"
        SELECT id, name, description_de, description_en, website_url, instagram_url, created_at, updated_at
        FROM organizers
        WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_one(&state.db)
    .await?;

    Ok(Json(organizer))
}

#[utoipa::path(
    put,
    path = "/api/v1/organizers/{id}",
    tag = "Organizers",
    params(("id" = i64, Path, description = "Organizer identifier")),
    request_body = UpdateOrganizerRequest,
    responses((status = 200, description = "Organizer updated", body = Organizer))
)]
#[instrument(skip(state, payload))]
pub(crate) async fn update_organizer(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<i64>,
    Json(payload): Json<UpdateOrganizerRequest>,
) -> Result<Json<Organizer>, AppError> {
    let user = current_user_from_headers(&headers, &state).await?;
    if user.id != id {
        return Err(AppError::unauthorized("cannot update another organizer"));
    }
    let has_updates = payload.has_updates();
    let UpdateOrganizerRequest {
        name,
        description_de,
        description_en,
        website_url,
        instagram_url,
    } = payload;

    if !has_updates {
        return Err(AppError::validation("No fields supplied for update"));
    }

    // Build assignments defensively to avoid any stray commas
    let mut builder = QueryBuilder::<Postgres>::new("UPDATE organizers SET updated_at = NOW()");
    if let Some(name) = name {
        builder.push(", name = ").push_bind(name);
    }
    if let Some(description_de) = description_de {
        builder.push(", description_de = ").push_bind(description_de);
    }
    if let Some(description_en) = description_en {
        builder.push(", description_en = ").push_bind(description_en);
    }
    if let Some(website_url) = website_url {
        builder.push(", website_url = ").push_bind(website_url);
    }
    if let Some(instagram_url) = instagram_url {
        builder.push(", instagram_url = ").push_bind(instagram_url);
    }

    builder.push(" WHERE id = ").push_bind(id);
    builder.push(" RETURNING id, name, description_de, description_en, website_url, instagram_url, created_at, updated_at");

    let organizer = builder
        .build_query_as::<Organizer>()
        .fetch_one(&state.db)
        .await?;

    Ok(Json(organizer))
}

#[utoipa::path(
    delete,
    path = "/api/v1/organizers/{id}",
    tag = "Organizers",
    params(("id" = i64, Path, description = "Organizer identifier")),
    responses((status = 204, description = "Organizer removed"))
)]
#[instrument(skip(state))]
pub(crate) async fn delete_organizer(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<i64>,
) -> Result<StatusCode, AppError> {
    let user = current_user_from_headers(&headers, &state).await?;
    if user.id != id {
        return Err(AppError::unauthorized("cannot delete another organizer"));
    }
    let result = sqlx::query("DELETE FROM organizers WHERE id = $1")
        .bind(id)
        .execute(&state.db)
        .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::not_found("Organizer not found"));
    }

    Ok(StatusCode::NO_CONTENT)
}

#[utoipa::path(
    get,
    path = "/api/v1/audit-logs",
    tag = "Audit",
    params(ListAuditLogsQuery),
    responses((status = 200, description = "List audit log entries", body = [AuditLogEntry]))
)]
#[instrument(skip(state, query_params))]
pub(crate) async fn list_audit_logs(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(mut query_params): Query<ListAuditLogsQuery>,
) -> Result<Json<Vec<AuditLogEntry>>, AppError> {
    let user = current_user_from_headers(&headers, &state).await?;
    if let Some(requested) = query_params.organizer_id {
        if requested != user.id {
            return Err(AppError::unauthorized("cannot view other organizers' audit logs"));
        }
    } else {
        query_params.organizer_id = Some(user.id);
    }
    let mut builder = QueryBuilder::<Postgres>::new(
        "SELECT id, event_id, organizer_id, type, at, note, old_data, new_data FROM audit_log",
    );

    let mut any = false;
    if let Some(event_id) = query_params.event_id {
        builder.push(" WHERE event_id = ").push_bind(event_id);
        any = true;
    }
    if let Some(organizer_id) = query_params.organizer_id {
        if any {
            builder.push(" AND ");
        } else {
            builder.push(" WHERE ");
        }
        builder.push("organizer_id = ").push_bind(organizer_id);
        any = true;
    }

    builder.push(" ORDER BY at DESC");

    if let Some(limit) = query_params.limit {
        builder.push(" LIMIT ").push_bind(limit.max(1));
    }
    if let Some(offset) = query_params.offset {
        builder.push(" OFFSET ").push_bind(offset.max(0));
    }

    let entries = builder
        .build_query_as::<AuditLogEntry>()
        .fetch_all(&state.db)
        .await?;

    Ok(Json(entries))
}

#[utoipa::path(
    get,
    path = "/api/v1/events",
    tag = "Events",
    params(ListEventsQuery),
    responses((status = 200, description = "List events", body = [Event]))
)]
#[instrument(skip(state, query_params))]
pub(crate) async fn list_events(
    State(state): State<AppState>,
    Query(query_params): Query<ListEventsQuery>,
) -> Result<Json<Vec<Event>>, AppError> {
    let mut builder = QueryBuilder::<Postgres>::new(
        "SELECT id, organizer_id, title_de, title_en, description_de, description_en, start_date_time, end_date_time, event_url, publish_app, publish_newsletter, created_at, updated_at FROM events",
    );

    if query_params.organizer_id.is_some() || query_params.upcoming_only.unwrap_or(false) {
        builder.push(" WHERE ");
    }

    if let Some(organizer_id) = query_params.organizer_id {
        builder.push("organizer_id = ").push_bind(organizer_id);
        if query_params.upcoming_only.unwrap_or(false) {
            builder.push(" AND ");
        }
    }

    if query_params.upcoming_only.unwrap_or(false) {
        builder.push("start_date_time >= ").push_bind(Utc::now());
    }

    builder.push(" ORDER BY start_date_time ASC");

    if let Some(limit) = query_params.limit {
        builder.push(" LIMIT ").push_bind(limit.max(1));
    }
    if let Some(offset) = query_params.offset {
        builder.push(" OFFSET ").push_bind(offset.max(0));
    }

    let events = builder
        .build_query_as::<Event>()
        .fetch_all(&state.db)
        .await?;

    Ok(Json(events))
}

#[utoipa::path(
    post,
    path = "/api/v1/events",
    tag = "Events",
    request_body = CreateEventRequest,
    responses((status = 201, description = "Event created", body = Event))
)]
#[instrument(skip(state, payload))]
pub(crate) async fn create_event(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(payload): Json<CreateEventRequest>,
) -> Result<impl IntoResponse, AppError> {
    let user = current_user_from_headers(&headers, &state).await?;
    let CreateEventRequest {
        title_de,
        title_en,
        description_de,
        description_en,
        start_date_time,
        end_date_time,
        event_url,
        publish_app,
        publish_newsletter,
        audit_note,
    } = payload;

    let mut transaction = state.db.begin().await?;

    let event = sqlx::query_as::<_, Event>(
        r#"
        INSERT INTO events (organizer_id, title_de, title_en, description_de, description_en, start_date_time, end_date_time, event_url, publish_app, publish_newsletter)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id, organizer_id, title_de, title_en, description_de, description_en, start_date_time, end_date_time, event_url, publish_app, publish_newsletter, created_at, updated_at
        "#,
    )
    .bind(user.id)
    .bind(title_de)
    .bind(title_en)
    .bind(description_de)
    .bind(description_en)
    .bind(start_date_time)
    .bind(end_date_time)
    .bind(event_url)
    .bind(publish_app)
    .bind(publish_newsletter)
    .fetch_one(&mut *transaction)
    .await?;

    record_audit(
        &mut transaction,
        event.id,
        event.organizer_id,
        AuditType::Create,
        audit_note.as_ref(),
        None,
        Some(&event),
    )
    .await?;

    transaction.commit().await?;

    Ok((StatusCode::CREATED, Json(event)))
}

#[utoipa::path(
    get,
    path = "/api/v1/events/{id}",
    tag = "Events",
    params(("id" = i64, Path, description = "Event identifier")),
    responses((status = 200, description = "Event details", body = Event))
)]
#[instrument(skip(state))]
pub(crate) async fn get_event(
    State(state): State<AppState>,
    Path(id): Path<i64>,
) -> Result<Json<Event>, AppError> {
    let event = sqlx::query_as::<_, Event>(
        r#"
        SELECT id, organizer_id, title_de, title_en, description_de, description_en, start_date_time, end_date_time, event_url, publish_app, publish_newsletter, created_at, updated_at
        FROM events
        WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_one(&state.db)
    .await?;

    Ok(Json(event))
}

#[utoipa::path(
    put,
    path = "/api/v1/events/{id}",
    tag = "Events",
    params(("id" = i64, Path, description = "Event identifier")),
    request_body = UpdateEventRequest,
    responses((status = 200, description = "Event updated", body = Event))
)]
#[instrument(skip(state, payload))]
pub(crate) async fn update_event(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<i64>,
    Json(payload): Json<UpdateEventRequest>,
) -> Result<Json<Event>, AppError> {
    let user = current_user_from_headers(&headers, &state).await?;
    let has_updates = payload.has_updates();
    let UpdateEventRequest {
        title_de,
        title_en,
        description_de,
        description_en,
        start_date_time,
        end_date_time,
        event_url,
        publish_app,
        publish_newsletter,
        audit_note,
    } = payload;

    if !has_updates {
        return Err(AppError::validation("No fields supplied for update"));
    }

    let mut transaction = state.db.begin().await?;

    let existing_event = sqlx::query_as::<_, Event>(
        r#"
        SELECT id, organizer_id, title_de, title_en, description_de, description_en, start_date_time, end_date_time, event_url, publish_app, publish_newsletter, created_at, updated_at
        FROM events
        WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_one(&mut *transaction)
    .await?;

    if existing_event.organizer_id != user.id {
        return Err(AppError::unauthorized("cannot update another organizer's event"));
    }

    // Build assignments defensively to avoid any stray commas
    let mut builder = QueryBuilder::<Postgres>::new("UPDATE events SET updated_at = NOW()");
    if let Some(title_de) = title_de {
        builder.push(", title_de = ").push_bind(title_de);
    }
    if let Some(title_en) = title_en {
        builder.push(", title_en = ").push_bind(title_en);
    }
    if let Some(description_de) = description_de {
        builder.push(", description_de = ").push_bind(description_de);
    }
    if let Some(description_en) = description_en {
        builder.push(", description_en = ").push_bind(description_en);
    }
    if let Some(start_date_time) = start_date_time {
        builder.push(", start_date_time = ").push_bind(start_date_time);
    }
    if let Some(end_date_time) = end_date_time {
        builder.push(", end_date_time = ").push_bind(end_date_time);
    }
    if let Some(event_url) = event_url {
        builder.push(", event_url = ").push_bind(event_url);
    }
    if let Some(publish_app) = publish_app {
        builder.push(", publish_app = ").push_bind(publish_app);
    }
    if let Some(publish_newsletter) = publish_newsletter {
        builder.push(", publish_newsletter = ").push_bind(publish_newsletter);
    }

    builder.push(" WHERE id = ").push_bind(id);
    builder.push(" RETURNING id, organizer_id, title_de, title_en, description_de, description_en, start_date_time, end_date_time, event_url, publish_app, publish_newsletter, created_at, updated_at");

    let updated_event = builder
        .build_query_as::<Event>()
        .fetch_one(&mut *transaction)
        .await?;

    record_audit(
        &mut transaction,
        updated_event.id,
        updated_event.organizer_id,
        AuditType::Update,
        audit_note.as_ref(),
        Some(&existing_event),
        Some(&updated_event),
    )
    .await?;

    transaction.commit().await?;

    Ok(Json(updated_event))
}

#[utoipa::path(
    delete,
    path = "/api/v1/events/{id}",
    tag = "Events",
    params(("id" = i64, Path, description = "Event identifier")),
    responses((status = 204, description = "Event removed"))
)]
#[instrument(skip(state))]
pub(crate) async fn delete_event(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<i64>,
) -> Result<StatusCode, AppError> {
    let user = current_user_from_headers(&headers, &state).await?;
    let mut transaction = state.db.begin().await?;

    let existing_event = sqlx::query_as::<_, Event>(
        r#"
        SELECT id, organizer_id, title_de, title_en, description_de, description_en, start_date_time, end_date_time, event_url, publish_app, publish_newsletter, created_at, updated_at
        FROM events
        WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&mut *transaction)
    .await?;

    let Some(existing_event) = existing_event else {
        return Err(AppError::not_found("Event not found"));
    };

    if existing_event.organizer_id != user.id {
        return Err(AppError::unauthorized("cannot delete another organizer's event"));
    }

    sqlx::query("DELETE FROM events WHERE id = $1")
        .bind(id)
        .execute(&mut *transaction)
        .await?;

    record_audit(
        &mut transaction,
        existing_event.id,
        existing_event.organizer_id,
        AuditType::Delete,
        None,
        Some(&existing_event),
        None,
    )
    .await?;

    transaction.commit().await?;

    Ok(StatusCode::NO_CONTENT)
}

async fn record_audit(
    transaction: &mut Transaction<'_, Postgres>,
    event_id: i64,
    organizer_id: i64,
    audit_type: AuditType,
    note: Option<&String>,
    old_data: Option<&Event>,
    new_data: Option<&Event>,
) -> Result<(), AppError> {
    let old_json: Option<Value> = match old_data {
        Some(data) => Some(serde_json::to_value(data)?),
        None => None,
    };
    let new_json: Option<Value> = match new_data {
        Some(data) => Some(serde_json::to_value(data)?),
        None => None,
    };

    sqlx::query(
        r#"
        INSERT INTO audit_log (event_id, organizer_id, type, note, old_data, new_data)
        VALUES ($1, $2, $3, $4, $5, $6)
        "#,
    )
    .bind(event_id)
    .bind(organizer_id)
    .bind(audit_type)
    .bind(note.cloned())
    .bind(old_json)
    .bind(new_json)
    .execute(&mut **transaction)
    .await?;

    Ok(())
}
