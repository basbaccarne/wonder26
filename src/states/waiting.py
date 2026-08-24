# waiting: handset is off the hook, no story picked yet (or a story just ended).
# Loops the waiting sound until a story button is pressed, or the horn is
# replaced (back to idle).

import os
import subprocess

from hardware import button_horn, story_buttons
from states.shared import SharedState, AUDIO_CARD, AUDIO_DIR

WAITING_PATH = os.path.join(AUDIO_DIR, "waiting.wav")

_process = None


def _stop():
    global _process
    if _process is not None and _process.poll() is None:
        _process.terminate()
        _process.wait()
    _process = None


def _play_waiting():
    global _process
    if not os.path.exists(WAITING_PATH):
        print(f"[waiting] ❌ missing audio: {WAITING_PATH}")
        return
    _process = subprocess.Popen(
        ["aplay", "-D", AUDIO_CARD, WAITING_PATH],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )


def _pressed_button():
    for number, button in story_buttons.items():
        if button.is_pressed:
            return number
    return None


def run():
    global _process

    # ── horn replaced → idle ─────────────────────────────────────────────
    if button_horn.is_pressed:
        print("📵 Horn replaced — returning to idle.")
        _stop()
        return "idle"

    # ── a story button was pressed → play it ─────────────────────────────
    number = _pressed_button()
    if number is not None:
        print(f"🔘 Button {number} pressed — playing story {number}.")
        _stop()
        SharedState.selected_button = number
        return "playing"

    # ── keep the waiting sound looping ───────────────────────────────────
    if _process is None or _process.poll() is not None:
        _play_waiting()

    return None
