use base64::{Engine as _, engine::general_purpose::URL_SAFE_NO_PAD};
use hmac::{Hmac, KeyInit, Mac};
use sha2::{Digest, Sha256};

use crate::{app_state::AppState, authed_user::AuthedUser, error::AppError, models::AccountType};

type HmacSha256 = Hmac<Sha256>;

pub fn derive_key(secret: &str) -> [u8; 32] {
    let mut hasher = Sha256::new();
    hasher.update(secret.as_bytes());
    hasher.update(b"campus-life-events-oauth-token-v1");
    hasher.finalize().into()
}

pub fn hash_raw(key: &[u8; 32], raw: &str) -> [u8; 32] {
    let mut mac = HmacSha256::new_from_slice(key.as_slice()).expect("HMAC accepts 32-byte key");
    mac.update(raw.as_bytes());
    mac.finalize().into_bytes().into()
}

fn random_token(prefix: &str) -> String {
    let mut bytes = [0u8; 32];
    getrandom::fill(&mut bytes).expect("failed to generate random bytes");
    format!("{prefix}{}", URL_SAFE_NO_PAD.encode(bytes))
}

pub fn generate_access_token() -> String {
    random_token("cle_at_")
}

pub fn generate_refresh_token() -> String {
    random_token("cle_rt_")
}

pub fn generate_authorization_code() -> String {
    random_token("cle_ac_")
}

pub fn pkce_s256_challenge(verifier: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(verifier.as_bytes());
    URL_SAFE_NO_PAD.encode(hasher.finalize())
}

pub fn is_loopback_redirect_uri(uri: &str) -> bool {
    let Some(rest) = uri.strip_prefix("http://") else {
        return false;
    };
    let authority = rest.split('/').next().unwrap_or("");
    let host = host_from_http_authority(authority);
    matches!(host, "127.0.0.1" | "localhost" | "[::1]" | "::1")
}

fn host_from_http_authority(authority: &str) -> &str {
    if authority.starts_with('[') {
        if let Some(end) = authority.find(']') {
            return &authority[..=end];
        }
        return authority;
    }
    match authority.rsplit_once(':') {
        Some((h, port)) if port.chars().all(|c| c.is_ascii_digit()) => h,
        _ => authority,
    }
}

fn uri_without_query(uri: &str) -> &str {
    uri.split_once('?').map(|(p, _)| p).unwrap_or(uri)
}

fn is_cursor_native_redirect_uri(uri: &str) -> bool {
    let base = uri_without_query(uri);
    base == "cursor://anysphere.cursor-mcp/oauth/callback"
        || base.starts_with("cursor://anysphere.cursor-mcp/")
}

fn is_cursor_https_redirect_uri(uri: &str) -> bool {
    matches!(
        uri_without_query(uri),
        "https://www.cursor.com/agents/mcp/oauth/callback"
            | "https://cursor.com/agents/mcp/oauth/callback"
    )
}

pub fn is_allowed_redirect_uri(uri: &str) -> bool {
    is_loopback_redirect_uri(uri)
        || is_cursor_native_redirect_uri(uri)
        || is_cursor_https_redirect_uri(uri)
}

pub async fn authed_user_from_access_token(
    raw_token: &str,
    state: &AppState,
) -> Result<AuthedUser, AppError> {
    let Some(key) = state.oauth_token_hmac_key.as_ref() else {
        return Err(AppError::unauthorized("invalid token"));
    };

    if !raw_token.starts_with("cle_at_") {
        return Err(AppError::unauthorized("invalid token"));
    }

    let digest = hash_raw(key, raw_token);
    let rec = sqlx::query!(
        r#"
        SELECT t.id, a.id as account_id, a.account_type as "account_type: AccountType", a.organizer_id
        FROM oauth_tokens t
        JOIN accounts a ON a.id = t.account_id
        WHERE t.access_token_hmac = $1
          AND t.access_expires_at > NOW()
          AND t.revoked_at IS NULL
        "#,
        &digest[..]
    )
    .fetch_optional(&state.db)
    .await?;

    let Some(row) = rec else {
        return Err(AppError::unauthorized("invalid token"));
    };

    let _ = sqlx::query!(
        "UPDATE oauth_tokens SET last_used_at = NOW() WHERE id = $1",
        row.id
    )
    .execute(&state.db)
    .await;

    Ok(AuthedUser {
        account_id: row.account_id,
        account_type: row.account_type,
        organizer_id: row.organizer_id,
    })
}

pub async fn revoke_account_tokens<'e, E>(executor: E, account_id: i64) -> Result<(), sqlx::Error>
where
    E: sqlx::Executor<'e, Database = sqlx::Postgres>,
{
    sqlx::query!(
        "UPDATE oauth_tokens SET revoked_at = NOW() WHERE account_id = $1 AND revoked_at IS NULL",
        account_id
    )
    .execute(executor)
    .await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accepts_cursor_dcr_redirects() {
        assert!(is_allowed_redirect_uri(
            "cursor://anysphere.cursor-mcp/oauth/callback"
        ));
        assert!(is_allowed_redirect_uri(
            "https://www.cursor.com/agents/mcp/oauth/callback"
        ));
        assert!(is_allowed_redirect_uri("http://localhost:8787/callback"));
        assert!(is_allowed_redirect_uri("http://127.0.0.1:8787/callback"));
        assert!(is_allowed_redirect_uri("http://[::1]:8787/callback"));
        assert!(!is_allowed_redirect_uri("https://evil.example/callback"));
        assert!(!is_allowed_redirect_uri("http://example.com/callback"));
    }
}
