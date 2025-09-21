pub(crate) mod admin;
pub(crate) mod audit;
pub(crate) mod auth;
pub(crate) mod events;
pub(crate) mod health;
pub(crate) mod ical;
pub(crate) mod organizers;
pub(crate) mod public_events;
mod shared;

use axum::Router;

use crate::app_state::AppState;

pub fn api_router() -> Router<AppState> {
    Router::new()
        .merge(health::router())
        .nest("/admin", admin::router())
        .nest("/auth", auth::router())
        .nest("/events", events::router())
        .nest("/organizers", organizers::router())
        .nest("/audit-logs", audit::router())
        .nest("/public", public_events::router())
}
