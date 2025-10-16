use axum::{
    Json, Router,
    extract::{Path, State},
    http::{HeaderMap, StatusCode},
    response::{IntoResponse, Response},
    routing::get,
};
use chrono::{DateTime, Utc};
use chrono_tz::Europe::Berlin;
use icalendar::{Calendar, Component, Event as ICalEvent, Property};
use tracing::{instrument, warn};

use crate::{
    app_state::AppState,
    error::AppError,
    models::{Event, Organizer},
    responses::PublicEventResponse,
};

#[derive(Debug, Clone)]
struct EventWithOrganizer {
    pub id: i64,
    pub title_de: String,
    pub title_en: String,
    pub description_de: Option<String>,
    pub description_en: Option<String>,
    pub start_date_time: DateTime<Utc>,
    pub end_date_time: DateTime<Utc>,
    pub event_url: Option<String>,
    pub location: Option<String>,
    pub organizer_location: Option<String>,
}

impl EventWithOrganizer {
    fn to_ical_event(&self) -> ICalEvent {
        let mut ical_event = ICalEvent::new();

        let title = if !self.title_en.is_empty() {
            &self.title_en
        } else {
            &self.title_de
        };

        ical_event.summary(title);

        let description = if let Some(desc_en) = &self.description_en {
            if !desc_en.is_empty() {
                Some(desc_en.as_str())
            } else {
                self.description_de.as_deref()
            }
        } else {
            self.description_de.as_deref()
        };

        if let Some(location) = &self.location {
            ical_event.location(location);
        } else if let Some(organizer_location) = &self.organizer_location {
            ical_event.location(organizer_location);
        }

        if let Some(desc) = description {
            ical_event.description(desc);
        }

        let start_local = self.start_date_time.with_timezone(&Berlin);
        let mut start_property =
            Property::new("DTSTART", &start_local.format("%Y%m%dT%H%M%S").to_string());
        start_property.add_parameter("TZID", BERLIN_TZID);
        ical_event.append_property(start_property);

        let end_local = self.end_date_time.with_timezone(&Berlin);
        let mut end_property =
            Property::new("DTEND", &end_local.format("%Y%m%dT%H%M%S").to_string());
        end_property.add_parameter("TZID", BERLIN_TZID);
        ical_event.append_property(end_property);

        if let Some(url) = &self.event_url {
            ical_event.url(url);
        }

        ical_event.uid(&format!("campus-life-event-{}", self.id));

        ical_event.done()
    }
}

const BERLIN_TZID: &str = "Europe/Berlin";

#[derive(Debug, Clone, sqlx::FromRow)]
struct EventWithOrganizerRow {
    pub id: i64,
    pub title_de: String,
    pub title_en: String,
    pub description_de: Option<String>,
    pub description_en: Option<String>,
    pub start_date_time: DateTime<Utc>,
    pub end_date_time: DateTime<Utc>,
    pub event_url: Option<String>,
    pub location: Option<String>,
    pub organizer_location: Option<String>,
}

impl From<EventWithOrganizerRow> for EventWithOrganizer {
    fn from(row: EventWithOrganizerRow) -> Self {
        Self {
            id: row.id,
            title_de: row.title_de,
            title_en: row.title_en,
            description_de: row.description_de,
            description_en: row.description_en,
            start_date_time: row.start_date_time,
            end_date_time: row.end_date_time,
            event_url: row.event_url,
            location: row.location,
            organizer_location: row.organizer_location,
        }
    }
}

