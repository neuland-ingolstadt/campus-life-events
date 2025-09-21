use axum::{
    Json, Router,
    extract::State,
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
    routing::{get, post},
};
use tracing::{error, info, instrument, warn};

use crate::{
    app_state::AppState,
    dto::InviteAdminRequest,
    error::AppError,
    models::{AccountType, AdminInviteRow, AdminWithInvite},
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

    let rows = sqlx::query_as::<_, AdminInviteRow>(
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
        "#,
    )
    .fetch_all(&state.db)
    .await?;

    let admins = rows.into_iter().map(AdminWithInvite::from_row).collect();

    Ok(Json(admins))
}

pub(crate) fn router() -> Router<AppState> {
    Router::new()
        .route("/invite", post(invite_admin))
        .route("/list", get(list_admins))
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
    tracing::debug!(
        "Generated setup token: '{}' (length: {})",
        token,
        token.len()
    );
    let mut tx = state.db.begin().await?;

    sqlx::query(
        r#"
        INSERT INTO accounts (
            account_type,
            display_name,
            email,
            setup_token,
            setup_token_expires_at
        )
        VALUES ($1, $2, $3, $4, NOW() + INTERVAL '7 days')
        "#,
    )
    .bind(AccountType::Admin)
    .bind(&payload.display_name)
    .bind(&payload.email)
    .bind(&token)
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
                // Log the registration URL for manual use
                crate::email::log_registration_url(&token);
                warn!("admin invite created but email failed - registration URL logged to console");
            }
        }
    } else {
        warn!("email client not configured; skipping admin invite email");
        // Log the registration URL for manual use
        crate::email::log_registration_url(&token);
    }

    tx.commit().await?;

    Ok((
        StatusCode::CREATED,
        Json(SetupTokenResponse { setup_token: token }),
    ))
}
