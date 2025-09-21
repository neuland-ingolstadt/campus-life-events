use axum::{
    Json, Router,
    extract::{Path, State},
    routing::get,
};
use tracing::instrument;

use crate::{
    app_state::AppState,
    error::AppError,
    models::{Event, Organizer},
};

#[utoipa::path(
    get,
    path = "/api/v1/public/events/{id}",
    tag = "Public Events",
    params(("id" = i64, Path, description = "Event identifier")),
    responses((status = 200, description = "Public event details", body = Event), (status = 404, description = "Event not found or not published"))
)]
#[instrument(skip(state))]
pub(crate) async fn get_public_event(
    State(state): State<AppState>,
    Path(id): Path<i64>,
) -> Result<Json<Event>, AppError> {
    let event = sqlx::query_as!(
        Event,
        r#"
        SELECT id, organizer_id, title_de, title_en, description_de, description_en, start_date_time, end_date_time, event_url, location, publish_app, publish_newsletter, publish_in_ical, publish_web, created_at, updated_at
        FROM events
        WHERE id = $1 AND publish_web = true
        "#,
        id
    )
    .fetch_optional(&state.db)
    .await?;

    match event {
        Some(event) => Ok(Json(event)),
        None => Err(AppError::not_found("Event not found or not published")),
    }
}

#[utoipa::path(
    get,
    path = "/api/v1/public/organizers/{id}",
    tag = "Public Events",
    params(("id" = i64, Path, description = "Organizer identifier")),
    responses((status = 200, description = "Public organizer details", body = Organizer), (status = 404, description = "Organizer not found"))
)]
#[instrument(skip(state))]
pub(crate) async fn get_public_organizer(
    State(state): State<AppState>,
    Path(id): Path<i64>,
) -> Result<Json<Organizer>, AppError> {
    let organizer = sqlx::query_as!(
        Organizer,
        r#"
        SELECT id, name, description_de, description_en, website_url, instagram_url, location, newsletter, created_at, updated_at
        FROM organizers
        WHERE id = $1
        "#,
        id
    )
    .fetch_optional(&state.db)
    .await?;

    match organizer {
        Some(organizer) => Ok(Json(organizer)),
        None => Err(AppError::not_found("Organizer not found")),
    }
}

pub(crate) fn router() -> Router<AppState> {
    Router::new()
        .route("/events/{id}", get(get_public_event))
        .route("/organizers/{id}", get(get_public_organizer))
}
