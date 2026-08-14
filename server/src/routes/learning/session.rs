use std::{
    collections::HashMap,
    net::IpAddr,
    time::{SystemTime, UNIX_EPOCH},
};

use anyhow::anyhow;
use axum::http::HeaderMap;
use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};
use hmac::{Hmac, Mac};
use sha2::Sha256;
use uuid::Uuid;

use super::LearningState;

type HmacSha256 = Hmac<Sha256>;
const SESSION_HEADER: &str = "x-solpg-session";

#[derive(Default)]
struct DailyUsage {
    day: u64,
    ai_turns: u32,
}

#[derive(Default)]
pub(super) struct UsageCounters {
    sessions: HashMap<Uuid, DailyUsage>,
    ips: HashMap<IpAddr, DailyUsage>,
    global: DailyUsage,
}

impl LearningState {
    pub(super) fn sign_session(&self, id: Uuid) -> anyhow::Result<String> {
        let payload = id.simple().to_string();
        let mut mac = HmacSha256::new_from_slice(&self.session_secret)
            .map_err(|_| anyhow!("Invalid session secret"))?;
        mac.update(payload.as_bytes());
        let signature = URL_SAFE_NO_PAD.encode(mac.finalize().into_bytes());
        Ok(format!("{payload}.{signature}"))
    }

    pub(super) fn verify_session(&self, headers: &HeaderMap) -> anyhow::Result<Uuid> {
        let token = headers
            .get(SESSION_HEADER)
            .and_then(|value| value.to_str().ok())
            .ok_or_else(|| anyhow!("Missing learning session"))?;
        let (payload, signature) = token
            .split_once('.')
            .ok_or_else(|| anyhow!("Invalid learning session"))?;
        let id = Uuid::parse_str(payload).map_err(|_| anyhow!("Invalid learning session"))?;
        let supplied = URL_SAFE_NO_PAD
            .decode(signature)
            .map_err(|_| anyhow!("Invalid learning session"))?;
        let mut mac = HmacSha256::new_from_slice(&self.session_secret)
            .map_err(|_| anyhow!("Invalid session secret"))?;
        mac.update(payload.as_bytes());
        mac.verify_slice(&supplied)
            .map_err(|_| anyhow!("Invalid learning session"))?;
        Ok(id)
    }

    pub(super) async fn consume_ai_turn(
        &self,
        owner: Uuid,
        peer_ip: IpAddr,
    ) -> anyhow::Result<u32> {
        let day = unix_seconds() / 86_400;
        let mut usage = self.usage.lock().await;
        usage.sessions.retain(|_, value| value.day == day);
        usage.ips.retain(|_, value| value.day == day);
        if usage.global.day != day {
            usage.global = DailyUsage { day, ai_turns: 0 };
        }
        let UsageCounters {
            sessions,
            ips,
            global,
        } = &mut *usage;
        let session_usage = sessions
            .entry(owner)
            .or_insert(DailyUsage { day, ai_turns: 0 });
        let ip_usage = ips
            .entry(peer_ip)
            .or_insert(DailyUsage { day, ai_turns: 0 });
        if session_usage.ai_turns >= self.ai_daily_limit
            || ip_usage.ai_turns >= self.ai_daily_limit
            || global.ai_turns >= self.ai_global_daily_limit
        {
            return Err(anyhow!(
                "Daily tutor limit reached. Your allowance resets at 00:00 UTC."
            ));
        }
        session_usage.ai_turns += 1;
        ip_usage.ai_turns += 1;
        global.ai_turns += 1;
        Ok(self.ai_daily_limit - session_usage.ai_turns)
    }
}

fn unix_seconds() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}

pub(super) fn session_safety_id(owner: Uuid) -> String {
    format!("solpg_{}", &owner.simple().to_string()[..20])
}

pub(super) fn client_ip(headers: &HeaderMap, peer_ip: IpAddr) -> IpAddr {
    headers
        .get("x-forwarded-for")
        .and_then(|value| value.to_str().ok())
        // Google appends client and load-balancer addresses to any supplied
        // values, so the second address from the right cannot be spoofed by a
        // caller-controlled prefix.
        .and_then(|value| {
            value
                .split(',')
                .rev()
                .filter_map(|value| value.trim().parse().ok())
                .nth(1)
        })
        .or_else(|| {
            headers
                .get("x-appengine-user-ip")
                .and_then(|value| value.to_str().ok())
                .and_then(|value| value.parse().ok())
        })
        .unwrap_or(peer_ip)
}

#[cfg(test)]
mod tests {
    use std::net::Ipv4Addr;

    use super::*;

    fn state() -> LearningState {
        LearningState::new("".into(), "gpt-5.6-sol".into(), "test-secret".into(), 2, 10)
    }

    #[test]
    fn signed_session_round_trip_and_tamper_rejection() {
        let state = state();
        let id = Uuid::new_v4();
        let token = state.sign_session(id).unwrap();
        let mut headers = HeaderMap::new();
        headers.insert(SESSION_HEADER, token.parse().unwrap());
        assert_eq!(state.verify_session(&headers).unwrap(), id);

        headers.insert(SESSION_HEADER, format!("{token}x").parse().unwrap());
        assert!(state.verify_session(&headers).is_err());
    }

    #[tokio::test]
    async fn daily_ai_quota_is_enforced() {
        let state = state();
        let id = Uuid::new_v4();
        let ip = IpAddr::V4(Ipv4Addr::LOCALHOST);
        assert_eq!(state.consume_ai_turn(id, ip).await.unwrap(), 1);
        assert_eq!(state.consume_ai_turn(id, ip).await.unwrap(), 0);
        assert!(state.consume_ai_turn(Uuid::new_v4(), ip).await.is_err());
    }

    #[tokio::test]
    async fn global_ai_quota_is_enforced_across_sessions_and_ips() {
        let state =
            LearningState::new("".into(), "gpt-5.6-sol".into(), "test-secret".into(), 10, 2);
        assert!(state
            .consume_ai_turn(Uuid::new_v4(), "192.0.2.1".parse().unwrap())
            .await
            .is_ok());
        assert!(state
            .consume_ai_turn(Uuid::new_v4(), "192.0.2.2".parse().unwrap())
            .await
            .is_ok());
        assert!(state
            .consume_ai_turn(Uuid::new_v4(), "192.0.2.3".parse().unwrap())
            .await
            .is_err());
    }

    #[test]
    fn client_ip_uses_the_load_balancer_appended_address() {
        let mut headers = HeaderMap::new();
        headers.insert(
            "x-forwarded-for",
            "203.0.113.9, 198.51.100.4, 192.0.2.8".parse().unwrap(),
        );
        assert_eq!(
            client_ip(&headers, "127.0.0.1".parse().unwrap()),
            "198.51.100.4".parse::<IpAddr>().unwrap()
        );
    }
}
