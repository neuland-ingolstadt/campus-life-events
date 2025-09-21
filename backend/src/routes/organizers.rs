use axum::{
    Json, Router,
    extract::{Path, State},
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
    routing::get,
};
use sqlx::{Postgres, QueryBuilder};
use tracing::{error, info, instrument, warn};

use crate::{
    app_state::AppState,
    dto::{CreateOrganizerRequest, UpdateOrganizerRequest},
    error::AppError,
    models::{AccountType, Organizer, OrganizerInviteRow, OrganizerWithInvite},
    responses::SetupTokenResponse,
};

use super::shared::{current_user_from_headers, generate_setup_token_value};

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
        SELECT id, name, description_de, description_en, website_url, instagram_url, location, created_at, updated_at
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
    responses((status = 201, description = "Organizer created", body = SetupTokenResponse))
)]
#[instrument(skip(state, headers, payload))]
pub(crate) async fn create_organizer(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(payload): Json<CreateOrganizerRequest>,
) -> Result<impl IntoResponse, AppError> {
    let user = current_user_from_headers(&headers, &state).await?;
    if !user.is_admin() {
        return Err(AppError::unauthorized("insufficient permissions"));
    }

    let token = generate_setup_token_value();
    let mut tx = state.db.begin().await?;
    let organizer = sqlx::query_as::<_, Organizer>(
        r#"
        INSERT INTO organizers (name)
        VALUES ($1)
        RETURNING id, name, description_de, description_en, website_url, instagram_url, location, created_at, updated_at
        "#,
    )
    .bind(&payload.name)
    .fetch_one(&mut *tx)
    .await?;

    sqlx::query(
        r#"
        INSERT INTO accounts (
            account_type,
            organizer_id,
            display_name,
            email,
            setup_token,
            setup_token_expires_at
        )
        VALUES ($1, $2, $3, $4, $5, NOW() + INTERVAL '7 days')
        "#,
    )
    .bind(AccountType::Organizer)
    .bind(organizer.id)
    .bind(&organizer.name)
    .bind(&payload.email)
    .bind(&token)
    .execute(&mut *tx)
    .await?;

    if let Some(email_client) = &state.email {
        match email_client
            .send_new_organizer_invite(&payload.email, &payload.name, &token)
            .await
        {
            Ok(_) => info!("organizer invite email sent successfully"),
            Err(err) => {
                error!(error = %err, "failed to send organizer invite email");
                // Log the registration URL for manual use
                crate::email::log_registration_url(&token);
                warn!(
                    "organizer invite created but email failed - registration URL logged to console"
                );
            }
        }
    } else {
        warn!("email client not configured; skipping organizer invite email");
        // Log the registration URL for manual use
        crate::email::log_registration_url(&token);
    }

    tx.commit().await?;

    Ok((
        StatusCode::CREATED,
        Json(SetupTokenResponse { setup_token: token }),
    ))
}

#[utoipa::path(
    get,
    path = "/api/v1/organizers/admin",
    tag = "Organizers",
    responses((
        status = 200,
        description = "List organizers including invite status",
        body = [OrganizerWithInvite],
    )),
)]
#[instrument(skip(state, headers))]
pub(crate) async fn list_organizers_admin(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<Vec<OrganizerWithInvite>>, AppError> {
    let user = current_user_from_headers(&headers, &state).await?;
    if !user.is_admin() {
        return Err(AppError::unauthorized("insufficient permissions"));
    }

    let rows = sqlx::query_as::<_, OrganizerInviteRow>(
        r#"
        SELECT
            o.id AS organizer_id,
            o.name AS organizer_name,
            a.email AS account_email,
            o.created_at,
            o.updated_at,
            a.password_hash,
            a.setup_token,
            a.setup_token_expires_at
        FROM organizers o
        LEFT JOIN accounts a
            ON a.organizer_id = o.id AND a.account_type = 'ORGANIZER'
        ORDER BY o.created_at DESC
        "#,
    )
    .fetch_all(&state.db)
    .await?;

    let organizers = rows
        .into_iter()
        .map(OrganizerWithInvite::from_row)
        .collect();

    Ok(Json(organizers))
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
        SELECT id, name, description_de, description_en, website_url, instagram_url, location, created_at, updated_at
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
#[instrument(skip(state, headers, payload))]
pub(crate) async fn update_organizer(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<i64>,
    Json(payload): Json<UpdateOrganizerRequest>,
) -> Result<Json<Organizer>, AppError> {
    let user = current_user_from_headers(&headers, &state).await?;
    let editing_self = user.organizer_id() == Some(id);
    if !editing_self && !user.is_admin() {
        return Err(AppError::unauthorized("cannot update another organizer"));
    }
    let has_updates = payload.has_updates();
    let UpdateOrganizerRequest {
        name,
        description_de,
        description_en,
        website_url,
        instagram_url,
        location,
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
        builder
            .push(", description_de = ")
            .push_bind(description_de);
    }
    if let Some(description_en) = description_en {
        builder
            .push(", description_en = ")
            .push_bind(description_en);
    }
    if let Some(website_url) = website_url {
        builder.push(", website_url = ").push_bind(website_url);
    }
    if let Some(instagram_url) = instagram_url {
        builder.push(", instagram_url = ").push_bind(instagram_url);
    }
    if let Some(location) = location {
        builder.push(", location = ").push_bind(location);
    }

    builder.push(" WHERE id = ").push_bind(id);
    builder.push(" RETURNING id, name, description_de, description_en, website_url, instagram_url, location, created_at, updated_at");

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
#[instrument(skip(state, headers))]
pub(crate) async fn delete_organizer(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<i64>,
) -> Result<StatusCode, AppError> {
    let user = current_user_from_headers(&headers, &state).await?;
    let deleting_self = user.organizer_id() == Some(id);
    if !deleting_self && !user.is_admin() {
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
    if user.organizer_id() != Some(id) && !user.is_admin() {
        return Err(AppError::unauthorized(
            "cannot generate token for another organizer",
        ));
    }
    let token = generate_setup_token_value();
    let result = sqlx::query(
        r#"
        UPDATE accounts
        SET setup_token = $1,
            setup_token_expires_at = NOW() + INTERVAL '7 days',
            updated_at = NOW()
        WHERE organizer_id = $2
            AND account_type = 'ORGANIZER'
        "#,
    )
    .bind(&token)
    .bind(id)
    .execute(&state.db)
    .await?;
    if result.rows_affected() == 0 {
        return Err(AppError::not_found("Organizer account not found"));
    }
    Ok(Json(SetupTokenResponse { setup_token: token }))
}

pub(crate) fn router() -> Router<AppState> {
    Router::new()
        .route("/", get(list_organizers).post(create_organizer))
        .route("/admin", get(list_organizers_admin))
        .route(
            "/{id}",
            get(get_organizer)
                .put(update_organizer)
                .delete(delete_organizer),
        )
        .route(
            "/{id}/setup-token",
            get(generate_setup_token).post(generate_setup_token),
        )
}
