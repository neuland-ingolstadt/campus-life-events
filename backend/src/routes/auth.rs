use argon2::{
    Argon2,
    password_hash::rand_core::{OsRng, RngCore},
};
use axum::{
    Json, Router,
    extract::State,
    http::{HeaderMap, HeaderValue, StatusCode},
    response::{IntoResponse, Response},
    routing::{get, post},
};
use base64::{Engine as _, engine::general_purpose};
use chrono::{DateTime, Duration, Utc};
use password_hash::{PasswordHash, PasswordHasher, PasswordVerifier, SaltString};
use password_policy::{COMMON_PASSWORDS, HighSecurityPolicy, PasswordPolicy};
use tracing::{error, info, instrument, warn};
use uuid::Uuid;

use crate::{
    app_state::AppState,
    dto::{
        ChangePasswordRequest, InitAccountRequest, LoginRequest, RequestPasswordResetRequest,
        ResetPasswordRequest, SetupTokenLookupRequest,
    },
    error::AppError,
    models::AccountType,
    responses::{AuthUserResponse, SetupTokenInfoResponse},
};

use super::shared::{current_user_from_headers, get_cookie, session_cookie_attributes};

#[utoipa::path(
    post,
    path = "/api/v1/auth/login",
    tag = "Auth",
    request_body = LoginRequest,
    responses(
        (status = 200, description = "Logged in; cookie set", body = AuthUserResponse),
        (status = 401, description = "Invalid credentials"),
    )
)]
#[instrument(skip(state, payload), fields(email = %payload.email))]
pub(crate) async fn login(
    State(state): State<AppState>,
    Json(payload): Json<LoginRequest>,
) -> Result<Response, AppError> {
    let rec = sqlx::query!(
        r#"
        SELECT id, display_name, password_hash, account_type as "account_type: AccountType", organizer_id
        FROM accounts
        WHERE email = $1
        "#,
        &payload.email
    )
    .fetch_optional(&state.db)
    .await?;

    let Some(row) = rec else {
        tracing::warn!("Failed login attempt for email: {}", payload.email);
        return Err(AppError::unauthorized("invalid e-mail or password"));
    };

    let id = row.id;
    let display_name = row.display_name;
    let account_type = row.account_type;
    let organizer_id = row.organizer_id;
    let Some(stored_hash) = row.password_hash else {
        tracing::warn!(
            "Failed login attempt for email: {} (no password hash)",
            payload.email
        );
        return Err(AppError::unauthorized("invalid e-mail or password"));
    };

    let parsed_hash = PasswordHash::new(&stored_hash)
        .map_err(|_| AppError::unauthorized("invalid e-mail or password"))?;
    Argon2::default()
        .verify_password(payload.password.as_bytes(), &parsed_hash)
        .map_err(|_| {
            tracing::warn!(
                "Failed login attempt for email: {} (invalid password)",
                payload.email
            );
            AppError::unauthorized("invalid e-mail or password")
        })?;

    let session_id = Uuid::new_v4();
    // 24 hours expiry
    let expires_at = Utc::now() + Duration::hours(24);
    sqlx::query!(
        r#"INSERT INTO sessions (id, account_id, expires_at) VALUES ($1, $2, $3)"#,
        session_id,
        id,
        expires_at
    )
    .execute(&state.db)
    .await?;

    let attrs = session_cookie_attributes();
    let cookie_str = format!(
        "session_id={}; {}; Max-Age={}",
        session_id,
        attrs,
        24 * 60 * 60
    );

    tracing::info!(
        "Successful login for account: {} (id: {})",
        display_name,
        id
    );

    let can_access_newsletter =
        determine_newsletter_access(&state, &account_type, organizer_id).await?;

    let body = Json(AuthUserResponse {
        account_id: id,
        display_name,
        account_type,
        organizer_id,
        can_access_newsletter,
    });
    let mut resp = (StatusCode::OK, body).into_response();
    resp.headers_mut().append(
        axum::http::header::SET_COOKIE,
        HeaderValue::from_str(&cookie_str).unwrap(),
    );
    Ok(resp)
}

