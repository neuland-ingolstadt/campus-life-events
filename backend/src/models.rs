use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use sqlx::FromRow;
use utoipa::ToSchema;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct Organizer {
    pub id: i64,
    pub name: String,
    pub description_de: Option<String>,
    pub description_en: Option<String>,
    pub website_url: Option<String>,
    pub instagram_url: Option<String>,
    pub location: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type, ToSchema, PartialEq, Eq)]
#[sqlx(type_name = "account_type", rename_all = "SCREAMING_SNAKE_CASE")]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum AccountType {
    Admin,
    Organizer,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type, ToSchema)]
#[sqlx(type_name = "audit_type", rename_all = "SCREAMING_SNAKE_CASE")]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum AuditType {
    Create,
    Update,
    Delete,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct Event {
    pub id: i64,
    pub organizer_id: i64,
    pub title_de: String,
    pub title_en: String,
    pub description_de: Option<String>,
    pub description_en: Option<String>,
    pub start_date_time: DateTime<Utc>,
    pub end_date_time: Option<DateTime<Utc>>,
    pub event_url: Option<String>,
    pub location: Option<String>,
    pub publish_app: bool,
    pub publish_newsletter: bool,
    pub publish_in_ical: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct AuditLogEntry {
    pub id: i64,
    pub event_id: i64,
    pub organizer_id: i64,
    pub r#type: AuditType,
    pub at: DateTime<Utc>,
    pub note: Option<String>,
    pub old_data: Option<Value>,
    pub new_data: Option<Value>,
}

#[derive(Debug, Clone, Serialize, ToSchema)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum InviteStatus {
    Pending,
    Expired,
    Completed,
}

#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct OrganizerWithInvite {
    pub id: i64,
    pub name: String,
    pub email: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub invite_status: InviteStatus,
    pub invite_expires_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, FromRow)]
pub struct OrganizerInviteRow {
    pub organizer_id: i64,
    pub organizer_name: String,
    pub organizer_created_at: DateTime<Utc>,
    pub organizer_updated_at: DateTime<Utc>,
    pub email: Option<String>,
    pub password_hash: Option<String>,
    pub setup_token: Option<String>,
    pub setup_token_expires_at: Option<DateTime<Utc>>,
}

impl OrganizerWithInvite {
    pub(crate) fn from_row(row: OrganizerInviteRow) -> Self {
        let invite_status = if row.password_hash.is_some() {
            InviteStatus::Completed
        } else if row.setup_token.is_some() {
            if let Some(expires_at) = row.setup_token_expires_at {
                if expires_at > Utc::now() {
                    InviteStatus::Pending
                } else {
                    InviteStatus::Expired
                }
            } else {
                InviteStatus::Expired
            }
        } else {
            InviteStatus::Expired
        };

        Self {
            id: row.organizer_id,
            name: row.organizer_name,
            email: row.email,
            created_at: row.organizer_created_at,
            updated_at: row.organizer_updated_at,
            invite_status,
            invite_expires_at: row.setup_token_expires_at,
        }
    }
}
