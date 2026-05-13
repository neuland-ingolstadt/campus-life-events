use std::{env, str::FromStr};

use lettre::{
    AsyncSmtpTransport, AsyncTransport, Tokio1Executor,
    message::{Mailbox, Message, header::ContentType},
    transport::smtp::authentication::Credentials,
    transport::smtp::client::{Tls, TlsParameters},
};
use thiserror::Error;
use tracing::warn;

use crate::models::{AccountType, OrganizerKind};

const DEFAULT_BASE_URL: &str = "http://localhost:3000";
const INVITE_SUBJECT: &str = "Willkommen bei Campus Life Events";
const INVITE_SUBJECT_ORGANIZER: &str = "Einladung zu Campus Life Events";
const INVITE_SUBJECT_THI_ORGANIZER: &str = "Einladung zu Campus Life Events für THI Services";
const WELCOME_SUBJECT: &str = "Willkommen bei Campus Life Events – Dein Konto ist aktiviert!";
const WELCOME_SUBJECT_THI_ORGANIZER: &str =
    "Willkommen bei Campus Life Events (THI Services) – Ihr Konto ist aktiviert!";
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
        organizer_kind: OrganizerKind,
    ) -> Result<(), EmailClientError> {
        let recipient = Mailbox::from_str(recipient_email)
            .map_err(|_| EmailClientError::InvalidRecipient(recipient_email.to_string()))?;

        let registration_url = self.registration_url(setup_token);
        let (subject, body) = match organizer_kind {
            OrganizerKind::StudentAssociation => (
                INVITE_SUBJECT_ORGANIZER,
                self.render_organizer_invite_generic(organizer_name, &registration_url),
            ),
            OrganizerKind::ThiDepartment => (
                INVITE_SUBJECT_THI_ORGANIZER,
                self.render_organizer_invite_thi_department(organizer_name, &registration_url),
            ),
        };

        let message = Message::builder()
            .from(self.from.clone())
            .to(recipient)
            .subject(subject)
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
        account_type: AccountType,
        organizer_kind: Option<OrganizerKind>,
    ) -> Result<(), EmailClientError> {
        let recipient = Mailbox::from_str(recipient_email)
            .map_err(|_| EmailClientError::InvalidRecipient(recipient_email.to_string()))?;

        let subject = match (account_type, organizer_kind) {
            (AccountType::Organizer, Some(OrganizerKind::ThiDepartment)) => {
                WELCOME_SUBJECT_THI_ORGANIZER
            }
            _ => WELCOME_SUBJECT,
        };
        let body = self.render_welcome_template(display_name, account_type, organizer_kind);

        let message = Message::builder()
            .from(self.from.clone())
            .to(recipient)
            .subject(subject)
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

    pub async fn send_newsletter_preview_email(
        &self,
        recipient_email: &str,
        subject: &str,
        html_body: &str,
    ) -> Result<(), EmailClientError> {
        let recipient = Mailbox::from_str(recipient_email)
            .map_err(|_| EmailClientError::InvalidRecipient(recipient_email.to_string()))?;

        let message = Message::builder()
            .from(self.from.clone())
            .to(recipient)
            .subject(subject)
            .header(ContentType::TEXT_HTML)
            .body(html_body.to_string())?;

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

    fn render_organizer_invite_generic(
        &self,
        organizer_name: &str,
        registration_url: &str,
    ) -> String {
        format!(
            "Hallo {organizer_name},\n\n\
du wurdest zu Campus Life Events eingeladen. Über die Plattform kannst du öffentliche Veranstaltungen deiner Organisation an der THI planen, veröffentlichen und verwalten.\n\n\
Was dich erwartet:\n\
- Übersichtliche Veranstaltungsverwaltung zum Erstellen und Bearbeiten von Terminen\n\
- Optionale Anbindung an den Campus Life Newsletter, sofern für eure Organisation freigeschaltet\n\
- Veröffentlichung in der Neuland Next App, wenn du dies für einzelne Events aktivierst\n\
- Eigener iCal-Feed zum Abonnieren in Kalender-Apps\n\
- Aktuelle Darstellung auf der Campus-Life-Webseite, wenn du die Freigaben setzt\n\n\
Bitte richte dein Konto über folgenden Link ein (gültig für 7 Tage):\n\n\
{registration_url}\n\n\
Bitte wähle ein sicheres Passwort und teile es nur mit Personen, die Events für diese Organisation mitverwalten sollen.\n\n\
Viele Grüße\nDas Neuland und StudVer Team\n\n\
Campus Life Events ist ein Projekt der THI StudVer und wird von Neuland Ingolstadt e.V. entwickelt und betrieben."
        )
    }

    fn render_organizer_invite_thi_department(
        &self,
        organizer_name: &str,
        registration_url: &str,
    ) -> String {
        format!(
            "Guten Tag,\n\n\
Sie wurden für die Organisation „{organizer_name}“ zum Bereich THI Services auf Campus Life Events eingeladen.\n\
Dieser Zugang ist von den Konten der Studierendenvereine (Clubs) getrennt: Hier werden öffentliche Termine von Einrichtungen und Services der THI verwaltet und über einen eigenen THI-Services-Kalender bereitgestellt.\n\n\
Was Sie erwarten können:\n\
- Verwaltung und Veröffentlichung öffentlicher Veranstaltungen Ihrer Einrichtung\n\
- Eigener iCal-Feed für THI-Services-Termine (nicht identisch mit dem Kalender der Studierendenvereine)\n\
- Optionale Weitergabe an Website und App über die jeweiligen Freigaben pro Event\n\
Bitte richten Sie Ihr Konto über folgenden Link ein (gültig für 7 Tage):\n\n\
{registration_url}\n\n\
Bitte verwenden Sie ein sicheres Passwort und geben Sie es nur an Kolleginnen und Kollegen weiter, die Inhalte für diese Organisation pflegen sollen.\n\n\
Mit freundlichen Grüßen\nDas Neuland Team\n\n\
Campus Life Events ist ein Projekt der THI StudVer und wird von Neuland Ingolstadt e.V. entwickelt und betrieben."
        )
    }

    fn render_admin_invite_template(&self, display_name: &str, registration_url: &str) -> String {
        format!(
            "Hallo {display_name},\n\n\
du wurdest als Administrator*in für Campus Life Events eingeladen.\n\
Über den Adminbereich kannst du Organisationen und Zugänge verwalten, neue Accounts einladen und das Audit-Log einsehen.\n\n\
Bitte richte dein Konto über folgenden Link ein (gültig für 7 Tage):\n\n\
{registration_url}\n\n\
Viele Grüße\nDas Neuland Team\n\n\
Campus Life Events ist ein Projekt der THI StudVer und wird von Neuland Ingolstadt e.V. entwickelt und betrieben."
        )
    }

    fn render_welcome_template(
        &self,
        display_name: &str,
        account_type: AccountType,
        organizer_kind: Option<OrganizerKind>,
    ) -> String {
        match (account_type, organizer_kind) {
            (AccountType::Organizer, Some(OrganizerKind::ThiDepartment)) => format!(
                "Guten Tag,\n\n\
willkommen bei Campus Life Events im Bereich THI Services.\n\
Ihr Konto für die Organisation „{display_name}“ ist aktiviert; Sie können sich jetzt anmelden.\n\n\
Dieser Bereich dient der Veröffentlichung öffentlicher Termine Ihrer Einrichtung und ist von den Zugängen der Studierendenvereine getrennt. Veranstaltungen erscheinen entsprechend Ihrer Freigaben auf der Plattform und im Kalender für THI Services.\n\n\
Bei Rückfragen zur Einrichtung oder zu Berechtigungen wenden Sie sich bitte an das Team von Neuland und StudVer.\n\n\
Mit freundlichen Grüßen\nDas Neuland Team\n\n\
Campus Life Events ist ein Projekt der THI StudVer und wird von Neuland Ingolstadt e.V. entwickelt und betrieben."
            ),
            (AccountType::Admin, _) => format!(
                "Hallo {display_name},\n\n\
herzlich willkommen bei Campus Life Events!\n\
Dein Konto wurde erfolgreich aktiviert und du kannst dich jetzt in die Plattform einloggen.\n\n\
Als Administrator*in kannst du Organisationen und Zugänge verwalten, neue Accounts einladen und das Audit-Log einsehen.\n\
Bei Fragen oder Problemen wende dich gerne an uns.\n\n\
Viele Grüße\nDas Neuland Team\n\n\
Campus Life Events ist ein Projekt der THI StudVer und wird von Neuland Ingolstadt e.V. entwickelt und betrieben."
            ),
            (AccountType::Organizer, _) => format!(
                "Hallo {display_name},\n\n\
herzlich willkommen bei Campus Life Events!\n\
Dein Konto wurde erfolgreich aktiviert und du kannst dich jetzt in die Plattform einloggen.\n\n\
Als Organisator*in kannst du öffentliche Veranstaltungen für deine Organisation erstellen und verwalten.\n\
Bei Fragen oder Problemen wende dich gerne an uns.\n\n\
Viele Grüße\nDas Neuland Team\n\n\
Campus Life Events ist ein Projekt der THI StudVer und wird von Neuland Ingolstadt e.V. entwickelt und betrieben."
            ),
        }
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
            Viele Grüße\nDas Neuland Team\n\n\
            Campus Life Events ist ein Projekt der THI StudVer und wird von Neuland Ingolstadt e.V. entwickelt und betrieben."
        )
    }
}
