use axum::{
    Json, Router,
    extract::{Query, State},
    http::HeaderMap,
    routing::get,
};
use tracing::instrument;

use crate::{
    app_state::AppState,
    dto::ListMyEventsQuery,
    error::AppError,
    models::{AccountType, Event},
};

use super::{
    events::list_events_for_organizer,
    shared::{AuthedUser, api_token_user_from_headers},
};

fn require_organizer_account(user: &AuthedUser) -> Result<i64, AppError> {
    if !matches!(user.account_type, AccountType::Organizer) {
        return Err(AppError::unauthorized("organizer account required"));
    }

    user.organizer_id()
        .ok_or_else(|| AppError::unauthorized("organizer account required"))
}

#[utoipa::path(
    get,
    path = "/api/v1/my-events",
    tag = "Events",
    params(
        ListMyEventsQuery,
        ("Authorization" = String, Header, description = "Bearer API token"),
    ),
    responses(
        (status = 200, description = "Events for the authenticated organizer club", body = [Event]),
        (status = 401, description = "Missing or invalid API token"),
    )
)]
#[instrument(skip(state, headers))]
pub(crate) async fn list_my_events(
    State(state): State<AppState>,
    Query(query): Query<ListMyEventsQuery>,
    headers: HeaderMap,
) -> Result<Json<Vec<Event>>, AppError> {
    let user = api_token_user_from_headers(&headers, &state).await?;
    let organizer_id = require_organizer_account(&user)?;

    let events = list_events_for_organizer(
        &state,
        organizer_id,
        query.upcoming_only,
        query.limit,
        query.offset,
    )
    .await?;

    Ok(Json(events))
}

pub(crate) fn router() -> Router<AppState> {
    Router::new().route("/", get(list_my_events))
}
