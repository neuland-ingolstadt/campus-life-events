use axum::{
    Json, Router,
    extract::{Path, Query, State},
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
    routing::get,
};
use chrono::{DateTime, Datelike, Duration, NaiveDate, TimeZone, Utc};
use chrono_tz::Europe::Berlin;
use serde_json::Value;
use sqlx::{Postgres, QueryBuilder, Transaction};
use tracing::{instrument, warn};

use crate::{
    app_state::AppState,
    dto::{CreateEventRequest, ListEventsQuery, UpdateEventRequest},
    error::AppError,
    models::{AuditType, Event, EventWithOrganizer, Organizer},
    responses::{ErrorResponse, NewsletterDataResponse},
};

use super::shared::{AuthedUser, current_user_from_headers, refresh_organizer_activity_stats};

#[utoipa::path(
    get,
    path = "/api/v1/events",
    tag = "Events",
    params(ListEventsQuery),
    responses((status = 200, description = "List events", body = [Event]), (status = 401, description = "Unauthorized", body = ErrorResponse))
)]
#[instrument(skip(state, query_params, headers))]
pub(crate) async fn list_events(
    State(state): State<AppState>,
    Query(query_params): Query<ListEventsQuery>,
    headers: HeaderMap,
) -> Result<Json<Vec<Event>>, AppError> {
    // Require authentication for this endpoint
    let _user = current_user_from_headers(&headers, &state).await?;

    let mut builder = QueryBuilder::<Postgres>::new(
        "SELECT id, organizer_id, title_de, title_en, description_de, description_en, start_date_time, end_date_time, event_url, location, publish_app, publish_newsletter, publish_in_ical, publish_web, created_at, updated_at FROM events",
    );

    let mut has_where = false;

    if let Some(organizer_id) = query_params.organizer_id {
        if has_where {
            builder.push(" AND organizer_id = ").push_bind(organizer_id);
        } else {
            builder
                .push(" WHERE organizer_id = ")
                .push_bind(organizer_id);
            has_where = true;
        }
    }

    if query_params.upcoming_only.unwrap_or(false) {
        if has_where {
            builder
                .push(" AND start_date_time >= ")
                .push_bind(Utc::now());
        } else {
            builder
                .push(" WHERE start_date_time >= ")
                .push_bind(Utc::now());
        }
    }

    builder.push(" ORDER BY start_date_time ASC");

    if let Some(limit) = query_params.limit {
        builder.push(" LIMIT ").push_bind(limit.max(1));
    }
    if let Some(offset) = query_params.offset {
        builder.push(" OFFSET ").push_bind(offset.max(0));
    }

    let events = builder
        .build_query_as::<Event>()
        .fetch_all(&state.db)
        .await?;

    Ok(Json(events))
}

#[utoipa::path(
    post,
    path = "/api/v1/events",
    tag = "Events",
    request_body = CreateEventRequest,
    responses((status = 201, description = "Event created", body = Event))
)]
#[instrument(skip(state, payload))]
pub(crate) async fn create_event(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(payload): Json<CreateEventRequest>,
) -> Result<impl IntoResponse, AppError> {
    let user = current_user_from_headers(&headers, &state).await?;
    let organizer_id = user
        .organizer_id()
        .ok_or_else(|| AppError::unauthorized("organizer account required"))?;
    let CreateEventRequest {
        title_de,
        title_en,
        description_de,
        description_en,
        start_date_time,
        end_date_time,
        event_url,
        location,
        publish_app,
        publish_newsletter,
        publish_in_ical,
        publish_web,
    } = payload;

    if end_date_time < start_date_time {
        return Err(AppError::validation(
            "end date time must not be before start date time",
        ));
    }

    let mut transaction = state.db.begin().await?;

    let event = sqlx::query_as!(
        Event,
        r#"
        INSERT INTO events (organizer_id, title_de, title_en, description_de, description_en, start_date_time, end_date_time, event_url, location, publish_app, publish_newsletter, publish_in_ical, publish_web)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING id, organizer_id, title_de, title_en, description_de, description_en, start_date_time, end_date_time, event_url, location, publish_app, publish_newsletter, publish_in_ical, publish_web, created_at, updated_at
        "#,
        organizer_id,
        title_de,
        title_en,
        description_de,
        description_en,
        start_date_time,
        end_date_time,
        event_url,
        location,
        publish_app,
        publish_newsletter,
        publish_in_ical,
        publish_web
    )
    .fetch_one(&mut *transaction)
    .await?;

    record_audit(
        &mut transaction,
        event.id,
        event.organizer_id,
        user.account_id,
        AuditType::Create,
        None,
        Some(&event),
    )
    .await?;

    transaction.commit().await?;

    invalidate_public_event_caches(&state).await;

    Ok((StatusCode::CREATED, Json(event)))
}

