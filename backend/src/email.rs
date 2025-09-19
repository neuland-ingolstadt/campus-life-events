use std::{env, str::FromStr};

use lettre::{
    AsyncSmtpTransport, AsyncTransport, Tokio1Executor,
    message::{Mailbox, Message},
    transport::smtp::authentication::Credentials,
    transport::smtp::client::{Tls, TlsParameters},
};
use thiserror::Error;

const DEFAULT_REGISTRATION_BASE_URL: &str = "http://localhost:3000/register";
const INVITE_SUBJECT: &str = "Willkommen bei Campus Life Events";

#[derive(Clone)]
pub struct EmailClient {
    mailer: AsyncSmtpTransport<Tokio1Executor>,
    from: Mailbox,
    registration_base_url: String,
}

#[derive(Debug, Error)]
pub enum EmailClientError {
    #[error("SMTP configuration is incomplete; missing {0}")]
    IncompleteConfig(String),
    #[error("Invalid SMTP configuration: {0}")]
    InvalidConfig(String),
    #[error("Invalid recipient address: {0}")]
    InvalidRecipient(String),
    #[error("Failed to build email: {0}")]
    Build(#[from] lettre::error::Error),
    #[error("Failed to send email: {0}")]
    Transport(#[from] lettre::transport::smtp::Error),
}

impl EmailClient {
    pub fn from_env() -> Result<Option<Self>, EmailClientError> {
        let host = env::var("SMTP_HOST").ok();
        let username = env::var("SMTP_USERNAME").ok();
        let password = env::var("SMTP_PASSWORD").ok();
        let port = env::var("SMTP_PORT").ok();
        let from_email = env::var("SMTP_FROM_EMAIL").ok();
        let from_name = env::var("SMTP_FROM_NAME").ok();
        let registration_base_url = env::var("REGISTRATION_BASE_URL")
            .unwrap_or_else(|_| DEFAULT_REGISTRATION_BASE_URL.to_string());

        let required = [
            ("SMTP_HOST", host.as_ref()),
            ("SMTP_USERNAME", username.as_ref()),
            ("SMTP_PASSWORD", password.as_ref()),
            ("SMTP_FROM_EMAIL", from_email.as_ref()),
        ];

        let missing: Vec<&str> = required
            .iter()
            .filter(|(_, value)| value.is_none())
            .map(|(key, _)| *key)
            .collect();

        if missing.len() == required.len() {
            return Ok(None);
        }

        if !missing.is_empty() {
            return Err(EmailClientError::IncompleteConfig(missing.join(", ")));
        }

        let host = host.expect("host checked above");
        let username = username.expect("username checked above");
        let password = password.expect("password checked above");
        let from_email = from_email.expect("sender checked above");

        let parsed_port = match port {
            Some(value) => value.parse::<u16>().map_err(|_| {
                EmailClientError::InvalidConfig("SMTP_PORT must be a number".into())
            })?,
            None => 587,
        };

        let sender_spec = match from_name {
            Some(name) if !name.trim().is_empty() => format!("{name} <{from_email}>"),
            _ => from_email.clone(),
        };
        let from = Mailbox::from_str(&sender_spec)
            .map_err(|_| EmailClientError::InvalidConfig("SMTP_FROM_EMAIL is invalid".into()))?;

        let builder = AsyncSmtpTransport::<Tokio1Executor>::relay(&host)
            .map_err(|err| EmailClientError::InvalidConfig(err.to_string()))?;

        let mailer = builder
            .port(parsed_port)
            .credentials(Credentials::new(username, password))
            .tls(Tls::Required(TlsParameters::new(host.clone())?))
            .build();

        Ok(Some(Self {
            mailer,
            from,
            registration_base_url,
        }))
    }

    pub async fn send_new_organizer_invite(
        &self,
        recipient_email: &str,
        organizer_name: &str,
        setup_token: &str,
    ) -> Result<(), EmailClientError> {
        let recipient = Mailbox::from_str(recipient_email)
            .map_err(|_| EmailClientError::InvalidRecipient(recipient_email.to_string()))?;

        let registration_url = self.registration_url(setup_token);
        let body = self.render_invite_template(organizer_name, &registration_url, setup_token);

        let message = Message::builder()
            .from(self.from.clone())
            .to(recipient)
            .subject(INVITE_SUBJECT)
            .body(body)?;

        self.mailer
            .send(message)
            .await
            .map(|_| ())
            .map_err(EmailClientError::Transport)
    }

    fn registration_url(&self, token: &str) -> String {
        let trimmed = self.registration_base_url.trim_end_matches('?');
        if trimmed.contains('?') {
            format!("{trimmed}&token={token}")
        } else {
            format!("{trimmed}?token={token}")
        }
    }

    fn render_invite_template(
        &self,
        organizer_name: &str,
        registration_url: &str,
        setup_token: &str,
    ) -> String {
        format!(
            "Hallo {organizer_name},\n\n\
Du wurdest zur Campus Life Events Plattform eingeladen.\n\
Bitte richte dein Konto über folgenden Link ein (gültig für 7 Tage):\n\
{registration_url}\n\n\
Falls der Link nicht funktioniert, kannst du das Token auch manuell eingeben:\n\
{setup_token}\n\n\
Viele Grüße\nCampus Life Events Team\n"
        )
    }
}
