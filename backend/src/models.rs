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
    pub publish_app: bool,
    pub publish_newsletter: bool,
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