#[utoipa::path(
    post,
    path = "/api/v1/auth/register-info",
    tag = "Auth",
    request_body = SetupTokenLookupRequest,
    responses(
        (status = 200, description = "Valid setup token", body = SetupTokenInfoResponse),
        (status = 400, description = "Invalid or expired token"),
    )
)]
#[instrument(skip(state, payload))]
pub(crate) async fn lookup_setup_token(
    State(state): State<AppState>,
    Json(payload): Json<SetupTokenLookupRequest>,
) -> Result<Json<SetupTokenInfoResponse>, AppError> {
    let PendingSetupToken {
        display_name,
        account_type,
        ..
    } = ensure_pending_setup_token(&state, &payload.token).await?;

    Ok(Json(SetupTokenInfoResponse {
        account_name: display_name,
        account_type,
    }))
}

#[utoipa::path(
    post,
    path = "/api/v1/auth/init",
    tag = "Auth",
    request_body = InitAccountRequest,
    responses(
        (status = 200, description = "Initialized; cookie set", body = AuthUserResponse),
        (status = 400, description = "Already initialized or invalid token"),
    )
)]
#[instrument(skip(state, payload))]
pub(crate) async fn init_account(
    State(state): State<AppState>,
    Json(payload): Json<InitAccountRequest>,
) -> Result<Response, AppError> {
    let pending = ensure_pending_setup_token(&state, &payload.token).await?;
    let PendingSetupToken {
        account_id,
        display_name,
        account_type,
        organizer_id,
    } = pending;

    ensure_password_requirements(&payload.password)?;

    let salt = SaltString::generate(&mut OsRng);
    let hash = Argon2::default()
        .hash_password(payload.password.as_bytes(), &salt)
        .map_err(|_| AppError::validation("failed to hash password"))?
        .to_string();

    sqlx::query!(
        r#"
        UPDATE accounts
        SET email = $1,
            password_hash = $2,
            setup_token = NULL,
            setup_token_expires_at = NULL,
            updated_at = NOW()
        WHERE id = $3
        "#,
        &payload.email,
        hash,
        account_id
    )
    .execute(&state.db)
    .await?;

    // Create session
    let session_id = Uuid::new_v4();
    let expires_at = Utc::now() + Duration::hours(24);
    sqlx::query!(
        r#"INSERT INTO sessions (id, account_id, expires_at) VALUES ($1, $2, $3)"#,
        session_id,
        account_id,
        expires_at
    )
    .execute(&state.db)
    .await?;

    let attrs = session_cookie_attributes();
    let cookie_str = format!(
        "session_id={}; {}; Max-Age={}",
        session_id,
        attrs,
        24 * 60 * 60
    );

    // Send welcome email
    if let Some(email_client) = &state.email {
        let account_type_str = match account_type {
            AccountType::Admin => "Admin",
            AccountType::Organizer => "Organizer",
        };

        match email_client
            .send_welcome_email(&payload.email, &display_name, account_type_str)
            .await
        {
            Ok(_) => info!("welcome email sent successfully to {}", payload.email),
            Err(err) => {
                error!(error = %err, "failed to send welcome email to {}", payload.email);
                // Don't fail the registration if email fails
                warn!("account created but welcome email failed - user can still login");
            }
        }
    } else {
        warn!("email client not configured; skipping welcome email");
    }

    let can_access_newsletter =
        determine_newsletter_access(&state, &account_type, organizer_id).await?;

    let body = Json(AuthUserResponse {
        account_id,
        display_name,
        account_type,
        organizer_id,
        can_access_newsletter,
    });
    let mut resp = (StatusCode::OK, body).into_response();
    resp.headers_mut().append(
        axum::http::header::SET_COOKIE,
        HeaderValue::from_str(&cookie_str).unwrap(),
    );
    Ok(resp)
}

