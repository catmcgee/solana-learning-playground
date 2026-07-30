use std::time::Duration;

use axum::http::{header, Method};
use tower_http::cors::{AllowOrigin, CorsLayer};

use crate::log::error;

/// Create a CORS middleware.
///
/// Request origins other than `client_urls` are not allowed.
pub fn cors(client_urls: Vec<String>) -> CorsLayer {
    CorsLayer::new()
        .allow_origin(AllowOrigin::predicate(move |origin, _| {
            let allowed = client_urls.iter().any(|url| {
                origin
                    .to_str()
                    .is_ok_and(|origin| origin_matches(origin, url))
            });

            // Logging middleware doesn't catch CORS errors, log the error here instead
            if !allowed {
                match origin.to_str() {
                    Ok(origin) => error!("CORS blocked from origin {origin}"),
                    Err(e) => error!("CORS blocked from invalid origin: {e} ({origin:?})"),
                }
            }

            allowed
        }))
        .allow_methods([Method::GET, Method::POST, Method::DELETE])
        .allow_headers([
            header::CONTENT_TYPE,
            header::HeaderName::from_static("x-solpg-session"),
        ])
        .max_age(Duration::from_secs(600))
}

fn origin_matches(origin: &str, allowed: &str) -> bool {
    let allowed = allowed.trim_end_matches('/');
    if origin == allowed {
        return true;
    }

    origin
        .strip_prefix(allowed)
        .and_then(|suffix| suffix.strip_prefix(':'))
        .is_some_and(|port| {
            !port.is_empty() && port.chars().all(|character| character.is_ascii_digit())
        })
}

#[cfg(test)]
mod tests {
    use super::origin_matches;

    #[test]
    fn allows_local_development_ports_without_allowing_lookalike_hosts() {
        assert!(origin_matches("http://localhost:3000", "http://localhost"));
        assert!(origin_matches(
            "https://beta.solpg.io",
            "https://beta.solpg.io"
        ));
        assert!(!origin_matches(
            "https://beta.solpg.io.attacker.example",
            "https://beta.solpg.io"
        ));
        assert!(!origin_matches(
            "http://localhost.attacker.example",
            "http://localhost"
        ));
    }
}
