CREATE MATERIALIZED VIEW organizer_activity_stats AS
WITH stats AS (
    SELECT
        o.id AS organizer_id,
        COUNT(*) FILTER (
            WHERE e.publish_app = true
                AND COALESCE(e.end_date_time, e.start_date_time) >= NOW()
        ) AS active_events_count,
        COUNT(*) FILTER (
            WHERE e.publish_app = true
                AND e.start_date_time BETWEEN NOW() AND NOW() + INTERVAL '4 month'
        ) AS future_events_count,
        COUNT(*) FILTER (
            WHERE e.publish_app = true
                AND e.start_date_time BETWEEN NOW() - INTERVAL '2 months' AND NOW()
        ) AS recent_events_count
    FROM organizers o
    LEFT JOIN events e ON e.organizer_id = o.id
    GROUP BY o.id
)
SELECT
    s.organizer_id,
    s.active_events_count,
    s.future_events_count,
    s.recent_events_count,
    (
        COALESCE(s.future_events_count, 0) * 1.5
        + COALESCE(s.recent_events_count, 0) * 0.5
        + CASE WHEN o.description_de IS NOT NULL THEN 0.5 ELSE 0 END
        + CASE WHEN o.description_en IS NOT NULL THEN 0.5 ELSE 0 END
        + CASE WHEN o.website_url IS NOT NULL THEN 0.5 ELSE 0 END
        + CASE WHEN o.instagram_url IS NOT NULL THEN 0.25 ELSE 0 END
        + CASE WHEN o.linkedin_url IS NOT NULL THEN 0.25 ELSE 0 END
        + CASE WHEN o.location IS NOT NULL THEN 0.5 ELSE 0 END
        + CASE WHEN o.registration_number IS NOT NULL THEN 0.25 ELSE 0 END
    )::double precision AS activity_score
FROM stats s
JOIN organizers o ON o.id = s.organizer_id;

CREATE UNIQUE INDEX organizer_activity_stats_organizer_id_idx
    ON organizer_activity_stats (organizer_id);
