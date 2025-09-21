use utoipa::OpenApi;

use crate::{
    dto::{
        ChangePasswordRequest, CreateEventRequest, CreateOrganizerRequest, InitAccountRequest,
        InviteAdminRequest, ListAuditLogsQuery, ListEventsQuery, LoginRequest,
        RequestPasswordResetRequest, ResetPasswordRequest, SetupTokenLookupRequest,
        UpdateEventRequest, UpdateOrganizerRequest,
    },
    models::{AdminWithInvite, AuditLogEntry, Event, InviteStatus, Organizer, OrganizerWithInvite},
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
        routes::admin::invite_admin,
        routes::admin::list_admins,
        routes::events::list_events,
        routes::events::create_event,
        routes::events::get_event,
        routes::events::update_event,
        routes::events::delete_event,
        routes::public_events::get_public_event,
        routes::public_events::get_public_organizer,
        routes::audit::list_audit_logs,
        routes::auth::login,
        routes::auth::lookup_setup_token,
        routes::auth::logout,
        routes::auth::me,
        routes::auth::init_account,
        routes::auth::change_password,
        routes::auth::request_password_reset,
        routes::auth::reset_password
    ),
    components(schemas(
        AdminWithInvite,
        Organizer,
        OrganizerWithInvite,
        Event,
        CreateOrganizerRequest,
        UpdateOrganizerRequest,
        LoginRequest,
        InitAccountRequest,
        SetupTokenLookupRequest,
        ChangePasswordRequest,
        RequestPasswordResetRequest,
        ResetPasswordRequest,
        InviteAdminRequest,
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
        (name = "Public Events", description = "Public event information"),
        (name = "Audit", description = "Inspect change history"),
        (name = "Auth", description = "Organizer login & sessions"),
        (name = "Admin", description = "Manage admin accounts")
    )
)]
pub struct ApiDoc;
