use axum::{
    Form, Json, Router,
    extract::{Path, Query, State},
    http::{HeaderMap, HeaderValue, StatusCode, header},
    response::{IntoResponse, Redirect, Response},
    routing::{get, post},
};
use chrono::{Duration, Utc};
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use tracing::instrument;
use uuid::Uuid;

use crate::{
    app_state::AppState, error::AppError, models::AccountType, oauth,
    routes::shared::current_user_from_headers,
};

#[derive(Debug, Serialize)]
struct OAuthErrorBody {
    error: &'static str,
    #[serde(skip_serializing_if = "Option::is_none")]
    error_description: Option<String>,
}

struct OAuthError {
    status: StatusCode,
    error: &'static str,
    description: Option<String>,
}

impl OAuthError {
    fn new(status: StatusCode, error: &'static str, description: impl Into<String>) -> Self {
        Self {
            status,
            error,
            description: Some(description.into()),
        }
    }
}

impl IntoResponse for OAuthError {
    fn into_response(self) -> Response {
        (
            self.status,
            Json(OAuthErrorBody {
                error: self.error,
                error_description: self.description,
            }),
        )
            .into_response()
    }
}

fn frontend_base_url() -> String {
    std::env::var("BASE_URL").unwrap_or_else(|_| "http://localhost:3000".to_string())
}

fn configured_public_api_origin() -> Option<String> {
    let raw = std::env::var("PUBLIC_API_URL").ok()?;
    let trimmed = raw.trim().trim_end_matches('/');
    if trimmed.starts_with("https://") || trimmed.starts_with("http://") {
        Some(trimmed.to_string())
    } else {
        None
    }
}

fn public_origin(headers: &HeaderMap) -> String {
    if let Some(origin) = configured_public_api_origin() {
        return origin;
    }
    let secure = std::env::var("SESSION_COOKIE_SECURE")
        .ok()
        .is_some_and(|v| v.eq_ignore_ascii_case("true"));
    let proto = if secure { "https" } else { "http" };
    let host = headers
        .get(header::HOST)
        .and_then(|v| v.to_str().ok())
        .unwrap_or("localhost:8080");
    format!("{proto}://{host}")
}

fn issuer(headers: &HeaderMap) -> String {
    format!("{}/api/v1/oauth", public_origin(headers))
}

fn resource_uri(headers: &HeaderMap) -> String {
    format!("{}/mcp", public_origin(headers))
}

fn protected_resource_metadata_url(headers: &HeaderMap) -> String {
    format!("{}/api/v1/oauth/protected-resource", public_origin(headers))
}

fn www_authenticate(headers: &HeaderMap) -> HeaderValue {
    let meta = protected_resource_metadata_url(headers);
    HeaderValue::from_str(&format!(
        "Bearer realm=\"mcp\", resource_metadata=\"{meta}\", scope=\"mcp\""
    ))
    .unwrap_or_else(|_| HeaderValue::from_static("Bearer realm=\"mcp\", scope=\"mcp\""))
}

pub(crate) fn mcp_unauthorized_response(headers: &HeaderMap, body: impl IntoResponse) -> Response {
    let mut resp = (StatusCode::UNAUTHORIZED, body).into_response();
    resp.headers_mut()
        .insert(header::WWW_AUTHENTICATE, www_authenticate(headers));
    resp
}

fn authorization_server_metadata(headers: &HeaderMap) -> Value {
    let iss = issuer(headers);
    let origin = public_origin(headers);
    json!({
        "issuer": iss,
        "authorization_endpoint": format!("{origin}/api/v1/oauth/authorize"),
        "token_endpoint": format!("{iss}/token"),
        "registration_endpoint": format!("{iss}/register"),
        "response_types_supported": ["code"],
        "grant_types_supported": ["authorization_code", "refresh_token"],
        "code_challenge_methods_supported": ["S256"],
        "token_endpoint_auth_methods_supported": ["none"],
        "scopes_supported": ["mcp"],
        "authorization_response_iss_parameter_supported": true,
        "client_id_metadata_document_supported": false,
    })
}

fn protected_resource_metadata(headers: &HeaderMap) -> Value {
    json!({
        "resource": resource_uri(headers),
        "authorization_servers": [issuer(headers)],
        "scopes_supported": ["mcp"],
        "bearer_methods_supported": ["header"],
    })
}

