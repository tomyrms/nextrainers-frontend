"""End-to-end verification of the Bibliothèque page (exercises + favorites).

At 420x900 and 375x812: asserts the live exercise library streamed from the
clone backend is rendered ("Bibliothèque", the "N exercices" count and the
first seeded exercise), that the favorite toggle round-trips through
POST/DELETE /api/exercises/favorite, that type chips and the search field
filter the list, that there are zero console errors and no horizontal
overflow. Captures docs/bibliotheque.png and docs/bibliotheque-favorite.png.

Usage:  python scripts/verify-bibliotheque.py
Expects the frontend dev server on http://localhost:4970 and the backend on
http://localhost:4900.
"""

from __future__ import annotations

import asyncio
import json
import tempfile
import time
import urllib.error
import urllib.request
from pathlib import Path

from playwright.async_api import async_playwright

BASE_URL = "http://localhost:4970"
API_URL = "http://localhost:4900"
DOCS_DIR = Path(__file__).resolve().parent.parent / "docs"


def api_get(path: str) -> object:
    with urllib.request.urlopen(f"{API_URL}{path}", timeout=5) as response:
        return json.load(response)


def api_send(method: str, path: str, body: dict | None = None) -> int:
    data = json.dumps(body).encode() if body is not None else None
    request = urllib.request.Request(f"{API_URL}{path}", data=data, method=method)
    if data is not None:
        request.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(request, timeout=5) as response:
            return response.status
    except urllib.error.HTTPError as error:
        return error.code


def favorite_ids() -> set[str]:
    return {item["id"] for item in api_get("/api/exercises/favorite")}  # type: ignore[union-attr]


def wait_for_favorite(exercise_id: str, present: bool, timeout: float = 8.0) -> bool:
    """Polls the API until `exercise_id` is (not) favorited, or the timeout."""
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if (exercise_id in favorite_ids()) == present:
            return True
        time.sleep(0.25)
    return False


