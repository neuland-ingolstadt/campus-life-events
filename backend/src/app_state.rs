use sqlx::postgres::PgPool;

use crate::email::EmailClient;

#[derive(Clone)]
pub struct AppState {
    pub db: PgPool,
    pub email: Option<EmailClient>,
}
