use base64::{Engine as _, engine::general_purpose::URL_SAFE_NO_PAD};
use hmac::{Hmac, Mac};
use rand_core::{OsRng, RngCore};
use sha2::Sha256;

use crate::{app_state::AppState, authed_user::AuthedUser, error::AppError, models::AccountType};

type HmacSha256 = Hmac<Sha256>;

pub fn derive_key(secret: &str) -> [u8; 32] {
    use sha2::Digest;
    let mut hasher = Sha256::new();
    hasher.update(secret.as_bytes());
    hasher.update(b"campus-life-events-api-token-v1");
    hasher.finalize().into()
}

pub fn hash_raw_token(key: &[u8; 32], raw: &str) -> [u8; 32] {
    let mut mac = HmacSha256::new_from_slice(key.as_slice()).expect("HMAC accepts 32-byte key");
    mac.update(raw.as_bytes());
    mac.finalize().into_bytes().into()
}

pub fn generate_raw_token() -> String {
    let mut bytes = [0u8; 32];
    OsRng.fill_bytes(&mut bytes);
    format!("cle_{}", URL_SAFE_NO_PAD.encode(bytes))
}

pub fn token_last_four(raw: &str) -> String {
    raw.chars()
        .rev()
        .take(4)
        .collect::<String>()
        .chars()
        .rev()
        .collect()
}

pub async fn authed_user_from_bearer(
    raw_token: &str,
    state: &AppState,
) -> Result<AuthedUser, AppError> {
    let Some(key) = state.api_token_hmac_key.as_ref() else {
        return Err(AppError::unauthorized("invalid token"));
    };

    if !raw_token.starts_with("cle_") {
        return Err(AppError::unauthorized("invalid token"));
    }

    let digest = hash_raw_token(key, raw_token);
    let rec = sqlx::query!(
        r#"
        SELECT t.id, a.id as account_id, a.account_type as "account_type: AccountType", a.organizer_id
        FROM api_tokens t
        JOIN accounts a ON a.id = t.account_id
        WHERE t.token_hmac = $1 AND t.expires_at > NOW()
        "#,
        &digest[..]
    )
    .fetch_optional(&state.db)
    .await?;

    let Some(row) = rec else {
        return Err(AppError::unauthorized("invalid token"));
    };

    sqlx::query!(
        "UPDATE api_tokens SET last_used_at = NOW() WHERE id = $1",
        row.id
    )
    .execute(&state.db)
    .await?;

    Ok(AuthedUser {
        account_id: row.account_id,
        account_type: row.account_type,
        organizer_id: row.organizer_id,
    })
}
