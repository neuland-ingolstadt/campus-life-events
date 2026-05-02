use axum::{
    Json, Router,
    extract::{Path, State},
    http::{HeaderMap, StatusCode},
    routing::{delete, get},
};
use chrono::{DateTime, Duration, Utc};
use tracing::instrument;

use crate::{
    api_token,
    app_state::AppState,
    dto::CreateApiTokenRequest,
    error::AppError,
    responses::{ApiTokenCreatedResponse, ApiTokenSummaryResponse},
};

use super::shared::current_user_from_headers;

const MAX_API_TOKEN_LABEL_LEN: usize = 200;
const API_TOKEN_LIFETIME_DAYS: i64 = 30;

fn normalize_label(raw: &str) -> Result<String, AppError> {
    let t = raw.trim();
    if t.chars().count() > MAX_API_TOKEN_LABEL_LEN {
        return Err(AppError::validation(format!(
            "label must be at most {MAX_API_TOKEN_LABEL_LEN} characters"
        )));
    }
    Ok(t.to_string())
}

#[utoipa::path(
    get,
    path = "/api/v1/auth/api-tokens",
    tag = "Auth",
    responses(
        (status = 200, description = "API tokens for the current account", body = [ApiTokenSummaryResponse]),
        (status = 401, description = "Not authenticated"),
    )
)]
#[instrument(skip(state, headers))]
pub(crate) async fn list_api_tokens(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<Vec<ApiTokenSummaryResponse>>, AppError> {
    let user = current_user_from_headers(&headers, &state).await?;
    let rows = sqlx::query!(
        r#"
        SELECT id, label, token_last_four, created_at, expires_at, last_used_at as "last_used_at?: DateTime<Utc>"
        FROM api_tokens
        WHERE account_id = $1
        ORDER BY created_at DESC
        "#,
        user.account_id
    )
    .fetch_all(&state.db)
    .await?;

    let out = rows
        .into_iter()
        .map(|r| ApiTokenSummaryResponse {
            id: r.id,
            label: r.label,
            token_last_four: r.token_last_four,
            created_at: r.created_at,
            expires_at: r.expires_at,
            last_used_at: r.last_used_at,
        })
        .collect();

    Ok(Json(out))
}

#[utoipa::path(
    post,
    path = "/api/v1/auth/api-tokens",
    tag = "Auth",
    request_body = CreateApiTokenRequest,
    responses(
        (status = 200, description = "New token; copy `token` now; it is not shown again", body = ApiTokenCreatedResponse),
        (status = 401, description = "Not authenticated"),
        (status = 503, description = "Server not configured for API tokens"),
    )
)]
#[instrument(skip(state, headers, payload))]
pub(crate) async fn create_api_token(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(payload): Json<CreateApiTokenRequest>,
) -> Result<Json<ApiTokenCreatedResponse>, AppError> {
    let Some(key) = state.api_token_hmac_key.as_ref() else {
        return Err(AppError::service_unavailable(
            "API token management is not configured (set API_TOKEN_SECRET)",
        ));
    };

    let user = current_user_from_headers(&headers, &state).await?;
    let label = normalize_label(&payload.label)?;
    let raw = api_token::generate_raw_token();
    let h = api_token::hash_raw_token(key, &raw);
    let token_last_four = api_token::token_last_four(&raw);
    let expires_at = Utc::now() + Duration::days(API_TOKEN_LIFETIME_DAYS);

    let row = sqlx::query!(
        r#"
        INSERT INTO api_tokens (account_id, token_hmac, label, token_last_four, expires_at)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, created_at, expires_at
        "#,
        user.account_id,
        &h[..],
        &label,
        &token_last_four,
        expires_at
    )
    .fetch_one(&state.db)
    .await?;

    Ok(Json(ApiTokenCreatedResponse {
        id: row.id,
        label,
        token: raw,
        token_last_four,
        created_at: row.created_at,
        expires_at: row.expires_at,
    }))
}

#[utoipa::path(
    delete,
    path = "/api/v1/auth/api-tokens/{id}",
    tag = "Auth",
    params(
        ("id" = i64, Path, description = "API token id")
    ),
    responses(
        (status = 204, description = "Revoked"),
        (status = 401, description = "Not authenticated"),
        (status = 404, description = "Not found"),
    )
)]
#[instrument(skip(state, headers))]
pub(crate) async fn revoke_api_token(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<i64>,
) -> Result<StatusCode, AppError> {
    let user = current_user_from_headers(&headers, &state).await?;
    let res = sqlx::query!(
        "DELETE FROM api_tokens WHERE id = $1 AND account_id = $2",
        id,
        user.account_id
    )
    .execute(&state.db)
    .await?;

    if res.rows_affected() == 0 {
        return Err(AppError::not_found("token not found"));
    }

    Ok(StatusCode::NO_CONTENT)
}

pub(crate) fn router() -> Router<AppState> {
    Router::new()
        .route("/api-tokens", get(list_api_tokens).post(create_api_token))
        .route("/api-tokens/{id}", delete(revoke_api_token))
}
