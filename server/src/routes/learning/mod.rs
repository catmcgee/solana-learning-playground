mod request;
mod session;
mod tools;

use std::{net::SocketAddr, sync::Arc};

use anyhow::Context;
use axum::{
    body::Body,
    extract::{ConnectInfo, State},
    http::{header, HeaderMap, Response, StatusCode},
    response::IntoResponse,
    Json,
};
use futures_util::StreamExt;
use reqwest::Client;
use serde::Serialize;
use tokio::sync::Mutex;
use uuid::Uuid;

use self::{
    request::{create_openai_request, validate_ai_request, AiRequest},
    session::{client_ip, UsageCounters},
};
use crate::error::{Error, Result};

const MAX_OUTPUT_TOKENS: u32 = 4_096;

#[derive(Clone)]
pub struct LearningState {
    client: Client,
    openai_api_key: Arc<String>,
    openai_model: Arc<String>,
    session_secret: Arc<Vec<u8>>,
    usage: Arc<Mutex<UsageCounters>>,
    ai_daily_limit: u32,
    ai_global_daily_limit: u32,
}

impl LearningState {
    pub fn new(
        openai_api_key: String,
        openai_model: String,
        session_secret: String,
        ai_daily_limit: u32,
        ai_global_daily_limit: u32,
    ) -> Self {
        Self {
            client: Client::new(),
            openai_api_key: Arc::new(openai_api_key),
            openai_model: Arc::new(openai_model),
            session_secret: Arc::new(session_secret.into_bytes()),
            usage: Arc::default(),
            ai_daily_limit,
            ai_global_daily_limit,
        }
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LearningSessionResponse {
    token: String,
}

pub async fn learning_session(
    State(state): State<LearningState>,
) -> Result<Json<LearningSessionResponse>> {
    let token = state.sign_session(Uuid::new_v4())?;
    Ok(Json(LearningSessionResponse { token }))
}

pub async fn ai_response(
    State(state): State<LearningState>,
    ConnectInfo(peer): ConnectInfo<SocketAddr>,
    headers: HeaderMap,
    Json(payload): Json<AiRequest>,
) -> Result<Response<Body>> {
    let owner = state
        .verify_session(&headers)
        .map_err(|error| Error::Unauthorized(error.to_string()))?;
    validate_ai_request(&payload).map_err(|error| Error::BadRequest(error.to_string()))?;

    if state.openai_api_key.is_empty() {
        return Ok((
            StatusCode::SERVICE_UNAVAILABLE,
            "The tutor is not configured. Set PG_OPENAI_API_KEY on the server.",
        )
            .into_response());
    }

    let remaining = state
        .consume_ai_turn(owner, client_ip(&headers, peer.ip()))
        .await
        .map_err(|error| Error::TooManyRequests(error.to_string()))?;
    let request = create_openai_request(payload, state.openai_model.as_str(), owner);

    let upstream = state
        .client
        .post("https://api.openai.com/v1/responses")
        .bearer_auth(state.openai_api_key.as_str())
        .json(&request)
        .send()
        .await
        .context("OpenAI request failed")?;
    if !upstream.status().is_success() {
        let status = upstream.status();
        let body = upstream
            .text()
            .await
            .unwrap_or_else(|_| "OpenAI request failed".into());
        return Ok((status, body).into_response());
    }

    Ok(stream_response(upstream, remaining))
}

fn stream_response(upstream: reqwest::Response, remaining: u32) -> Response<Body> {
    let stream = upstream
        .bytes_stream()
        .map(|chunk| chunk.map_err(std::io::Error::other));
    let mut response = Response::new(Body::from_stream(stream));
    response.headers_mut().insert(
        header::CONTENT_TYPE,
        header::HeaderValue::from_static("text/event-stream"),
    );
    response.headers_mut().insert(
        header::CACHE_CONTROL,
        header::HeaderValue::from_static("no-cache, no-transform"),
    );
    response.headers_mut().insert(
        "x-solpg-ai-remaining",
        header::HeaderValue::from_str(&remaining.to_string())
            .unwrap_or_else(|_| header::HeaderValue::from_static("0")),
    );
    response
}
