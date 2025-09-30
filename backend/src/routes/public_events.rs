use axum::{
    Json, Router,
    extract::{Path, Query, State},
    routing::get,
};
use tracing::{instrument, warn};

use crate::{
    app_state::AppState,
    dto::ListEventsQuery,
    error::AppError,
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

#[derive(Debug, FromRow)]
struct PublicOrganizerWithStats {
    id: i64,
    name: String,
    description_de: Option<String>,
    description_en: Option<String>,
    website_url: Option<String>,
    instagram_url: Option<String>,
    location: Option<String>,
    linkedin_url: Option<String>,
    registration_number: Option<String>,
    non_profit: bool,
    active_events_count: i64,
    recent_and_upcoming_events_count: i64,
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
    let cache_key = format!("public:events:list:{query_params:?}");
    if let Some(cache) = &state.cache {
        match cache.get_json::<Vec<PublicEventResponse>>(&cache_key).await {
            Ok(Some(cached)) => return Ok(Json(cached)),
            Ok(None) => {}
            Err(err) => {
                warn!(target: "cache", action = "get", scope = "public_events_list", %err, "Failed to read public events list from cache")
            }
        }
    }

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

    if let Some(cache) = &state.cache {
        if let Err(err) = cache.set_json(&cache_key, &public_events).await {
            warn!(target: "cache", action = "set", scope = "public_events_list", %err, "Failed to store public events list in cache");
        }
    }

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
    let cache_key = "public:organizers:list";
    if let Some(cache) = &state.cache {
        match cache
            .get_json::<Vec<PublicOrganizerResponse>>(cache_key)
            .await
        {
            Ok(Some(cached)) => return Ok(Json(cached)),
            Ok(None) => {}
            Err(err) => {
                warn!(target: "cache", action = "get", scope = "public_organizers_list", %err, "Failed to read public organizers list from cache")
            }
        }
    }

    let organizers = sqlx::query_as!(
        PublicOrganizerWithStats,
        r#"
        SELECT
            o.id,
            o.name,
            o.description_de,
            o.description_en,
            o.website_url,
            o.instagram_url,
            o.location,
            o.linkedin_url,
            o.registration_number,
            o.non_profit,
            stats.active_events_count AS "active_events_count!",
            stats.recent_and_upcoming_events_count AS "recent_and_upcoming_events_count!"
        FROM organizers o
        LEFT JOIN LATERAL (
            SELECT
                COUNT(*) FILTER (
                    WHERE e.publish_app = true
                        AND COALESCE(e.end_date_time, e.start_date_time) >= NOW()
                ) AS active_events_count,
                COUNT(*) FILTER (
                    WHERE e.publish_app = true
                        AND e.start_date_time BETWEEN NOW() - INTERVAL '1 months' AND NOW() + INTERVAL '3 months'
                ) AS recent_and_upcoming_events_count
            FROM events e
            WHERE e.organizer_id = o.id
        ) stats ON TRUE
        ORDER BY stats.recent_and_upcoming_events_count DESC, o.name ASC
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
            active_events_count: organizer.active_events_count,
            recent_and_upcoming_events_count: organizer.recent_and_upcoming_events_count,
        })
        .collect();

    if let Some(cache) = &state.cache {
        if let Err(err) = cache.set_json(cache_key, &public_organizers).await {
            warn!(target: "cache", action = "set", scope = "public_organizers_list", %err, "Failed to store public organizers list in cache");
        }
    }

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
    let cache_key = format!("public:events:item:{id}");
    if let Some(cache) = &state.cache {
        match cache.get_json::<PublicEventResponse>(&cache_key).await {
            Ok(Some(cached)) => return Ok(Json(cached)),
            Ok(None) => {}
            Err(err) => {
                warn!(target: "cache", action = "get", scope = "public_event", event_id = id, %err, "Failed to read public event from cache")
            }
        }
    }

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
            if let Some(cache) = &state.cache {
                if let Err(err) = cache.set_json(&cache_key, &public_event).await {
                    warn!(target: "cache", action = "set", scope = "public_event", event_id = id, %err, "Failed to store public event in cache");
                }
            }
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
    let cache_key = format!("public:organizers:item:{id}");
    if let Some(cache) = &state.cache {
        match cache.get_json::<PublicOrganizerResponse>(&cache_key).await {
            Ok(Some(cached)) => return Ok(Json(cached)),
            Ok(None) => {}
            Err(err) => {
                warn!(target: "cache", action = "get", scope = "public_organizer", organizer_id = id, %err, "Failed to read public organizer from cache")
            }
        }
    }

    let organizer = sqlx::query_as!(
        PublicOrganizerWithStats,
        r#"
        SELECT
            o.id,
            o.name,
            o.description_de,
            o.description_en,
            o.website_url,
            o.instagram_url,
            o.location,
            o.linkedin_url,
            o.registration_number,
            o.non_profit,
            stats.active_events_count AS "active_events_count!",
            stats.recent_and_upcoming_events_count AS "recent_and_upcoming_events_count!"
        FROM organizers o
        LEFT JOIN LATERAL (
            SELECT
                COUNT(*) FILTER (
                    WHERE e.publish_app = true
                        AND COALESCE(e.end_date_time, e.start_date_time) >= NOW()
                ) AS active_events_count,
                COUNT(*) FILTER (
                    WHERE e.publish_app = true
                        AND e.start_date_time BETWEEN NOW() - INTERVAL '1 months' AND NOW() + INTERVAL '3 months'
                ) AS recent_and_upcoming_events_count
            FROM events e
            WHERE e.organizer_id = o.id
        ) stats ON TRUE
        WHERE o.id = $1
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
                active_events_count: organizer.active_events_count,
                recent_and_upcoming_events_count: organizer.recent_and_upcoming_events_count,
            };
            if let Some(cache) = &state.cache {
                if let Err(err) = cache.set_json(&cache_key, &public_organizer).await {
                    warn!(target: "cache", action = "set", scope = "public_organizer", organizer_id = id, %err, "Failed to store public organizer in cache");
                }
            }
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
