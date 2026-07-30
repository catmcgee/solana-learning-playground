use std::str::FromStr;

use dotenv::dotenv;
use uuid::Uuid;

/// Server configuration
pub struct Config {
    /// Client URLs to allow requests from
    pub client_urls: Vec<String>,
    /// Port to listen from
    pub port: u16,
    /// Request payload size limit in bytes
    pub payload_limit: usize,
    /// Whether logs should be verbose
    pub verbose: bool,
    /// Database URI
    pub db_uri: String,
    /// Database name
    pub db_name: String,
    /// Maximum amount of concurrent builds
    pub build_concurrency: usize,
    /// OpenAI project key. Kept server-side and never logged.
    pub openai_api_key: String,
    /// OpenAI model used by the learning tutor.
    pub openai_model: String,
    /// Secret used to authenticate anonymous browser sessions.
    pub learning_session_secret: String,
    /// Anonymous AI turns allowed per UTC day.
    pub learning_ai_daily_limit: u32,
    /// Managed Surfpool sessions allowed per anonymous browser.
    pub learning_surfpool_limit: usize,
    /// Managed Surfpool sessions allowed across the server.
    pub learning_surfpool_global_limit: usize,
    /// Minutes before an idle managed Surfpool is reclaimed.
    pub learning_surfpool_idle_minutes: u64,
}

impl Config {
    /// Create [`Config`] from the environment variables.
    ///
    /// `.env` file is supported.
    pub fn from_env() -> Config {
        dotenv().ok();
        Config {
            client_urls: get_env::<String>("CLIENT_URLS", "http://localhost,https://beta.solpg.io")
                .split(',')
                .map(str::trim)
                .map(ToOwned::to_owned)
                .collect(),
            port: get_env("PORT", 8080u16),
            payload_limit: get_env("PAYLOAD_LIMIT", 1024usize * 1024),
            verbose: get_env("VERBOSE", false),
            db_uri: get_env("DB_URI", "mongodb://localhost:27017"),
            db_name: get_env("DB_NAME", "solpg"),
            build_concurrency: get_env("BUILD_CONCURRENCY", 16usize),
            openai_api_key: get_env("OPENAI_API_KEY", ""),
            openai_model: get_env("OPENAI_MODEL", "gpt-5.6-sol"),
            learning_session_secret: get_env("LEARNING_SESSION_SECRET", Uuid::new_v4().to_string()),
            learning_ai_daily_limit: get_env("LEARNING_AI_DAILY_LIMIT", 100u32),
            learning_surfpool_limit: get_env("LEARNING_SURFPOOL_LIMIT", 2usize),
            learning_surfpool_global_limit: get_env("LEARNING_SURFPOOL_GLOBAL_LIMIT", 8usize),
            learning_surfpool_idle_minutes: get_env("LEARNING_SURFPOOL_IDLE_MINUTES", 30u64),
        }
    }
}

/// Get the environment variable value or return the `default`.
///
/// All environment variables are prefixed with `PG_` in order to prevent clashes.
fn get_env<T: FromStr>(key: &str, default: impl Into<T>) -> T {
    dotenv::var(format!("PG_{key}"))
        .ok()
        .and_then(|s| s.parse().ok())
        .unwrap_or(default.into())
}
