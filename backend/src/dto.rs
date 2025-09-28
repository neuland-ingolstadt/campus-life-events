use chrono::{DateTime, Utc};
use serde::Deserialize;
use utoipa::{IntoParams, ToSchema};

#[derive(Debug, Deserialize, ToSchema)]
#[serde(deny_unknown_fields)]
pub struct CreateOrganizerRequest {
    pub name: String,
    pub email: String,
}

#[derive(Debug, Deserialize, ToSchema)]
#[serde(deny_unknown_fields)]
pub struct InviteAdminRequest {
    pub display_name: String,
    pub email: String,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct UpdateOrganizerRequest {
    pub name: Option<String>,
    pub description_de: Option<String>,
    pub description_en: Option<String>,
    pub website_url: Option<String>,
    pub instagram_url: Option<String>,
    pub location: Option<String>,
    pub linkedin_url: Option<String>,
    pub registration_number: Option<String>,
    pub non_profit: Option<bool>,
}

impl UpdateOrganizerRequest {
    pub fn has_updates(&self) -> bool {
        self.name.is_some()
            || self.description_de.is_some()
            || self.description_en.is_some()
            || self.website_url.is_some()
            || self.instagram_url.is_some()
            || self.location.is_some()
            || self.linkedin_url.is_some()
            || self.registration_number.is_some()
            || self.non_profit.is_some()
    }
}

#[derive(Debug, Deserialize, ToSchema)]
#[serde(deny_unknown_fields)]
pub struct UpdateOrganizerPermissionsRequest {
    pub newsletter: bool,
}

#[derive(Debug, Deserialize, ToSchema)]
#[serde(deny_unknown_fields)]
pub struct CreateEventRequest {
    pub title_de: String,
    pub title_en: String,
    pub description_de: Option<String>,
    pub description_en: Option<String>,
    pub start_date_time: DateTime<Utc>,
    pub end_date_time: DateTime<Utc>,
    pub event_url: Option<String>,
    pub location: Option<String>,
    #[serde(default = "default_true")]
    pub publish_app: bool,
    #[serde(default = "default_true")]
    pub publish_newsletter: bool,
    #[serde(default = "default_true")]
    pub publish_in_ical: bool,
    #[serde(default = "default_true")]
    pub publish_web: bool,
}

#[derive(Debug, Deserialize, ToSchema)]
#[serde(deny_unknown_fields)]
pub struct UpdateEventRequest {
    pub title_de: Option<String>,
    pub title_en: Option<String>,
    pub description_de: Option<String>,
    pub description_en: Option<String>,
    pub start_date_time: Option<DateTime<Utc>>,
    pub end_date_time: Option<DateTime<Utc>>,
    pub event_url: Option<String>,
    pub location: Option<String>,
    pub publish_app: Option<bool>,
    pub publish_newsletter: Option<bool>,
    pub publish_in_ical: Option<bool>,
    pub publish_web: Option<bool>,
}

impl UpdateEventRequest {
    pub fn has_updates(&self) -> bool {
        self.title_de.is_some()
            || self.title_en.is_some()
            || self.description_de.is_some()
            || self.description_en.is_some()
            || self.start_date_time.is_some()
            || self.end_date_time.is_some()
            || self.event_url.is_some()
            || self.location.is_some()
            || self.publish_app.is_some()
            || self.publish_newsletter.is_some()
            || self.publish_in_ical.is_some()
            || self.publish_web.is_some()
    }
}

#[derive(Debug, Deserialize, ToSchema, IntoParams)]
#[into_params(parameter_in = Query)]
pub struct ListEventsQuery {
    pub organizer_id: Option<i64>,
    pub upcoming_only: Option<bool>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

#[derive(Debug, Deserialize, ToSchema, IntoParams)]
#[into_params(parameter_in = Query)]
pub struct ListAuditLogsQuery {
    pub event_id: Option<i64>,
    pub organizer_id: Option<i64>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

const fn default_true() -> bool {
    true
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct InitAccountRequest {
    pub token: String,
    pub email: String,
    pub password: String,
}

#[derive(Debug, Deserialize, ToSchema)]
#[serde(deny_unknown_fields)]
pub struct SetupTokenLookupRequest {
    pub token: String,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct ChangePasswordRequest {
    pub current_password: String,
    pub new_password: String,
}

#[derive(Debug, Deserialize, ToSchema)]
#[serde(deny_unknown_fields)]
pub struct RequestPasswordResetRequest {
    pub email: String,
}

#[derive(Debug, Deserialize, ToSchema)]
#[serde(deny_unknown_fields)]
pub struct ResetPasswordRequest {
    pub token: String,
    pub new_password: String,
}
