use axum::{
    Json, Router,
    extract::{Path, State},
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
    routing::get,
};
use chrono::{DateTime, Duration, Utc};
use sqlx::{FromRow, Postgres, QueryBuilder};
use tracing::{error, info, instrument, warn};

use crate::{
    app_state::AppState,
    dto::{CreateOrganizerRequest, UpdateOrganizerRequest},
    error::AppError,
    models::{AccountType, Organizer, OrganizerInviteRow, OrganizerKind, OrganizerWithInvite},
    responses::{
        ErrorResponse, OrganizerHealthResponse, OrganizerWithStatsResponse, SetupTokenResponse,
    },
};

use super::shared::{
    AuthedUser, SessionOrganizerKindScope, current_user_from_headers, generate_setup_token_value,
    refresh_organizer_activity_stats, session_organizer_kind_scope,
};

const PROFILE_FIELDS_TOTAL: i32 = 4;
const MIN_PEER_SAMPLE: i64 = 3;
const LOGIN_NUDGE_AFTER_DAYS: i64 = 14;

#[derive(Debug, FromRow)]
struct OrganizerHealthRow {
    organizer_id: i64,
    description_de: Option<String>,
    description_en: Option<String>,
    website_url: Option<String>,
    location: Option<String>,
    instagram_url: Option<String>,
    linkedin_url: Option<String>,
    future_events_count: i64,
    previous_login_at: Option<DateTime<Utc>>,
    last_login_at: Option<DateTime<Utc>>,
}

#[derive(Debug, FromRow)]
struct PeerHealthRow {
    future_events_count: i64,
    description_de: Option<String>,
    description_en: Option<String>,
    website_url: Option<String>,
    location: Option<String>,
    instagram_url: Option<String>,
    linkedin_url: Option<String>,
}

fn profile_fields_filled(
    description_de: &Option<String>,
    description_en: &Option<String>,
    website_url: &Option<String>,
    location: &Option<String>,
    instagram_url: &Option<String>,
    linkedin_url: &Option<String>,
) -> i32 {
    let has_description = description_de
        .as_ref()
        .is_some_and(|s| !s.trim().is_empty())
        || description_en
            .as_ref()
            .is_some_and(|s| !s.trim().is_empty());
    let has_website = website_url.as_ref().is_some_and(|s| !s.trim().is_empty());
    let has_location = location.as_ref().is_some_and(|s| !s.trim().is_empty());
    let has_social = instagram_url.as_ref().is_some_and(|s| !s.trim().is_empty())
        || linkedin_url.as_ref().is_some_and(|s| !s.trim().is_empty());
    i32::from(has_description)
        + i32::from(has_website)
        + i32::from(has_location)
        + i32::from(has_social)
}

fn median_f64(values: &mut [f64]) -> Option<f64> {
    if values.is_empty() {
        return None;
    }
    values.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));
    let mid = values.len() / 2;
    if values.len().is_multiple_of(2) {
        Some((values[mid - 1] + values[mid]) / 2.0)
    } else {
        Some(values[mid])
    }
}

