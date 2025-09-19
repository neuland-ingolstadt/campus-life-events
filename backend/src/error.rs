use axum::{
    Json,
    http::StatusCode,
    response::{IntoResponse, Response},
};
use thiserror::Error;

use crate::responses::ErrorResponse;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("resource not found")]
    NotFound { message: String },
    #[error("invalid request: {0}")]
    Validation(String),
    #[error("unauthorized: {0}")]
    Unauthorized(String),
    #[error(transparent)]
    Sqlx(#[from] sqlx::Error),
    #[error(transparent)]
    Serde(#[from] serde_json::Error),
}

impl AppError {
    pub fn not_found(msg: impl Into<String>) -> Self {
        Self::NotFound {
            message: msg.into(),
        }
    }

    pub fn validation(msg: impl Into<String>) -> Self {
        Self::Validation(msg.into())
    }

    pub fn unauthorized(msg: impl Into<String>) -> Self {
        Self::Unauthorized(msg.into())
    }

    fn status_code(&self) -> StatusCode {
        match self {
            AppError::NotFound { .. } => StatusCode::NOT_FOUND,
            AppError::Validation(_) => StatusCode::BAD_REQUEST,
            AppError::Unauthorized(_) => StatusCode::UNAUTHORIZED,
            AppError::Sqlx(error) => map_sqlx_error_to_status(error),
            AppError::Serde(_) => StatusCode::INTERNAL_SERVER_ERROR,
        }
    }

    fn message(&self) -> String {
        match self {
            AppError::NotFound { message } => message.clone(),
            AppError::Validation(message) => message.clone(),
            AppError::Unauthorized(message) => message.clone(),
            AppError::Sqlx(error) => match error {
                sqlx::Error::RowNotFound => "resource not found".to_string(),
                _ => error
                    .as_database_error()
                    .map(|db_err| db_err.message().to_string())
                    .unwrap_or_else(|| "database error".to_string()),
            },
            AppError::Serde(_) => "unexpected error".to_string(),
        }
    }
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let status = self.status_code();
        let message = self.message();

        let body = Json(ErrorResponse { message });

        (status, body).into_response()
    }
}

fn map_sqlx_error_to_status(error: &sqlx::Error) -> StatusCode {
    match error {
        sqlx::Error::RowNotFound => StatusCode::NOT_FOUND,
        _ => {
            if let Some(db_error) = error.as_database_error() {
                match db_error.code().as_deref() {
                    Some("23505") => StatusCode::CONFLICT,
                    Some("23503") => StatusCode::CONFLICT,
                    Some("P0001") => StatusCode::BAD_REQUEST,
                    _ => StatusCode::INTERNAL_SERVER_ERROR,
                }
            } else {
                StatusCode::INTERNAL_SERVER_ERROR
            }
        }
    }
}