async fn get_protected_resource(headers: HeaderMap) -> Json<Value> {
    Json(protected_resource_metadata(&headers))
}

async fn get_authorization_server_metadata(headers: HeaderMap) -> Json<Value> {
    Json(authorization_server_metadata(&headers))
}

#[derive(Debug, Deserialize)]
struct AuthorizeQuery {
    response_type: Option<String>,
    client_id: Option<String>,
    redirect_uri: Option<String>,
    code_challenge: Option<String>,
    code_challenge_method: Option<String>,
    state: Option<String>,
    resource: Option<String>,
    scope: Option<String>,
}

#[instrument(skip(state))]
async fn start_authorization(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(query): Query<AuthorizeQuery>,
) -> Response {
    match create_pending_authorization(&state, &headers, query).await {
        Ok(id) => Redirect::temporary(&format!(
            "{}/oauth/authorize?request={}",
            frontend_base_url().trim_end_matches('/'),
            id
        ))
        .into_response(),
        Err(err) => err.into_response(),
    }
}

async fn create_pending_authorization(
    state: &AppState,
    headers: &HeaderMap,
    query: AuthorizeQuery,
) -> Result<Uuid, OAuthError> {
    if query.response_type.as_deref().unwrap_or("") != "code" {
        return Err(OAuthError::new(
            StatusCode::BAD_REQUEST,
            "unsupported_response_type",
            "response_type must be code",
        ));
    }
    let method = query
        .code_challenge_method
        .as_deref()
        .unwrap_or("S256")
        .to_ascii_uppercase();
    if method != "S256" {
        return Err(OAuthError::new(
            StatusCode::BAD_REQUEST,
            "invalid_request",
            "code_challenge_method must be S256",
        ));
    }
    let code_challenge = query
        .code_challenge
        .filter(|s| !s.is_empty())
        .ok_or_else(|| {
            OAuthError::new(
                StatusCode::BAD_REQUEST,
                "invalid_request",
                "code_challenge required",
            )
        })?;
    let redirect_uri = query
        .redirect_uri
        .filter(|s| !s.is_empty())
        .ok_or_else(|| {
            OAuthError::new(
                StatusCode::BAD_REQUEST,
                "invalid_request",
                "redirect_uri required",
            )
        })?;
    if !oauth::is_allowed_redirect_uri(&redirect_uri) {
        return Err(OAuthError::new(
            StatusCode::BAD_REQUEST,
            "invalid_request",
            "redirect_uri is not allowed",
        ));
    }
    let client_id_str = query.client_id.filter(|s| !s.is_empty()).ok_or_else(|| {
        OAuthError::new(
            StatusCode::BAD_REQUEST,
            "invalid_request",
            "client_id required",
        )
    })?;
    let client_id = Uuid::parse_str(&client_id_str).map_err(|_| {
        OAuthError::new(
            StatusCode::BAD_REQUEST,
            "invalid_client",
            "invalid client_id",
        )
    })?;

    let client = sqlx::query!(
        r#"
        SELECT id, redirect_uris
        FROM oauth_clients
        WHERE id = $1
        "#,
        client_id
    )
    .fetch_optional(&state.db)
    .await
    .map_err(|_| {
        OAuthError::new(
            StatusCode::INTERNAL_SERVER_ERROR,
            "server_error",
            "failed to load client",
        )
    })?
    .ok_or_else(|| {
        OAuthError::new(
            StatusCode::BAD_REQUEST,
            "invalid_client",
            "unknown client_id",
        )
    })?;

    if !client.redirect_uris.iter().any(|u| u == &redirect_uri) {
        return Err(OAuthError::new(
            StatusCode::BAD_REQUEST,
            "invalid_request",
            "redirect_uri not registered",
        ));
    }

    let id = Uuid::new_v4();
    let expires_at = Utc::now() + Duration::minutes(10);
    let iss = issuer(headers);
    sqlx::query!(
        r#"
        INSERT INTO oauth_pending_requests (
            id, client_id, redirect_uri, code_challenge, code_challenge_method,
            state, resource, scope, expires_at, issuer
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        "#,
        id,
        client_id,
        redirect_uri,
        code_challenge,
        method,
        query.state,
        query.resource,
        query.scope,
        expires_at,
        iss
    )
    .execute(&state.db)
    .await
    .map_err(|_| {
        OAuthError::new(
            StatusCode::INTERNAL_SERVER_ERROR,
            "server_error",
            "failed to start authorization",
        )
    })?;

    Ok(id)
}

#[derive(Debug, Serialize)]
struct PendingAuthorizationResponse {
    request_id: String,
    client_id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    client_name: Option<String>,
    redirect_uri: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    state: Option<String>,
}

#[instrument(skip(state))]
async fn get_pending_authorization(
    State(state): State<AppState>,
    Path(request_id): Path<String>,
) -> Result<Json<PendingAuthorizationResponse>, AppError> {
    let id = Uuid::parse_str(&request_id).map_err(|_| AppError::not_found("request not found"))?;
    let row = sqlx::query!(
        r#"
        SELECT p.id, p.client_id, p.redirect_uri, p.state, p.expires_at, p.consumed_at,
               c.client_name
        FROM oauth_pending_requests p
        JOIN oauth_clients c ON c.id = p.client_id
        WHERE p.id = $1
        "#,
        id
    )
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::not_found("request not found"))?;

    if row.consumed_at.is_some() || row.expires_at < Utc::now() {
        return Err(AppError::not_found("request not found"));
    }

    Ok(Json(PendingAuthorizationResponse {
        request_id: row.id.to_string(),
        client_id: row.client_id.to_string(),
        client_name: row.client_name,
        redirect_uri: row.redirect_uri,
        state: row.state,
    }))
}