#[utoipa::path(
    get,
    path = "/api/v1/organizers/me/health",
    tag = "Organizers",
    responses(
        (status = 200, description = "Own organizer health vs anonymized peers", body = OrganizerHealthResponse),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 404, description = "No organizer for this account", body = ErrorResponse)
    )
)]
#[instrument(skip(state, headers))]
pub(crate) async fn get_organizer_health(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<OrganizerHealthResponse>, AppError> {
    let user = current_user_from_headers(&headers, &state).await?;
    let Some(organizer_id) = user.organizer_id else {
        return Err(AppError::not_found("No organizer linked to this account"));
    };

    let own = sqlx::query_as::<_, OrganizerHealthRow>(
        r#"
        SELECT
            o.id AS organizer_id,
            o.description_de,
            o.description_en,
            o.website_url,
            o.location,
            o.instagram_url,
            o.linkedin_url,
            COALESCE(stats.future_events_count, 0) AS future_events_count,
            a.previous_login_at,
            a.last_login_at
        FROM organizers o
        LEFT JOIN organizer_activity_stats stats ON stats.organizer_id = o.id
        LEFT JOIN accounts a ON a.id = $2
        WHERE o.id = $1
        "#,
    )
    .bind(organizer_id)
    .bind(user.account_id)
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::not_found("Organizer not found"))?;

    let peers = sqlx::query_as::<_, PeerHealthRow>(
        r#"
        SELECT
            COALESCE(stats.future_events_count, 0) AS future_events_count,
            o.description_de,
            o.description_en,
            o.website_url,
            o.location,
            o.instagram_url,
            o.linkedin_url
        FROM organizers o
        LEFT JOIN organizer_activity_stats stats ON stats.organizer_id = o.id
        WHERE o.organizer_kind = (
            SELECT organizer_kind FROM organizers WHERE id = $1
        )
          AND o.id <> $1
        "#,
    )
    .bind(organizer_id)
    .fetch_all(&state.db)
    .await?;

    let peer_sample_size = peers.len() as i64;
    let mut peer_future_counts: Vec<f64> =
        peers.iter().map(|p| p.future_events_count as f64).collect();
    let peer_future_events_median = if peer_sample_size >= MIN_PEER_SAMPLE {
        median_f64(&mut peer_future_counts)
    } else {
        None
    };

    let peer_complete_count = peers
        .iter()
        .filter(|p| {
            profile_fields_filled(
                &p.description_de,
                &p.description_en,
                &p.website_url,
                &p.location,
                &p.instagram_url,
                &p.linkedin_url,
            ) == PROFILE_FIELDS_TOTAL
        })
        .count() as f64;
    let peer_profile_complete_share = if peer_sample_size >= MIN_PEER_SAMPLE {
        Some(peer_complete_count / peer_sample_size as f64)
    } else {
        None
    };

    let profile_fields_filled = profile_fields_filled(
        &own.description_de,
        &own.description_en,
        &own.website_url,
        &own.location,
        &own.instagram_url,
        &own.linkedin_url,
    );
    let profile_completeness = f64::from(profile_fields_filled) / f64::from(PROFILE_FIELDS_TOTAL);

    let future_events_vs_peer_ratio = match peer_future_events_median {
        Some(median) if median > 0.0 && own.future_events_count > 0 => {
            Some(median / own.future_events_count as f64)
        }
        Some(median) if median > 0.0 && own.future_events_count == 0 => None,
        _ => None,
    };

    let show_event_nudge = match peer_future_events_median {
        Some(median) => median >= 1.0 && (own.future_events_count as f64) < median,
        None => false,
    };
    let show_profile_nudge = profile_fields_filled < PROFILE_FIELDS_TOTAL;
    let show_login_nudge = own
        .previous_login_at
        .is_some_and(|ts| Utc::now() - ts > Duration::days(LOGIN_NUDGE_AFTER_DAYS));

    Ok(Json(OrganizerHealthResponse {
        organizer_id: own.organizer_id,
        previous_login_at: own.previous_login_at,
        last_login_at: own.last_login_at,
        future_events_count: own.future_events_count,
        peer_future_events_median,
        future_events_vs_peer_ratio,
        peer_sample_size,
        profile_fields_filled,
        profile_fields_total: PROFILE_FIELDS_TOTAL,
        profile_completeness,
        peer_profile_complete_share,
        show_login_nudge,
        show_event_nudge,
        show_profile_nudge,
    }))
}

