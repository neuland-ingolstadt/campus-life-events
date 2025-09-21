use axum::{
    Router,
    extract::{Path, State},
    http::{HeaderMap, StatusCode},
    response::{IntoResponse, Response},
    routing::get,
};
use chrono::{DateTime, Utc};
use chrono_tz::Europe::Berlin;
use icalendar::{Calendar, Component, Event as ICalEvent, Property};
use tracing::instrument;

use crate::{app_state::AppState, error::AppError, models::Organizer};

#[derive(Debug, Clone)]
struct EventWithOrganizer {
    pub id: i64,
    pub title_de: String,
    pub title_en: String,
    pub description_de: Option<String>,
    pub description_en: Option<String>,
    pub start_date_time: DateTime<Utc>,
    pub end_date_time: Option<DateTime<Utc>>,
    pub event_url: Option<String>,
    pub location: Option<String>,
    pub organizer_location: Option<String>,
}

impl EventWithOrganizer {
    fn to_ical_event(&self) -> ICalEvent {
        let mut ical_event = ICalEvent::new();

        // Use English title if available, fallback to German
        let title = if !self.title_en.is_empty() {
            &self.title_en
        } else {
            &self.title_de
        };

        ical_event.summary(title);

        // Use English description if available, fallback to German
        let description = if let Some(desc_en) = &self.description_en {
            if !desc_en.is_empty() {
                Some(desc_en.as_str())
            } else {
                self.description_de.as_deref()
            }
        } else {
            self.description_de.as_deref()
        };

        // Add location if available
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

        let end_time = self
            .end_date_time
            .unwrap_or_else(|| self.start_date_time + chrono::Duration::hours(2));
        let end_local = end_time.with_timezone(&Berlin);
        let mut end_property =
            Property::new("DTEND", &end_local.format("%Y%m%dT%H%M%S").to_string());
        end_property.add_parameter("TZID", BERLIN_TZID);
        ical_event.append_property(end_property);

        // Add event URL if available
        if let Some(url) = &self.event_url {
            ical_event.url(url);
        }

        // Set unique ID for the event
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
    pub end_date_time: Option<DateTime<Utc>>,
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
    headers: HeaderMap,
) -> Result<impl IntoResponse, AppError> {
    let events_with_organizers = sqlx::query_as::<_, EventWithOrganizerRow>(
        r#"
        SELECT 
            e.id, e.title_de, e.title_en, e.description_de, e.description_en,
            e.start_date_time, e.end_date_time, e.event_url, e.location,
            o.location as organizer_location
        FROM events e
        JOIN organizers o ON e.organizer_id = o.id
        WHERE e.publish_in_ical = true
        ORDER BY e.start_date_time ASC
        "#,
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

    let response = Response::builder()
        .status(StatusCode::OK)
        .header("Content-Type", "text/calendar; charset=utf-8")
        .header(
            "Content-Disposition",
            "attachment; filename=\"campus-life-events.ics\"",
        )
        .header("Cache-Control", "public, max-age=3600") // Cache for 1 hour
        .body(ical_content)
        .map_err(|_| AppError::internal("Failed to build response"))?;

    Ok(response)
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
    // First, verify the organizer exists
    let organizer = sqlx::query_as::<_, Organizer>(
        r#"
        SELECT id, name, description_de, description_en, website_url, instagram_url, location, created_at, updated_at
        FROM organizers
        WHERE id = $1
        "#
    )
    .bind(organizer_id)
    .fetch_optional(&state.db)
    .await?;

    let Some(organizer) = organizer else {
        return Err(AppError::not_found("Organizer not found"));
    };

    let events_with_organizers = sqlx::query_as::<_, EventWithOrganizerRow>(
        r#"
        SELECT 
            e.id, e.title_de, e.title_en, e.description_de, e.description_en,
            e.start_date_time, e.end_date_time, e.event_url, e.location,
            o.location as organizer_location
        FROM events e
        JOIN organizers o ON e.organizer_id = o.id
        WHERE e.organizer_id = $1 AND e.publish_app = true
        ORDER BY e.start_date_time ASC
        "#,
    )
    .bind(organizer_id)
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

    let response = Response::builder()
        .status(StatusCode::OK)
        .header("Content-Type", "text/calendar; charset=utf-8")
        .header(
            "Content-Disposition",
            &format!(
                "attachment; filename=\"{}-events.ics\"",
                organizer.name.to_lowercase().replace(' ', "-")
            ),
        )
        .header("Cache-Control", "public, max-age=3600") // Cache for 1 hour
        .body(ical_content)
        .map_err(|_| AppError::internal("Failed to build response"))?;

    Ok(response)
}

pub(crate) fn router() -> Router<AppState> {
    Router::new()
        .route("/", get(get_all_events_ical))
        .route("/{organizer_id}", get(get_organizer_events_ical))
}
