use utoipa::OpenApi;

use crate::{
    dto::{
        ChangePasswordRequest, CreateEventRequest, CreateOrganizerRequest, InitAccountRequest,
        InviteAdminRequest, ListAuditLogsQuery, ListEventsQuery, LoginRequest,
        RequestPasswordResetRequest, ResetPasswordRequest, SendNewsletterPreviewRequest,
        SetupTokenLookupRequest, UpdateEventRequest, UpdateOrganizerPermissionsRequest,
        UpdateOrganizerRequest,
    },
    models::{AdminWithInvite, AuditLogEntry, Event, InviteStatus, Organizer, OrganizerWithInvite},
    responses::{
        AuthUserResponse, ErrorResponse, HealthResponse, NewsletterDataResponse,
        OrganizerWithStatsResponse, PasswordResetRequestResponse, PublicEventResponse,
        PublicOrganizerResponse, SetupTokenInfoResponse, SetupTokenResponse,
    },
    routes,
};

#[derive(OpenApi)]
#[openapi(
    info(
        title = "Campus Life Events API",
        description = "Campus Life Events REST API for managing organizers, events, and administrative workflows.",
        terms_of_service = "https://github.com/neuland-ingolstadt/campus-life-events",
        contact(
            name = "Campus Life Events",
            url = "https://github.com/neuland-ingolstadt/campus-life-events",
            email = "info@neuland-ingolstadt.de"
        ),
        license(
            name = "GNU Affero General Public License v3.0 or later",
            identifier = "AGPL-3.0-or-later",
            url = "https://www.gnu.org/licenses/agpl-3.0-standalone.html"
        ),
        version = "1.0.0"
    ),
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
        routes::admin::update_organizer_permissions,
        routes::events::list_events,
        routes::events::create_event,
        routes::events::get_event,
        routes::events::update_event,
        routes::events::delete_event,
        routes::events::get_newsletter_data,
        routes::events::send_newsletter_preview,
        routes::public_events::list_public_events,
        routes::public_events::get_public_event,
        routes::public_events::list_public_organizers,
        routes::public_events::get_public_organizer,
        routes::ical::list_organizer_ical_events,
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
        OrganizerWithStatsResponse,
        Event,
        CreateOrganizerRequest,
        UpdateOrganizerRequest,
        UpdateOrganizerPermissionsRequest,
        LoginRequest,
        InitAccountRequest,
        SetupTokenLookupRequest,
        ChangePasswordRequest,
        RequestPasswordResetRequest,
        PasswordResetRequestResponse,
        ResetPasswordRequest,
        InviteAdminRequest,
        CreateEventRequest,
        UpdateEventRequest,
        ListEventsQuery,
        ListAuditLogsQuery,
        SendNewsletterPreviewRequest,
        AuditLogEntry,
        ErrorResponse,
        HealthResponse,
        AuthUserResponse,
        SetupTokenResponse,
        SetupTokenInfoResponse,
        NewsletterDataResponse,
        PublicEventResponse, PublicOrganizerResponse,
        InviteStatus
    )),
    tags(
        (name = "Health", description = "Service availability"),
        (name = "Organizers", description = "Manage organizers"),
        (name = "Events", description = "Manage events"),
        (name = "Public", description = "Public event and organizer information"),
        (name = "Audit", description = "Inspect change history"),
        (name = "Auth", description = "Organizer login & sessions"),
        (name = "Admin", description = "Manage admin accounts")
    )
)]
pub struct ApiDoc;