#[utoipa::path(
    get,
    path = "/api/v1/events/{id}",
    tag = "Events",
    params(("id" = i64, Path, description = "Event identifier")),
    responses((status = 200, description = "Event details", body = Event), (status = 401, description = "Unauthorized", body = ErrorResponse))
)]
#[instrument(skip(state, headers))]
pub(crate) async fn get_event(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<i64>,
) -> Result<Json<Event>, AppError> {
    let event = sqlx::query_as!(
        Event,
        r#"
        SELECT id, organizer_id, title_de, title_en, description_de, description_en, start_date_time, end_date_time, event_url, location, publish_app, publish_newsletter, publish_in_ical, publish_web, created_at, updated_at
        FROM events
        WHERE id = $1
        "#,
        id
    )
    .fetch_optional(&state.db)
    .await?;

    let Some(event) = event else {
        return Err(AppError::not_found("event not found"));
    };

    // Require authentication for this endpoint
    let user = current_user_from_headers(&headers, &state).await?;

    // Only allow admins or the event's organizer to access the event
    if user.is_admin() || user.organizer_id() == Some(event.organizer_id) {
        Ok(Json(event))
    } else {
        Err(AppError::not_found("event not found"))
    }
}

#[utoipa::path(
    put,
    path = "/api/v1/events/{id}",
    tag = "Events",
    params(("id" = i64, Path, description = "Event identifier")),
    request_body = UpdateEventRequest,
    responses((status = 200, description = "Event updated", body = Event))
)]
#[instrument(skip(state, headers, payload))]
pub(crate) async fn update_event(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<i64>,
    Json(payload): Json<UpdateEventRequest>,
) -> Result<Json<Event>, AppError> {
    let user = current_user_from_headers(&headers, &state).await?;

    // Allow admins to edit any event, organizers can only edit their own events
    let organizer_id = if user.is_admin() {
        None // Admin can edit any event, so we don't need to check organizer_id
    } else {
        Some(
            user.organizer_id()
                .ok_or_else(|| AppError::unauthorized("organizer account required"))?,
        )
    };

    let has_updates = payload.has_updates();
    let UpdateEventRequest {
        title_de,
        title_en,
        description_de,
        description_en,
        start_date_time,
        end_date_time,
        event_url,
        location,
        publish_app,
        publish_newsletter,
        publish_in_ical,
        publish_web,
    } = payload;

    if !has_updates {
        return Err(AppError::validation("No fields supplied for update"));
    }

    let mut transaction = state.db.begin().await?;

    let existing_event = sqlx::query_as!(
        Event,
        r#"
        SELECT id, organizer_id, title_de, title_en, description_de, description_en, start_date_time, end_date_time, event_url, location, publish_app, publish_newsletter, publish_in_ical, publish_web, created_at, updated_at
        FROM events
        WHERE id = $1
        "#,
        id
    )
    .fetch_one(&mut *transaction)
    .await?;

    // Only check ownership if the user is not an admin
    if let Some(organizer_id) = organizer_id
        && existing_event.organizer_id != organizer_id
    {
        return Err(AppError::unauthorized(
            "cannot update another organizer's event",
        ));
    }

    let effective_start = start_date_time.unwrap_or(existing_event.start_date_time);
    let effective_end = end_date_time.unwrap_or(existing_event.end_date_time);

    if effective_end < effective_start {
        return Err(AppError::validation(
            "end date time must not be before start date time",
        ));
    }

    // Build assignments defensively to avoid any stray commas
    let mut builder = QueryBuilder::<Postgres>::new("UPDATE events SET updated_at = NOW()");
    if let Some(title_de) = title_de {
        builder.push(", title_de = ").push_bind(title_de);
    }
    if let Some(title_en) = title_en {
        builder.push(", title_en = ").push_bind(title_en);
    }
    if let Some(description_de) = description_de {
        builder
            .push(", description_de = ")
            .push_bind(description_de);
    }
    if let Some(description_en) = description_en {
        builder
            .push(", description_en = ")
            .push_bind(description_en);
    }
    if let Some(start_date_time) = start_date_time {
        builder
            .push(", start_date_time = ")
            .push_bind(start_date_time);
    }
    if let Some(end_date_time) = end_date_time {
        builder.push(", end_date_time = ").push_bind(end_date_time);
    }
    if let Some(event_url) = event_url {
        builder.push(", event_url = ").push_bind(event_url);
    }
    if let Some(location) = location {
        builder.push(", location = ").push_bind(location);
    }
    if let Some(publish_app) = publish_app {
        builder.push(", publish_app = ").push_bind(publish_app);
    }
    if let Some(publish_newsletter) = publish_newsletter {
        builder
            .push(", publish_newsletter = ")
            .push_bind(publish_newsletter);
    }
    if let Some(publish_in_ical) = publish_in_ical {
        builder
            .push(", publish_in_ical = ")
            .push_bind(publish_in_ical);
    }
    if let Some(publish_web) = publish_web {
        builder.push(", publish_web = ").push_bind(publish_web);
    }

    builder.push(" WHERE id = ").push_bind(id);
    builder.push(" RETURNING id, organizer_id, title_de, title_en, description_de, description_en, start_date_time, end_date_time, event_url, location, publish_app, publish_newsletter, publish_in_ical, publish_web, created_at, updated_at");

    let updated_event = builder
        .build_query_as::<Event>()
        .fetch_one(&mut *transaction)
        .await?;

    record_audit(
        &mut transaction,
        updated_event.id,
        updated_event.organizer_id,
        user.account_id,
        AuditType::Update,
        Some(&existing_event),
        Some(&updated_event),
    )
    .await?;

    transaction.commit().await?;

    invalidate_public_event_caches(&state).await;

    Ok(Json(updated_event))
}

