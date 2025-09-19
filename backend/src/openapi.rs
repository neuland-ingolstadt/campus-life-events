use utoipa::OpenApi;

use crate::{
    dto::{
        ChangePasswordRequest, CreateEventRequest, CreateOrganizerRequest, InitAccountRequest,
        ListAuditLogsQuery, ListEventsQuery, LoginRequest, SetupTokenLookupRequest,
        UpdateEventRequest, UpdateOrganizerRequest,
    },
    models::{AuditLogEntry, Event, InviteStatus, Organizer, OrganizerWithInvite},
    responses::{
        AuthUserResponse, ErrorResponse, HealthResponse, SetupTokenInfoResponse, SetupTokenResponse,
    },
    routes,
};

#[derive(OpenApi)]
#[openapi(
    paths(
        routes::health_check,
        routes::list_organizers,
        routes::create_organizer,
        routes::list_organizers_admin,
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
        routes::lookup_setup_token,
        routes::logout,
        routes::me,
        routes::init_account,
        routes::change_password
    ),
    components(schemas(
        Organizer,
        OrganizerWithInvite,
        Event,
        CreateOrganizerRequest,
        UpdateOrganizerRequest,
        LoginRequest,
        InitAccountRequest,
        SetupTokenLookupRequest,
        ChangePasswordRequest,
        CreateEventRequest,
        UpdateEventRequest,
        ListEventsQuery,
        ListAuditLogsQuery,
        AuditLogEntry,
        ErrorResponse,
        HealthResponse,
        AuthUserResponse,
        SetupTokenResponse,
        SetupTokenInfoResponse,
        InviteStatus
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