async def main() -> None:
    exercises = api_get("/api/exercises")
    assert isinstance(exercises, list)
    count = len(exercises)
    count_label = f"{count} exercices" if count > 1 else f"{count} exercice"
    first = exercises[0]
    first_id, first_title = first["id"], first["title"]
    # "Retour au calme" is the last chip; the API tells us how many it shows.
    cooldown_label = "Retour au calme"
    cooldown_count = sum(1 for item in exercises if item["type"] == "cooldown")

    # Start from a clean slate so the round-trip below is unambiguous.
    if first_id in favorite_ids():
        api_send("DELETE", f"/api/exercises/favorite?exerciseId={first_id}")

    required = ["Bibliothèque", count_label, first_title]
    problems: list[str] = []
    report: dict[str, object] = {
        "backend_exercise_count": count,
        "backend_first_exercise": {"id": first_id, "title": first_title},
        "required_texts": required,
        "views": {},
    }
    shots = {
        "420x900": DOCS_DIR / "bibliotheque.png",
        "375x812": Path(tempfile.gettempdir()) / "bibliotheque-375.png",
    }

    async with async_playwright() as pw:
        browser = await pw.chromium.launch()

        for view in ("420x900", "375x812"):
            width, height = (int(part) for part in view.split("x"))
            context = await browser.new_context(
                viewport={"width": width, "height": height},
                device_scale_factor=1,
            )
            page = await context.new_page()

            errors: list[str] = []
            warnings: list[str] = []

            def on_console(msg: object, errors=errors, warnings=warnings) -> None:
                text = f"{msg.type}: {msg.text}"  # type: ignore[attr-defined]
                if msg.type == "error":  # type: ignore[attr-defined]
                    errors.append(text)
                elif msg.type == "warning":  # type: ignore[attr-defined]
                    warnings.append(text)

            page.on("console", on_console)
            page.on(
                "pageerror",
                lambda exc, errors=errors: errors.append(f"pageerror: {exc}"),
            )

            response = await page.goto(f"{BASE_URL}/fr/bibliotheque", wait_until="load")
            try:
                await page.wait_for_load_state("networkidle", timeout=15_000)
            except Exception as exc:  # noqa: BLE001 - dev HMR socket stays open
                warnings.append(f"networkidle-timeout: {exc.__class__.__name__}")

            # Streamed RSC content must have replaced the empty-state fallback.
            for probe in (f"text={count_label}", f"text={first_title}"):
                try:
                    await page.wait_for_selector(probe, timeout=15_000)
                except Exception as exc:  # noqa: BLE001
                    warnings.append(f"wait-for {probe!r} timed out: {exc.__class__.__name__}")
            await page.evaluate("document.fonts.ready")
            await page.wait_for_timeout(400)

            entry: dict[str, object] = {"screenshot": str(shots[view])}

            if view == "420x900":
                # Search + chips handle the list client-side, over the RSC data.
                await page.fill('input[role="searchbox"]', "zzzz")
                try:
                    await page.wait_for_selector("text=Aucun exercice ne correspond", timeout=5_000)
                    entry["search_empty_state"] = True
                except Exception as exc:  # noqa: BLE001
                    entry["search_empty_state"] = False
                    problems.append(f"{view}: search empty state missing ({exc.__class__.__name__})")
                await page.fill('input[role="searchbox"]', "")

                await page.get_by_role("button", name=cooldown_label, exact=True).click()
                await page.wait_for_timeout(250)
                chip_label = f"{cooldown_count} exercice"
                body = await page.inner_text("body")
                entry["chip_filter"] = {
                    "chip": cooldown_label,
                    "expected_count_text": chip_label,
                    "found": chip_label in body,
                    "cards": await page.locator("article").count(),
                }
                if chip_label not in body:
                    problems.append(f"{view}: chip '{cooldown_label}' did not show {chip_label!r}")
                if await page.locator("article").count() != cooldown_count:
                    problems.append(
                        f"{view}: chip '{cooldown_label}' rendered "
                        f"{await page.locator('article').count()} cards, expected {cooldown_count}"
                    )
                await page.get_by_role("button", name="Tous", exact=True).click()
                await page.wait_for_timeout(250)

                # The seeded SVG diagram must be inlined in the first card.
                svg_shapes = await page.locator("article").first.locator("svg rect").count()
                entry["first_card_svg_shapes"] = svg_shapes
                if svg_shapes == 0:
                    problems.append(f"{view}: first card has no inline SVG diagram")

                text = await page.inner_text("body")
                overflow = await page.evaluate(
                    "document.documentElement.scrollWidth - window.innerWidth"
                )
                missing = [item for item in required if item not in text]
                cards = await page.locator("article").count()
                entry.update(
                    {
                        "status": response.status if response else None,
                        "missing_texts": missing,
                        "cards": cards,
                        "count_text_found": count_label in text,
                        "favorite_count_text": "0 favori" in text,
                    }
                )
                if missing:
                    problems.append(f"{view}: missing texts {missing}")
                if cards != count:
                    problems.append(f"{view}: {cards} cards rendered, expected {count}")

                shots[view].parent.mkdir(parents=True, exist_ok=True)
                await page.screenshot(path=str(shots[view]))

                # --- favorite round-trip (browser -> API) ---
                toggle = page.locator('[data-testid="favorite-toggle"]').first
                before = await toggle.get_attribute("aria-pressed")
                entry["favorite_before"] = before
                if before != "false":
                    problems.append(f"{view}: first toggle started aria-pressed={before}")

                await toggle.click()
                try:
                    await page.wait_for_selector(
                        '[data-testid="favorite-toggle"][aria-pressed="true"]', timeout=5_000
                    )
                    entry["favorite_optimistic"] = True
                except Exception as exc:  # noqa: BLE001
                    entry["favorite_optimistic"] = False
                    problems.append(f"{view}: toggle did not turn on ({exc.__class__.__name__})")

                added = wait_for_favorite(first_id, True)
                entry["favorite_api_after_post"] = sorted(favorite_ids())
                if not added:
                    problems.append(f"{view}: POST /api/exercises/favorite did not persist {first_id}")
                try:
                    await page.wait_for_selector("text=1 favori", timeout=5_000)
                    entry["favorite_count_after_post"] = True
                except Exception as exc:  # noqa: BLE001
                    entry["favorite_count_after_post"] = False
                    problems.append(f"{view}: '1 favori' count missing ({exc.__class__.__name__})")

                favorite_shot = DOCS_DIR / "bibliotheque-favorite.png"
                favorite_shot.parent.mkdir(parents=True, exist_ok=True)
                await page.screenshot(path=str(favorite_shot))
                entry["favorite_screenshot"] = str(favorite_shot)

                await toggle.click()
                try:
                    await page.wait_for_selector(
                        '[data-testid="favorite-toggle"][aria-pressed="false"]', timeout=5_000
                    )
                    entry["unfavorite_optimistic"] = True
                except Exception as exc:  # noqa: BLE001
                    entry["unfavorite_optimistic"] = False
                    problems.append(f"{view}: toggle did not turn off ({exc.__class__.__name__})")

                removed = wait_for_favorite(first_id, False)
                entry["favorite_api_after_delete"] = sorted(favorite_ids())
                if not removed:
                    problems.append(
                        f"{view}: DELETE /api/exercises/favorite left {first_id} favorited"
                    )

                await page.wait_for_timeout(400)
                text = await page.inner_text("body")
                entry["favorite_count_back_to_zero"] = "0 favori" in text
                overflow = max(
                    overflow,
                    await page.evaluate(
                        "document.documentElement.scrollWidth - window.innerWidth"
                    ),
                )
            else:
                text = await page.inner_text("body")
                overflow = await page.evaluate(
                    "document.documentElement.scrollWidth - window.innerWidth"
                )
                missing = [item for item in required if item not in text]
                entry.update(
                    {
                        "status": response.status if response else None,
                        "missing_texts": missing,
                    }
                )
                if missing:
                    problems.append(f"{view}: missing texts {missing}")

                shots[view].parent.mkdir(parents=True, exist_ok=True)
                await page.screenshot(path=str(shots[view]))

            entry.update(
                {
                    "console_errors": errors,
                    "console_warnings": warnings,
                    "horizontal_overflow_px": overflow,
                }
            )
            report["views"][view] = entry  # type: ignore[index]

            problems.extend(f"{view} console -> {line}" for line in errors)
            if overflow > 0:
                problems.append(f"{view}: horizontal overflow of {overflow}px")

            await context.close()

        await browser.close()

    print(json.dumps(report, indent=2, ensure_ascii=False))
    print(f"\nPROBLEMS: {len(problems)}")
    for line in problems:
        print(" -", line)
    if problems:
        raise SystemExit(1)


if __name__ == "__main__":
    asyncio.run(main())