pub(crate) async fn update_organizer_with_user(
    state: &AppState,
    user: &AuthedUser,
    id: i64,
    payload: UpdateOrganizerRequest,
) -> Result<Organizer, AppError> {
    let editing_self = user.organizer_id() == Some(id);
    if !editing_self && !user.is_admin() {
        return Err(AppError::unauthorized("cannot update another organizer"));
    }
    let has_updates = payload.has_updates();
    let UpdateOrganizerRequest {
        name,
        description_de,
        description_en,
        website_url,
        instagram_url,
        location,
        linkedin_url,
        registration_number,
        non_profit,
    } = payload;

    if !has_updates {
        return Err(AppError::validation("No fields supplied for update"));
    }

    let mut builder = QueryBuilder::<Postgres>::new("UPDATE organizers SET updated_at = NOW()");
    if let Some(name) = name {
        builder.push(", name = ").push_bind(name);
    }
    if let Some(description_de) = description_de {
        builder
            .push(", description_de = ")
            .push_bind(description_de);
    }
    if let Some(description_en) = description_en {
        builder
            .push(", description_en = ")
            .push_bind(description_en);
    }
    if let Some(website_url) = website_url {
        builder.push(", website_url = ").push_bind(website_url);
    }
    if let Some(instagram_url) = instagram_url {
        builder.push(", instagram_url = ").push_bind(instagram_url);
    }
    if let Some(location) = location {
        builder.push(", location = ").push_bind(location);
    }
    if let Some(linkedin_url) = linkedin_url {
        builder.push(", linkedin_url = ").push_bind(linkedin_url);
    }
    if let Some(registration_number) = registration_number {
        builder
            .push(", registration_number = ")
            .push_bind(registration_number);
    }
    if let Some(non_profit) = non_profit {
        builder.push(", non_profit = ").push_bind(non_profit);
    }

    builder.push(" WHERE id = ").push_bind(id);
    builder.push(
        " RETURNING id, name, description_de, description_en, website_url, instagram_url, location, linkedin_url, registration_number, non_profit, newsletter, organizer_kind, created_at, updated_at",
    );

    let organizer = builder
        .build_query_as::<Organizer>()
        .fetch_one(&state.db)
        .await?;

    invalidate_public_organizer_caches(state).await;

    Ok(organizer)
}

