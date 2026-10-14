"""End-to-end verification of the accueil <-> clone backend integration.

Checks, at 420x900 and 375x812, that the home page renders the live fixture and
the real training library streamed from the backend, with zero console errors
and no horizontal overflow. Saves the 420x900 screenshot to
docs/accueil-integrated.png (the 375x812 take goes to the temp directory).

Usage:  python scripts/verify-integration.py
Expects the frontend dev server on http://localhost:4970 and the backend on
http://localhost:4900.
"""

from __future__ import annotations

import asyncio
import json
import tempfile
import urllib.request
from pathlib import Path

from playwright.async_api import async_playwright

BASE_URL = "http://localhost:4970"
API_URL = "http://localhost:4900"
DOCS_DIR = Path(__file__).resolve().parent.parent / "docs"


def backend_facts() -> tuple[str, str]:
    """First seeded training name + the count label the card must show."""
    with urllib.request.urlopen(f"{API_URL}/api/trainings", timeout=5) as response:
        trainings = json.load(response)
    count = len(trainings)
    label = f"{count} séances" if count > 1 else f"{count} séance"
    return trainings[0]["name"], label


async def main() -> None:
    first_training, count_label = backend_facts()
    required = ["FC Lyon", "Championnat", first_training, count_label]
    problems: list[str] = []
    report: dict[str, object] = {
        "backend_first_training": first_training,
        "expected_count_label": count_label,
        "required_texts": required,
        "views": {},
    }
    shots = {
        "420x900": DOCS_DIR / "accueil-integrated.png",
        "375x812": Path(tempfile.gettempdir()) / "accueil-integrated-375.png",
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

            response = await page.goto(f"{BASE_URL}/fr/accueil", wait_until="load")
            try:
                await page.wait_for_load_state("networkidle", timeout=15_000)
            except Exception as exc:  # noqa: BLE001 - dev HMR socket keeps a connection open
                warnings.append(f"networkidle-timeout: {exc.__class__.__name__}")

            # Streamed RSC content must have replaced the empty-state fallbacks.
            for probe in ("text=FC Lyon", f"text={first_training}"):
                try:
                    await page.wait_for_selector(probe, timeout=15_000)
                except Exception as exc:  # noqa: BLE001
                    warnings.append(f"wait-for {probe!r} timed out: {exc.__class__.__name__}")
            await page.evaluate("document.fonts.ready")
            await page.wait_for_timeout(400)

            text = await page.inner_text("body")
            overflow = await page.evaluate(
                "document.documentElement.scrollWidth - window.innerWidth"
            )
            missing = [item for item in required if item not in text]
            streamed = "Ajouter ton adversaire" not in text

            shot = shots[view]
            shot.parent.mkdir(parents=True, exist_ok=True)
            await page.screenshot(path=str(shot))

            entry = {
                "status": response.status if response else None,
                "missing_texts": missing,
                "streamed_instead_of_fallback": streamed,
                "has_prepare_cta": "Préparer le match contre FC Lyon" in text,
                "console_errors": errors,
                "console_warnings": warnings,
                "horizontal_overflow_px": overflow,
                "screenshot": str(shot),
            }
            report["views"][view] = entry  # type: ignore[index]

            if missing:
                problems.append(f"{view}: missing texts {missing}")
            if not streamed:
                problems.append(f"{view}: empty state still rendered (no streamed data?)")
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
