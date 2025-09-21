use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use sqlx::FromRow;
use utoipa::ToSchema;

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type, ToSchema)]
#[sqlx(type_name = "account_type", rename_all = "SCREAMING_SNAKE_CASE")]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum AccountType {
    Admin,
    Organizer,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct Account {
    pub id: i64,
    pub account_type: AccountType,
    pub organizer_id: Option<i64>,
    pub display_name: String,
    pub email: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

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
    pub publish_web: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct EventWithOrganizer {
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
    pub publish_web: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub organizer_name: String,
    pub organizer_website: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct AuditLogEntry {
    pub id: i64,
    pub event_id: i64,
    pub organizer_id: i64,
    pub user_id: Option<i64>,
    pub r#type: AuditType,
    pub at: DateTime<Utc>,
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
    pub account_email: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub password_hash: Option<String>,
    pub setup_token: Option<String>,
    pub setup_token_expires_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct AdminWithInvite {
    pub id: i64,
    pub display_name: String,
    pub email: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub invite_status: InviteStatus,
    pub invite_expires_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, FromRow)]
pub struct AdminInviteRow {
    pub account_id: i64,
    pub display_name: String,
    pub account_email: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
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
            email: row.account_email,
            created_at: row.created_at,
            updated_at: row.updated_at,
            invite_status,
            invite_expires_at: row.setup_token_expires_at,
        }
    }
}

impl AdminWithInvite {
    pub(crate) fn from_row(row: AdminInviteRow) -> Self {
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
            id: row.account_id,
            display_name: row.display_name,
            email: row.account_email,
            created_at: row.created_at,
            updated_at: row.updated_at,
            invite_status,
            invite_expires_at: row.setup_token_expires_at,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct PasswordResetToken {
    pub id: i64,
    pub account_id: i64,
    pub token: String,
    pub expires_at: DateTime<Utc>,
    pub used_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
}