#[utoipa::path(
    get,
    path = "/api/v1/organizers",
    tag = "Organizers",
    responses((status = 200, description = "List organizers", body = [OrganizerWithStatsResponse]), (status = 401, description = "Unauthorized", body = ErrorResponse))
)]
#[instrument(skip(state, headers))]
pub(crate) async fn list_organizers(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<Vec<OrganizerWithStatsResponse>>, AppError> {
    let user = current_user_from_headers(&headers, &state).await?;
    let scope = session_organizer_kind_scope(&state, &user).await?;

    if matches!(scope, SessionOrganizerKindScope::None) {
        return Ok(Json(vec![]));
    }

    let organizers: Vec<OrganizerWithStatsResponse> = match scope {
        SessionOrganizerKindScope::None => unreachable!(),
        SessionOrganizerKindScope::All => sqlx::query!(
            r#"
        SELECT
            o.id,
            o.name,
            o.description_de,
            o.description_en,
            o.website_url,
            o.instagram_url,
            o.location,
            o.linkedin_url,
            o.registration_number,
            o.non_profit,
            o.newsletter,
            o.organizer_kind as "organizer_kind: OrganizerKind",
            o.created_at,
            o.updated_at,
            COALESCE(stats.active_events_count, 0) AS "active_events_count!",
            COALESCE(stats.activity_score, 0)::double precision AS "activity_score!"
        FROM organizers o
        LEFT JOIN organizer_activity_stats stats ON stats.organizer_id = o.id
        ORDER BY o.name
        "#
        )
        .fetch_all(&state.db)
        .await?
        .into_iter()
        .map(|row| OrganizerWithStatsResponse {
            id: row.id,
            name: row.name,
            description_de: row.description_de,
            description_en: row.description_en,
            website_url: row.website_url,
            instagram_url: row.instagram_url,
            location: row.location,
            linkedin_url: row.linkedin_url,
            registration_number: row.registration_number,
            non_profit: row.non_profit,
            newsletter: row.newsletter,
            organizer_kind: row.organizer_kind,
            created_at: row.created_at,
            updated_at: row.updated_at,
            active_events_count: row.active_events_count,
            activity_score: row.activity_score,
        })
        .collect(),
        SessionOrganizerKindScope::OnlyKind(kind) => sqlx::query!(
            r#"
        SELECT
            o.id,
            o.name,
            o.description_de,
            o.description_en,
            o.website_url,
            o.instagram_url,
            o.location,
            o.linkedin_url,
            o.registration_number,
            o.non_profit,
            o.newsletter,
            o.organizer_kind as "organizer_kind: OrganizerKind",
            o.created_at,
            o.updated_at,
            COALESCE(stats.active_events_count, 0) AS "active_events_count!",
            COALESCE(stats.activity_score, 0)::double precision AS "activity_score!"
        FROM organizers o
        LEFT JOIN organizer_activity_stats stats ON stats.organizer_id = o.id
        WHERE o.organizer_kind = $1
        ORDER BY o.name
        "#,
            kind as OrganizerKind
        )
        .fetch_all(&state.db)
        .await?
        .into_iter()
        .map(|row| OrganizerWithStatsResponse {
            id: row.id,
            name: row.name,
            description_de: row.description_de,
            description_en: row.description_en,
            website_url: row.website_url,
            instagram_url: row.instagram_url,
            location: row.location,
            linkedin_url: row.linkedin_url,
            registration_number: row.registration_number,
            non_profit: row.non_profit,
            newsletter: row.newsletter,
            organizer_kind: row.organizer_kind,
            created_at: row.created_at,
            updated_at: row.updated_at,
            active_events_count: row.active_events_count,
            activity_score: row.activity_score,
        })
        .collect(),
    };

    Ok(Json(organizers))
}

#[utoipa::path(
    post,
    path = "/api/v1/organizers",
    tag = "Organizers",
    request_body = CreateOrganizerRequest,
    responses((status = 201, description = "Organizer created", body = SetupTokenResponse))
)]
#[instrument(skip(state, headers, payload))]
pub(crate) async fn create_organizer(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(payload): Json<CreateOrganizerRequest>,
) -> Result<impl IntoResponse, AppError> {
    let user = current_user_from_headers(&headers, &state).await?;
    if !user.is_admin() {
        return Err(AppError::unauthorized("insufficient permissions"));
    }

    let token = generate_setup_token_value();
    let mut tx = state.db.begin().await?;
    let organizer = sqlx::query_as!(
        Organizer,
        r#"
        INSERT INTO organizers (name, organizer_kind)
        VALUES ($1, $2)
        RETURNING id, name, description_de, description_en, website_url, instagram_url, location, linkedin_url, registration_number, non_profit, newsletter, organizer_kind as "organizer_kind: OrganizerKind", created_at, updated_at
        "#,
        &payload.name,
        payload.organizer_kind as OrganizerKind
    )
    .fetch_one(&mut *tx)
    .await?;

    sqlx::query!(
        r#"
        INSERT INTO accounts (
            account_type,
            organizer_id,
            display_name,
            email,
            setup_token,
            setup_token_expires_at
        )
        VALUES ($1::account_type, $2, $3, $4, $5, NOW() + INTERVAL '7 days')
        "#,
        AccountType::Organizer as AccountType,
        organizer.id,
        &organizer.name,
        &payload.email,
        &token
    )
    .execute(&mut *tx)
    .await?;

    if let Some(email_client) = &state.email {
        match email_client
            .send_new_organizer_invite(
                &payload.email,
                &payload.name,
                &token,
                payload.organizer_kind,
            )
            .await
        {
            Ok(_) => info!("organizer invite email sent successfully"),
            Err(err) => {
                error!(error = %err, "failed to send organizer invite email");
                warn!("organizer invite created but email delivery failed");
            }
        }
    } else {
        warn!("email client not configured; organizer invite email not sent");
    }

    tx.commit().await?;

    invalidate_public_organizer_caches(&state).await;

    Ok((
        StatusCode::CREATED,
        Json(SetupTokenResponse { setup_token: token }),
    ))
}