#[derive(Debug, Deserialize)]
struct DynamicClientRegistrationRequest {
    #[serde(default)]
    redirect_uris: Vec<String>,
    #[serde(default)]
    client_name: Option<String>,
    #[serde(default)]
    token_endpoint_auth_method: Option<String>,
    #[serde(default)]
    grant_types: Option<Vec<String>>,
    #[serde(default)]
    response_types: Option<Vec<String>>,
}

#[derive(Debug, Serialize)]
struct DynamicClientRegistrationResponse {
    client_id: String,
    client_id_issued_at: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    client_name: Option<String>,
    redirect_uris: Vec<String>,
    token_endpoint_auth_method: String,
    grant_types: Vec<String>,
    response_types: Vec<String>,
}

#[instrument(skip(state, payload))]
async fn register_client(
    State(state): State<AppState>,
    Json(payload): Json<DynamicClientRegistrationRequest>,
) -> Result<(StatusCode, Json<DynamicClientRegistrationResponse>), OAuthError> {
    if payload.redirect_uris.is_empty() {
        return Err(OAuthError::new(
            StatusCode::BAD_REQUEST,
            "invalid_client_metadata",
            "redirect_uris required",
        ));
    }
    let redirect_uris: Vec<String> = payload
        .redirect_uris
        .into_iter()
        .filter(|uri| oauth::is_allowed_redirect_uri(uri))
        .collect();
    if redirect_uris.is_empty() {
        return Err(OAuthError::new(
            StatusCode::BAD_REQUEST,
            "invalid_redirect_uri",
            "no supported redirect_uris (loopback http, https, or native app URI scheme)",
        ));
    }

    let auth_method = payload
        .token_endpoint_auth_method
        .unwrap_or_else(|| "none".to_string());
    if auth_method != "none" {
        return Err(OAuthError::new(
            StatusCode::BAD_REQUEST,
            "invalid_client_metadata",
            "only token_endpoint_auth_method=none is supported",
        ));
    }

    let client_id = Uuid::new_v4();
    let issued_at = Utc::now().timestamp();
    sqlx::query!(
        r#"
        INSERT INTO oauth_clients (id, client_name, redirect_uris, token_endpoint_auth_method)
        VALUES ($1, $2, $3, $4)
        "#,
        client_id,
        payload.client_name.as_deref(),
        &redirect_uris,
        auth_method
    )
    .execute(&state.db)
    .await
    .map_err(|_| {
        OAuthError::new(
            StatusCode::INTERNAL_SERVER_ERROR,
            "server_error",
            "failed to register client",
        )
    })?;

    Ok((
        StatusCode::CREATED,
        Json(DynamicClientRegistrationResponse {
            client_id: client_id.to_string(),
            client_id_issued_at: issued_at,
            client_name: payload.client_name,
            redirect_uris,
            token_endpoint_auth_method: "none".to_string(),
            grant_types: payload
                .grant_types
                .unwrap_or_else(|| vec!["authorization_code".into(), "refresh_token".into()]),
            response_types: payload
                .response_types
                .unwrap_or_else(|| vec!["code".into()]),
        }),
    ))
}

