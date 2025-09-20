use argon2::{Argon2, password_hash::rand_core::OsRng};
use axum::{
    Json, Router,
    extract::State,
    http::{HeaderMap, HeaderValue, StatusCode},
    response::{IntoResponse, Response},
    routing::{get, post},
};
use chrono::{DateTime, Duration, Utc};
use password_hash::{PasswordHash, PasswordHasher, PasswordVerifier, SaltString};
use password_policy::{COMMON_PASSWORDS, HighSecurityPolicy, PasswordPolicy};
use sqlx::Row;
use tracing::instrument;
use uuid::Uuid;

use crate::{
    app_state::AppState,
    dto::{ChangePasswordRequest, InitAccountRequest, LoginRequest, SetupTokenLookupRequest},
    error::AppError,
    models::AccountType,
    responses::{AuthUserResponse, SetupTokenInfoResponse},
};

use super::shared::{current_user_from_headers, get_cookie, session_cookie_attributes};

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
#[instrument(skip(state, payload), fields(email = %payload.email))]
pub(crate) async fn login(
    State(state): State<AppState>,
    Json(payload): Json<LoginRequest>,
) -> Result<Response, AppError> {
    let rec = sqlx::query(
        r#"
        SELECT
            a.id,
            a.account_type,
            a.password_hash,
            a.organizer_id,
            a.email AS account_email,
            o.name AS organizer_name,
            adm.name AS admin_name
        FROM accounts a
        LEFT JOIN organizers o ON o.id = a.organizer_id
        LEFT JOIN admins adm ON adm.account_id = a.id
        WHERE a.email = $1
        "#,
    )
    .bind(&payload.email)
    .fetch_optional(&state.db)
    .await?;

    let Some(row) = rec else {
        tracing::warn!("Failed login attempt for email: {}", payload.email);
        return Err(AppError::unauthorized("invalid e-mail or password"));
    };

    let id: i64 = row.try_get("id").unwrap_or_default();
    let account_type: AccountType = row.try_get("account_type")?;
    let organizer_id: Option<i64> = row.try_get("organizer_id").ok();
    let name: String = match account_type {
        AccountType::Admin => row
            .try_get::<Option<String>, _>("admin_name")?
            .or_else(|| {
                row.try_get::<Option<String>, _>("account_email")
                    .ok()
                    .flatten()
            })
            .unwrap_or_default(),
        AccountType::Organizer => row
            .try_get::<Option<String>, _>("organizer_name")?
            .or_else(|| {
                row.try_get::<Option<String>, _>("account_email")
                    .ok()
                    .flatten()
            })
            .unwrap_or_default(),
    };
    let stored_hash: Option<String> = row.try_get("password_hash").ok();
    let Some(stored_hash) = stored_hash else {
        tracing::warn!(
            "Failed login attempt for email: {} (no password hash)",
            payload.email
        );
        return Err(AppError::unauthorized("invalid e-mail or password"));
    };

    let parsed_hash = PasswordHash::new(&stored_hash)
        .map_err(|_| AppError::unauthorized("invalid e-mail or password"))?;
    Argon2::default()
        .verify_password(payload.password.as_bytes(), &parsed_hash)
        .map_err(|_| {
            tracing::warn!(
                "Failed login attempt for email: {} (invalid password)",
                payload.email
            );
            AppError::unauthorized("invalid e-mail or password")
        })?;

    let session_id = Uuid::new_v4();
    // 24 hours expiry
    let expires_at = Utc::now() + Duration::hours(24);
    sqlx::query(r#"INSERT INTO sessions (id, account_id, expires_at) VALUES ($1, $2, $3)"#)
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
        24 * 60 * 60
    );

    tracing::info!("Successful login for user: {} (id: {})", name, id);

    let body = Json(AuthUserResponse {
        id,
        name,
        account_type,
        organizer_id,
    });
    let mut resp = (StatusCode::OK, body).into_response();
    resp.headers_mut().append(
        axum::http::header::SET_COOKIE,
        HeaderValue::from_str(&cookie_str).unwrap(),
    );
    Ok(resp)
}