#[utoipa::path(
    get,
    path = "/api/ical",
    tag = "iCal",
    responses((status = 200, description = "iCal calendar with all events", content_type = "text/calendar"))
)]
#[instrument(skip(state))]
pub(crate) async fn get_all_events_ical(
    State(state): State<AppState>,
    _headers: HeaderMap,
) -> Result<impl IntoResponse, AppError> {
    let cache_key = "ical:all";
    if let Some(cache) = &state.cache {
        match cache.get_string(cache_key).await {
            Ok(Some(cached)) => {
                return build_ical_response_with_filename(
                    cached,
                    "attachment; filename=\"campus-life-events.ics\"".to_string(),
                );
            }
            Ok(None) => {}
            Err(err) => {
                warn!(target: "cache", action = "get", scope = "ical_all", %err, "Failed to read iCal feed from cache")
            }
        }
    }

    let events_with_organizers = sqlx::query_as!(
        EventWithOrganizerRow,
        r#"
        SELECT
            e.id, e.title_de, e.title_en, e.description_de, e.description_en,
            e.start_date_time, e.end_date_time, e.event_url, e.location,
            o.location as organizer_location
        FROM events e
        JOIN organizers o ON e.organizer_id = o.id
        WHERE e.publish_in_ical = true AND e.publish_app = true
        ORDER BY e.start_date_time ASC
        "#
    )
    .fetch_all(&state.db)
    .await?;

    let mut calendar = Calendar::new();
    calendar.name("Campus Life Events");
    calendar.description("All campus life events");
    calendar.ttl(&chrono::Duration::hours(1));
    calendar.timezone(BERLIN_TZID);

    for row in events_with_organizers {
        let event_with_organizer = EventWithOrganizer::from(row);
        let ical_event = event_with_organizer.to_ical_event();
        calendar.push(ical_event);
    }

    let ical_content = calendar.done().to_string();

    if let Some(cache) = &state.cache {
        if let Err(err) = cache.set_string(cache_key, &ical_content).await {
            warn!(target: "cache", action = "set", scope = "ical_all", %err, "Failed to store iCal feed in cache");
        }
    }

    build_ical_response_with_filename(
        ical_content,
        "attachment; filename=\"campus-life-events.ics\"".to_string(),
    )
}

#[utoipa::path(
    get,
    path = "/api/ical/{organizer_id}",
    tag = "iCal",
    params(("organizer_id" = i64, Path, description = "Organizer identifier")),
    responses((status = 200, description = "iCal calendar with events for specific organizer", content_type = "text/calendar"))
)]
#[instrument(skip(state))]
pub(crate) async fn get_organizer_events_ical(
    State(state): State<AppState>,
    Path(organizer_id): Path<i64>,
) -> Result<impl IntoResponse, AppError> {
    let organizer = sqlx::query_as!(
        Organizer,
        r#"
        SELECT id, name, description_de, description_en, website_url, instagram_url, location, linkedin_url, registration_number, non_profit, newsletter, created_at, updated_at
        FROM organizers
        WHERE id = $1
        "#,
        organizer_id
    )
    .fetch_optional(&state.db)
    .await?;

    let Some(organizer) = organizer else {
        return Err(AppError::not_found("Organizer not found"));
    };

    let cache_key = format!("ical:organizer:{organizer_id}");
    let file_name = organizer.name.to_lowercase().replace(' ', "-");
    let content_disposition = format!("attachment; filename=\"{file_name}-events.ics\"");

    if let Some(cache) = &state.cache {
        match cache.get_string(&cache_key).await {
            Ok(Some(cached)) => {
                return build_ical_response_with_filename(cached, content_disposition.clone());
            }
            Ok(None) => {}
            Err(err) => {
                warn!(target: "cache", action = "get", scope = "ical_organizer", organizer_id, %err, "Failed to read organizer iCal feed from cache")
            }
        }
    }

    let events_with_organizers = sqlx::query_as!(
        EventWithOrganizerRow,
        r#"
        SELECT
            e.id, e.title_de, e.title_en, e.description_de, e.description_en,
            e.start_date_time, e.end_date_time, e.event_url, e.location,
            o.location as organizer_location
        FROM events e
        JOIN organizers o ON e.organizer_id = o.id
        WHERE e.organizer_id = $1 AND e.publish_in_ical = true
        ORDER BY e.start_date_time ASC
        "#,
        organizer_id
    )
    .fetch_all(&state.db)
    .await?;

    let mut calendar = Calendar::new();
    calendar.name(&format!("{} Events", organizer.name));
    calendar.description(&format!("Events organized by {}", organizer.name));
    calendar.ttl(&chrono::Duration::hours(1));
    calendar.timezone(BERLIN_TZID);

    for row in events_with_organizers {
        let event_with_organizer = EventWithOrganizer::from(row);
        let ical_event = event_with_organizer.to_ical_event();
        calendar.push(ical_event);
    }

    let ical_content = calendar.done().to_string();

    if let Some(cache) = &state.cache {
        if let Err(err) = cache.set_string(&cache_key, &ical_content).await {
            warn!(target: "cache", action = "set", scope = "ical_organizer", organizer_id, %err, "Failed to store organizer iCal feed in cache");
        }
    }

    build_ical_response_with_filename(ical_content, content_disposition)
}

