use std::sync::Arc;

use redis::{AsyncCommands, Client, aio::MultiplexedConnection};
use serde::{Serialize, de::DeserializeOwned};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum CacheError {
    #[error("redis error: {0}")]
    Redis(#[from] redis::RedisError),
    #[error("serde error: {0}")]
    Serde(#[from] serde_json::Error),
}

#[derive(Clone)]
pub struct CacheService {
    client: Arc<Client>,
    ttl_seconds: u64,
    prefix: String,
}

impl CacheService {
    pub async fn connect(
        url: &str,
        ttl_seconds: u64,
        prefix: impl Into<String>,
    ) -> Result<Self, CacheError> {
        let client = Client::open(url)?;
        let service = Self {
            client: Arc::new(client),
            ttl_seconds: ttl_seconds.max(1),
            prefix: prefix.into(),
        };
        service.ping().await?;
        Ok(service)
    }

    async fn ping(&self) -> Result<(), CacheError> {
        let mut connection = self.connection().await?;
        let _: () = redis::cmd("PING").query_async(&mut connection).await?;
        Ok(())
    }

    fn namespaced_key(&self, key: &str) -> String {
        format!("{}:{key}", self.prefix)
    }

    async fn connection(&self) -> Result<MultiplexedConnection, CacheError> {
        Ok(self.client.get_multiplexed_async_connection().await?)
    }

    pub async fn get_json<T>(&self, key: &str) -> Result<Option<T>, CacheError>
    where
        T: DeserializeOwned,
    {
        let mut connection = self.connection().await?;
        let payload: Option<String> = connection.get(self.namespaced_key(key)).await?;
        match payload {
            Some(payload) => Ok(Some(serde_json::from_str(&payload)?)),
            None => Ok(None),
        }
    }

    pub async fn set_json<T>(&self, key: &str, value: &T) -> Result<(), CacheError>
    where
        T: Serialize,
    {
        let payload = serde_json::to_string(value)?;
        let ttl = self.effective_ttl();
        let mut connection = self.connection().await?;
        let _: () = connection
            .set_ex(self.namespaced_key(key), payload, ttl)
            .await?;
        Ok(())
    }

    pub async fn get_string(&self, key: &str) -> Result<Option<String>, CacheError> {
        let mut connection = self.connection().await?;
        let payload: Option<String> = connection.get(self.namespaced_key(key)).await?;
        Ok(payload)
    }

    pub async fn set_string(&self, key: &str, value: &str) -> Result<(), CacheError> {
        let ttl = self.effective_ttl();
        let mut connection = self.connection().await?;
        let _: () = connection
            .set_ex(self.namespaced_key(key), value, ttl)
            .await?;
        Ok(())
    }

    pub async fn purge_prefix(&self, prefix: &str) -> Result<(), CacheError> {
        let mut connection = self.connection().await?;
        let pattern = format!("{}:{}*", self.prefix, prefix);
        let mut cursor: u64 = 0;
        loop {
            let (next_cursor, keys): (u64, Vec<String>) = redis::cmd("SCAN")
                .arg(cursor)
                .arg("MATCH")
                .arg(&pattern)
                .arg("COUNT")
                .arg(100)
                .query_async(&mut connection)
                .await?;
            if !keys.is_empty() {
                let _: () = redis::cmd("DEL")
                    .arg(keys)
                    .query_async(&mut connection)
                    .await?;
            }
            if next_cursor == 0 {
                break;
            }
            cursor = next_cursor;
        }
        Ok(())
    }

    fn effective_ttl(&self) -> u64 {
        self.ttl_seconds
    }
}