#[utoipa::path(
    post,
    path = "/api/v1/auth/register-info",
    tag = "Auth",
    request_body = SetupTokenLookupRequest,
    responses(
        (status = 200, description = "Valid setup token", body = SetupTokenInfoResponse),
        (status = 400, description = "Invalid or expired token"),
    )
)]
#[instrument(skip(state, payload))]
pub(crate) async fn lookup_setup_token(
    State(state): State<AppState>,
    Json(payload): Json<SetupTokenLookupRequest>,
) -> Result<Json<SetupTokenInfoResponse>, AppError> {
    let PendingSetupToken { name, .. } = ensure_pending_setup_token(&state, &payload.token).await?;

    Ok(Json(SetupTokenInfoResponse {
        organizer_name: name,
    }))
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
    let pending = ensure_pending_setup_token(&state, &payload.token).await?;
    let PendingSetupToken {
        id,
        name,
        account_type,
        organizer_id,
    } = pending;

    ensure_password_requirements(&payload.password)?;

    let salt = SaltString::generate(&mut OsRng);
    let hash = Argon2::default()
        .hash_password(payload.password.as_bytes(), &salt)
        .map_err(|_| AppError::validation("failed to hash password"))?
        .to_string();

    sqlx::query(
        r#"
        UPDATE accounts
        SET email = $1,
            password_hash = $2,
            setup_token = NULL,
            setup_token_expires_at = NULL,
            updated_at = NOW()
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
    let expires_at = Utc::now() + Duration::hours(24);
    sqlx::query(r#"INSERT INTO sessions (id, account_id, expires_at) VALUES ($1, $2, $3)"#)
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
        24 * 60 * 60
    );

    let body = Json(AuthUserResponse {
        id,
        name,
        account_type,
        organizer_id,
    });
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
            tracing::info!("User logout for session: {}", session_id);
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

    let uuid = Uuid::parse_str(&session_id)
        .map_err(|_| AppError::unauthorized("invalid session format"))?;
    let rec = sqlx::query(
        r#"
        SELECT
            a.id,
            a.account_type,
            a.organizer_id,
            a.email AS account_email,
            o.name AS organizer_name,
            adm.name AS admin_name
        FROM sessions s
        JOIN accounts a ON a.id = s.account_id
        LEFT JOIN organizers o ON o.id = a.organizer_id
        LEFT JOIN admins adm ON adm.account_id = a.id
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
    let account_type: AccountType = row.try_get("account_type")?;
    let organizer_id: Option<i64> = row.try_get("organizer_id").ok();
    let name: String = match account_type {
        AccountType::Admin => row
            .try_get::<Option<String>, _>("admin_name")?
            .or_else(|| {
                row.try_get::<Option<String>, _>("account_email")
                    .ok()
                    .flatten()
            })
            .unwrap_or_default(),
        AccountType::Organizer => row
            .try_get::<Option<String>, _>("organizer_name")?
            .or_else(|| {
                row.try_get::<Option<String>, _>("account_email")
                    .ok()
                    .flatten()
            })
            .unwrap_or_default(),
    };
    Ok(Json(AuthUserResponse {
        id,
        name,
        account_type,
        organizer_id,
    }))
}

#[utoipa::path(
    post,
    path = "/api/v1/auth/change-password",
    tag = "Auth",
    request_body = ChangePasswordRequest,
    responses((status = 204, description = "Password changed"))
)]
#[instrument(skip(state, headers, payload))]
pub(crate) async fn change_password(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(payload): Json<ChangePasswordRequest>,
) -> Result<StatusCode, AppError> {
    let user = current_user_from_headers(&headers, &state).await?;
    let rec = sqlx::query(r#"SELECT password_hash FROM accounts WHERE id = $1"#)
        .bind(user.account_id)
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

    ensure_password_requirements(&payload.new_password)?;

    let salt = SaltString::generate(&mut OsRng);
    let new_hash = Argon2::default()
        .hash_password(payload.new_password.as_bytes(), &salt)
        .map_err(|_| AppError::validation("failed to hash password"))?
        .to_string();

    let mut tx = state.db.begin().await?;
    sqlx::query(r#"UPDATE accounts SET password_hash = $1, updated_at = NOW() WHERE id = $2"#)
        .bind(&new_hash)
        .bind(user.account_id)
        .execute(&mut *tx)
        .await?;
    // Invalidate all existing sessions for this user (session rotation)
    sqlx::query(r#"DELETE FROM sessions WHERE account_id = $1"#)
        .bind(user.account_id)
        .execute(&mut *tx)
        .await?;
    tx.commit().await?;

    Ok(StatusCode::NO_CONTENT)
}

struct PendingSetupToken {
    id: i64,
    name: String,
    account_type: AccountType,
    organizer_id: Option<i64>,
}

async fn ensure_pending_setup_token(
    state: &AppState,
    token: &str,
) -> Result<PendingSetupToken, AppError> {
    let row = sqlx::query(
        r#"
        SELECT
            a.id,
            a.account_type,
            a.password_hash,
            a.organizer_id,
            a.setup_token_expires_at,
            a.email AS account_email,
            o.name AS organizer_name,
            adm.name AS admin_name
        FROM accounts a
        LEFT JOIN organizers o ON o.id = a.organizer_id
        LEFT JOIN admins adm ON adm.account_id = a.id
        WHERE a.setup_token = $1
        "#,
    )
    .bind(token)
    .fetch_optional(&state.db)
    .await?;

    let Some(row) = row else {
        return Err(AppError::validation("invalid setup token"));
    };

    let expires_at: Option<DateTime<Utc>> = row.try_get("setup_token_expires_at")?;
    match expires_at {
        Some(when) if when > Utc::now() => {}
        _ => {
            return Err(AppError::validation("setup token expired"));
        }
    }

    let existing: Option<String> = row.try_get("password_hash")?;
    if existing.is_some() {
        return Err(AppError::validation("account already initialized"));
    }

    let account_type: AccountType = row.try_get("account_type")?;
    let name = match account_type {
        AccountType::Admin => row
            .try_get::<Option<String>, _>("admin_name")?
            .or_else(|| {
                row.try_get::<Option<String>, _>("account_email")
                    .ok()
                    .flatten()
            })
            .unwrap_or_default(),
        AccountType::Organizer => row
            .try_get::<Option<String>, _>("organizer_name")?
            .or_else(|| {
                row.try_get::<Option<String>, _>("account_email")
                    .ok()
                    .flatten()
            })
            .unwrap_or_default(),
    };

    Ok(PendingSetupToken {
        id: row.try_get("id")?,
        name,
        account_type,
        organizer_id: row.try_get("organizer_id").ok(),
    })
}

fn ensure_password_requirements(password: &str) -> Result<(), AppError> {
    let policy = HighSecurityPolicy {
        min_length: 20,
        ..Default::default()
    };

    if password.len() < policy.min_length {
        return Err(AppError::validation(format!(
            "password must be at least {} characters long",
            policy.min_length
        )));
    }

    if !password.chars().any(|c| c.is_ascii_lowercase()) {
        return Err(AppError::validation(
            "password must include at least one lowercase letter",
        ));
    }

    if !password.chars().any(|c| c.is_ascii_uppercase()) {
        return Err(AppError::validation(
            "password must include at least one uppercase letter",
        ));
    }

    if !password.chars().any(|c| c.is_ascii_digit()) {
        return Err(AppError::validation(
            "password must include at least one number",
        ));
    }

    if !password.chars().any(|c| !c.is_ascii_alphanumeric()) {
        return Err(AppError::validation(
            "password must include at least one symbol",
        ));
    }

    let lowered = password.to_lowercase();
    if COMMON_PASSWORDS
        .iter()
        .any(|candidate| lowered.contains(candidate))
    {
        return Err(AppError::validation(
            "password is too common or predictable",
        ));
    }

    if !policy.meets_requirements(password) {
        return Err(AppError::validation(format!(
            "password must provide at least {:.0} bits of entropy",
            policy.min_entropy
        )));
    }

    Ok(())
}

pub(crate) fn router() -> Router<AppState> {
    Router::new()
        .route("/login", post(login))
        .route("/register-info", post(lookup_setup_token))
        .route("/init", post(init_account))
        .route("/logout", post(logout))
        .route("/change-password", post(change_password))
        .route("/me", get(me))
}
