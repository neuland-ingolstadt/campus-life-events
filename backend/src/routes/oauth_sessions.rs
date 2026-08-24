use axum::{
    Json, Router,
    extract::{Path, State},
    http::{HeaderMap, StatusCode},
    routing::{delete, get},
};
use chrono::{DateTime, Utc};
use tracing::instrument;

use crate::{
    app_state::AppState, error::AppError, responses::OAuthSessionSummaryResponse,
    routes::shared::current_user_from_headers,
};

#[utoipa::path(
    get,
    path = "/api/v1/auth/oauth-sessions",
    tag = "Auth",
    responses(
        (status = 200, description = "Active MCP OAuth sessions for the current account", body = [OAuthSessionSummaryResponse]),
        (status = 401, description = "Not authenticated"),
    )
)]
#[instrument(skip(state, headers))]
pub(crate) async fn list_oauth_sessions(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<Vec<OAuthSessionSummaryResponse>>, AppError> {
    let user = current_user_from_headers(&headers, &state).await?;
    let rows = sqlx::query!(
        r#"
        SELECT
            t.id,
            t.client_id,
            c.client_name,
            t.created_at,
            t.access_expires_at,
            t.refresh_expires_at,
            t.last_used_at as "last_used_at?: DateTime<Utc>"
        FROM oauth_tokens t
        JOIN oauth_clients c ON c.id = t.client_id
        WHERE t.account_id = $1
          AND t.revoked_at IS NULL
          AND t.refresh_expires_at > NOW()
        ORDER BY COALESCE(t.last_used_at, t.created_at) DESC
        "#,
        user.account_id
    )
    .fetch_all(&state.db)
    .await?;

    let out = rows
        .into_iter()
        .map(|r| OAuthSessionSummaryResponse {
            id: r.id,
            client_id: r.client_id.to_string(),
            client_name: r.client_name,
            created_at: r.created_at,
            access_expires_at: r.access_expires_at,
            refresh_expires_at: r.refresh_expires_at,
            last_used_at: r.last_used_at,
        })
        .collect();

    Ok(Json(out))
}

#[utoipa::path(
    delete,
    path = "/api/v1/auth/oauth-sessions/{id}",
    tag = "Auth",
    params(
        ("id" = i64, Path, description = "OAuth session (token) id")
    ),
    responses(
        (status = 204, description = "Revoked"),
        (status = 401, description = "Not authenticated"),
        (status = 404, description = "Not found"),
    )
)]
#[instrument(skip(state, headers))]
pub(crate) async fn revoke_oauth_session(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<i64>,
) -> Result<StatusCode, AppError> {
    let user = current_user_from_headers(&headers, &state).await?;
    let res = sqlx::query!(
        r#"
        UPDATE oauth_tokens
        SET revoked_at = NOW()
        WHERE id = $1 AND account_id = $2 AND revoked_at IS NULL
        "#,
        id,
        user.account_id
    )
    .execute(&state.db)
    .await?;

    if res.rows_affected() == 0 {
        return Err(AppError::not_found("session not found"));
    }

    Ok(StatusCode::NO_CONTENT)
}

pub(crate) fn router() -> Router<AppState> {
    Router::new()
        .route(
            "/oauth-sessions",
            get(list_oauth_sessions).delete(revoke_all_oauth_sessions),
        )
        .route("/oauth-sessions/{id}", delete(revoke_oauth_session))
}

#[utoipa::path(
    delete,
    path = "/api/v1/auth/oauth-sessions",
    tag = "Auth",
    responses(
        (status = 204, description = "All sessions revoked"),
        (status = 401, description = "Not authenticated"),
    )
)]
#[instrument(skip(state, headers))]
pub(crate) async fn revoke_all_oauth_sessions(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<StatusCode, AppError> {
    let user = current_user_from_headers(&headers, &state).await?;
    crate::oauth::revoke_account_tokens(&state.db, user.account_id).await?;
    Ok(StatusCode::NO_CONTENT)
}