#[utoipa::path(
    post,
    path = "/api/v1/auth/logout",
    tag = "Auth",
    responses((status = 204, description = "Logged out"))
)]
#[instrument(skip(state, headers))]
pub(crate) async fn logout(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Response, AppError> {
    if let Some(session_id) = get_cookie(&headers, "session_id") {
        if let Ok(uuid) = Uuid::parse_str(&session_id) {
            tracing::info!("User logout for session: {}", session_id);
            let _ = sqlx::query!("DELETE FROM sessions WHERE id = $1", uuid)
                .execute(&state.db)
                .await?;
        }
        let attrs = session_cookie_attributes();
        let expired = format!("session_id=; {attrs}; Max-Age=0");
        let mut resp = StatusCode::NO_CONTENT.into_response();
        resp.headers_mut().append(
            axum::http::header::SET_COOKIE,
            HeaderValue::from_str(&expired).unwrap(),
        );
        return Ok(resp);
    }

    Ok(StatusCode::NO_CONTENT.into_response())
}

#[utoipa::path(
    get,
    path = "/api/v1/auth/me",
    tag = "Auth",
    responses(
        (status = 200, description = "Current user", body = AuthUserResponse),
        (status = 401, description = "Not authenticated")
    )
)]
#[instrument(skip(state, headers))]
pub(crate) async fn me(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<AuthUserResponse>, AppError> {
    let Some(session_id) = get_cookie(&headers, "session_id") else {
        return Err(AppError::unauthorized("missing session"));
    };

    let uuid = Uuid::parse_str(&session_id)
        .map_err(|_| AppError::unauthorized("invalid session format"))?;
    let rec = sqlx::query!(
        r#"
        SELECT a.id, a.display_name, a.account_type as "account_type: AccountType", a.organizer_id
        FROM sessions s
        JOIN accounts a ON a.id = s.account_id
        WHERE s.id = $1 AND s.expires_at > NOW()
        "#,
        uuid
    )
    .fetch_optional(&state.db)
    .await?;

    let Some(row) = rec else {
        return Err(AppError::unauthorized("invalid or expired session"));
    };

    let account_id = row.id;
    let display_name = row.display_name;
    let account_type = row.account_type;
    let organizer_id = row.organizer_id;
    let can_access_newsletter =
        determine_newsletter_access(&state, &account_type, organizer_id).await?;
    Ok(Json(AuthUserResponse {
        account_id,
        display_name,
        account_type,
        organizer_id,
        can_access_newsletter,
    }))
}

async fn determine_newsletter_access(
    state: &AppState,
    account_type: &AccountType,
    organizer_id: Option<i64>,
) -> Result<bool, AppError> {
    if matches!(account_type, AccountType::Admin) {
        return Ok(true);
    }

    let Some(organizer_id) = organizer_id else {
        return Ok(false);
    };

    let row = sqlx::query!(
        r#"
        SELECT newsletter
        FROM organizers
        WHERE id = $1
        "#,
        organizer_id
    )
    .fetch_optional(&state.db)
    .await?;

    Ok(row.map(|record| record.newsletter).unwrap_or(false))
}

#[utoipa::path(
    post,
    path = "/api/v1/auth/change-password",
    tag = "Auth",
    request_body = ChangePasswordRequest,
    responses((status = 204, description = "Password changed"))
)]
#[instrument(skip(state, headers, payload))]
pub(crate) async fn change_password(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(payload): Json<ChangePasswordRequest>,
) -> Result<StatusCode, AppError> {
    let user = current_user_from_headers(&headers, &state).await?;
    let rec = sqlx::query!(
        r#"SELECT password_hash FROM accounts WHERE id = $1"#,
        user.account_id
    )
    .fetch_one(&state.db)
    .await?;

    let Some(stored) = rec.password_hash else {
        return Err(AppError::validation("account not initialized"));
    };

    let parsed_hash = PasswordHash::new(&stored)
        .map_err(|_| AppError::unauthorized("invalid current password"))?;
    Argon2::default()
        .verify_password(payload.current_password.as_bytes(), &parsed_hash)
        .map_err(|_| AppError::unauthorized("invalid current password"))?;

    ensure_password_requirements(&payload.new_password)?;

    let salt = SaltString::generate(&mut OsRng);
    let new_hash = Argon2::default()
        .hash_password(payload.new_password.as_bytes(), &salt)
        .map_err(|_| AppError::validation("failed to hash password"))?
        .to_string();

    let mut tx = state.db.begin().await?;
    sqlx::query!(
        r#"UPDATE accounts SET password_hash = $1, updated_at = NOW() WHERE id = $2"#,
        &new_hash,
        user.account_id
    )
    .execute(&mut *tx)
    .await?;
    // Invalidate all existing sessions for this user (session rotation)
    sqlx::query!(
        "DELETE FROM sessions WHERE account_id = $1",
        user.account_id
    )
    .execute(&mut *tx)
    .await?;
    tx.commit().await?;

    Ok(StatusCode::NO_CONTENT)
}

