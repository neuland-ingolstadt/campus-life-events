use axum::http::{HeaderValue, Method, header};
use tower_http::cors::{AllowOrigin, CorsLayer};
use tracing::{info, warn};

pub fn build_cors_layer() -> CorsLayer {
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

    let allowed_suffixes = parse_allowed_origin_suffixes();

    let allowed_origin_strings: Vec<String> = allowed_origins
        .iter()
        .filter_map(|value| value.to_str().ok().map(str::to_string))
        .collect();

    info!(
        target: "startup",
        component = "cors",
        action = "configure",
        allowed_origins = ?allowed_origin_strings,
        allowed_origin_suffixes = ?allowed_suffixes,
        "Configured CORS allowed origins"
    );

    let mut layer = CorsLayer::new()
        .allow_methods([
            Method::GET,
            Method::POST,
            Method::PUT,
            Method::DELETE,
            Method::OPTIONS,
        ])
        .allow_headers([header::CONTENT_TYPE, header::AUTHORIZATION, header::COOKIE])
        .allow_credentials(true);

    layer = if allowed_suffixes.is_empty() {
        layer.allow_origin(allowed_origins)
    } else {
        layer.allow_origin(AllowOrigin::predicate({
            let exact = allowed_origins;
            let suffixes = allowed_suffixes;
            move |origin: &HeaderValue, _| origin_is_allowed(origin, &exact, &suffixes)
        }))
    };

    layer
}

fn parse_allowed_origin_suffixes() -> Vec<String> {
    let Ok(raw) = std::env::var("ALLOWED_ORIGIN_SUFFIXES") else {
        return Vec::new();
    };

    let mut suffixes = Vec::new();
    for entry in raw.split(',') {
        let trimmed = entry.trim();
        if trimmed.is_empty() {
            continue;
        }
        suffixes.push(normalize_suffix(trimmed));
    }
    suffixes
}

fn origin_is_allowed(
    origin: &HeaderValue,
    exact_origins: &[HeaderValue],
    suffixes: &[String],
) -> bool {
    if exact_origins.iter().any(|allowed| allowed == origin) {
        return true;
    }

    let Ok(origin_str) = origin.to_str() else {
        return false;
    };

    suffixes
        .iter()
        .any(|suffix| origin_matches_suffix(origin_str, suffix))
}

fn normalize_suffix(suffix: &str) -> String {
    if suffix.starts_with('.') {
        suffix.to_string()
    } else {
        format!(".{suffix}")
    }
}

fn origin_host(origin: &str) -> Option<&str> {
    let (scheme, rest) = origin.split_once("://")?;
    if scheme != "http" && scheme != "https" {
        return None;
    }

    let host_with_port = rest.split('/').next()?;
    let host = match host_with_port.rsplit_once(':') {
        Some((host, port)) if port.chars().all(|c| c.is_ascii_digit()) => host,
        _ => host_with_port,
    };

    Some(host)
}

fn origin_matches_suffix(origin: &str, suffix: &str) -> bool {
    let Some(host) = origin_host(origin) else {
        return false;
    };

    let normalized = normalize_suffix(suffix);
    let apex = normalized.trim_start_matches('.');

    host.ends_with(&normalized) || host == apex
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn matches_expo_preview_subdomains() {
        assert!(origin_matches_suffix(
            "https://abc123.expo.app",
            ".expo.app"
        ));
        assert!(origin_matches_suffix(
            "https://myapp--branch.expo.app",
            "expo.app"
        ));
    }

    #[test]
    fn rejects_unrelated_origins() {
        assert!(!origin_matches_suffix(
            "https://evil-expo.app.attacker.com",
            ".expo.app"
        ));
        assert!(!origin_matches_suffix("https://notexpo.app", ".expo.app"));
        assert!(!origin_matches_suffix(
            "https://dev.neuland.app",
            ".expo.app"
        ));
    }

    #[test]
    fn matches_apex_domain_when_configured() {
        assert!(origin_matches_suffix("https://expo.app", ".expo.app"));
    }

    #[test]
    fn rejects_invalid_origin_formats() {
        assert!(!origin_matches_suffix("expo.app", ".expo.app"));
        assert!(!origin_matches_suffix("ftp://foo.expo.app", ".expo.app"));
    }

    #[test]
    fn exact_origin_matching_works() {
        let exact = vec![HeaderValue::from_static("https://dev.neuland.app")];
        let suffixes = vec![".expo.app".to_string()];

        assert!(origin_is_allowed(
            &HeaderValue::from_static("https://dev.neuland.app"),
            &exact,
            &suffixes
        ));
        assert!(origin_is_allowed(
            &HeaderValue::from_static("https://preview.expo.app"),
            &exact,
            &suffixes
        ));
        assert!(!origin_is_allowed(
            &HeaderValue::from_static("https://evil.example.com"),
            &exact,
            &suffixes
        ));
    }
}
