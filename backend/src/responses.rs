use serde::Serialize;
use utoipa::ToSchema;

use crate::models::AccountType;

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
    pub id: i64,
    pub name: String,
    pub account_type: AccountType,
    pub organizer_id: Option<i64>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct SetupTokenResponse {
    pub setup_token: String,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct SetupTokenInfoResponse {
    pub organizer_name: String,
}
