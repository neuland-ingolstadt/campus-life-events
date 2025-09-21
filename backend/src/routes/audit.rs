use axum::{
    Json, Router,
    extract::{Query, State},
    http::HeaderMap,
    routing::get,
};
use sqlx::{Postgres, QueryBuilder};
use tracing::instrument;

use crate::{app_state::AppState, dto::ListAuditLogsQuery, error::AppError, models::AuditLogEntry};

use super::shared::current_user_from_headers;

#[utoipa::path(
    get,
    path = "/api/v1/audit-logs",
    tag = "Audit",
    params(ListAuditLogsQuery),
    responses((status = 200, description = "List audit log entries", body = [AuditLogEntry]))
)]
#[instrument(skip(state, query_params))]
pub(crate) async fn list_audit_logs(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(mut query_params): Query<ListAuditLogsQuery>,
) -> Result<Json<Vec<AuditLogEntry>>, AppError> {
    let user = current_user_from_headers(&headers, &state).await?;
    if !user.is_admin() {
        let organizer_id = user
            .organizer_id()
            .ok_or_else(|| AppError::unauthorized("missing organizer context"))?;
        if let Some(requested) = query_params.organizer_id {
            if requested != organizer_id {
                return Err(AppError::unauthorized(
                    "cannot view other organizers' audit logs",
                ));
            }
        } else {
            query_params.organizer_id = Some(organizer_id);
        }
    }
    let mut builder = QueryBuilder::<Postgres>::new(
        "SELECT id, event_id, organizer_id, user_id, type, at, old_data, new_data FROM audit_log",
    );

    let mut any = false;
    if let Some(event_id) = query_params.event_id {
        builder.push(" WHERE event_id = ").push_bind(event_id);
        any = true;
    }
    if let Some(organizer_id) = query_params.organizer_id {
        if any {
            builder.push(" AND ");
        } else {
            builder.push(" WHERE ");
        }
        builder.push("organizer_id = ").push_bind(organizer_id);
    }

    builder.push(" ORDER BY at DESC");

    if let Some(limit) = query_params.limit {
        builder.push(" LIMIT ").push_bind(limit.max(1));
    }
    if let Some(offset) = query_params.offset {
        builder.push(" OFFSET ").push_bind(offset.max(0));
    }

    let entries = builder
        .build_query_as::<AuditLogEntry>()
        .fetch_all(&state.db)
        .await?;

    Ok(Json(entries))
}

pub(crate) fn router() -> Router<AppState> {
    Router::new().route("/", get(list_audit_logs))
}
