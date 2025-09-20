use axum::http::HeaderMap;
use cookie::Cookie;
use sqlx::Row;
use uuid::Uuid;

use crate::{app_state::AppState, error::AppError, models::AccountType};

#[derive(Clone, Debug)]
pub(crate) struct AuthedUser {
    pub(crate) account_id: i64,
    pub(crate) account_type: AccountType,
    pub(crate) organizer_id: Option<i64>,
}

impl AuthedUser {
    pub(crate) fn is_admin(&self) -> bool {
        matches!(self.account_type, AccountType::Admin)
    }

    pub(crate) fn organizer_id(&self) -> Option<i64> {
        self.organizer_id
    }
}

pub(crate) async fn current_user_from_headers(
    headers: &HeaderMap,
    state: &AppState,
) -> Result<AuthedUser, AppError> {
    let Some(session_id) = get_cookie(headers, "session_id") else {
        return Err(AppError::unauthorized("missing session"));
    };

    let uuid = Uuid::parse_str(&session_id)
        .map_err(|_| AppError::unauthorized("invalid session format"))?;

    let rec = sqlx::query(
        r#"
        SELECT a.id as account_id, a.account_type, a.organizer_id
        FROM sessions s
        JOIN accounts a ON a.id = s.account_id
        WHERE s.id = $1 AND s.expires_at > NOW()
        "#,
    )
    .bind(uuid)
    .fetch_optional(&state.db)
    .await?;

    let Some(row) = rec else {
        return Err(AppError::unauthorized("invalid or expired session"));
    };

    Ok(AuthedUser {
        account_id: row.try_get("account_id").unwrap_or_default(),
        account_type: row.try_get("account_type")?,
        organizer_id: row.try_get("organizer_id").ok(),
    })
}

pub(crate) fn get_cookie(headers: &HeaderMap, name: &str) -> Option<String> {
    let cookie_header = headers.get(axum::http::header::COOKIE)?;
    let cookie_str = cookie_header.to_str().ok()?;
    for c in Cookie::split_parse(cookie_str) {
        if let Ok(cookie) = c {
            if cookie.name() == name {
                return Some(cookie.value().to_string());
            }
        }
    }
    None
}

pub(crate) fn session_cookie_attributes() -> String {
    let secure = std::env::var("SESSION_COOKIE_SECURE")
        .ok()
        .and_then(|v| v.parse::<bool>().ok())
        .unwrap_or(true);
    if secure {
        "Path=/; HttpOnly; SameSite=Lax; Secure".to_string()
    } else {
        "Path=/; HttpOnly; SameSite=Lax".to_string()
    }
}

pub(crate) fn generate_setup_token_value() -> String {
    use base64::{Engine as _, engine::general_purpose};
    use rand::RngCore;
    let mut bytes = [0u8; 32];
    rand::thread_rng().fill_bytes(&mut bytes);
    general_purpose::STANDARD.encode(bytes)
}
