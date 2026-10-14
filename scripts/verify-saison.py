"""End-to-end verification of the Saison page <-> clone backend integration.

Reads the live backend state (season plan + sessions) with urllib, then checks
at 420x900 that /fr/saison streams the plan card, the macro-plan and the
sessions list, and saves docs/saison.png. Then clicks "Générer les séances",
waits for the ~1.2 s generation to land and for router.refresh() to stream the
new rows, and asserts the page shows exactly what GET /api/season/sessions
returns (a freshly seeded backend goes 3 -> 5 sessions; a long-running one
replaces its previous generated pair or appends, and either way the skeleton
gains "Bloc 2" sessions). It also confirms the POST /api/season/generate call
and the RSC refresh request on the wire. Then saves docs/saison-generated.png.
Finally checks zero console errors and no horizontal overflow at 375 and 420.

Usage:  python scripts/verify-saison.py
Expects the frontend dev server on http://localhost:4970 and the backend on
http://localhost:4900.
"""

from __future__ import annotations

import asyncio
import datetime as dt
import json
import urllib.request
from pathlib import Path

from playwright.async_api import async_playwright

BASE_URL = "http://localhost:4970"
API_URL = "http://localhost:4900"
DOCS_DIR = Path(__file__).resolve().parent.parent / "docs"

# Same rendering as the page's formatShortDate: "mar. 15 sept.".
WEEKDAYS = ["lun.", "mar.", "mer.", "jeu.", "ven.", "sam.", "dim."]
MONTHS = [
    "janv.", "févr.", "mars", "avr.", "mai", "juin",
    "juil.", "août", "sept.", "oct.", "nov.", "déc.",
]

THEME_LABELS = {
    "buildupFromBack": "Relance",
    "pressExit": "Sortie de pressing",
    "possessionRetention": "Conservation",
    "progression": "Progression",
    "playBetweenLines": "Jeu entre les lignes",
    "crosses": "Centres",
    "finishing": "Finition",
    "pressing": "Pressing",
    "defensiveBlock": "Bloc défensif",
    "transitionDefense": "Transition défensive",
    "transitionOffense": "Transition offensive",
    "setPieces": "Coups de pied arrêtés",
    "communication": "Communication",
    "other": "Autre",
}


def short_date(iso: str) -> str:
    date = dt.date.fromisoformat(iso)
    return f"{WEEKDAYS[date.weekday()]} {date.day} {MONTHS[date.month - 1]}"


def api_get(path: str) -> object:
    with urllib.request.urlopen(f"{API_URL}{path}", timeout=5) as response:
        return json.load(response)


def backend_state() -> tuple[dict, list[dict]]:
    """Live plan + sessions straight from the backend (plan_1)."""
    plan = api_get("/api/season-plan")["plan"]  # type: ignore[index]
    sessions = api_get(
        f"/api/season/sessions?seasonPlanId={plan['id']}"
    )["sessions"]  # type: ignore[index]
    return plan, sessions


def theme_probe(theme: str | None) -> str:
    if not theme:
        return ""
    return THEME_LABELS.get(theme, theme.capitalize())


