use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
};

use crate::log::error;

/// Application result type that can be used in API handler functions
pub type Result<T> = core::result::Result<T, Error>;

/// Application error type that can be returned from [`Result`] in API handler functions.
#[derive(thiserror::Error, Debug)]
pub enum Error {
    #[error("{0}")]
    BadRequest(String),
    #[error("{0}")]
    Unauthorized(String),
    #[error("{0}")]
    TooManyRequests(String),
    /// Catch-all for all remaining errors
    #[error(transparent)]
    Other(#[from] anyhow::Error),
}

impl Error {
    /// Map the error type to the corresponding HTTP status codes.
    fn status_code(&self) -> StatusCode {
        match self {
            Self::BadRequest(_) => StatusCode::BAD_REQUEST,
            Self::Unauthorized(_) => StatusCode::UNAUTHORIZED,
            Self::TooManyRequests(_) => StatusCode::TOO_MANY_REQUESTS,
            Self::Other(_) => StatusCode::INTERNAL_SERVER_ERROR,
        }
    }
}

/// Support converting the errors to an [`axum`] response.
impl IntoResponse for Error {
    fn into_response(self) -> Response {
        // Log the error
        if let Error::Other(e) = &self {
            error!("Other error: {e}");
        }

        (self.status_code(), self.to_string()).into_response()
    }
}
