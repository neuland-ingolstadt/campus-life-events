mod app_state;
mod cache;
mod dto;
mod email;
mod error;
mod models;
mod openapi;
mod responses;
mod routes;

use std::net::SocketAddr;

use axum::Router;
use axum::http::{HeaderValue, Method, header};
use dotenvy::dotenv;
use sqlx::postgres::PgPoolOptions;
use tokio::net::TcpListener;
use tower_http::{cors::CorsLayer, set_header::SetResponseHeaderLayer};
use tracing::{error, info, warn};
use tracing_subscriber::{EnvFilter, fmt::time::UtcTime};
use utoipa::OpenApi;
use utoipa_swagger_ui::{Config, SwaggerUi, SyntaxHighlight};

use crate::{
    app_state::AppState,
    cache::CacheService,
    email::{EmailClient, EmailClientError},
    openapi::ApiDoc,
    routes::api_router,
};

#[tokio::main]
async fn main() {
    if dotenvy::from_filename(".env.local").is_err() {
        dotenv().ok();
    }
    init_tracing();

    let database_url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set");

    let pool = PgPoolOptions::new()
        .max_connections(10)
        .connect(&database_url)
        .await
        .expect("Failed to connect to database");

    info!(target: "startup", component = "database", action = "connect", "Connected to database");

    // Run database migrations at startup
    sqlx::migrate!("./migrations")
        .run(&pool)
        .await
        .expect("Failed to run migrations");
    info!(target: "startup", component = "database", action = "migrate", "Database migrations applied");

    let email_client = match EmailClient::from_env() {
        Ok(Some(client)) => {
            info!(
                target: "startup",
                component = "email",
                action = "init",
                mode = "enabled",
                "Email notifications enabled"
            );
            Some(client)
        }
        Ok(None) => {
            warn!(
                target: "startup",
                component = "email",
                action = "init",
                mode = "disabled",
                reason = "missing_configuration",
                "Email notifications disabled; SMTP env vars not set"
            );
            None
        }
        Err(EmailClientError::IncompleteConfig(missing)) => {
            warn!(
                target: "startup",
                component = "email",
                action = "init",
                mode = "disabled",
                missing = %missing,
                "Email notifications disabled; SMTP config incomplete"
            );
            None
        }
        Err(err) => {
            error!(
                target: "startup",
                component = "email",
                action = "init",
                %err,
                "Failed to initialize email client"
            );
            panic!("Failed to initialize email client: {err}");
        }
    };

    let cache = build_cache().await;

    let state = AppState {
        db: pool.clone(),
        email: email_client,
        cache,
    };

    // Configure CORS to be more restrictive
    let raw_allowed_origins = std::env::var("ALLOWED_ORIGINS")
        .unwrap_or_else(|_| "http://localhost:3000,https://localhost:3000".to_string());

    let mut allowed_origins = Vec::new();
    for origin in raw_allowed_origins.split(',') {
        let trimmed = origin.trim();
        if trimmed.is_empty() {
            continue;
        }
        match HeaderValue::from_str(trimmed) {
            Ok(value) => allowed_origins.push(value),
            Err(err) => warn!(
                target: "startup",
                component = "cors",
                action = "parse_origin",
                invalid_origin = trimmed,
                %err,
                "Ignoring invalid allowed origin"
            ),
        }
    }

    if allowed_origins.is_empty() {
        warn!(
            target: "startup",
            component = "cors",
            action = "parse_origin",
            source = %raw_allowed_origins,
            "No valid allowed origins configured; using default http://localhost:3000"
        );
        allowed_origins.push(HeaderValue::from_static("http://localhost:3000"));
    }

    let allowed_origin_strings: Vec<String> = allowed_origins
        .iter()
        .map(|value| {
            value
                .to_str()
                .map(|s| s.to_string())
                .unwrap_or_else(|_| String::new())
        })
        .collect();

    info!(
        target: "startup",
        component = "cors",
        action = "configure",
        allowed_origins = ?allowed_origin_strings,
        "Configured CORS allowed origins"
    );

    let cors = CorsLayer::new()
        .allow_methods([
            Method::GET,
            Method::POST,
            Method::PUT,
            Method::DELETE,
            Method::OPTIONS,
        ])
        .allow_origin(allowed_origins)
        .allow_headers([header::CONTENT_TYPE, header::AUTHORIZATION, header::COOKIE])
        .allow_credentials(true);

    // Note: Rate limiting and CSRF protection would require additional middleware
    // that's compatible with the current Axum version. These can be added later
    // with proper middleware implementations.

    let swagger_config = Config::new(["/api/api-docs/openapi.json"])
        .display_operation_id(true)
        .display_request_duration(true)
        .filter(true)
        .persist_authorization(true)
        .try_it_out_enabled(false)
        .with_syntax_highlight(SyntaxHighlight::default().theme("obsidian"));

    let swagger_router: Router<AppState> = SwaggerUi::new("/api/swagger-ui")
        .url("/api/api-docs/openapi.json", ApiDoc::openapi())
        .config(swagger_config)
        .into();

    let api = Router::new()
        .nest("/api/v1", api_router())
        .nest("/api/ical", routes::ical::router())
        .merge(swagger_router);

    let app = Router::new()
        .merge(api)
        .layer(cors)
        .layer(SetResponseHeaderLayer::overriding(
            header::X_FRAME_OPTIONS,
            HeaderValue::from_static("DENY"),
        ))
        .layer(SetResponseHeaderLayer::overriding(
            header::X_CONTENT_TYPE_OPTIONS,
            HeaderValue::from_static("nosniff"),
        ))
        .layer(SetResponseHeaderLayer::overriding(
            header::STRICT_TRANSPORT_SECURITY,
            HeaderValue::from_static("max-age=31536000; includeSubDomains"),
        ))
        .with_state(state);

    let addr: SocketAddr = "0.0.0.0:8080".parse().expect("Invalid listen address");
    info!(target: "startup", %addr, component = "http", action = "listen", "Server ready to accept connections");

    let listener = TcpListener::bind(addr)
        .await
        .expect("failed to bind address");
    axum::serve(listener, app.into_make_service())
        .await
        .expect("server error");
}

fn init_tracing() {
    let env_filter = EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info"));

    tracing_subscriber::fmt()
        .with_env_filter(env_filter)
        .with_target(true)
        .with_level(true)
        .with_file(true)
        .with_line_number(true)
        .with_timer(UtcTime::rfc_3339())
        .compact()
        .init();
}

async fn build_cache() -> Option<CacheService> {
    let redis_url = match std::env::var("REDIS_URL") {
        Ok(url) => url,
        Err(_) => {
            info!(target: "startup", component = "cache", action = "init", mode = "disabled", "Cache disabled; REDIS_URL not set");
            return None;
        }
    };

    let ttl = std::env::var("CACHE_TTL_SECONDS")
        .ok()
        .and_then(|value| value.parse::<u64>().ok())
        .unwrap_or(60);

    match CacheService::connect(&redis_url, ttl, "cle").await {
        Ok(cache) => {
            info!(target: "startup", component = "cache", action = "init", mode = "enabled", ttl_seconds = ttl, "Connected to Redis cache");
            Some(cache)
        }
        Err(err) => {
            warn!(target: "startup", component = "cache", action = "init", mode = "disabled", %err, "Cache disabled due to initialization failure");
            None
        }
    }
}
