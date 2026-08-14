use chrono::{DateTime, Utc};
use sqlx::{Postgres, QueryBuilder};

use crate::dto::{EventSort, SortDirection};

pub(crate) fn push_event_order_by_clause(
    builder: &mut QueryBuilder<Postgres>,
    sort: Option<EventSort>,
    direction: Option<SortDirection>,
    now: DateTime<Utc>,
    table_alias: Option<&str>,
) {
    let prefix = table_alias.unwrap_or("");
    builder.push(" ORDER BY ");

    let use_effective_tiebreak = matches!(sort, None | Some(EventSort::EffectiveDateTime));

    match sort {
        Some(EventSort::EndDateTime) => {
            builder.push(prefix);
            builder.push("end_date_time");
        }
        Some(EventSort::TitleDe) => {
            builder.push(prefix);
            builder.push("title_de");
        }
        Some(EventSort::StartDateTime) => {
            builder.push(prefix);
            builder.push("start_date_time");
        }
        Some(EventSort::EffectiveDateTime) | None => {
            builder.push("CASE WHEN ");
            builder.push(prefix);
            builder.push("start_date_time > ");
            builder.push_bind(now);
            builder.push(" THEN ");
            builder.push(prefix);
            builder.push("start_date_time ELSE ");
            builder.push(prefix);
            builder.push("end_date_time END");
        }
    }

    let descending = matches!(direction, Some(SortDirection::Desc));
    builder.push(if descending { " DESC" } else { " ASC" });

    if use_effective_tiebreak {
        builder.push(", ");
        builder.push(prefix);
        builder.push("start_date_time ");
        builder.push(if descending { "DESC" } else { "ASC" });
    }

    builder.push(", ");
    builder.push(prefix);
    builder.push("id ");
    builder.push(if descending { "DESC" } else { "ASC" });
}