#[utoipa::path(
    delete,
    path = "/api/v1/events/{id}",
    tag = "Events",
    params(("id" = i64, Path, description = "Event identifier")),
    responses((status = 204, description = "Event removed"))
)]
#[instrument(skip(state))]
pub(crate) async fn delete_event(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<i64>,
) -> Result<StatusCode, AppError> {
    let user = current_user_from_headers(&headers, &state).await?;

    // Allow admins to delete any event, organizers can only delete their own events
    let organizer_id = if user.is_admin() {
        None // Admin can delete any event, so we don't need to check organizer_id
    } else {
        Some(
            user.organizer_id()
                .ok_or_else(|| AppError::unauthorized("organizer account required"))?,
        )
    };
    let mut transaction = state.db.begin().await?;

    let existing_event = sqlx::query_as!(
        Event,
        r#"
        SELECT id, organizer_id, title_de, title_en, description_de, description_en, start_date_time, end_date_time, event_url, location, publish_app, publish_newsletter, publish_in_ical, publish_web, created_at, updated_at
        FROM events
        WHERE id = $1
        "#,
        id
    )
    .fetch_optional(&mut *transaction)
    .await?;

    let Some(existing_event) = existing_event else {
        return Err(AppError::not_found("Event not found"));
    };

    // Only check ownership if the user is not an admin
    if let Some(organizer_id) = organizer_id
        && existing_event.organizer_id != organizer_id
    {
        return Err(AppError::unauthorized(
            "cannot delete another organizer's event",
        ));
    }

    sqlx::query!("DELETE FROM events WHERE id = $1", id)
        .execute(&mut *transaction)
        .await?;

    record_audit(
        &mut transaction,
        existing_event.id,
        existing_event.organizer_id,
        user.account_id,
        AuditType::Delete,
        Some(&existing_event),
        None,
    )
    .await?;

    transaction.commit().await?;

    invalidate_public_event_caches(&state).await;

    Ok(StatusCode::NO_CONTENT)
}

