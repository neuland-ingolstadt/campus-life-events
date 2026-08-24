use sqlx::postgres::PgPool;

use crate::{cache::CacheService, email::EmailClient};

#[derive(Clone)]
pub struct AppState {
    pub db: PgPool,
    pub email: Option<EmailClient>,
    pub cache: Option<CacheService>,
    pub api_token_hmac_key: Option<[u8; 32]>,
    pub oauth_token_hmac_key: Option<[u8; 32]>,
}
