mod app_state;
mod dto;
mod error;
mod models;
mod openapi;
mod responses;
mod routes;

use std::net::SocketAddr;

use axum::Router;
use dotenvy::dotenv;
use sqlx::postgres::PgPoolOptions;
use tokio::net::TcpListener;
use tower_http::cors::{Any, CorsLayer};
use tracing::info;
use tracing_subscriber::{EnvFilter, layer::SubscriberExt, util::SubscriberInitExt};
use utoipa::OpenApi;
use utoipa_swagger_ui::SwaggerUi;

use crate::{app_state::AppState, openapi::ApiDoc, routes::api_router};

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

    let state = AppState { db: pool.clone() };

    let cors = CorsLayer::new()
        .allow_methods(Any)
        .allow_origin(Any)
        .allow_headers(Any);

    let swagger_router: Router<AppState> = SwaggerUi::new("/swagger-ui")
        .url("/api-docs/openapi.json", ApiDoc::openapi())
        .into();

    let api = Router::new().nest("/api/v1", api_router());

    let app = Router::new()
        .merge(api)
        .merge(swagger_router)
        .layer(cors)
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
