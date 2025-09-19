use axum::{Json, Router, response::IntoResponse, routing::get};

use crate::{app_state::AppState, responses::HealthResponse};

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

pub(crate) fn router() -> Router<AppState> {
    Router::new().route("/healthcheck", get(health_check))
}
