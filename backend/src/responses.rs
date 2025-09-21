use chrono::{DateTime, Utc};
use serde::Serialize;
use utoipa::ToSchema;

use crate::models::{AccountType, EventWithOrganizer, Organizer};

#[derive(Debug, Serialize, ToSchema)]
pub struct ErrorResponse {
    pub message: String,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct HealthResponse {
    pub status: String,
    pub message: String,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct AuthUserResponse {
    pub account_id: i64,
    pub display_name: String,
    pub account_type: AccountType,
    pub organizer_id: Option<i64>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct SetupTokenResponse {
    pub setup_token: String,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct SetupTokenInfoResponse {
    pub account_name: String,
    pub account_type: AccountType,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct NewsletterTemplateResponse {
    pub subject: String,
    pub html_body: String,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct NewsletterDataResponse {
    pub subject: String,
    pub next_week_events: Vec<EventWithOrganizer>,
    pub following_week_events: Vec<EventWithOrganizer>,
    pub all_organizers: Vec<Organizer>,
    pub next_week_start: DateTime<Utc>,
    pub week_after_start: DateTime<Utc>,
}
