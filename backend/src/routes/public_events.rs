use axum::{
    Json, Router,
    extract::{Path, Query, State},
    routing::get,
};
use tracing::instrument;

use crate::{
    app_state::AppState,
    dto::ListEventsQuery,
    error::AppError,
    models::Organizer,
    responses::{PublicEventResponse, PublicOrganizerResponse},
};
use chrono::{DateTime, Utc};
use sqlx::{FromRow, Postgres, QueryBuilder};

#[derive(Debug, FromRow)]
struct PublicEventWithOrganizer {
    id: i64,
    organizer_id: i64,
    organizer_name: String,
    title_de: String,
    title_en: String,
    description_de: Option<String>,
    description_en: Option<String>,
    start_date_time: DateTime<Utc>,
    end_date_time: DateTime<Utc>,
    event_url: Option<String>,
    location: Option<String>,
}

#[utoipa::path(
    get,
    path = "/api/v1/public/events",
    tag = "Public",
    params(ListEventsQuery),
    responses((status = 200, description = "List public events", body = [PublicEventResponse]))
)]
#[instrument(skip(state, query_params))]
pub(crate) async fn list_public_events(
    State(state): State<AppState>,
    Query(query_params): Query<ListEventsQuery>,
) -> Result<Json<Vec<PublicEventResponse>>, AppError> {
    let mut builder = QueryBuilder::<Postgres>::new(
        "SELECT e.id, e.organizer_id, o.name AS organizer_name, e.title_de, e.title_en, e.description_de, e.description_en, e.start_date_time, e.end_date_time, e.event_url, e.location FROM events e INNER JOIN organizers o ON e.organizer_id = o.id",
    );

    // Only show events that are published in the app
    builder.push(" WHERE e.publish_app = true");

    if let Some(organizer_id) = query_params.organizer_id {
        builder
            .push(" AND e.organizer_id = ")
            .push_bind(organizer_id);
    }

    if query_params.upcoming_only.unwrap_or(false) {
        builder
            .push(" AND e.start_date_time >= ")
            .push_bind(Utc::now());
    }

    builder.push(" ORDER BY e.start_date_time ASC");

    if let Some(limit) = query_params.limit {
        builder.push(" LIMIT ").push_bind(limit.max(1));
    }
    if let Some(offset) = query_params.offset {
        builder.push(" OFFSET ").push_bind(offset.max(0));
    }

    let events = builder
        .build_query_as::<PublicEventWithOrganizer>()
        .fetch_all(&state.db)
        .await?;

    let public_events: Vec<PublicEventResponse> = events
        .into_iter()
        .map(|event| PublicEventResponse {
            id: event.id,
            organizer_id: event.organizer_id,
            organizer_name: event.organizer_name,
            title_de: event.title_de,
            title_en: event.title_en,
            description_de: event.description_de,
            description_en: event.description_en,
            start_date_time: event.start_date_time,
            end_date_time: event.end_date_time,
            event_url: event.event_url,
            location: event.location,
        })
        .collect();

    Ok(Json(public_events))
}

#[utoipa::path(
    get,
    path = "/api/v1/public/organizers",
    tag = "Public",
    responses((status = 200, description = "List public organizers", body = [PublicOrganizerResponse]))
)]
#[instrument(skip(state))]
pub(crate) async fn list_public_organizers(
    State(state): State<AppState>,
) -> Result<Json<Vec<PublicOrganizerResponse>>, AppError> {
    let organizers = sqlx::query_as!(
        Organizer,
        r#"
        SELECT id, name, description_de, description_en, website_url, instagram_url, location, linkedin_url, registration_number, non_profit, newsletter, created_at, updated_at
        FROM organizers
        ORDER BY name ASC
        "#
    )
    .fetch_all(&state.db)
    .await?;

    let public_organizers: Vec<PublicOrganizerResponse> = organizers
        .into_iter()
        .map(|organizer| PublicOrganizerResponse {
            id: organizer.id,
            name: organizer.name,
            description_de: organizer.description_de,
            description_en: organizer.description_en,
            website_url: organizer.website_url,
            instagram_url: organizer.instagram_url,
            location: organizer.location,
            linkedin_url: organizer.linkedin_url,
            registration_number: organizer.registration_number,
            non_profit: organizer.non_profit,
        })
        .collect();

    Ok(Json(public_organizers))
}

#[utoipa::path(
    get,
    path = "/api/v1/public/events/{id}",
    tag = "Public",
    params(("id" = i64, Path, description = "Event identifier")),
    responses((status = 200, description = "Public event details", body = PublicEventResponse), (status = 404, description = "Event not found or not published"))
)]
#[instrument(skip(state))]
pub(crate) async fn get_public_event(
    State(state): State<AppState>,
    Path(id): Path<i64>,
) -> Result<Json<PublicEventResponse>, AppError> {
    let event = sqlx::query_as!(
        PublicEventWithOrganizer,
        r#"
        SELECT e.id, e.organizer_id, o.name AS organizer_name, e.title_de, e.title_en, e.description_de, e.description_en, e.start_date_time, e.end_date_time, e.event_url, e.location
        FROM events e
        INNER JOIN organizers o ON e.organizer_id = o.id
        WHERE e.id = $1 AND e.publish_web = true
        "#,
        id
    )
    .fetch_optional(&state.db)
    .await?;

    match event {
        Some(event) => {
            let public_event = PublicEventResponse {
                id: event.id,
                organizer_id: event.organizer_id,
                organizer_name: event.organizer_name,
                title_de: event.title_de,
                title_en: event.title_en,
                description_de: event.description_de,
                description_en: event.description_en,
                start_date_time: event.start_date_time,
                end_date_time: event.end_date_time,
                event_url: event.event_url,
                location: event.location,
            };
            Ok(Json(public_event))
        }
        None => Err(AppError::not_found("Event not found or not published")),
    }
}

#[utoipa::path(
    get,
    path = "/api/v1/public/organizers/{id}",
    tag = "Public",
    params(("id" = i64, Path, description = "Organizer identifier")),
    responses((status = 200, description = "Public organizer details", body = PublicOrganizerResponse), (status = 404, description = "Organizer not found"))
)]
#[instrument(skip(state))]
pub(crate) async fn get_public_organizer(
    State(state): State<AppState>,
    Path(id): Path<i64>,
) -> Result<Json<PublicOrganizerResponse>, AppError> {
    let organizer = sqlx::query_as!(
        Organizer,
        r#"
        SELECT id, name, description_de, description_en, website_url, instagram_url, location, linkedin_url, registration_number, non_profit, newsletter, created_at, updated_at
        FROM organizers
        WHERE id = $1
        "#,
        id
    )
    .fetch_optional(&state.db)
    .await?;

    match organizer {
        Some(organizer) => {
            let public_organizer = PublicOrganizerResponse {
                id: organizer.id,
                name: organizer.name,
                description_de: organizer.description_de,
                description_en: organizer.description_en,
                website_url: organizer.website_url,
                instagram_url: organizer.instagram_url,
                location: organizer.location,
                linkedin_url: organizer.linkedin_url,
                registration_number: organizer.registration_number,
                non_profit: organizer.non_profit,
            };
            Ok(Json(public_organizer))
        }
        None => Err(AppError::not_found("Organizer not found")),
    }
}

pub(crate) fn router() -> Router<AppState> {
    Router::new()
        .route("/events", get(list_public_events))
        .route("/events/{id}", get(get_public_event))
        .route("/organizers", get(list_public_organizers))
        .route("/organizers/{id}", get(get_public_organizer))
}
