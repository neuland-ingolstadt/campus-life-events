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
        routes::health::health_check,
        routes::organizers::list_organizers,
        routes::organizers::create_organizer,
        routes::organizers::list_organizers_admin,
        routes::organizers::get_organizer,
        routes::organizers::update_organizer,
        routes::organizers::delete_organizer,
        routes::organizers::generate_setup_token,
        routes::events::list_events,
        routes::events::create_event,
        routes::events::get_event,
        routes::events::update_event,
        routes::events::delete_event,
        routes::audit::list_audit_logs,
        routes::auth::login,
        routes::auth::lookup_setup_token,
        routes::auth::logout,
        routes::auth::me,
        routes::auth::init_account,
        routes::auth::change_password
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
