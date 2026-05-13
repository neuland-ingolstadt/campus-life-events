use axum::{
    Json, Router,
    extract::State,
    http::{HeaderMap, StatusCode},
    routing::post,
};
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use tracing::{instrument, warn};
use uuid::Uuid;

use crate::{
    api_token,
    app_state::AppState,
    dto::{
        CreateEventRequest, CreateOrganizerRequest, NewsletterDataQuery, UpdateEventRequest,
        UpdateOrganizerRequest,
    },
    error::AppError,
    models::{
        AccountType, AdminInviteRow, AdminWithInvite, Event, Organizer, OrganizerInviteRow,
        OrganizerKind, OrganizerWithInvite,
    },
};

use super::events::{
    create_event_with_user, delete_event_with_user, get_event_with_user, list_events_for_organizer,
    newsletter_data_with_user, update_event_with_user,
};
use super::organizers::update_organizer_with_user;
use super::shared::{AuthedUser, generate_setup_token_value, refresh_organizer_activity_stats};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct JsonRpcRequest {
    pub jsonrpc: String,
    pub id: Option<Value>,
    pub method: String,
    #[serde(default)]
    pub params: Option<Value>,
}

#[derive(Debug, Serialize)]
struct JsonRpcResponse {
    pub jsonrpc: &'static str,
    pub id: Value,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub result: Option<Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<JsonRpcError>,
}

