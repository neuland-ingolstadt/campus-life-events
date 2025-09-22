use axum::{
    Json, Router,
    extract::{Path, Query, State},
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
    routing::get,
};
use chrono::{DateTime, Datelike, Duration, NaiveDate, NaiveTime, TimeZone, Timelike, Utc};
use chrono_tz::Europe::Berlin;
use serde_json::Value;
use sqlx::{Postgres, QueryBuilder, Transaction};
use tracing::instrument;

use crate::{
    app_state::AppState,
    dto::{CreateEventRequest, ListEventsQuery, UpdateEventRequest},
    error::AppError,
    models::{AuditType, Event, EventWithOrganizer, Organizer},
    responses::{ErrorResponse, NewsletterDataResponse, NewsletterTemplateResponse},
};

use super::shared::{AuthedUser, current_user_from_headers};

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

    Ok(StatusCode::NO_CONTENT)
}

#[utoipa::path(
    get,
    path = "/api/v1/events/newsletter-template",
    tag = "Events",
    responses(
        (
            status = 200,
            description = "Generate official newsletter template for upcoming weeks",
            body = NewsletterTemplateResponse
        )
    )
)]
#[instrument(skip(state, headers))]
pub(crate) async fn get_newsletter_template(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<NewsletterTemplateResponse>, AppError> {
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
    let all_organizers: Vec<Organizer> = sqlx::query_as!(
        Organizer,
        "SELECT id, name, description_de, description_en, website_url, instagram_url, location, newsletter, created_at, updated_at FROM organizers ORDER BY name"
    )
    .fetch_all(&state.db)
    .await?;

    let html_body = build_newsletter_html(
        &next_week_events,
        &following_week_events,
        &all_organizers,
        next_week_start,
        week_after_start,
    );
    Ok(Json(NewsletterTemplateResponse { subject, html_body }))
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
        "SELECT id, name, description_de, description_en, website_url, instagram_url, location, newsletter, created_at, updated_at FROM organizers ORDER BY name"
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

fn build_newsletter_html(
    next_week_events: &[EventWithOrganizer],
    following_week_events: &[EventWithOrganizer],
    all_organizers: &[Organizer],
    next_week_start: DateTime<Utc>,
    week_after_start: DateTime<Utc>,
) -> String {
    let mut html = String::new();

    // Start HTML document with proper styling
    html.push_str(r#"<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>THI Campus Life Newsletter</title>
    <style>
        body { 
            font-family: Arial, Helvetica, sans-serif; 
            color: #1a1a1a; 
            line-height: 1.6; 
            margin: 0; 
            padding: 0; 
            background-color: #f5f5f5;
        }
        .container { 
            max-width: 800px; 
            margin: 0 auto; 
            background-color: #ffffff; 
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
        }
        .header { 
            background: linear-gradient(135deg, #215b9c 0%, #215b9c 100%); 
            color: white; 
            padding: 40px 30px; 
            text-align: center; 
            position: relative;
            overflow: hidden;
        }
        .header::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="25" cy="25" r="1" fill="white" opacity="0.1"/><circle cx="75" cy="75" r="1" fill="white" opacity="0.1"/><circle cx="50" cy="10" r="0.5" fill="white" opacity="0.1"/><circle cx="10" cy="60" r="0.5" fill="white" opacity="0.1"/><circle cx="90" cy="40" r="0.5" fill="white" opacity="0.1"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>') repeat;
            opacity: 0.3;
        }
        .header-content { position: relative; z-index: 1; }
        .logo { 
            font-size: 32px; 
            font-weight: bold; 
            margin-bottom: 10px; 
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .subtitle { 
            font-size: 18px; 
            opacity: 0.9; 
            margin-bottom: 20px;
        }
        .week-info { 
            background: rgba(255,255,255,0.2); 
            padding: 15px; 
            border-radius: 10px; 
            display: inline-block;
            backdrop-filter: blur(10px);
        }
        .content { padding: 30px; }
        .intro { 
            background: #f8fafc; 
            padding: 20px; 
            border-radius: 8px; 
            margin-bottom: 30px; 
            border-left: 4px solid #215b9c;
        }
        .section-title { 
            font-size: 24px; 
            color: #215b9c; 
            margin: 30px 0 20px 0; 
            padding-bottom: 10px; 
            border-bottom: 2px solid #e5e7eb;
        }
        .event { 
            background: #ffffff; 
            border: 1px solid #e5e7eb; 
            border-radius: 12px; 
            padding: 25px; 
            margin-bottom: 20px; 
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }
        .event-title { 
            font-size: 20px; 
            font-weight: bold; 
            color: #215b9c; 
            margin-bottom: 15px; 
            line-height: 1.3;
        }
        .event-meta { 
            display: flex; 
            flex-wrap: wrap; 
            gap: 15px; 
            margin-bottom: 15px; 
            font-size: 14px;
        }
        .meta-item { 
            display: flex; 
            align-items: center; 
            gap: 5px; 
            color: #6b7280;
        }
        .meta-icon { 
            width: 16px; 
            height: 16px; 
            fill: currentColor;
        }
        .event-description { 
            color: #374151; 
            line-height: 1.6; 
            margin-top: 15px;
        }
        .event-link { 
            display: inline-block; 
            background: #215b9c; 
            color: white; 
            padding: 8px 16px; 
            text-decoration: none; 
            border-radius: 6px; 
            font-size: 14px; 
            margin-top: 15px;
        }
        .organizer { 
            background: #f3f4f6; 
            padding: 8px 12px; 
            border-radius: 20px; 
            font-size: 12px; 
            color: #6b7280; 
            display: inline-block; 
            margin-top: 15px;
            text-decoration: none;
            border: 1px solid #e5e7eb;
        }
        .organizer:hover { 
            background: #e5e7eb; 
            color: #374151;
        }
        .quick-list { 
            background: #f8fafc; 
            border-radius: 8px; 
            padding: 20px; 
            margin-top: 20px;
        }
        .quick-list ul { 
            margin: 0; 
            padding-left: 20px; 
            list-style: none;
        }
        .quick-list li { 
            margin-bottom: 8px; 
            position: relative;
        }
        .quick-list li::before { 
            content: "•"; 
            color: #215b9c; 
            font-weight: bold; 
            position: absolute; 
            left: -15px;
        }
        .footer { 
            background: #1f2937; 
            color: #d1d5db; 
            padding: 30px; 
            text-align: center; 
            font-size: 14px;
        }
        .footer a { color: #60a5fa; text-decoration: none; }
        .footer a:hover { text-decoration: underline; }
        .unsubscribe { 
            margin-top: 20px; 
            padding-top: 20px; 
            border-top: 1px solid #374151; 
            font-size: 12px;
        }
        .no-events { 
            text-align: center; 
            color: #6b7280; 
            font-style: italic; 
            padding: 40px 20px;
        }
        @media (max-width: 600px) {
            .container { margin: 0; }
            .header { padding: 30px 20px; }
            .content { padding: 20px; }
            .event-meta { flex-direction: column; gap: 8px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="header-content">
                <div class="logo">
                    <img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IndoaXRlIiBmaWxsLW9wYWNpdHk9IjAuOSIvPgo8dGV4dCB4PSIyMCIgeT0iMjYiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZm9udC13ZWlnaHQ9ImJvbGQiIGZpbGw9IiMxZTNhOGEiIHRleHQtYW5jaG9yPSJtaWRkbGUiPkM8L3RleHQ+Cjwvc3ZnPgo=" alt="Campus Life" style="width: 40px; height: 40px; margin-right: 15px; vertical-align: middle;">
                    Campus Life
                </div>
                <div class="subtitle">Wochennewsletter</div>
                <div class="subtitle">Aktuelle studentische Veranstaltungen</div>
                <div class="week-info">
                    <strong>Kalenderwoche "#);

    let next_local = next_week_start.with_timezone(&Berlin);
    let next_iso = next_local.iso_week();
    let next_range = format_date_range(
        next_local.date_naive(),
        (week_after_start - Duration::days(1))
            .with_timezone(&Berlin)
            .date_naive(),
    );

    html.push_str(&format!("{} ({})", next_iso.week(), next_range));
    html.push_str(r#"</strong>
                </div>
            </div>
        </div>
        
        <div class="content">
            <div class="intro">
                <p><strong>Der offizielle Newsletter für die Studierenden der Technischen Hochschule Ingolstadt.</strong></p>
                <p>Hier findest du alle wichtigen Veranstaltungen und Events der kommenden Woche. Alle Events wurden von den Vereinen und Hochschulgruppen für die Veröffentlichung freigegeben.</p>
            </div>
            
            <h2 class="section-title">Upcoming Events:</h2>"#);

    if next_week_events.is_empty() {
        html.push_str(
            r#"<div class="no-events">
                <p>Für die kommende Woche sind derzeit keine Veranstaltungen geplant.</p>
                <p>Schau gerne in der App oder auf der Website vorbei, um alle Events zu sehen!</p>
            </div>"#,
        );
    } else {
        for event in next_week_events {
            let title = if !event.title_de.trim().is_empty() {
                &event.title_de
            } else {
                &event.title_en
            };
            let title = escape_html(title);

            let start_local = event.start_date_time.with_timezone(&Berlin);
            let start_date = format_date(start_local.date_naive());
            let start_time = format_time(start_local.time());
            let mut when = format!("{start_date} {start_time}Uhr");

            if let Some(end_date_time) = event.end_date_time {
                let end_local = end_date_time.with_timezone(&Berlin);
                let end_time = format_time(end_local.time());
                if end_local.date_naive() == start_local.date_naive() {
                    when.push_str(&format!(" bis {end_time}Uhr"));
                } else {
                    let end_date = format_date(end_local.date_naive());
                    when.push_str(&format!(" bis {end_date} {end_time}Uhr"));
                }
            }

            html.push_str("<div class=\"event\">");
            html.push_str(&format!("<div class=\"event-title\">{title}</div>"));

            html.push_str("<div class=\"event-meta\">");
            html.push_str(&format!("<div class=\"meta-item\"><svg class=\"meta-icon\" viewBox=\"0 0 24 24\"><path d=\"M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z\"/></svg>{}</div>", escape_html(&when)));

            if let Some(location) = &event.location {
                if !location.trim().is_empty() {
                    html.push_str(&format!("<div class=\"meta-item\"><svg class=\"meta-icon\" viewBox=\"0 0 24 24\"><path d=\"M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z\"/><path d=\"M15 11a3 3 0 11-6 0 3 3 0 016 0z\"/></svg>{}</div>", escape_html(location)));
                }
            }
            html.push_str("</div>");

            if let Some(description_de) = &event.description_de {
                if !description_de.trim().is_empty() {
                    let formatted_description = escape_with_line_breaks(description_de);
                    html.push_str(&format!(
                        "<div class=\"event-description\">{formatted_description}</div>"
                    ));
                } else if let Some(description_en) = &event.description_en {
                    if !description_en.trim().is_empty() {
                        let formatted_description = escape_with_line_breaks(description_en);
                        html.push_str(&format!(
                            "<div class=\"event-description\">{formatted_description}</div>"
                        ));
                    }
                }
            }

            if let Some(url) = &event.event_url {
                if !url.trim().is_empty() {
                    let safe_url = escape_html(url);
                    html.push_str(&format!(
                        "<a href=\"{safe_url}\" class=\"event-link\">Weitere Informationen</a>"
                    ));
                }
            }

            html.push_str(&format!(
                "<div class=\"organizer\">{}</div>",
                escape_html(&event.organizer_name)
            ));
            html.push_str("</div>");
        }
    }

    let following_local = week_after_start.with_timezone(&Berlin);
    let following_iso = following_local.iso_week();
    let following_range = format_date_range(
        following_local.date_naive(),
        (week_after_start + Duration::days(6))
            .with_timezone(&Berlin)
            .date_naive(),
    );

    html.push_str(&format!(
        r#"<h2 class="section-title">Ausblick Kalenderwoche {} ({})</h2>"#,
        following_iso.week(),
        following_range
    ));

    if following_week_events.is_empty() {
        html.push_str(
            r#"<div class="no-events">
                <p>Für die darauffolgende Woche sind derzeit keine Veranstaltungen geplant.</p>
            </div>"#,
        );
    } else {
        html.push_str(
            r#"<div class="quick-list">
                <p><strong>Kurzüberblick über die bisher gemeldeten Termine:</strong></p>
                <ul>"#,
        );

        for event in following_week_events {
            let title = if !event.title_de.trim().is_empty() {
                &event.title_de
            } else {
                &event.title_en
            };
            let title = escape_html(title);

            let start_local = event.start_date_time.with_timezone(&Berlin);
            let date_str = format_date(start_local.date_naive());
            let time_str = format_time(start_local.time());
            html.push_str("<li>");
            html.push_str(&format!("{date_str}, {time_str} Uhr – {title}"));

            if let Some(location) = &event.location {
                if !location.trim().is_empty() {
                    html.push_str(&format!(" ({})", escape_html(location)));
                }
            }

            if let Some(url) = &event.event_url {
                if !url.trim().is_empty() {
                    let safe_url = escape_html(url);
                    html.push_str(&format!(
                        " – <a href=\"{safe_url}\" style=\"color:#3b82f6;\">Details</a>"
                    ));
                }
            }
            html.push_str("</li>");
        }
        html.push_str("</ul></div>");
    }

    html.push_str(r#"
            <div style="margin-top: 40px; padding: 20px; background: #f8fafc; border-radius: 8px; border-left: 4px solid #10b981;">
                <h3 style="margin: 0 0 10px 0; color: #065f46;">Campus Life News</h3>
                <p style="margin: 0; color: #374151;">Mehr Informationen zu den Events findest du in der Campus Life App oder auf unserer Website.</p>
            </div>
        </div>
        
        <div class="footer">
            <p><strong>Technische Hochschule Ingolstadt | Newsletter der Vereine | Campus Life</strong></p>
            <p>Die teilnehmenden Vereine und Hochschulgruppen:<br/>"#);

    // Add actual organizer names
    let organizer_names: Vec<String> = all_organizers
        .iter()
        .map(|org| escape_html(&org.name))
        .collect();
    html.push_str(&organizer_names.join(" • "));

    html.push_str(r#"</p>
            
            <p>Bei Rückfragen wenden Sie sich bitte an <a href="mailto:campus-life@thi.de">campus-life@thi.de</a><br/>
            Kommunikation studentischer Vereine: Campus Life/StudVer e-mail</p>
            
            <div class="unsubscribe">
                <p><strong>Den Campus Life Newsletter nicht mehr empfangen?</strong><br/>
                Melden Sie sich unter <a href="https://sympa.thi.de/">https://sympa.thi.de/</a> an (THI-Login rechts oben).<br/>
                Dann auf Meine Listen (links) → students-campuslife → Abbestellen (links) → Bestätigen.</p>
                
                <p><strong>No longer receiving the Campus Life Newsletter?</strong><br/>
                Log in at <a href="https://sympa.thi.de/">https://sympa.thi.de/</a> (THI login at the top right).<br/>
                Then go to My lists (left) → students-campuslife → Unsubscribe (left) → Confirm.</p>
            </div>
        </div>
    </div>
</body>
</html>"#);

    html
}

fn format_date_range(start: NaiveDate, end: NaiveDate) -> String {
    format!(
        "{:02}.{:02}.{} – {:02}.{:02}.{}",
        start.day(),
        start.month(),
        start.year(),
        end.day(),
        end.month(),
        end.year()
    )
}

fn format_date(date: NaiveDate) -> String {
    format!("{:02}.{:02}.{}", date.day(), date.month(), date.year())
}

fn format_time(time: NaiveTime) -> String {
    format!("{:02}:{:02}", time.hour(), time.minute())
}

fn escape_html(input: &str) -> String {
    let mut escaped = String::with_capacity(input.len());
    for c in input.chars() {
        match c {
            '&' => escaped.push_str("&amp;"),
            '<' => escaped.push_str("&lt;"),
            '>' => escaped.push_str("&gt;"),
            '"' => escaped.push_str("&quot;"),
            '\'' => escaped.push_str("&#39;"),
            _ => escaped.push(c),
        }
    }
    escaped
}

fn escape_with_line_breaks(input: &str) -> String {
    let mut parts = Vec::new();
    for line in input.split('\n') {
        let cleaned = line.trim_end_matches('\r');
        parts.push(escape_html(cleaned));
    }
    parts.join("<br/>")
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

pub(crate) fn router() -> Router<AppState> {
    Router::new()
        .route("/", get(list_events).post(create_event))
        .route("/newsletter-template", get(get_newsletter_template))
        .route("/newsletter-data", get(get_newsletter_data))
        .route(
            "/{id}",
            get(get_event).put(update_event).delete(delete_event),
        )
}