#[derive(Debug, Deserialize)]
struct ConsentRequest {
    request_id: String,
}

#[derive(Debug, Serialize)]
struct ConsentResponse {
    redirect_to: String,
}

#[instrument(skip(state, headers, payload))]
async fn consent(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(payload): Json<ConsentRequest>,
) -> Result<Json<ConsentResponse>, AppError> {
    let Some(key) = state.oauth_token_hmac_key.as_ref() else {
        return Err(AppError::service_unavailable(
            "OAuth is not configured; set API_TOKEN_SECRET",
        ));
    };

    let user = current_user_from_headers(&headers, &state).await?;
    match user.account_type {
        AccountType::Admin => {}
        AccountType::Organizer if user.organizer_id.is_some() => {}
        _ => {
            return Err(AppError::unauthorized(
                "organizer or admin account required",
            ));
        }
    }

    let request_id = Uuid::parse_str(&payload.request_id)
        .map_err(|_| AppError::validation("invalid request_id"))?;

    let pending = sqlx::query!(
        r#"
        SELECT id, client_id, redirect_uri, code_challenge, code_challenge_method,
               state, resource, issuer, expires_at, consumed_at
        FROM oauth_pending_requests
        WHERE id = $1
        "#,
        request_id
    )
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::validation("unknown request_id"))?;

    if pending.consumed_at.is_some() || pending.expires_at < Utc::now() {
        return Err(AppError::validation("authorization request expired"));
    }
    if pending.code_challenge_method != "S256" {
        return Err(AppError::validation("code_challenge_method must be S256"));
    }
    if !oauth::is_allowed_redirect_uri(&pending.redirect_uri) {
        return Err(AppError::validation("redirect_uri is not allowed"));
    }

    let updated = sqlx::query!(
        r#"
        UPDATE oauth_pending_requests
        SET consumed_at = NOW()
        WHERE id = $1 AND consumed_at IS NULL
        "#,
        request_id
    )
    .execute(&state.db)
    .await?;
    if updated.rows_affected() == 0 {
        return Err(AppError::validation("authorization request expired"));
    }

    let code = oauth::generate_authorization_code();
    let code_hmac = oauth::hash_raw(key, &code);
    let expires_at = Utc::now() + Duration::minutes(10);

    sqlx::query!(
        r#"
        INSERT INTO oauth_authorization_codes (
            code_hmac, client_id, account_id, redirect_uri,
            code_challenge, code_challenge_method, resource, expires_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        "#,
        &code_hmac[..],
        pending.client_id,
        user.account_id,
        pending.redirect_uri,
        pending.code_challenge,
        pending.code_challenge_method,
        pending.resource.as_deref(),
        expires_at
    )
    .execute(&state.db)
    .await?;

    let mut redirect = append_query_param(&pending.redirect_uri, "code", &code);
    if let Some(state) = pending.state.as_deref().filter(|s| !s.is_empty()) {
        redirect = append_query_param(&redirect, "state", state);
    }
    let iss = if pending.issuer.is_empty() {
        issuer(&headers)
    } else {
        pending.issuer
    };
    redirect = append_query_param(&redirect, "iss", &iss);

    Ok(Json(ConsentResponse {
        redirect_to: redirect,
    }))
}

fn append_query_param(uri: &str, key: &str, value: &str) -> String {
    let sep = if uri.contains('?') { '&' } else { '?' };
    format!("{uri}{sep}{key}={}", urlencoding_encode(value))
}

fn urlencoding_encode(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    for b in s.bytes() {
        match b {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                out.push(b as char);
            }
            _ => {
                out.push('%');
                out.push(char::from_digit((b >> 4) as u32, 16).unwrap());
                out.push(char::from_digit((b & 0xf) as u32, 16).unwrap());
            }
        }
    }
    out
}