#[derive(Debug, Serialize)]
struct JsonRpcError {
    pub code: i64,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<Value>,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
struct BasicOrganizerInfo {
    pub id: i64,
    pub name: String,
    pub description_de: Option<String>,
    pub description_en: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct McpToolTextResult {
    pub content: Vec<McpTextContent>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct McpTextContent {
    pub r#type: &'static str,
    pub text: String,
}

#[derive(Debug, Deserialize)]
struct EventIdArgs {
    id: i64,
}

#[derive(Debug, Deserialize)]
struct UpdateEventToolArgs {
    id: i64,
    #[serde(flatten)]
    patch: UpdateEventRequest,
}

#[derive(Debug, Deserialize, Default)]
#[serde(default)]
struct ListMyEventsFilteredArgs {
    upcoming_only: Option<bool>,
    limit: Option<i64>,
    offset: Option<i64>,
}

async fn invalidate_public_organizer_caches(state: &AppState) {
    if let Some(cache) = &state.cache {
        if let Err(err) = cache.purge_prefix("public:organizers").await {
            warn!(target: "cache", action = "purge", scope = "public_organizers", %err, "Failed to purge public organizers cache");
        }
        if let Err(err) = cache.purge_prefix("public:events").await {
            warn!(target: "cache", action = "purge", scope = "public_events", %err, "Failed to purge public events cache");
        }
        if let Err(err) = cache.purge_prefix("ical").await {
            warn!(target: "cache", action = "purge", scope = "ical", %err, "Failed to purge iCal cache");
        }
    }
    refresh_organizer_activity_stats(state).await;
}

fn json_rpc_ok(id: Value, result: Value) -> Json<JsonRpcResponse> {
    Json(JsonRpcResponse {
        jsonrpc: "2.0",
        id,
        result: Some(result),
        error: None,
    })
}

fn json_rpc_err(
    id: Value,
    code: i64,
    message: impl Into<String>,
    data: Option<Value>,
) -> Json<JsonRpcResponse> {
    Json(JsonRpcResponse {
        jsonrpc: "2.0",
        id,
        result: None,
        error: Some(JsonRpcError {
            code,
            message: message.into(),
            data,
        }),
    })
}

fn invalid_request(id: Value, message: impl Into<String>) -> (StatusCode, Json<JsonRpcResponse>) {
    (
        StatusCode::BAD_REQUEST,
        json_rpc_err(id, -32600, message, None),
    )
}

fn method_not_found(id: Value, method: &str) -> (StatusCode, Json<JsonRpcResponse>) {
    (
        StatusCode::NOT_FOUND,
        json_rpc_err(id, -32601, format!("method not found: {method}"), None),
    )
}

fn internal_error(id: Value, _message: impl Into<String>) -> (StatusCode, Json<JsonRpcResponse>) {
    (
        StatusCode::INTERNAL_SERVER_ERROR,
        json_rpc_err(id, -32603, "request failed", None),
    )
}

fn mcp_jsonrpc_code_for_status(status: StatusCode) -> i64 {
    match status.as_u16() {
        401 => -32001,
        404 => -32004,
        409 => -32009,
        503 => -32003,
        400 => -32002,
        _ => -32603,
    }
}

fn mcp_from_app_error(id: Value, err: AppError) -> (StatusCode, Json<JsonRpcResponse>) {
    let status = err.http_status();
    let code = mcp_jsonrpc_code_for_status(status);
    (
        status,
        json_rpc_err(id, code, err.safe_jsonrpc_message(), None),
    )
}

fn bearer_token(headers: &HeaderMap) -> Result<&str, AppError> {
    let hv = headers
        .get(axum::http::header::AUTHORIZATION)
        .ok_or_else(|| AppError::unauthorized("missing API token"))?
        .to_str()
        .map_err(|_| AppError::unauthorized("invalid API token"))?;
    let rest = hv
        .strip_prefix("Bearer ")
        .or_else(|| hv.strip_prefix("bearer "))
        .ok_or_else(|| AppError::unauthorized("invalid API token"))?;
    let t = rest.trim();
    if t.is_empty() {
        return Err(AppError::unauthorized("invalid API token"));
    }
    Ok(t)
}

async fn organizer_or_admin_authed_from_bearer(
    headers: &HeaderMap,
    state: &AppState,
) -> Result<AuthedUser, AppError> {
    let raw = bearer_token(headers)?;
    let user = api_token::authed_user_from_bearer(raw, state).await?;
    match user.account_type {
        AccountType::Admin => Ok(user),
        AccountType::Organizer if user.organizer_id.is_some() => Ok(user),
        _ => Err(AppError::unauthorized(
            "organizer or admin account required",
        )),
    }
}

async fn fetch_my_club_info(state: &AppState, organizer_id: i64) -> Result<Organizer, AppError> {
    let row = sqlx::query_as::<_, Organizer>(
        r#"
		SELECT id, name, description_de, description_en, website_url, instagram_url, location, linkedin_url, registration_number, non_profit, newsletter, organizer_kind, created_at, updated_at
		FROM organizers
		WHERE id = $1
		"#,
    )
    .bind(organizer_id)
    .fetch_optional(&state.db)
    .await?;

    row.ok_or_else(|| AppError::not_found("Organizer not found"))
}

async fn fetch_all_clubs_basic(
    state: &AppState,
    kind: Option<OrganizerKind>,
) -> Result<Vec<BasicOrganizerInfo>, AppError> {
    let rows = match kind {
        None => {
            sqlx::query_as::<_, BasicOrganizerInfo>(
                r#"
		SELECT id, name, description_de, description_en
		FROM organizers
		ORDER BY name
		"#,
            )
            .fetch_all(&state.db)
            .await?
        }
        Some(kind) => {
            sqlx::query_as::<_, BasicOrganizerInfo>(
                r#"
		SELECT id, name, description_de, description_en
		FROM organizers
		WHERE organizer_kind = $1
		ORDER BY name
		"#,
            )
            .bind(kind)
            .fetch_all(&state.db)
            .await?
        }
    };
    Ok(rows)
}

async fn fetch_admins_with_invites(state: &AppState) -> Result<Vec<AdminWithInvite>, AppError> {
    let rows = sqlx::query_as::<_, AdminInviteRow>(
        r#"
        SELECT
            id AS account_id,
            display_name,
            email AS account_email,
            created_at,
            updated_at,
            password_hash,
            setup_token,
            setup_token_expires_at
        FROM accounts
        WHERE account_type = 'ADMIN'
        ORDER BY created_at DESC
        "#,
    )
    .fetch_all(&state.db)
    .await?;

    Ok(rows.into_iter().map(AdminWithInvite::from_row).collect())
}

async fn fetch_clubs_with_invites(state: &AppState) -> Result<Vec<OrganizerWithInvite>, AppError> {
    let rows = sqlx::query_as::<_, OrganizerInviteRow>(
        r#"
        SELECT
            o.id AS organizer_id,
            o.name AS organizer_name,
            a.id AS account_id,
            a.email AS account_email,
            o.newsletter AS newsletter,
            o.organizer_kind,
            o.created_at,
            o.updated_at,
            a.password_hash,
            a.setup_token,
            a.setup_token_expires_at
        FROM organizers o
        LEFT JOIN accounts a
            ON a.organizer_id = o.id AND a.account_type = 'ORGANIZER'
        ORDER BY o.created_at DESC
        "#,
    )
    .fetch_all(&state.db)
    .await?;

    Ok(rows
        .into_iter()
        .map(OrganizerWithInvite::from_row)
        .collect())
}

async fn fetch_my_events(state: &AppState, organizer_id: i64) -> Result<Vec<Event>, AppError> {
    let rows = sqlx::query_as::<_, Event>(
		"SELECT id, organizer_id, title_de, title_en, description_de, description_en, start_date_time, end_date_time, event_url, location, publish_app, publish_newsletter, publish_in_ical, publish_web, created_at, updated_at FROM events WHERE organizer_id = $1 ORDER BY start_date_time ASC",
	)
	.bind(organizer_id)
	.fetch_all(&state.db)
	.await?;
    Ok(rows)
}

fn tool_schema_my_club_info() -> Value {
    json!({
        "name": "my_club_info",
        "description": "Fetch the current club's (organizer) full profile.",
        "inputSchema": { "type": "object", "properties": {}, "additionalProperties": false }
    })
}

fn tool_schema_list_clubs_basic() -> Value {
    json!({
        "name": "list_clubs_basic",
        "description": "List all clubs (organizers) with basic info (name + descriptions).",
        "inputSchema": { "type": "object", "properties": {}, "additionalProperties": false }
    })
}

fn tool_schema_invite_club() -> Value {
    json!({
        "name": "invite_club",
        "description": "Invite a new club (organizer): creates organizer + setup token and sends invite email if SMTP is configured (admin only).",
        "inputSchema": {
            "type": "object",
            "required": ["name", "email"],
            "properties": {
                "name": { "type": "string" },
                "email": { "type": "string" }
            },
            "additionalProperties": false
        }
    })
}

fn tool_schema_list_admins_with_invites() -> Value {
    json!({
        "name": "list_admins_with_invites",
        "description": "List all admin accounts including invite status and setup-token expiry (admin only).",
        "inputSchema": { "type": "object", "properties": {}, "additionalProperties": false }
    })
}

fn tool_schema_list_clubs_with_invites() -> Value {
    json!({
        "name": "list_clubs_with_invites",
        "description": "List all clubs (organizers) including invite status and setup-token expiry (admin only).",
        "inputSchema": { "type": "object", "properties": {}, "additionalProperties": false }
    })
}

fn tool_schema_my_events() -> Value {
    json!({
        "name": "my_events",
        "description": "List all events for the current club (organizer).",
        "inputSchema": { "type": "object", "properties": {}, "additionalProperties": false }
    })
}

fn tool_schema_create_my_event() -> Value {
    json!({
        "name": "create_my_event",
        "description": "Create an event for the current club. Datetimes as ISO-8601 UTC strings.",
        "inputSchema": {
            "type": "object",
            "required": ["title_de", "title_en", "start_date_time", "end_date_time"],
            "properties": {
                "title_de": { "type": "string" },
                "title_en": { "type": "string" },
                "description_de": { "type": "string" },
                "description_en": { "type": "string" },
                "start_date_time": { "type": "string", "format": "date-time" },
                "end_date_time": { "type": "string", "format": "date-time" },
                "event_url": { "type": "string" },
                "location": { "type": "string" },
                "publish_app": { "type": "boolean" },
                "publish_newsletter": { "type": "boolean" },
                "publish_in_ical": { "type": "boolean" },
                "publish_web": { "type": "boolean" }
            },
            "additionalProperties": false
        }
    })
}

fn tool_schema_get_my_event() -> Value {
    json!({
        "name": "get_my_event",
        "description": "Get one event by id if it belongs to your club.",
        "inputSchema": {
            "type": "object",
            "required": ["id"],
            "properties": { "id": { "type": "integer" } },
            "additionalProperties": false
        }
    })
}

fn tool_schema_update_my_event() -> Value {
    json!({
        "name": "update_my_event",
        "description": "Update an event by id (your club only). Include at least one field besides id.",
        "inputSchema": {
            "type": "object",
            "required": ["id"],
            "properties": {
                "id": { "type": "integer" },
                "title_de": { "type": "string" },
                "title_en": { "type": "string" },
                "description_de": { "type": "string" },
                "description_en": { "type": "string" },
                "start_date_time": { "type": "string", "format": "date-time" },
                "end_date_time": { "type": "string", "format": "date-time" },
                "event_url": { "type": "string" },
                "location": { "type": "string" },
                "publish_app": { "type": "boolean" },
                "publish_newsletter": { "type": "boolean" },
                "publish_in_ical": { "type": "boolean" },
                "publish_web": { "type": "boolean" }
            },
            "additionalProperties": false
        }
    })
}

fn tool_schema_delete_my_event() -> Value {
    json!({
        "name": "delete_my_event",
        "description": "Delete an event by id (your club only).",
        "inputSchema": {
            "type": "object",
            "required": ["id"],
            "properties": { "id": { "type": "integer" } },
            "additionalProperties": false
        }
    })
}

fn tool_schema_list_my_events_filtered() -> Value {
    json!({
        "name": "list_my_events_filtered",
        "description": "List your club's events with optional upcoming filter and pagination.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "upcoming_only": { "type": "boolean" },
                "limit": { "type": "integer" },
                "offset": { "type": "integer" }
            },
            "additionalProperties": false
        }
    })
}

fn tool_schema_newsletter_upcoming_summary() -> Value {
    json!({
        "name": "newsletter_upcoming_summary",
        "description": "Newsletter dataset for the next two weeks (requires newsletter permission on the organizer). Optional week_start YYYY-MM-DD (Monday of week).",
        "inputSchema": {
            "type": "object",
            "properties": {
                "week_start": { "type": "string", "description": "YYYY-MM-DD" }
            },
            "additionalProperties": false
        }
    })
}

fn tool_schema_update_my_club_profile() -> Value {
    json!({
        "name": "update_my_club_profile",
        "description": "Update your club profile fields (at least one required).",
        "inputSchema": {
            "type": "object",
            "properties": {
                "name": { "type": "string" },
                "description_de": { "type": "string" },
                "description_en": { "type": "string" },
                "website_url": { "type": "string" },
                "instagram_url": { "type": "string" },
                "location": { "type": "string" },
                "linkedin_url": { "type": "string" },
                "registration_number": { "type": "string" },
                "non_profit": { "type": "boolean" }
            },
            "additionalProperties": false
        }
    })
}

fn mcp_initialize_result() -> Value {
    json!({
        "protocolVersion": "2025-03-26",
        "serverInfo": {
            "name": "campus-life-events-backend",
            "version": env!("CARGO_PKG_VERSION"),
        },
        "capabilities": {
            "tools": {}
        }
    })
}

fn mcp_tools_list_result() -> Value {
    json!({
        "tools": [
            tool_schema_my_club_info(),
            tool_schema_list_clubs_basic(),
            tool_schema_my_events(),
            tool_schema_create_my_event(),
            tool_schema_get_my_event(),
            tool_schema_update_my_event(),
            tool_schema_delete_my_event(),
            tool_schema_list_my_events_filtered(),
            tool_schema_newsletter_upcoming_summary(),
            tool_schema_update_my_club_profile(),
        ]
    })
}

fn mcp_tools_list_result_admin() -> Value {
    json!({
        "tools": [
            tool_schema_list_clubs_basic(),
            tool_schema_list_admins_with_invites(),
            tool_schema_list_clubs_with_invites(),
            tool_schema_invite_club(),
            tool_schema_newsletter_upcoming_summary(),
        ]
    })
}

fn tool_text_result(value: Value) -> Result<Value, String> {
    let text =
        serde_json::to_string_pretty(&value).map_err(|_| "failed to serialize tool result")?;
    let out = McpToolTextResult {
        content: vec![McpTextContent {
            r#type: "text",
            text,
        }],
    };
    serde_json::to_value(out).map_err(|_| "failed to serialize tool result".to_string())
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ToolsCallParams {
    pub name: String,
    #[serde(default)]
    pub arguments: Value,
}

#[instrument(skip(state, headers, req))]
async fn handle_post(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(req): Json<JsonRpcRequest>,
) -> Result<(StatusCode, Json<JsonRpcResponse>), (StatusCode, Json<JsonRpcResponse>)> {
    let id = req
        .id
        .clone()
        .unwrap_or_else(|| Value::String(Uuid::new_v4().to_string()));

    if req.jsonrpc != "2.0" {
        return Err(invalid_request(id, "jsonrpc must be '2.0'"));
    }

    let user = organizer_or_admin_authed_from_bearer(&headers, &state)
        .await
        .map_err(|err| mcp_from_app_error(id.clone(), err))?;

    match req.method.as_str() {
        "initialize" => Ok((StatusCode::OK, json_rpc_ok(id, mcp_initialize_result()))),
        "notifications/initialized" => Ok((StatusCode::ACCEPTED, json_rpc_ok(id, json!({})))),
        "tools/list" => {
            let result = if user.is_admin() {
                mcp_tools_list_result_admin()
            } else {
                mcp_tools_list_result()
            };
            Ok((StatusCode::OK, json_rpc_ok(id, result)))
        }
        "tools/call" => {
            let organizer_id = user.organizer_id();

            let Some(params) = req.params else {
                return Err(invalid_request(id, "missing params"));
            };

            let params: ToolsCallParams = serde_json::from_value(params)
                .map_err(|_| invalid_request(id.clone(), "invalid tools/call params"))?;

            if user.is_admin()
                && !matches!(
                    params.name.as_str(),
                    "list_clubs_basic"
                        | "list_admins_with_invites"
                        | "list_clubs_with_invites"
                        | "invite_club"
                        | "newsletter_upcoming_summary"
                )
            {
                return Err(method_not_found(id, params.name.as_str()));
            }

            let result: Result<Value, (StatusCode, Json<JsonRpcResponse>)> = match params
                .name
                .as_str()
            {
                "my_club_info" => {
                    let Some(organizer_id) = organizer_id else {
                        return Err(mcp_from_app_error(
                            id,
                            AppError::unauthorized("organizer account required"),
                        ));
                    };
                    let organizer = fetch_my_club_info(&state, organizer_id)
                        .await
                        .map_err(|e| mcp_from_app_error(id.clone(), e))?;
                    let v = serde_json::to_value(organizer)
                        .map_err(|_| internal_error(id.clone(), "serialize"))?;
                    tool_text_result(v).map_err(|e| internal_error(id.clone(), e))
                }
                "list_clubs_basic" => {
                    let clubs = if user.is_admin() {
                        fetch_all_clubs_basic(&state, None).await
                    } else {
                        let Some(oid) = organizer_id else {
                            return Err(mcp_from_app_error(
                                id,
                                AppError::unauthorized("organizer account required"),
                            ));
                        };
                        let row = sqlx::query!(
                            r#"
                            SELECT organizer_kind as "organizer_kind: OrganizerKind"
                            FROM organizers
                            WHERE id = $1
                            "#,
                            oid
                        )
                        .fetch_optional(&state.db)
                        .await
                        .map_err(|e| mcp_from_app_error(id.clone(), AppError::from(e)))?;
                        let Some(row) = row else {
                            return Err(mcp_from_app_error(
                                id,
                                AppError::not_found("Organizer not found"),
                            ));
                        };
                        fetch_all_clubs_basic(&state, Some(row.organizer_kind)).await
                    }
                    .map_err(|e| mcp_from_app_error(id.clone(), e))?;
                    let v = serde_json::to_value(clubs)
                        .map_err(|_| internal_error(id.clone(), "serialize"))?;
                    tool_text_result(v).map_err(|e| internal_error(id.clone(), e))
                }
                "list_admins_with_invites" => {
                    let admins = fetch_admins_with_invites(&state)
                        .await
                        .map_err(|e| mcp_from_app_error(id.clone(), e))?;
                    let v = serde_json::to_value(admins)
                        .map_err(|_| internal_error(id.clone(), "serialize"))?;
                    tool_text_result(v).map_err(|e| internal_error(id.clone(), e))
                }
                "list_clubs_with_invites" => {
                    let clubs = fetch_clubs_with_invites(&state)
                        .await
                        .map_err(|e| mcp_from_app_error(id.clone(), e))?;
                    let v = serde_json::to_value(clubs)
                        .map_err(|_| internal_error(id.clone(), "serialize"))?;
                    tool_text_result(v).map_err(|e| internal_error(id.clone(), e))
                }
                "invite_club" => {
                    let payload: CreateOrganizerRequest = serde_json::from_value(params.arguments)
                        .map_err(|_| invalid_request(id.clone(), "invalid arguments"))?;

                    let token = generate_setup_token_value();
                    let mut tx = state
                        .db
                        .begin()
                        .await
                        .map_err(|e| mcp_from_app_error(id.clone(), AppError::from(e)))?;

                    let organizer = sqlx::query_as::<_, Organizer>(
                        r#"
                        INSERT INTO organizers (name, organizer_kind)
                        VALUES ($1, $2)
                        RETURNING id, name, description_de, description_en, website_url, instagram_url, location, linkedin_url, registration_number, non_profit, newsletter, organizer_kind, created_at, updated_at
                        "#,
                    )
                    .bind(&payload.name)
                    .bind(payload.organizer_kind)
                    .fetch_one(&mut *tx)
                    .await
                    .map_err(|e| mcp_from_app_error(id.clone(), AppError::from(e)))?;

                    sqlx::query(
                        r#"
                        INSERT INTO accounts (
                            account_type,
                            organizer_id,
                            display_name,
                            email,
                            setup_token,
                            setup_token_expires_at
                        )
                        VALUES ($1::account_type, $2, $3, $4, $5, NOW() + INTERVAL '7 days')
                        "#,
                    )
                    .bind(AccountType::Organizer as AccountType)
                    .bind(organizer.id)
                    .bind(&organizer.name)
                    .bind(&payload.email)
                    .bind(&token)
                    .execute(&mut *tx)
                    .await
                    .map_err(|e| mcp_from_app_error(id.clone(), AppError::from(e)))?;

                    if let Some(email_client) = &state.email {
                        let _ = email_client
                            .send_new_organizer_invite(&payload.email, &payload.name, &token)
                            .await;
                    }

                    tx.commit()
                        .await
                        .map_err(|e| mcp_from_app_error(id.clone(), AppError::from(e)))?;

                    invalidate_public_organizer_caches(&state).await;

                    let v = serde_json::to_value(
                        json!({ "setup_token": token, "organizer_id": organizer.id }),
                    )
                    .map_err(|_| internal_error(id.clone(), "serialize"))?;
                    tool_text_result(v).map_err(|e| internal_error(id.clone(), e))
                }
                "my_events" => {
                    let Some(organizer_id) = organizer_id else {
                        return Err(mcp_from_app_error(
                            id,
                            AppError::unauthorized("organizer account required"),
                        ));
                    };
                    let events = fetch_my_events(&state, organizer_id)
                        .await
                        .map_err(|e| mcp_from_app_error(id.clone(), e))?;
                    let v = serde_json::to_value(events)
                        .map_err(|_| internal_error(id.clone(), "serialize"))?;
                    tool_text_result(v).map_err(|e| internal_error(id.clone(), e))
                }
                "create_my_event" => {
                    let payload: CreateEventRequest = serde_json::from_value(params.arguments)
                        .map_err(|_| invalid_request(id.clone(), "invalid arguments"))?;
                    let event = create_event_with_user(&state, &user, payload)
                        .await
                        .map_err(|e| mcp_from_app_error(id.clone(), e))?;
                    let v = serde_json::to_value(event)
                        .map_err(|_| internal_error(id.clone(), "serialize"))?;
                    tool_text_result(v).map_err(|e| internal_error(id.clone(), e))
                }
                "get_my_event" => {
                    let args: EventIdArgs = serde_json::from_value(params.arguments)
                        .map_err(|_| invalid_request(id.clone(), "invalid arguments"))?;
                    let event = get_event_with_user(&state, &user, args.id)
                        .await
                        .map_err(|e| mcp_from_app_error(id.clone(), e))?;
                    let v = serde_json::to_value(event)
                        .map_err(|_| internal_error(id.clone(), "serialize"))?;
                    tool_text_result(v).map_err(|e| internal_error(id.clone(), e))
                }
                "update_my_event" => {
                    let args: UpdateEventToolArgs = serde_json::from_value(params.arguments)
                        .map_err(|_| invalid_request(id.clone(), "invalid arguments"))?;
                    let event = update_event_with_user(&state, &user, args.id, args.patch)
                        .await
                        .map_err(|e| mcp_from_app_error(id.clone(), e))?;
                    let v = serde_json::to_value(event)
                        .map_err(|_| internal_error(id.clone(), "serialize"))?;
                    tool_text_result(v).map_err(|e| internal_error(id.clone(), e))
                }
                "delete_my_event" => {
                    let args: EventIdArgs = serde_json::from_value(params.arguments)
                        .map_err(|_| invalid_request(id.clone(), "invalid arguments"))?;
                    delete_event_with_user(&state, &user, args.id)
                        .await
                        .map_err(|e| mcp_from_app_error(id.clone(), e))?;
                    let v = serde_json::to_value(json!({ "deleted": true }))
                        .map_err(|_| internal_error(id.clone(), "serialize"))?;
                    tool_text_result(v).map_err(|e| internal_error(id.clone(), e))
                }
                "list_my_events_filtered" => {
                    let Some(organizer_id) = organizer_id else {
                        return Err(mcp_from_app_error(
                            id,
                            AppError::unauthorized("organizer account required"),
                        ));
                    };
                    let args: ListMyEventsFilteredArgs =
                        serde_json::from_value(params.arguments)
                            .map_err(|_| invalid_request(id.clone(), "invalid arguments"))?;
                    let events = list_events_for_organizer(
                        &state,
                        organizer_id,
                        args.upcoming_only,
                        args.limit,
                        args.offset,
                    )
                    .await
                    .map_err(|e| mcp_from_app_error(id.clone(), e))?;
                    let v = serde_json::to_value(events)
                        .map_err(|_| internal_error(id.clone(), "serialize"))?;
                    tool_text_result(v).map_err(|e| internal_error(id.clone(), e))
                }
                "newsletter_upcoming_summary" => {
                    let q: NewsletterDataQuery = serde_json::from_value(params.arguments)
                        .map_err(|_| invalid_request(id.clone(), "invalid arguments"))?;
                    let data = newsletter_data_with_user(&state, &user, q)
                        .await
                        .map_err(|e| mcp_from_app_error(id.clone(), e))?;
                    let v = serde_json::to_value(data)
                        .map_err(|_| internal_error(id.clone(), "serialize"))?;
                    tool_text_result(v).map_err(|e| internal_error(id.clone(), e))
                }
                "update_my_club_profile" => {
                    let Some(organizer_id) = organizer_id else {
                        return Err(mcp_from_app_error(
                            id,
                            AppError::unauthorized("organizer account required"),
                        ));
                    };
                    let payload: UpdateOrganizerRequest = serde_json::from_value(params.arguments)
                        .map_err(|_| invalid_request(id.clone(), "invalid arguments"))?;
                    let org = update_organizer_with_user(&state, &user, organizer_id, payload)
                        .await
                        .map_err(|e| mcp_from_app_error(id.clone(), e))?;
                    let v = serde_json::to_value(org)
                        .map_err(|_| internal_error(id.clone(), "serialize"))?;
                    tool_text_result(v).map_err(|e| internal_error(id.clone(), e))
                }
                other => {
                    return Err(method_not_found(id, other));
                }
            };

            let result = result?;
            Ok((StatusCode::OK, json_rpc_ok(id, result)))
        }
        other => Err(method_not_found(id, other)),
    }
}

pub(crate) fn router() -> Router<AppState> {
    Router::new().route("/mcp", post(handle_post))
}