struct PendingSetupToken {
    account_id: i64,
    display_name: String,
    account_type: AccountType,
    organizer_id: Option<i64>,
}

async fn ensure_pending_setup_token(
    state: &AppState,
    token: &str,
) -> Result<PendingSetupToken, AppError> {
    tracing::debug!(
        "Looking up setup token: '{}' (length: {})",
        token,
        token.len()
    );

    // Handle URL encoding issues where + becomes space
    let normalized_token = token.replace(' ', "+");
    if normalized_token != token {
        tracing::debug!(
            "Normalized token: '{}' (length: {})",
            normalized_token,
            normalized_token.len()
        );
    }

    let row = sqlx::query!(
        r#"
        SELECT id, display_name, password_hash, account_type as "account_type: AccountType", organizer_id, setup_token_expires_at as "setup_token_expires_at?: DateTime<Utc>"
        FROM accounts
        WHERE setup_token = $1
        "#,
        &normalized_token
    )
    .fetch_optional(&state.db)
    .await?;

    let Some(row) = row else {
        return Err(AppError::validation("invalid setup token"));
    };

    match row.setup_token_expires_at {
        Some(when) if when > Utc::now() => {}
        _ => {
            return Err(AppError::validation("setup token expired"));
        }
    }

    if row.password_hash.is_some() {
        return Err(AppError::validation("account already initialized"));
    }

    Ok(PendingSetupToken {
        account_id: row.id,
        display_name: row.display_name,
        account_type: row.account_type,
        organizer_id: row.organizer_id,
    })
}

fn ensure_password_requirements(password: &str) -> Result<(), AppError> {
    let policy = HighSecurityPolicy {
        min_length: 20,
        ..Default::default()
    };

    if password.len() < policy.min_length {
        return Err(AppError::validation(format!(
            "password must be at least {} characters long",
            policy.min_length
        )));
    }

    if !password.chars().any(|c| c.is_ascii_lowercase()) {
        return Err(AppError::validation(
            "password must include at least one lowercase letter",
        ));
    }

    if !password.chars().any(|c| c.is_ascii_uppercase()) {
        return Err(AppError::validation(
            "password must include at least one uppercase letter",
        ));
    }

    if !password.chars().any(|c| c.is_ascii_digit()) {
        return Err(AppError::validation(
            "password must include at least one number",
        ));
    }

    if !password.chars().any(|c| !c.is_ascii_alphanumeric()) {
        return Err(AppError::validation(
            "password must include at least one symbol",
        ));
    }

    let lowered = password.to_lowercase();
    if COMMON_PASSWORDS
        .iter()
        .any(|candidate| lowered.contains(candidate))
    {
        return Err(AppError::validation(
            "password is too common or predictable",
        ));
    }

    if !policy.meets_requirements(password) {
        return Err(AppError::validation(format!(
            "password must provide at least {:.0} bits of entropy",
            policy.min_entropy
        )));
    }

    Ok(())
}

