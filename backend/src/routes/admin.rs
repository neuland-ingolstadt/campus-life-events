use axum::{
    Json, Router,
    extract::{Path, State},
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
    routing::{get, post, put},
};
use tracing::{error, info, instrument, warn};

use crate::{
    app_state::AppState,
    dto::{InviteAdminRequest, UpdateOrganizerPermissionsRequest},
    error::AppError,
    models::{
        AccountType, AdminInviteRow, AdminWithInvite, OrganizerInviteRow, OrganizerWithInvite,
    },
    responses::SetupTokenResponse,
};

use super::shared::{current_user_from_headers, generate_setup_token_value};

#[utoipa::path(
    get,
    path = "/api/v1/admin/list",
    tag = "Admin",
    responses((
        status = 200,
        description = "List admins including invite status",
        body = [AdminWithInvite],
    )),
)]
#[instrument(skip(state, headers))]
pub(crate) async fn list_admins(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<Vec<AdminWithInvite>>, AppError> {
    let user = current_user_from_headers(&headers, &state).await?;
    if !user.is_admin() {
        return Err(AppError::unauthorized("insufficient permissions"));
    }

    let rows = sqlx::query_as!(
        AdminInviteRow,
        r#"
        SELECT
            id AS account_id,
            display_name,
            email AS account_email,
            created_at,
            updated_at,
            password_hash,
            setup_token,
            setup_token_expires_at
        FROM accounts
        WHERE account_type = 'ADMIN'
        ORDER BY created_at DESC
        "#
    )
    .fetch_all(&state.db)
    .await?;

    let admins = rows.into_iter().map(AdminWithInvite::from_row).collect();

    Ok(Json(admins))
}

#[utoipa::path(
    put,
    path = "/api/v1/admin/organizers/{id}/permissions",
    tag = "Admin",
    params(("id" = i64, Path, description = "Organizer identifier")),
    request_body = UpdateOrganizerPermissionsRequest,
    responses((
        status = 200,
        description = "Organizer permissions updated",
        body = OrganizerWithInvite,
    )),
)]
#[instrument(skip(state, headers, payload))]
pub(crate) async fn update_organizer_permissions(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<i64>,
    Json(payload): Json<UpdateOrganizerPermissionsRequest>,
) -> Result<Json<OrganizerWithInvite>, AppError> {
    let user = current_user_from_headers(&headers, &state).await?;
    if !user.is_admin() {
        return Err(AppError::unauthorized("insufficient permissions"));
    }

    let result = sqlx::query!(
        r#"
        UPDATE organizers
        SET newsletter = $1,
            updated_at = NOW()
        WHERE id = $2
        "#,
        payload.newsletter,
        id
    )
    .execute(&state.db)
    .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::not_found("Organizer not found"));
    }

    let row = sqlx::query_as!(
        OrganizerInviteRow,
        r#"
        SELECT
            o.id AS organizer_id,
            o.name AS organizer_name,
            a.email AS account_email,
            o.newsletter AS newsletter,
            o.created_at,
            o.updated_at,
            a.password_hash,
            a.setup_token,
            a.setup_token_expires_at
        FROM organizers o
        LEFT JOIN accounts a
            ON a.organizer_id = o.id AND a.account_type = 'ORGANIZER'
        WHERE o.id = $1
        "#,
        id
    )
    .fetch_one(&state.db)
    .await?;

    let organizer = OrganizerWithInvite::from_row(row);

    Ok(Json(organizer))
}

pub(crate) fn router() -> Router<AppState> {
    Router::new()
        .route("/invite", post(invite_admin))
        .route("/list", get(list_admins))
        .route(
            "/organizers/{id}/permissions",
            put(update_organizer_permissions),
        )
}

#[utoipa::path(
    post,
    path = "/api/v1/admin/invite",
    tag = "Admin",
    request_body = InviteAdminRequest,
    responses((status = 201, description = "Admin invited", body = SetupTokenResponse)),
)]
#[instrument(skip(state, headers, payload))]
pub(crate) async fn invite_admin(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(payload): Json<InviteAdminRequest>,
) -> Result<impl IntoResponse, AppError> {
    let user = current_user_from_headers(&headers, &state).await?;
    if !user.is_admin() {
        return Err(AppError::unauthorized("insufficient permissions"));
    }

    let token = generate_setup_token_value();
    let mut tx = state.db.begin().await?;

    sqlx::query!(
        r#"
        INSERT INTO accounts (
            account_type,
            display_name,
            email,
            setup_token,
            setup_token_expires_at
        )
        VALUES ($1::account_type, $2, $3, $4, NOW() + INTERVAL '7 days')
        "#,
        AccountType::Admin as AccountType,
        &payload.display_name,
        &payload.email,
        &token
    )
    .execute(&mut *tx)
    .await?;

    if let Some(email_client) = &state.email {
        match email_client
            .send_new_admin_invite(&payload.email, &payload.display_name, &token)
            .await
        {
            Ok(_) => info!("admin invite email sent successfully"),
            Err(err) => {
                error!(error = %err, "failed to send admin invite email");
                warn!("admin invite created but email delivery failed");
            }
        }
    } else {
        warn!("email client not configured; admin invite email not sent");
    }

    tx.commit().await?;

    Ok((
        StatusCode::CREATED,
        Json(SetupTokenResponse { setup_token: token }),
    ))
}
