use std::{env, str::FromStr};

use lettre::{
    AsyncSmtpTransport, AsyncTransport, Tokio1Executor,
    message::{Mailbox, Message},
    transport::smtp::authentication::Credentials,
    transport::smtp::client::{Tls, TlsParameters},
};
use thiserror::Error;
use tracing::warn;

const DEFAULT_BASE_URL: &str = "http://localhost:3000";
const INVITE_SUBJECT: &str = "Willkommen bei Campus Life Events";
const WELCOME_SUBJECT: &str = "Willkommen bei Campus Life Events - Dein Konto ist aktiviert!";
const PASSWORD_RESET_SUBJECT: &str = "Passwort zurücksetzen - Campus Life Events";

#[derive(Clone)]
pub struct EmailClient {
    mailer: AsyncSmtpTransport<Tokio1Executor>,
    from: Mailbox,
    base_url: String,
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
        let base_url = env::var("BASE_URL").unwrap_or_else(|_| DEFAULT_BASE_URL.to_string());

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
            warn!("SMTP configuration missing; email sending disabled");
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
            base_url,
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

    pub async fn send_new_admin_invite(
        &self,
        recipient_email: &str,
        display_name: &str,
        setup_token: &str,
    ) -> Result<(), EmailClientError> {
        let recipient = Mailbox::from_str(recipient_email)
            .map_err(|_| EmailClientError::InvalidRecipient(recipient_email.to_string()))?;

        let registration_url = self.registration_url(setup_token);
        let body = self.render_admin_invite_template(display_name, &registration_url);

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

    pub async fn send_welcome_email(
        &self,
        recipient_email: &str,
        display_name: &str,
        account_type: &str,
    ) -> Result<(), EmailClientError> {
        let recipient = Mailbox::from_str(recipient_email)
            .map_err(|_| EmailClientError::InvalidRecipient(recipient_email.to_string()))?;

        let body = self.render_welcome_template(display_name, account_type);

        let message = Message::builder()
            .from(self.from.clone())
            .to(recipient)
            .subject(WELCOME_SUBJECT)
            .body(body)?;

        self.mailer
            .send(message)
            .await
            .map(|_| ())
            .map_err(EmailClientError::Transport)
    }

    pub async fn send_password_reset_email(
        &self,
        recipient_email: &str,
        display_name: &str,
        reset_token: &str,
    ) -> Result<(), EmailClientError> {
        let recipient = Mailbox::from_str(recipient_email)
            .map_err(|_| EmailClientError::InvalidRecipient(recipient_email.to_string()))?;

        let reset_url = self.reset_url(reset_token);
        let body = self.render_password_reset_template(display_name, &reset_url, reset_token);

        let message = Message::builder()
            .from(self.from.clone())
            .to(recipient)
            .subject(PASSWORD_RESET_SUBJECT)
            .body(body)?;

        self.mailer
            .send(message)
            .await
            .map(|_| ())
            .map_err(EmailClientError::Transport)
    }

    fn registration_url(&self, token: &str) -> String {
        let trimmed = self.base_url.trim_end_matches('/');
        format!("{trimmed}/register?token={token}")
    }

    fn reset_url(&self, token: &str) -> String {
        let trimmed = self.base_url.trim_end_matches('/');
        format!("{trimmed}/reset-password?token={token}")
    }

    fn render_invite_template(
        &self,
        organizer_name: &str,
        registration_url: &str,
        _setup_token: &str,
    ) -> String {
        format!(
            "Hallo {organizer_name},\n\n\
Du wurdest zur Campus Life Events Plattform der THI StudVer eingeladen.\n\
Als zentrale Plattform für die Veranstaltungen der Vereine an der THI bietet sie dir die Möglichkeit, deine Veranstaltungen zu planen und zu verwalten.\n\n\
Was dich erwartet:\n\
- Einfache Veranstaltungsverwaltung: Erstelle und verwalte deine Events intuitiv\n\
- Campus Life Newsletter: Automatische Integration in den wöchentlichen Newsletter für alle Studierenden\n\
- Neuland Next App Integration: Deine Veranstaltungen werden direkt in der App präsentiert\n\
- Moderne Benutzeroberfläche: Der bisherige Moodle-Kurs wird durch diese neue Plattform ersetzt\n\
- Ein eigener iCal-Kalender für deine Veranstaltungen, zum einfachen Import in Kalender-Apps\n\
- Echtzeit-Updates: Sofortige Synchronisation zwischen allen Plattformen\n\
Bitte richte dein Konto über folgenden Link ein (gültig für 7 Tage):\n\n\
{registration_url}\n\n\
Bitte verwende ein sicheres Passwort, um dein Konto zu schützen und teile es nur mit den Organisator*innen deines Vereins.\n\
Du kannst das Passwort auch auf das von CampusLife vergebene Moodle Passwort ändern, aus Sicherheitsgründen empfehlen wir dies aber nicht.\n\n\
Viele Grüße\nDas Neuland und StudVer Team\n\n\
Campus Life Events ist ein Projekt der THI StudVer und wird von Neuland Ingolstadt e.V. entwickelt und betrieben."
        )
    }

    fn render_admin_invite_template(&self, display_name: &str, registration_url: &str) -> String {
        format!(
            "Hallo {display_name},\n\n\
du wurdest als Administrator*in für Campus Life Events eingeladen.\n\
Über den Adminbereich kannst du Vereine verwalten, neue Accounts einladen und das Audit-Log einsehen.\n\n\
Bitte richte dein Konto über folgenden Link ein (gültig für 7 Tage):\n\n\
{registration_url}\n\n\
Viele Grüße\nDas Neuland und StudVer Team\n\n\
Campus Life Events ist ein Projekt der THI StudVer und wird von Neuland Ingolstadt e.V. entwickelt und betrieben."
        )
    }

    fn render_welcome_template(&self, display_name: &str, account_type: &str) -> String {
        let role_description = match account_type {
            "Admin" => {
                "Als Administrator*in kannst du Vereine verwalten, neue Accounts einladen und das Audit-Log einsehen."
            }
            "Organizer" => {
                "Als Organisator*in kannst du Veranstaltungen für deinen Verein erstellen und verwalten."
            }
            _ => "Du kannst die Plattform entsprechend deiner Berechtigung nutzen.",
        };

        format!(
            "Hallo {display_name},\n\n\
herzlich willkommen bei Campus Life Events! 🎉\n\
Dein Konto wurde erfolgreich aktiviert und du kannst dich jetzt in die Plattform einloggen.\n\n\
{role_description}\n\
Bei Fragen oder Problemen wende dich gerne an uns.\n\n\
Viele Grüße\nDas Neuland und StudVer Team\n\n\n\
Campus Life Events ist ein Projekt der THI StudVer und wird von Neuland Ingolstadt e.V. entwickelt und betrieben."
        )
    }

    fn render_password_reset_template(
        &self,
        display_name: &str,
        reset_url: &str,
        _reset_token: &str,
    ) -> String {
        format!(
            "Hallo {display_name},\n\n\
            du hast eine Anfrage zum Zurücksetzen deines Passworts für Campus Life Events gestellt.\n\n\
            Um dein Passwort zurückzusetzen, klicke auf folgenden Link (gültig für 10 Minuten):\n\
            {reset_url}\n\n\
            Falls du diese Anfrage nicht gestellt hast, kannst du diese E-Mail ignorieren.\n\
            Dein Passwort bleibt unverändert.\n\n\
            Aus Sicherheitsgründen ist dieser Link nur für 10 Minuten gültig.\n\n\
            Viele Grüße\nDas Neuland und StudVer Team\n\n\
            Campus Life Events ist ein Projekt der THI StudVer und wird von Neuland Ingolstadt e.V. entwickelt und betrieben."
        )
    }
}
