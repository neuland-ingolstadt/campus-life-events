use axum::http::HeaderMap;
use cookie::Cookie;
use sqlx::Row;
use uuid::Uuid;

use crate::{app_state::AppState, error::AppError};

#[derive(Clone, Debug)]
pub(crate) struct AuthedUser {
    pub(crate) id: i64,
    pub(crate) super_user: bool,
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
        SELECT o.id, o.super_user
        FROM sessions s
        JOIN organizers o ON o.id = s.organizer_id
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
        id: row.try_get("id").unwrap_or_default(),
        super_user: row.try_get("super_user").unwrap_or(false),
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
