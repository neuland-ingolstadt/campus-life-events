#!/usr/bin/env python3
from __future__ import annotations

import base64
import os
from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo

TZ = ZoneInfo("Europe/Berlin")

CLUBS: list[tuple[str, str, str, str, str]] = [
    (
        "AStA TH Ingolstadt",
        "Vertretung der Studierendenschaft an der TH Ingolstadt.",
        "Student representation at TH Ingolstadt.",
        "TH Ingolstadt Campus",
        "invite.asta@eggl.dev",
    ),
    (
        "Filmclub Campus",
        "Wöchentliche Filmreihe und Diskussionsrunde.",
        "Weekly film series and discussion.",
        "Audimax Nebengebäude",
        "invite.film@eggl.dev",
    ),
    (
        "Hochschulsport Basketball",
        "Training und Campus-Liga für alle Level.",
        "Training and campus league for all levels.",
        "Sporthalle West",
        "invite.basketball@eggl.dev",
    ),
    (
        "Green Office Initiative",
        "Workshops zu Klima, Müllvermeidung und Mobilität.",
        "Workshops on climate, waste, and mobility.",
        "Nachhaltigkeitsbüro",
        "invite.green@eggl.dev",
    ),
    (
        "Debating Society",
        "Englischsprachige Debatten und BP-Format.",
        "English-language debates and BP format.",
        "Seminarraum 204",
        "invite.debate@eggl.dev",
    ),
    (
        "International Office Buddies",
        "Buddy-Programm und Stammtisch für internationale Studierende.",
        "Buddy programme and socials for international students.",
        "IO Lounge",
        "invite.buddies@eggl.dev",
    ),
]

EVENT_TEMPLATES: list[tuple[str, str, str, str, str | None, str | None, int]] = [
    (
        "Campuslauf Training",
        "Campus run training",
        "Lockeres Tempotraining auf dem Campusring.",
        "Easy pace laps on the campus loop.",
        "https://example.edu/sport/campuslauf",
        "Campusring Nord",
        2,
    ),
    (
        "Klimaworkshop: Ernährung",
        "Climate workshop: food",
        "Praktische Tipps für weniger CO₂ in der Mensa und WG-Küche.",
        "Practical tips for lower CO₂ in canteen and shared kitchens.",
        "https://example.edu/green/food",
        "Green Office",
        2,
    ),
    (
        "Open Mic Night",
        "Open mic night",
        "Musik, Comedy, Spoken Word — Anmeldung am Abend.",
        "Music, comedy, spoken word — sign-up on the night.",
        "https://example.edu/culture/openmic",
        "Studentenkeller",
        3,
    ),
    (
        "KI-Grundlagen für Vereine",
        "AI basics for student clubs",
        "Prompting, Datenschutz und sinnvolle Tools für eure Arbeit.",
        "Prompting, privacy, and sensible tools for your work.",
        "https://example.edu/tech/ai-clubs",
        "Labor 3.12",
        2,
    ),
    (
        "Stadtführung Ingolstadt",
        "Ingolstadt city tour",
        "Historische Altstadt und Donauufer mit Guide.",
        "Historic old town and Danube riverfront with guide.",
        None,
        "Haupteingang Rathausplatz",
        3,
    ),
    (
        "Basketball Pickup",
        "Basketball pickup",
        "Offenes Spiel — bitte Hallenschuhe mitbringen.",
        "Open run — indoor shoes required.",
        None,
        "Sporthalle West",
        2,
    ),
    (
        "Filmgespräch: Dokumentarfilm",
        "Film talk: documentary",
        "Regisseur*in zu Gast, Moderation auf Deutsch und Englisch.",
        "Guest director, moderation in German and English.",
        "https://example.edu/film/talk",
        "Kino 2",
        2,
    ),
    (
        "Buddy-Stammtisch",
        "Buddy pub night",
        "Kennenlernen in lockerer Atmosphäre, Snacks werden gestellt.",
        "Casual meet-and-greet, snacks provided.",
        None,
        "IO Lounge",
        2,
    ),
    (
        "Nachhaltige Mobilität",
        "Sustainable mobility",
        "Rad, ÖPNV, Carsharing — was lohnt sich wirklich?",
        "Bike, public transport, carsharing — what actually pays off?",
        "https://example.edu/green/mobility",
        "Audimax Foyer",
        2,
    ),
    (
        "BP-Debatte: Campus-Themen",
        "BP debate: campus topics",
        "Motion und Teams werden am Abend gelost.",
        "Motion and teams drawn on the night.",
        None,
        "Seminarraum 204",
        3,
    ),
    (
        "Yoga für Anfänger*innen",
        "Beginner yoga",
        "Matten vorhanden, bequeme Kleidung reicht.",
        "Mats provided, comfortable clothes are enough.",
        "https://example.edu/sport/yoga",
        "Sporthalle Ost",
        1,
    ),
    (
        "Hackathon Warm-up",
        "Hackathon warm-up",
        "Teamfindung, Ideenpitch und Repo-Setup.",
        "Team matching, idea pitch, and repo setup.",
        "https://example.edu/tech/hackathon",
        "Labor 1.07",
        4,
    ),
    (
        "Konzert: Jazz Ensemble",
        "Concert: jazz ensemble",
        "Eigenkompositionen und Standards im kleinen Rahmen.",
        "Originals and standards in an intimate setting.",
        "https://example.edu/music/jazz",
        "Aula",
        2,
    ),
    (
        "Sprachtandem Speed-Dating",
        "Language tandem speed dating",
        "5-Minuten-Runden, dann digitale Matches.",
        "Five-minute rounds, then digital matches.",
        None,
        "IO Lounge",
        2,
    ),
    (
        "Repair Café",
        "Repair café",
        "Elektronik und Textilien — Expert*innen helfen beim Fixen.",
        "Electronics and textiles — experts help you fix things.",
        "https://example.edu/green/repair",
        "Werkstatt Mitte",
        3,
    ),
    (
        "Fußball Freundschaftsspiel",
        "Friendly football match",
        "Kunstrasen, Trikots bitte mitbringen.",
        "Artificial turf, please bring shirts.",
        None,
        "Sportplatz Süd",
        2,
    ),
]