#[utoipa::path(
    post,
    path = "/api/v1/auth/request-password-reset",
    tag = "Auth",
    request_body = RequestPasswordResetRequest,
    responses(
        (status = 204, description = "Password reset email sent if account exists"),
        (status = 400, description = "Invalid email format"),
    )
)]
#[instrument(skip(state, payload))]
pub(crate) async fn request_password_reset(
    State(state): State<AppState>,
    Json(payload): Json<RequestPasswordResetRequest>,
) -> Result<StatusCode, AppError> {
    // Always return 204 to prevent email enumeration attacks
    // Even if the email doesn't exist, we don't reveal that information

    let rec = sqlx::query!(
        r#"
        SELECT id, display_name, email
        FROM accounts
        WHERE email = $1 AND password_hash IS NOT NULL
        "#,
        &payload.email
    )
    .fetch_optional(&state.db)
    .await?;

    if let Some(row) = rec {
        let account_id = row.id;
        let display_name = row.display_name;

        // Generate a secure reset token (32 random bytes = 256 bits of entropy)
        let mut token_bytes = [0u8; 32];
        OsRng.fill_bytes(&mut token_bytes);
        let reset_token = general_purpose::URL_SAFE_NO_PAD.encode(token_bytes);

        // Set expiry to 10 minutes from now
        let expires_at = Utc::now() + Duration::minutes(10);

        // Invalidate any existing reset tokens for this account
        sqlx::query!(
            "DELETE FROM password_reset_tokens WHERE account_id = $1",
            account_id
        )
        .execute(&state.db)
        .await?;

        // Insert new reset token
        sqlx::query!(
            r#"INSERT INTO password_reset_tokens (account_id, token, expires_at) VALUES ($1, $2, $3)"#,
            account_id,
            &reset_token,
            expires_at
        )
        .execute(&state.db)
        .await?;

        // Send password reset email
        if let Some(email_client) = &state.email {
            match email_client
                .send_password_reset_email(&payload.email, &display_name, &reset_token)
                .await
            {
                Ok(_) => info!(
                    "Password reset email sent successfully to {}",
                    payload.email
                ),
                Err(err) => {
                    error!(error = %err, "Failed to send password reset email to {}", payload.email);
                    // Don't fail the request if email fails
                }
            }
        } else {
            warn!("email client not configured; password reset email not sent");
        }
    }

    // Always return success to prevent email enumeration
    Ok(StatusCode::NO_CONTENT)
}

#[utoipa::path(
    post,
    path = "/api/v1/auth/reset-password",
    tag = "Auth",
    request_body = ResetPasswordRequest,
    responses(
        (status = 204, description = "Password reset successfully"),
        (status = 400, description = "Invalid or expired token"),
    )
)]
#[instrument(skip(state, payload))]
pub(crate) async fn reset_password(
    State(state): State<AppState>,
    Json(payload): Json<ResetPasswordRequest>,
) -> Result<StatusCode, AppError> {
    // Validate the reset token
    let rec = sqlx::query!(
        r#"
        SELECT prt.id, prt.account_id, prt.expires_at as "expires_at: DateTime<Utc>", a.display_name
        FROM password_reset_tokens prt
        JOIN accounts a ON a.id = prt.account_id
        WHERE prt.token = $1 AND prt.expires_at > NOW() AND prt.used_at IS NULL
        "#,
        &payload.token
    )
    .fetch_optional(&state.db)
    .await?;

    let Some(row) = rec else {
        return Err(AppError::validation("Invalid or expired reset token"));
    };

    let token_id = row.id;
    let account_id = row.account_id;
    let display_name = row.display_name;

    // Validate new password
    ensure_password_requirements(&payload.new_password)?;

    // Hash the new password
    let salt = SaltString::generate(&mut OsRng);
    let new_hash = Argon2::default()
        .hash_password(payload.new_password.as_bytes(), &salt)
        .map_err(|_| AppError::validation("Failed to hash password"))?
        .to_string();

    // Start transaction
    let mut tx = state.db.begin().await?;

    // Update the password
    sqlx::query!(
        r#"UPDATE accounts SET password_hash = $1, updated_at = NOW() WHERE id = $2"#,
        &new_hash,
        account_id
    )
    .execute(&mut *tx)
    .await?;

    // Mark the reset token as used
    sqlx::query!(
        "UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1",
        token_id
    )
    .execute(&mut *tx)
    .await?;

    // Invalidate all existing sessions for this user (session rotation)
    sqlx::query!("DELETE FROM sessions WHERE account_id = $1", account_id)
        .execute(&mut *tx)
        .await?;

    tx.commit().await?;

    info!(
        "Password reset successful for account: {} (id: {})",
        display_name, account_id
    );
    Ok(StatusCode::NO_CONTENT)
}

pub(crate) fn router() -> Router<AppState> {
    Router::new()
        .route("/login", post(login))
        .route("/register-info", post(lookup_setup_token))
        .route("/init", post(init_account))
        .route("/logout", post(logout))
        .route("/change-password", post(change_password))
        .route("/request-password-reset", post(request_password_reset))
        .route("/reset-password", post(reset_password))
        .route("/me", get(me))
}