#[utoipa::path(
    get,
    path = "/api/v1/events/newsletter-data",
    tag = "Events",
    responses(
        (status = 200, description = "Get newsletter data", body = NewsletterDataResponse),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse)
    )
)]
#[instrument(skip(state, headers))]
pub(crate) async fn get_newsletter_data(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<NewsletterDataResponse>, AppError> {
    let user = current_user_from_headers(&headers, &state).await?;
    ensure_newsletter_access(&user, &state).await?;

    let now = Utc::now();
    let (next_week_start, week_after_start, week_after_end) = compute_newsletter_ranges(now);

    let events = sqlx::query_as!(
        EventWithOrganizer,
        r#"
        SELECT e.id, e.organizer_id, e.title_de, e.title_en, e.description_de, e.description_en, 
               e.start_date_time, e.end_date_time, e.event_url, e.location, e.publish_app, 
               e.publish_newsletter, e.publish_in_ical, e.publish_web, e.created_at, e.updated_at,
               o.name as organizer_name, o.website_url as organizer_website
        FROM events e
        JOIN organizers o ON e.organizer_id = o.id
        WHERE e.publish_newsletter = true
        AND e.start_date_time >= $1
        AND e.start_date_time < $2
        ORDER BY e.start_date_time ASC
        "#,
        next_week_start,
        week_after_end
    )
    .fetch_all(&state.db)
    .await?;

    let (next_week_events, following_week_events): (Vec<_>, Vec<_>) = events
        .into_iter()
        .partition(|event| event.start_date_time < week_after_start);

    let subject = build_newsletter_subject(next_week_start);

    // Get all organizers for the footer
    let all_organizers = sqlx::query_as!(
        Organizer,
        "SELECT id, name, description_de, description_en, website_url, instagram_url, location, linkedin_url, registration_number, non_profit, newsletter, created_at, updated_at FROM organizers ORDER BY name"
    )
    .fetch_all(&state.db)
    .await?;

    Ok(Json(NewsletterDataResponse {
        subject,
        next_week_events,
        following_week_events,
        all_organizers,
        next_week_start,
        week_after_start,
    }))
}

async fn ensure_newsletter_access(user: &AuthedUser, state: &AppState) -> Result<(), AppError> {
    if user.is_admin() {
        return Ok(());
    }

    let Some(organizer_id) = user.organizer_id() else {
        return Err(AppError::unauthorized("organizer account required"));
    };

    let row = sqlx::query!(
        r#"SELECT newsletter FROM organizers WHERE id = $1"#,
        organizer_id
    )
    .fetch_optional(&state.db)
    .await?;

    let Some(row) = row else {
        return Err(AppError::unauthorized("organizer account required"));
    };

    if !row.newsletter {
        return Err(AppError::unauthorized("newsletter permission required"));
    }

    Ok(())
}

fn compute_newsletter_ranges(now: DateTime<Utc>) -> (DateTime<Utc>, DateTime<Utc>, DateTime<Utc>) {
    let berlin_now = now.with_timezone(&Berlin);
    let weekday_offset = berlin_now.weekday().num_days_from_monday() as i64;
    let current_week_monday = berlin_now.date_naive() - Duration::days(weekday_offset);
    let next_week_monday = current_week_monday + Duration::days(7);
    let following_week_monday = next_week_monday + Duration::days(7);
    let next_week_start = start_of_day_utc(next_week_monday);
    let week_after_start = start_of_day_utc(following_week_monday);
    let week_after_end = week_after_start + Duration::days(7);
    (next_week_start, week_after_start, week_after_end)
}

fn start_of_day_utc(date: NaiveDate) -> DateTime<Utc> {
    Berlin
        .from_local_datetime(&date.and_hms_opt(0, 0, 0).expect("valid midnight"))
        .earliest()
        .expect("midnight should exist")
        .with_timezone(&Utc)
}

fn build_newsletter_subject(next_week_start: DateTime<Utc>) -> String {
    let local_start = next_week_start.with_timezone(&Berlin);
    let iso = local_start.iso_week();
    format!(
        "THI Campus Live Events – Newsletter KW {} {}",
        iso.week(),
        iso.year()
    )
}

async fn record_audit(
    transaction: &mut Transaction<'_, Postgres>,
    event_id: i64,
    organizer_id: i64,
    user_id: i64,
    audit_type: AuditType,
    old_data: Option<&Event>,
    new_data: Option<&Event>,
) -> Result<(), AppError> {
    let old_json: Option<Value> = match old_data {
        Some(data) => Some(serde_json::to_value(data)?),
        None => None,
    };
    let new_json: Option<Value> = match new_data {
        Some(data) => Some(serde_json::to_value(data)?),
        None => None,
    };

    sqlx::query!(
        r#"
        INSERT INTO audit_log (event_id, organizer_id, user_id, type, old_data, new_data)
        VALUES ($1, $2, $3, $4::audit_type, $5, $6)
        "#,
        event_id,
        organizer_id,
        user_id,
        audit_type as AuditType,
        old_json,
        new_json
    )
    .execute(&mut **transaction)
    .await?;

    Ok(())
}

async fn invalidate_public_event_caches(state: &AppState) {
    if let Some(cache) = &state.cache {
        if let Err(err) = cache.purge_prefix("public:events").await {
            warn!(target: "cache", action = "purge", scope = "public_events", %err, "Failed to purge public events cache");
        }
        if let Err(err) = cache.purge_prefix("ical").await {
            warn!(target: "cache", action = "purge", scope = "ical", %err, "Failed to purge iCal cache");
        }
    }
    refresh_organizer_activity_stats(state).await;
}

pub(crate) fn router() -> Router<AppState> {
    Router::new()
        .route("/", get(list_events).post(create_event))
        .route("/newsletter-data", get(get_newsletter_data))
        .route(
            "/{id}",
            get(get_event).put(update_event).delete(delete_event),
        )
}