#[utoipa::path(
    get,
    path = "/api/v1/organizers/admin",
    tag = "Organizers",
    responses((
        status = 200,
        description = "List organizers including invite status",
        body = [OrganizerWithInvite],
    )),
)]
#[instrument(skip(state, headers))]
pub(crate) async fn list_organizers_admin(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<Vec<OrganizerWithInvite>>, AppError> {
    let user = current_user_from_headers(&headers, &state).await?;
    if !user.is_admin() {
        return Err(AppError::unauthorized("insufficient permissions"));
    }

    let rows = sqlx::query_as!(
        OrganizerInviteRow,
        r#"
        SELECT
            o.id AS organizer_id,
            o.name AS organizer_name,
            a.id AS account_id,
            a.email AS account_email,
            o.newsletter AS newsletter,
            o.organizer_kind as "organizer_kind: OrganizerKind",
            o.created_at,
            o.updated_at,
            a.password_hash,
            a.setup_token,
            a.setup_token_expires_at
        FROM organizers o
        LEFT JOIN accounts a
            ON a.organizer_id = o.id AND a.account_type = 'ORGANIZER'
        ORDER BY o.created_at DESC
        "#
    )
    .fetch_all(&state.db)
    .await?;

    let organizers = rows
        .into_iter()
        .map(OrganizerWithInvite::from_row)
        .collect();

    Ok(Json(organizers))
}

#[utoipa::path(
    get,
    path = "/api/v1/organizers/{id}",
    tag = "Organizers",
    params(("id" = i64, Path, description = "Organizer identifier")),
    responses((status = 200, description = "Organizer details", body = OrganizerWithStatsResponse), (status = 401, description = "Unauthorized", body = ErrorResponse))
)]
#[instrument(skip(state, headers))]
pub(crate) async fn get_organizer(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<i64>,
) -> Result<Json<OrganizerWithStatsResponse>, AppError> {
    let user = current_user_from_headers(&headers, &state).await?;
    let scope = session_organizer_kind_scope(&state, &user).await?;

    if matches!(scope, SessionOrganizerKindScope::None) {
        return Err(AppError::not_found("Organizer not found"));
    }

    let organizer = sqlx::query!(
        r#"
        SELECT
            o.id,
            o.name,
            o.description_de,
            o.description_en,
            o.website_url,
            o.instagram_url,
            o.location,
            o.linkedin_url,
            o.registration_number,
            o.non_profit,
            o.newsletter,
            o.organizer_kind as "organizer_kind: OrganizerKind",
            o.created_at,
            o.updated_at,
            COALESCE(stats.active_events_count, 0) AS "active_events_count!",
            COALESCE(stats.activity_score, 0)::double precision AS "activity_score!"
        FROM organizers o
        LEFT JOIN organizer_activity_stats stats ON stats.organizer_id = o.id
        WHERE o.id = $1
        "#,
        id
    )
    .fetch_optional(&state.db)
    .await?;

    let Some(row) = organizer else {
        return Err(AppError::not_found("Organizer not found"));
    };

    if let SessionOrganizerKindScope::OnlyKind(kind) = scope
        && row.organizer_kind != kind
    {
        return Err(AppError::not_found("Organizer not found"));
    }

    Ok(Json(OrganizerWithStatsResponse {
        id: row.id,
        name: row.name,
        description_de: row.description_de,
        description_en: row.description_en,
        website_url: row.website_url,
        instagram_url: row.instagram_url,
        location: row.location,
        linkedin_url: row.linkedin_url,
        registration_number: row.registration_number,
        non_profit: row.non_profit,
        newsletter: row.newsletter,
        organizer_kind: row.organizer_kind,
        created_at: row.created_at,
        updated_at: row.updated_at,
        active_events_count: row.active_events_count,
        activity_score: row.activity_score,
    }))
}

