use sqlx::postgres::PgPool;

use crate::{cache::CacheService, email::EmailClient};

#[derive(Clone)]
pub struct AppState {
    pub db: PgPool,
    pub email: Option<EmailClient>,
    pub cache: Option<CacheService>,
}