#[derive(Debug, Deserialize)]
struct TokenForm {
    grant_type: String,
    #[serde(default)]
    code: Option<String>,
    #[serde(default)]
    redirect_uri: Option<String>,
    #[serde(default)]
    client_id: Option<String>,
    #[serde(default)]
    code_verifier: Option<String>,
    #[serde(default)]
    refresh_token: Option<String>,
    #[serde(default)]
    resource: Option<String>,
}

#[derive(Debug, Serialize)]
struct TokenResponse {
    access_token: String,
    token_type: &'static str,
    expires_in: i64,
    refresh_token: String,
    scope: &'static str,
}

fn invalid_grant() -> OAuthError {
    OAuthError::new(
        StatusCode::BAD_REQUEST,
        "invalid_grant",
        "invalid authorization code or refresh token",
    )
}

fn token_server_error() -> OAuthError {
    OAuthError::new(
        StatusCode::INTERNAL_SERVER_ERROR,
        "server_error",
        "token request failed",
    )
}

#[instrument(skip(state, form))]
async fn token(
    State(state): State<AppState>,
    Form(form): Form<TokenForm>,
) -> Result<Json<TokenResponse>, OAuthError> {
    let Some(key) = state.oauth_token_hmac_key.as_ref() else {
        return Err(OAuthError::new(
            StatusCode::SERVICE_UNAVAILABLE,
            "temporarily_unavailable",
            "OAuth is not configured; set API_TOKEN_SECRET",
        ));
    };

    match form.grant_type.as_str() {
        "authorization_code" => {
            let code = form.code.as_deref().ok_or_else(|| {
                OAuthError::new(StatusCode::BAD_REQUEST, "invalid_request", "code required")
            })?;
            let redirect_uri = form.redirect_uri.as_deref().ok_or_else(|| {
                OAuthError::new(
                    StatusCode::BAD_REQUEST,
                    "invalid_request",
                    "redirect_uri required",
                )
            })?;
            let client_id_str = form.client_id.as_deref().ok_or_else(|| {
                OAuthError::new(
                    StatusCode::BAD_REQUEST,
                    "invalid_request",
                    "client_id required",
                )
            })?;
            let code_verifier = form.code_verifier.as_deref().ok_or_else(|| {
                OAuthError::new(
                    StatusCode::BAD_REQUEST,
                    "invalid_request",
                    "code_verifier required",
                )
            })?;

            let client_id = Uuid::parse_str(client_id_str).map_err(|_| {
                OAuthError::new(
                    StatusCode::UNAUTHORIZED,
                    "invalid_client",
                    "invalid client_id",
                )
            })?;
            let code_hmac = oauth::hash_raw(key, code);

            let row = sqlx::query!(
                r#"
                UPDATE oauth_authorization_codes
                SET used_at = NOW()
                WHERE code_hmac = $1 AND used_at IS NULL AND expires_at > NOW()
                RETURNING client_id, account_id, redirect_uri, code_challenge,
                          code_challenge_method, resource
                "#,
                &code_hmac[..]
            )
            .fetch_optional(&state.db)
            .await
            .map_err(|_| token_server_error())?
            .ok_or_else(invalid_grant)?;

            if row.client_id != client_id {
                return Err(invalid_grant());
            }
            if row.redirect_uri != redirect_uri {
                return Err(invalid_grant());
            }
            if row.code_challenge_method != "S256" {
                return Err(invalid_grant());
            }
            let expected = oauth::pkce_s256_challenge(code_verifier);
            if expected != row.code_challenge {
                return Err(invalid_grant());
            }
            if let Some(expected_resource) = row.resource.as_deref()
                && let Some(got) = form.resource.as_deref()
                && got != expected_resource
            {
                return Err(invalid_grant());
            }

            issue_tokens(&state, key, row.account_id, client_id).await
        }
        "refresh_token" => {
            let refresh = form.refresh_token.as_deref().ok_or_else(|| {
                OAuthError::new(
                    StatusCode::BAD_REQUEST,
                    "invalid_request",
                    "refresh_token required",
                )
            })?;
            if !refresh.starts_with("cle_rt_") {
                return Err(invalid_grant());
            }
            let refresh_hmac = oauth::hash_raw(key, refresh);
            let row = sqlx::query!(
                r#"
                SELECT id, account_id, client_id, refresh_expires_at, revoked_at
                FROM oauth_tokens
                WHERE refresh_token_hmac = $1
                "#,
                &refresh_hmac[..]
            )
            .fetch_optional(&state.db)
            .await
            .map_err(|_| token_server_error())?
            .ok_or_else(invalid_grant)?;

            if row.revoked_at.is_some() || row.refresh_expires_at < Utc::now() {
                return Err(invalid_grant());
            }
            if let Some(client_id_str) = form.client_id.as_deref() {
                let client_id = Uuid::parse_str(client_id_str).map_err(|_| {
                    OAuthError::new(
                        StatusCode::UNAUTHORIZED,
                        "invalid_client",
                        "invalid client_id",
                    )
                })?;
                if row.client_id != client_id {
                    return Err(invalid_grant());
                }
            }

            sqlx::query!(
                "UPDATE oauth_tokens SET revoked_at = NOW() WHERE id = $1",
                row.id
            )
            .execute(&state.db)
            .await
            .map_err(|_| token_server_error())?;

            issue_tokens(&state, key, row.account_id, row.client_id).await
        }
        _ => Err(OAuthError::new(
            StatusCode::BAD_REQUEST,
            "unsupported_grant_type",
            "supported grant_types: authorization_code, refresh_token",
        )),
    }
}