#[utoipa::path(
    put,
    path = "/api/v1/organizers/{id}",
    tag = "Organizers",
    params(("id" = i64, Path, description = "Organizer identifier")),
    request_body = UpdateOrganizerRequest,
    responses((status = 200, description = "Organizer updated", body = Organizer))
)]
#[instrument(skip(state, headers, payload))]
pub(crate) async fn update_organizer(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<i64>,
    Json(payload): Json<UpdateOrganizerRequest>,
) -> Result<Json<Organizer>, AppError> {
    let user = current_user_from_headers(&headers, &state).await?;
    let organizer = update_organizer_with_user(&state, &user, id, payload).await?;
    Ok(Json(organizer))
}

#[utoipa::path(
    delete,
    path = "/api/v1/organizers/{id}",
    tag = "Organizers",
    params(("id" = i64, Path, description = "Organizer identifier")),
    responses((status = 204, description = "Organizer removed"))
)]
#[instrument(skip(state, headers))]
pub(crate) async fn delete_organizer(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<i64>,
) -> Result<StatusCode, AppError> {
    let user = current_user_from_headers(&headers, &state).await?;
    let deleting_self = user.organizer_id() == Some(id);
    if !deleting_self && !user.is_admin() {
        return Err(AppError::unauthorized("cannot delete another organizer"));
    }
    let result = sqlx::query!("DELETE FROM organizers WHERE id = $1", id)
        .execute(&state.db)
        .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::not_found("Organizer not found"));
    }

    invalidate_public_organizer_caches(&state).await;

    Ok(StatusCode::NO_CONTENT)
}

#[utoipa::path(
    post,
    path = "/api/v1/organizers/{id}/setup-token",
    tag = "Organizers",
    params(("id" = i64, Path, description = "Organizer identifier")),
    responses((status = 200, description = "Setup token generated", body = SetupTokenResponse))
)]
#[instrument(skip(state))]
pub(crate) async fn generate_setup_token(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<i64>,
) -> Result<Json<SetupTokenResponse>, AppError> {
    let user = current_user_from_headers(&headers, &state).await?;
    if user.organizer_id() != Some(id) && !user.is_admin() {
        return Err(AppError::unauthorized(
            "cannot generate token for another organizer",
        ));
    }
    let token = generate_setup_token_value();
    let result = sqlx::query!(
        r#"
        UPDATE accounts
        SET setup_token = $1,
            setup_token_expires_at = NOW() + INTERVAL '7 days',
            updated_at = NOW()
        WHERE organizer_id = $2
            AND account_type = 'ORGANIZER'
        "#,
        &token,
        id
    )
    .execute(&state.db)
    .await?;
    if result.rows_affected() == 0 {
        return Err(AppError::not_found("Organizer account not found"));
    }
    Ok(Json(SetupTokenResponse { setup_token: token }))
}

pub(crate) async fn invalidate_public_organizer_caches(state: &AppState) {
    if let Some(cache) = &state.cache {
        if let Err(err) = cache.purge_prefix("public:organizers").await {
            warn!(target: "cache", action = "purge", scope = "public_organizers", %err, "Failed to purge public organizers cache");
        }
        if let Err(err) = cache.purge_prefix("public:events").await {
            warn!(target: "cache", action = "purge", scope = "public_events", %err, "Failed to purge public events cache");
        }
        if let Err(err) = cache.purge_prefix("ical").await {
            warn!(target: "cache", action = "purge", scope = "ical", %err, "Failed to purge iCal cache");
        }
    }
    refresh_organizer_activity_stats(state).await;
}

pub(crate) fn router() -> Router<AppState> {
    Router::new()
        .route("/", get(list_organizers).post(create_organizer))
        .route("/admin", get(list_organizers_admin))
        .route("/me/health", get(get_organizer_health))
        .route(
            "/{id}",
            get(get_organizer)
                .put(update_organizer)
                .delete(delete_organizer),
        )
        .route(
            "/{id}/setup-token",
            get(generate_setup_token).post(generate_setup_token),
        )
}
