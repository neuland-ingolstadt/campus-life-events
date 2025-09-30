use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
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
    pub can_access_newsletter: bool,
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

#[allow(dead_code)]
#[derive(Debug, Serialize, ToSchema)]
pub struct NewsletterDataResponse {
    pub subject: String,
    pub next_week_events: Vec<EventWithOrganizer>,
    pub following_week_events: Vec<EventWithOrganizer>,
    pub all_organizers: Vec<Organizer>,
    pub next_week_start: DateTime<Utc>,
    pub week_after_start: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct PublicEventResponse {
    pub id: i64,
    pub organizer_id: i64,
    pub organizer_name: String,
    pub title_de: String,
    pub title_en: String,
    pub description_de: Option<String>,
    pub description_en: Option<String>,
    pub start_date_time: DateTime<Utc>,
    pub end_date_time: DateTime<Utc>,
    pub event_url: Option<String>,
    pub location: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct PublicOrganizerResponse {
    pub id: i64,
    pub name: String,
    pub description_de: Option<String>,
    pub description_en: Option<String>,
    pub website_url: Option<String>,
    pub instagram_url: Option<String>,
    pub location: Option<String>,
    pub linkedin_url: Option<String>,
    pub registration_number: Option<String>,
    pub non_profit: bool,
}