async fn issue_tokens(
    state: &AppState,
    key: &[u8; 32],
    account_id: i64,
    client_id: Uuid,
) -> Result<Json<TokenResponse>, OAuthError> {
    let access = oauth::generate_access_token();
    let refresh = oauth::generate_refresh_token();
    let access_hmac = oauth::hash_raw(key, &access);
    let refresh_hmac = oauth::hash_raw(key, &refresh);
    let access_expires_at = Utc::now() + Duration::hours(1);
    let refresh_expires_at = Utc::now() + Duration::days(30);

    sqlx::query!(
        r#"
        INSERT INTO oauth_tokens (
            account_id, client_id, access_token_hmac, refresh_token_hmac,
            access_expires_at, refresh_expires_at
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        "#,
        account_id,
        client_id,
        &access_hmac[..],
        &refresh_hmac[..],
        access_expires_at,
        refresh_expires_at
    )
    .execute(&state.db)
    .await
    .map_err(|_| token_server_error())?;

    Ok(Json(TokenResponse {
        access_token: access,
        token_type: "Bearer",
        expires_in: 3600,
        refresh_token: refresh,
        scope: "mcp",
    }))
}

#[derive(Debug, Serialize)]
struct ClientInfoResponse {
    client_id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    client_name: Option<String>,
}

#[instrument(skip(state))]
async fn get_client(
    State(state): State<AppState>,
    Path(client_id): Path<String>,
) -> Result<Json<ClientInfoResponse>, AppError> {
    let id = Uuid::parse_str(&client_id).map_err(|_| AppError::not_found("client not found"))?;
    let row = sqlx::query!(
        r#"
        SELECT id, client_name
        FROM oauth_clients
        WHERE id = $1
        "#,
        id
    )
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::not_found("client not found"))?;

    Ok(Json(ClientInfoResponse {
        client_id: row.id.to_string(),
        client_name: row.client_name,
    }))
}

pub(crate) fn api_router() -> Router<AppState> {
    Router::new()
        .route("/protected-resource", get(get_protected_resource))
        .route(
            "/.well-known/oauth-authorization-server",
            get(get_authorization_server_metadata),
        )
        .route("/authorize", get(start_authorization))
        .route("/pending/{request_id}", get(get_pending_authorization))
        .route("/register", post(register_client))
        .route("/token", post(token))
        .route("/consent", post(consent))
        .route("/clients/{client_id}", get(get_client))
}

pub(crate) fn well_known_router() -> Router<AppState> {
    Router::new()
        .route(
            "/.well-known/oauth-protected-resource",
            get(get_protected_resource),
        )
        .route(
            "/.well-known/oauth-protected-resource/mcp",
            get(get_protected_resource),
        )
        .route(
            "/.well-known/oauth-authorization-server",
            get(get_authorization_server_metadata),
        )
        .route(
            "/.well-known/oauth-authorization-server/api/v1/oauth",
            get(get_authorization_server_metadata),
        )
}
