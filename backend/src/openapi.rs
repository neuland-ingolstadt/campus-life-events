use utoipa::OpenApi;

use crate::{
    dto::{
        CreateEventRequest, CreateOrganizerRequest, ListAuditLogsQuery, ListEventsQuery,
        UpdateEventRequest, UpdateOrganizerRequest, LoginRequest, InitAccountRequest,
        ChangePasswordRequest,
    },
    models::{AuditLogEntry, Event, Organizer},
    responses::{ErrorResponse, HealthResponse, AuthUserResponse, SetupTokenResponse},
    routes,
};

#[derive(OpenApi)]
#[openapi(
    paths(
        routes::health_check,
        routes::list_organizers,
        routes::create_organizer,
        routes::get_organizer,
        routes::update_organizer,
        routes::delete_organizer,
        routes::generate_setup_token,
        routes::list_events,
        routes::create_event,
        routes::get_event,
        routes::update_event,
        routes::delete_event,
        routes::list_audit_logs,
        routes::login,
        routes::logout,
        routes::me,
        routes::init_account,
        routes::change_password
    ),
    components(schemas(
        Organizer,
        Event,
        CreateOrganizerRequest,
        UpdateOrganizerRequest,
        LoginRequest,
        InitAccountRequest,
        ChangePasswordRequest,
        CreateEventRequest,
        UpdateEventRequest,
        ListEventsQuery,
        ListAuditLogsQuery,
        AuditLogEntry,
        ErrorResponse,
        HealthResponse,
        AuthUserResponse,
        SetupTokenResponse
    )),
    tags(
        (name = "Health", description = "Service availability"),
        (name = "Organizers", description = "Manage organizers"),
        (name = "Events", description = "Manage events"),
        (name = "Audit", description = "Inspect change history"),
        (name = "Auth", description = "Organizer login & sessions")
    )
)]
pub struct ApiDoc;
