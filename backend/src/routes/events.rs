use axum::{
    Json, Router,
    extract::{Path, Query, State},
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
    routing::get,
};
use chrono::Utc;
use serde_json::Value;
use sqlx::{Postgres, QueryBuilder, Transaction};
use tracing::instrument;

use crate::{
    app_state::AppState,
    dto::{CreateEventRequest, ListEventsQuery, UpdateEventRequest},
    error::AppError,
    models::{AuditType, Event},
};

use super::shared::current_user_from_headers;

#[utoipa::path(
    get,
    path = "/api/v1/events",
    tag = "Events",
    params(ListEventsQuery),
    responses((status = 200, description = "List events", body = [Event]))
)]
#[instrument(skip(state, query_params, headers))]
pub(crate) async fn list_events(
    State(state): State<AppState>,
    Query(query_params): Query<ListEventsQuery>,
    headers: HeaderMap,
) -> Result<Json<Vec<Event>>, AppError> {
    // Check if user is authenticated
    let is_authenticated = current_user_from_headers(&headers, &state).await.is_ok();

    let mut builder = QueryBuilder::<Postgres>::new(
        "SELECT id, organizer_id, title_de, title_en, description_de, description_en, start_date_time, end_date_time, event_url, location, publish_app, publish_newsletter, publish_in_ical, publish_web, created_at, updated_at FROM events",
    );

    let mut has_where = false;

    // If not authenticated, only show events that are published in the app
    if !is_authenticated {
        builder.push(" WHERE publish_app = true");
        has_where = true;
    }

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
    responses((status = 200, description = "Event details", body = Event))
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

    if event.publish_app || event.publish_web {
        return Ok(Json(event));
    }

    let user = current_user_from_headers(&headers, &state).await.ok();
    if let Some(user) = user
        && (user.is_admin() || user.organizer_id() == Some(event.organizer_id))
    {
        return Ok(Json(event));
    }

    Err(AppError::not_found("event not found"))
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
        .route(
            "/{id}",
            get(get_event).put(update_event).delete(delete_event),
        )
}
