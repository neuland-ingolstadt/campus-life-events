mod app_state;
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
use tracing::info;
use tracing_subscriber::{EnvFilter, layer::SubscriberExt, util::SubscriberInitExt};
use utoipa::OpenApi;
use utoipa_swagger_ui::SwaggerUi;

use crate::{
    app_state::AppState,
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

    info!("✅ Connected to database");

    // Run database migrations at startup
    sqlx::migrate!("./migrations")
        .run(&pool)
        .await
        .expect("Failed to run migrations");
    info!("✅ Database migrations applied");

    let email_client = match EmailClient::from_env() {
        Ok(Some(client)) => {
            info!("📧 Email notifications enabled");
            Some(client)
        }
        Ok(None) => {
            info!("📧 Email notifications disabled (SMTP env vars not set)");
            None
        }
        Err(EmailClientError::IncompleteConfig(missing)) => {
            info!(
                missing = missing.as_str(),
                "📧 Email notifications disabled; SMTP config incomplete"
            );
            None
        }
        Err(err) => {
            panic!("Failed to initialize email client: {err}");
        }
    };

    let state = AppState {
        db: pool.clone(),
        email: email_client,
    };

    // Configure CORS to be more restrictive
    let allowed_origins = std::env::var("ALLOWED_ORIGINS")
        .unwrap_or_else(|_| "http://localhost:3000,https://localhost:3000".to_string())
        .split(',')
        .map(|origin| origin.trim().parse::<HeaderValue>().unwrap())
        .collect::<Vec<_>>();

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

    let swagger_router: Router<AppState> = SwaggerUi::new("/api/swagger-ui")
        .url("/api/api-docs/openapi.json", ApiDoc::openapi())
        .into();

    let api = Router::new()
        .nest("/api/v1", api_router())
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
    info!(?addr, "✅ Server started successfully");

    let listener = TcpListener::bind(addr)
        .await
        .expect("failed to bind address");
    axum::serve(listener, app.into_make_service())
        .await
        .expect("server error");
}

fn init_tracing() {
    let env_filter = EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info"));

    tracing_subscriber::registry()
        .with(env_filter)
        .with(tracing_subscriber::fmt::layer())
        .init();
}