async def main() -> None:
    plan, sessions_before = backend_state()
    category = (plan.get("teamCategory") or "").upper()
    rows_before = len(sessions_before)
    dates_before = [short_date(session["date"]) for session in sessions_before]
    themes_before = [theme_probe(session.get("theme")) for session in sessions_before]
    assert rows_before >= 3, f"expected >= 3 seeded sessions, got {rows_before}"

    problems: list[str] = []
    report: dict[str, object] = {
        "backend": {
            "plan_id": plan["id"],
            "category": category,
            "sessions_before": rows_before,
            "dates_before": dates_before,
        },
        "checks": {},
        "screenshots": {},
    }

    async with async_playwright() as pw:
        browser = await pw.chromium.launch()

        # ---------------------------------------------------------- 420x900
        context = await browser.new_context(
            viewport={"width": 420, "height": 900},
            device_scale_factor=1,
        )
        page = await context.new_page()

        errors: list[str] = []
        warnings: list[str] = []
        generate_responses: list[dict] = []
        post_click_requests: list[str] = []
        rsc_requests: list[str] = []
        generating = False

        def on_console(msg: object, sink_errors=errors, sink_warnings=warnings) -> None:
            text = f"{msg.type}: {msg.text}"  # type: ignore[attr-defined]
            if msg.type == "error":  # type: ignore[attr-defined]
                sink_errors.append(text)
            elif msg.type in ("warning",):  # type: ignore[attr-defined]
                sink_warnings.append(text)

        def on_response(resp: object) -> None:
            url = resp.url  # type: ignore[attr-defined]
            if "/api/season/generate" in url:
                generate_responses.append(
                    {"status": resp.status}  # type: ignore[attr-defined]
                )

        def on_request(req: object) -> None:
            if not generating or req.method != "GET":  # type: ignore[attr-defined]
                return
            url = req.url  # type: ignore[attr-defined]
            if len(post_click_requests) < 40:
                post_click_requests.append(url)
            if "_rsc=" in url:
                rsc_requests.append(url)

        page.on("console", on_console)
        page.on("response", on_response)
        page.on("request", on_request)
        page.on(
            "pageerror",
            lambda exc, sink=errors: sink.append(f"pageerror: {exc}"),
        )

        response = await page.goto(f"{BASE_URL}/fr/saison", wait_until="load")

        # Streamed RSC content must have replaced the empty-state fallbacks.
        for probe in (f"text={category}", "text=Générer les séances"):
            try:
                await page.wait_for_selector(probe, timeout=15_000)
            except Exception as exc:  # noqa: BLE001
                problems.append(f"wait-for {probe!r} timed out: {exc.__class__.__name__}")
        await page.evaluate("document.fonts.ready")
        await page.wait_for_timeout(400)

        text_before = await page.inner_text("body")
        lowered = text_before.lower()
        rows_on_page = await page.get_by_test_id("session-row").count()
        overflow_420 = await page.evaluate(
            "document.documentElement.scrollWidth - window.innerWidth"
        )

        date_hits = [date for date in dates_before if date.lower() in lowered]
        theme_hits = [theme for theme in themes_before if theme and theme.lower() in lowered]
        checks_before = {
            "has_saison_title": "saison" in lowered,
            "has_category": category.lower() in lowered,
            "has_generate_cta": "générer les séances" in lowered,
            "rows_on_page": rows_on_page,
            "rows_expected": rows_before,
            "date_probes_present": date_hits,
            "date_probes_expected": dates_before,
            "theme_probes_present": theme_hits,
        }
        report["checks"]["before"] = checks_before

        if not checks_before["has_saison_title"]:
            problems.append("page is missing the 'Saison' title")
        if not checks_before["has_category"]:
            problems.append(f"page is missing the category badge {category!r}")
        if not checks_before["has_generate_cta"]:
            problems.append("page is missing the 'Générer les séances' CTA")
        if rows_on_page != rows_before:
            problems.append(f"page shows {rows_on_page} session rows, backend has {rows_before}")
        if len(date_hits) < 3:
            problems.append(f"only {len(date_hits)} session dates rendered, expected >= 3")
        if len(date_hits) + len(theme_hits) < 3:
            problems.append("fewer than 3 session dates/themes rendered")
        if overflow_420 > 0:
            problems.append(f"420x900: horizontal overflow of {overflow_420}px")

        DOCS_DIR.mkdir(parents=True, exist_ok=True)
        shot_before = DOCS_DIR / "saison.png"
        await page.screenshot(path=str(shot_before))
        report["screenshots"]["before"] = str(shot_before)

        # ------------------------------------------------------ generation
        button = page.get_by_test_id("generate-sessions")
        enabled_before = await button.is_enabled()
        generating = True
        await button.click()

        pending_seen = False
        try:
            await page.get_by_text("Génération en cours").wait_for(
                state="visible", timeout=2_000
            )
            pending_seen = True
        except Exception:  # noqa: BLE001
            warnings.append("pending label not observed (generation finished too fast?)")

        success_seen = False
        try:
            await page.get_by_text("Séances mises à jour").wait_for(
                state="visible", timeout=15_000
            )
            success_seen = True
        except Exception as exc:  # noqa: BLE001
            problems.append(f"success message never appeared: {exc.__class__.__name__}")

        # The backend now has the regenerated skeleton; row count and dates must
        # match it exactly (on a long-running backend the generated dates can
        # repeat, so the on-the-wire POST + RSC assertions above carry the
        # "generation really happened" evidence).
        _, sessions_after = backend_state()
        newest_dates = [short_date(session["date"]) for session in sessions_after[-2:]]
        try:
            await page.wait_for_function(
                """([count, dates]) => {
                    const rows = document.querySelectorAll('[data-testid="session-row"]').length;
                    return rows === count && dates.every((d) => document.body.innerText.includes(d));
                }""",
                arg=[len(sessions_after), newest_dates],
                timeout=15_000,
            )
        except Exception as exc:  # noqa: BLE001
            problems.append(f"page did not refresh to the new sessions: {exc.__class__.__name__}")

        await page.wait_for_timeout(300)
        text_after = await page.inner_text("body")
        lowered_after = text_after.lower()
        rows_after = await page.get_by_test_id("session-row").count()
        button_enabled = await button.is_enabled()
        overflow_after = await page.evaluate(
            "document.documentElement.scrollWidth - window.innerWidth"
        )
        mesocycles = sorted({(s.get("mesocycle") or "") for s in sessions_after})

        checks_after = {
            "sessions_after": len(sessions_after),
            "dates_after": [short_date(s["date"]) for s in sessions_after],
            "mesocycles_after": mesocycles,
            "rows_on_page": rows_after,
            "success_message_seen": success_seen,
            "pending_label_seen": pending_seen,
            "button_reenabled": button_enabled,
            "bloc2_on_page": "bloc 2" in lowered_after,
            "newest_dates_on_page": [
                d for d in newest_dates if d.lower() in lowered_after
            ],
            "generate_post_responses": generate_responses,
            "rsc_refresh_requests": len(rsc_requests),
        }
        report["checks"]["after"] = checks_after

        if rows_before == 3:
            # Freshly seeded backend per the brief: 3 seeded + 2 generated = 5.
            if len(sessions_after) != 5:
                problems.append(
                    f"backend returned {len(sessions_after)} sessions after generation, expected 5"
                )
        elif len(sessions_after) not in (rows_before, rows_before + 2):
            # Long-running backend: generation replaces its previous pair when it
            # still remembers it, otherwise it appends the two new sessions.
            problems.append(
                f"backend returned {len(sessions_after)} sessions after generation, "
                f"expected {rows_before} (replaced) or {rows_before + 2} (appended)"
            )
        if rows_after != len(sessions_after):
            problems.append(f"page shows {rows_after} rows, backend has {len(sessions_after)}")
        bloc2_on_backend = [
            s for s in sessions_after if "bloc 2" in (s.get("mesocycle") or "").lower()
        ]
        if len(bloc2_on_backend) < 2:
            problems.append(
                f"fewer than 2 generated 'Bloc 2' sessions on the backend: {mesocycles}"
            )
        if "bloc 2" not in lowered_after:
            problems.append("page is missing the 'Bloc 2' session group")
        if len(checks_after["newest_dates_on_page"]) != len(newest_dates):
            problems.append("page is missing the newly generated session dates")
        if not any(r.get("status") == 200 for r in generate_responses):
            problems.append(
                f"no successful POST /api/season/generate observed: {generate_responses}"
            )
        if not rsc_requests:
            problems.append(
                "no RSC refresh request observed after generation "
                f"(post-click requests: {post_click_requests[:20]})"
            )
        if not button_enabled:
            problems.append("generate button stayed disabled after generation")
        if not enabled_before:
            problems.append("generate button was disabled before the click")
        if overflow_after > 0:
            problems.append(f"420x900 after generation: horizontal overflow of {overflow_after}px")

        shot_after = DOCS_DIR / "saison-generated.png"
        await page.screenshot(path=str(shot_after))
        report["screenshots"]["after"] = str(shot_after)

        report["console_errors_420"] = errors
        report["console_warnings_420"] = warnings
        problems.extend(f"420x900 console -> {line}" for line in errors)
        await context.close()

        # ---------------------------------------------------------- 375x812
        context = await browser.new_context(
            viewport={"width": 375, "height": 812},
            device_scale_factor=1,
        )
        page = await context.new_page()
        errors_375: list[str] = []

        def on_console_375(msg: object, sink=errors_375) -> None:
            if msg.type == "error":  # type: ignore[attr-defined]
                sink.append(f"{msg.type}: {msg.text}")  # type: ignore[attr-defined]

        page.on("console", on_console_375)
        page.on(
            "pageerror",
            lambda exc, sink=errors_375: sink.append(f"pageerror: {exc}"),
        )

        await page.goto(f"{BASE_URL}/fr/saison", wait_until="load")
        try:
            await page.wait_for_selector("text=Générer les séances", timeout=15_000)
        except Exception as exc:  # noqa: BLE001
            problems.append(f"375x812: streamed content never appeared: {exc.__class__.__name__}")
        await page.evaluate("document.fonts.ready")
        await page.wait_for_timeout(400)

        rows_375 = await page.get_by_test_id("session-row").count()
        overflow_375 = await page.evaluate(
            "document.documentElement.scrollWidth - window.innerWidth"
        )
        report["checks"]["375x812"] = {
            "rows_on_page": rows_375,
            "horizontal_overflow_px": overflow_375,
            "console_errors": errors_375,
        }
        if rows_375 != len(sessions_after):
            problems.append(f"375x812: page shows {rows_375} rows, backend has {len(sessions_after)}")
        if overflow_375 > 0:
            problems.append(f"375x812: horizontal overflow of {overflow_375}px")
        problems.extend(f"375x812 console -> {line}" for line in errors_375)
        await context.close()

        await browser.close()

    report["http_status"] = response.status if response else None
    report["problems"] = problems
    print(json.dumps(report, indent=2, ensure_ascii=False))
    print(f"\nPROBLEMS: {len(problems)}")
    for line in problems:
        print(" -", line)
    if problems:
        raise SystemExit(1)


if __name__ == "__main__":
    asyncio.run(main())