def esc(s: str) -> str:
    return s.replace("'", "''")


def setup_token() -> str:
    return base64.urlsafe_b64encode(os.urandom(32)).decode().rstrip("=")


def monday_on_or_after(d: date) -> date:
    while d.weekday() != 0:
        d += timedelta(days=1)
    return d


def fmt_ts(dt: datetime) -> str:
    return dt.isoformat()


def main() -> None:
    print("BEGIN;")
    for name, dd, de, loc, email in CLUBS:
        print(
            "INSERT INTO organizers (name, description_de, description_en, location) "
            f"VALUES ('{esc(name)}', '{esc(dd)}', '{esc(de)}', '{esc(loc)}');"
        )
    for name, dd, de, loc, email in CLUBS:
        tok = setup_token()
        print(
            "INSERT INTO accounts (account_type, organizer_id, display_name, email, "
            "setup_token, setup_token_expires_at) "
            f"SELECT 'ORGANIZER', id, '{esc(name)}', '{esc(email)}', '{tok}', "
            "NOW() + INTERVAL '14 days' FROM organizers WHERE name = "
            f"'{esc(name)}';"
        )

    first_monday = monday_on_or_after(date(2026, 5, 13))
    n_weeks = 18
    dow_offsets = [1, 2, 3, 5]
    hours = [10, 12, 17, 18, 19, 11, 16, 20]

    rows: list[str] = []
    org_ids = list(range(1, len(CLUBS) + 2))
    n_orgs = len(org_ids)
    ev_i = 0
    for w in range(n_weeks):
        monday = first_monday + timedelta(weeks=w)
        for slot, dow in enumerate(dow_offsets):
            day = monday + timedelta(days=dow)
            hour = hours[(w + slot) % len(hours)]
            start = datetime.combine(day, time(hour, 0), tzinfo=TZ)
            td, te, dd, de, url, loc, dur_h = EVENT_TEMPLATES[ev_i % len(EVENT_TEMPLATES)]
            ev_i += 1
            end = start + timedelta(hours=dur_h)
            oid = org_ids[(w * 4 + slot) % n_orgs]
            url_sql = "NULL" if url is None else f"'{esc(url)}'"
            loc_sql = "NULL" if loc is None else f"'{esc(loc)}'"
            rows.append(
                "("
                f"{oid}, '{esc(td)}', '{esc(te)}', '{esc(dd)}', '{esc(de)}', "
                f"'{fmt_ts(start)}'::timestamptz, '{fmt_ts(end)}'::timestamptz, "
                f"{url_sql}, {loc_sql}, true, true, true, true)"
            )

    print(
        "INSERT INTO events (organizer_id, title_de, title_en, description_de, "
        "description_en, start_date_time, end_date_time, event_url, location, "
        "publish_app, publish_newsletter, publish_in_ical, publish_web) VALUES\n    "
        + ",\n    ".join(rows)
        + ";"
    )
    print("COMMIT;")


if __name__ == "__main__":
    main()
