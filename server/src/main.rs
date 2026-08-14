mod config;
mod db;
mod error;
mod log;
mod middlewares;
mod package;
mod program;
mod routes;
mod utils;

use std::net::{Ipv4Addr, SocketAddr};

use anyhow::Result;
use axum::{
    middleware,
    routing::{get, post},
    Router,
};
use tokio::net::TcpListener;

use self::{config::Config, log::info, middlewares::*, routes::*};

#[tokio::main]
async fn main() -> Result<()> {
    let config = Config::from_env();
    log::init(config.verbose);
    info!("Config loaded");

    db::init(&config.db_uri, config.db_name).await?;
    info!("DB initialized");

    let stable_routes = Router::new()
        .route(
            "/build",
            post(build).with_state(BuildState::new(config.build_concurrency)),
        )
        .route("/deploy/{uuid}", get(deploy))
        .route("/share/{id}", get(share_get))
        .route("/new", post(share_new));

    let learning_state = LearningState::new(
        config.openai_api_key,
        config.openai_model,
        config.learning_session_secret,
        config.learning_ai_daily_limit,
        config.learning_ai_global_daily_limit,
    );
    let learning_routes = Router::new()
        .route("/learning/session", post(learning_session))
        .route("/ai/responses", post(ai_response))
        .with_state(learning_state);

    let unstable_routes = if cfg!(feature = "unstable") {
        Router::new()
            .route("/packages/{*name}", get(packages))
            .route("/types/{*name}", get(types))
    } else {
        Router::new()
    };

    let app = Router::new()
        .merge(stable_routes)
        .merge(learning_routes)
        .nest("/unstable", unstable_routes)
        .layer(compression())
        .layer(payload_limit(config.payload_limit))
        .layer(cors(config.client_urls))
        .layer(middleware::from_fn(log));

    let addr = SocketAddr::from((Ipv4Addr::UNSPECIFIED, config.port));
    let listener = TcpListener::bind(addr).await?;
    info!("Listening on {addr}");

    axum::serve(
        listener,
        app.into_make_service_with_connect_info::<SocketAddr>(),
    )
    .await?;

    Ok(())
}
