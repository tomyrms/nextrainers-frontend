"""End-to-end verification of the player detail page (/fr/equipe/[id]).

Reads the first player live from the API, opens the roster, follows the card
link to the detail page and asserts the name, stats, every skill (radar label +
stepper value), strengths and improvements. Then bumps the first skill with
the "+" stepper, checks the API and the radar polygon followed, edits the
coach notes and checks the API again; both are restored in `finally`. Also
checks the unknown-id state, console errors and horizontal overflow at 375
and 420 px.

Saves docs/joueur.png.

Usage:  python scripts/verify-joueur.py
Expects the frontend on http://localhost:4970 and the backend on :4900.
"""

from __future__ import annotations

import asyncio
import json
import time
import sys
import urllib.request
from pathlib import Path
from typing import Any

from playwright.async_api import Page, async_playwright

BASE_URL = "http://localhost:4970"
API_URL = "http://localhost:4900"
DOCS_DIR = Path(__file__).resolve().parent.parent / "docs"

failures: list[str] = []


def check(name: str, ok: bool, detail: str = "") -> None:
    print(f"  {'PASS' if ok else 'FAIL'}  {name}{'' if ok else '  -> ' + detail}")
    if not ok:
        failures.append(name)


def api(method: str, path: str, body: dict[str, Any] | None = None) -> Any:
    data = json.dumps(body).encode() if body is not None else None
    request = urllib.request.Request(
        f"{API_URL}{path}", data=data, method=method, headers={"content-type": "application/json"}
    )
    with urllib.request.urlopen(request, timeout=10) as response:
        return json.load(response)


async def overflow(page: Page) -> bool:
    return await page.evaluate("document.documentElement.scrollWidth > window.innerWidth")


async def main() -> None:
    players = api("GET", "/api/players")
    player = players[0]
    pid = player["id"]
    skill = player["skills"][0]
    original_value = skill["value"]
    original_notes = player.get("coachNotes", "")
    console_errors: list[str] = []

    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page(viewport={"width": 420, "height": 900})
        page.on("console", lambda m: console_errors.append(m.text) if m.type == "error" else None)
        page.on("pageerror", lambda e: console_errors.append(str(e)))

        try:
            await page.goto(f"{BASE_URL}/fr/equipe")
            full_name = f"{player['firstName']} {player['lastName']}"
            await page.get_by_label(f"Fiche de {full_name}").click()
            await page.wait_for_url(f"**/fr/equipe/{pid}")
            await page.wait_for_selector('[data-testid="skills-radar"]')

            check("detail shows the player name", (await page.get_by_test_id("player-name").inner_text()).strip() == full_name)
            body = await page.inner_text("main")
            check("stats rendered", str(player.get("matches", 0)) in body and "Matchs" in body)
            radar_label = await page.get_by_test_id("skills-radar").get_attribute("aria-label") or ""
            for s in player["skills"]:
                check(f"radar has {s['name']} {s['value']}", f"{s['name']} {s['value']}/10" in radar_label, radar_label)
                value = await page.get_by_test_id(f"skill-value-{s['id']}").inner_text()
                check(f"stepper shows {s['name']}={s['value']}", value.strip() == str(s["value"]))
            for chip in player.get("strengths", []) + player.get("improvements", []):
                check(f"chip '{chip}' shown", chip in body)
            await page.screenshot(path=str(DOCS_DIR / "joueur.png"), full_page=True)

            # Skill +1 (or -1 at the max) -> API + radar follow.
            delta_label = "Augmenter" if original_value < 10 else "Baisser"
            expected = original_value + (1 if original_value < 10 else -1)
            before_shape = await page.get_by_test_id("skills-radar-shape").get_attribute("points")
            await page.get_by_label(f"{delta_label} {skill['name']}").click()
            await page.wait_for_function(
                f"""() => document.querySelector('[data-testid="skills-radar"]')
                    ?.getAttribute('aria-label')?.includes('{skill['name']} {expected}/10')""",
                timeout=10_000,
            )
            fresh = api("GET", f"/api/players/{pid}")
            check("API skill updated", next(s for s in fresh["skills"] if s["id"] == skill["id"])["value"] == expected)
            after_shape = await page.get_by_test_id("skills-radar-shape").get_attribute("points")
            check("radar polygon moved", before_shape != after_shape)

            # Coach notes.
            marker = f"Note de vérification {int(time.time())}"
            await page.get_by_label("Notes du coach").fill(marker)
            await page.get_by_role("button", name="Enregistrer").click()
            await page.get_by_text("Notes enregistrées").wait_for()
            check("API coachNotes saved", api("GET", f"/api/players/{pid}")["coachNotes"] == marker)

            for width, height in ((375, 812), (420, 900)):
                await page.set_viewport_size({"width": width, "height": height})
                await page.reload()
                await page.wait_for_selector('[data-testid="skills-radar"]')
                check(f"no horizontal overflow at {width}px", not await overflow(page))

            await page.goto(f"{BASE_URL}/fr/equipe/does-not-exist")
            await page.get_by_text("Joueur introuvable").wait_for()
            check("unknown id -> not-found state", True)
        finally:
            # PATCH answers the skills wrapper and ignores other fields, so
            # restore skills and notes separately.
            api("PATCH", f"/api/players/{pid}", {"skills": [{"id": skill["id"], "value": original_value}]})
            api("PATCH", f"/api/players/{pid}", {"coachNotes": original_notes})
            await browser.close()

    check("0 console errors", not console_errors, "; ".join(console_errors[:3]))
    print(f"\n== RESULT: {len(failures)} failed ==")
    sys.exit(1 if failures else 0)


asyncio.run(main())