fn build_ical_response_with_filename(
    body: String,
    content_disposition: String,
) -> Result<Response, AppError> {
    Response::builder()
        .status(StatusCode::OK)
        .header("Content-Type", "text/calendar; charset=utf-8")
        .header("Content-Disposition", content_disposition)
        .header("Cache-Control", "public, max-age=3600")
        .body(axum::body::Body::from(body))
        .map_err(|_| AppError::internal("Failed to build response"))
}

fn extract_bearer_token(headers: &HeaderMap) -> Result<String, AppError> {
    let header_value = headers
        .get(axum::http::header::AUTHORIZATION)
        .ok_or_else(|| AppError::unauthorized("missing API token"))?;

    let header_str = header_value
        .to_str()
        .map_err(|_| AppError::unauthorized("invalid API token"))?;

    let token = header_str
        .strip_prefix("Bearer ")
        .ok_or_else(|| AppError::unauthorized("invalid API token"))?
        .trim();

    if token.is_empty() {
        return Err(AppError::unauthorized("invalid API token"));
    }

    Ok(token.to_string())
}

async fn validate_api_token(state: &AppState, headers: &HeaderMap) -> Result<(), AppError> {
    let token = extract_bearer_token(headers)?;

    let token_row = sqlx::query("SELECT 1 FROM api_tokens WHERE token = $1")
        .bind(token)
        .fetch_optional(&state.db)
        .await?;

    if token_row.is_none() {
        return Err(AppError::unauthorized("invalid API token"));
    }

    Ok(())
}

#[utoipa::path(
    get,
    path = "/api/ical/{organizer_id}/events",
    tag = "iCal",
    params(
        ("organizer_id" = i64, Path, description = "Organizer identifier"),
        ("Authorization" = String, Header, description = "Bearer API token"),
    ),
    responses((status = 200, description = "Events for organizer that are iCal eligible", body = [PublicEventResponse])),
)]
#[instrument(skip(state, headers))]
pub(crate) async fn list_organizer_ical_events(
    State(state): State<AppState>,
    Path(organizer_id): Path<i64>,
    headers: HeaderMap,
) -> Result<Json<Vec<PublicEventResponse>>, AppError> {
    validate_api_token(&state, &headers).await?;

    let organizer = sqlx::query!(
        r#"
        SELECT name
        FROM organizers
        WHERE id = $1
        "#,
        organizer_id
    )
    .fetch_optional(&state.db)
    .await?;

    let organizer = match organizer {
        Some(organizer) => organizer,
        None => return Err(AppError::not_found("Organizer not found")),
    };

    let events = sqlx::query_as::<_, Event>(
        "SELECT id, organizer_id, title_de, title_en, description_de, description_en, start_date_time, end_date_time, event_url, location, publish_app, publish_newsletter, publish_in_ical, publish_web, created_at, updated_at FROM events WHERE organizer_id = $1 AND publish_in_ical = true ORDER BY start_date_time ASC",
    )
    .bind(organizer_id)
    .fetch_all(&state.db)
    .await?;

    let organizer_name = organizer.name;

    let response = events
        .into_iter()
        .map(|event| PublicEventResponse {
            id: event.id,
            organizer_id: event.organizer_id,
            organizer_name: organizer_name.clone(),
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

    Ok(Json(response))
}

pub(crate) fn router() -> Router<AppState> {
    Router::new()
        .route("/", get(get_all_events_ical))
        .route("/{organizer_id}", get(get_organizer_events_ical))
        .route("/{organizer_id}/events", get(list_organizer_ical_events))
}
