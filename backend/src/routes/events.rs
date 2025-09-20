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
#[instrument(skip(state, query_params))]
pub(crate) async fn list_events(
    State(state): State<AppState>,
    Query(query_params): Query<ListEventsQuery>,
) -> Result<Json<Vec<Event>>, AppError> {
    let mut builder = QueryBuilder::<Postgres>::new(
        "SELECT id, organizer_id, title_de, title_en, description_de, description_en, start_date_time, end_date_time, event_url, location, publish_app, publish_newsletter, publish_in_ical, created_at, updated_at FROM events",
    );

    if query_params.organizer_id.is_some() || query_params.upcoming_only.unwrap_or(false) {
        builder.push(" WHERE ");
    }

    if let Some(organizer_id) = query_params.organizer_id {
        builder.push("organizer_id = ").push_bind(organizer_id);
        if query_params.upcoming_only.unwrap_or(false) {
            builder.push(" AND ");
        }
    }

    if query_params.upcoming_only.unwrap_or(false) {
        builder.push("start_date_time >= ").push_bind(Utc::now());
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
    } = payload;

    let mut transaction = state.db.begin().await?;

    let event = sqlx::query_as::<_, Event>(
        r#"
        INSERT INTO events (organizer_id, title_de, title_en, description_de, description_en, start_date_time, end_date_time, event_url, location, publish_app, publish_newsletter, publish_in_ical)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id, organizer_id, title_de, title_en, description_de, description_en, start_date_time, end_date_time, event_url, location, publish_app, publish_newsletter, publish_in_ical, created_at, updated_at
        "#,
    )
    .bind(user.id)
    .bind(title_de)
    .bind(title_en)
    .bind(description_de)
    .bind(description_en)
    .bind(start_date_time)
    .bind(end_date_time)
    .bind(event_url)
    .bind(location)
    .bind(publish_app)
    .bind(publish_newsletter)
    .bind(publish_in_ical)
    .fetch_one(&mut *transaction)
    .await?;

    record_audit(
        &mut transaction,
        event.id,
        event.organizer_id,
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
#[instrument(skip(state))]
pub(crate) async fn get_event(
    State(state): State<AppState>,
    Path(id): Path<i64>,
) -> Result<Json<Event>, AppError> {
    let event = sqlx::query_as::<_, Event>(
        r#"
        SELECT id, organizer_id, title_de, title_en, description_de, description_en, start_date_time, end_date_time, event_url, location, publish_app, publish_newsletter, publish_in_ical, created_at, updated_at
        FROM events
        WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_one(&state.db)
    .await?;

    Ok(Json(event))
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
    } = payload;

    if !has_updates {
        return Err(AppError::validation("No fields supplied for update"));
    }

    let mut transaction = state.db.begin().await?;

    let existing_event = sqlx::query_as::<_, Event>(
        r#"
        SELECT id, organizer_id, title_de, title_en, description_de, description_en, start_date_time, end_date_time, event_url, location, publish_app, publish_newsletter, publish_in_ical, created_at, updated_at
        FROM events
        WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_one(&mut *transaction)
    .await?;

    if existing_event.organizer_id != user.id {
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

    builder.push(" WHERE id = ").push_bind(id);
    builder.push(" RETURNING id, organizer_id, title_de, title_en, description_de, description_en, start_date_time, end_date_time, event_url, location, publish_app, publish_newsletter, publish_in_ical, created_at, updated_at");

    let updated_event = builder
        .build_query_as::<Event>()
        .fetch_one(&mut *transaction)
        .await?;

    record_audit(
        &mut transaction,
        updated_event.id,
        updated_event.organizer_id,
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
    let mut transaction = state.db.begin().await?;

    let existing_event = sqlx::query_as::<_, Event>(
        r#"
        SELECT id, organizer_id, title_de, title_en, description_de, description_en, start_date_time, end_date_time, event_url, location, publish_app, publish_newsletter, publish_in_ical, created_at, updated_at
        FROM events
        WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&mut *transaction)
    .await?;

    let Some(existing_event) = existing_event else {
        return Err(AppError::not_found("Event not found"));
    };

    if existing_event.organizer_id != user.id {
        return Err(AppError::unauthorized(
            "cannot delete another organizer's event",
        ));
    }

    sqlx::query("DELETE FROM events WHERE id = $1")
        .bind(id)
        .execute(&mut *transaction)
        .await?;

    record_audit(
        &mut transaction,
        existing_event.id,
        existing_event.organizer_id,
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

    sqlx::query(
        r#"
        INSERT INTO audit_log (event_id, organizer_id, type, old_data, new_data)
        VALUES ($1, $2, $3, $4, $5)
        "#,
    )
    .bind(event_id)
    .bind(organizer_id)
    .bind(audit_type)
    .bind(old_json)
    .bind(new_json)
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
