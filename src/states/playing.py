# playing: a prerecorded story is playing for this phone's DIP-switch ID.
# Replacing the horn aborts straight to idle. Pressing a *different* story
# button switches immediately, with no hang-up sound. Letting the file play
# to the end moves on to "hangup" (the click), then back to "waiting".

import os
import subprocess

from hardware import button_horn, story_buttons
from states.shared import SharedState, AUDIO_CARD, AUDIO_DIR

_process        = None
_current_button = None


def _stop():
    global _process
    if _process is not None and _process.poll() is None:
        _process.terminate()
        _process.wait()
    _process = None


def _story_path(phone_id, button_number):
    return os.path.join(AUDIO_DIR, f"phone_{phone_id}", f"button_{button_number}.wav")


def _pressed_other_button():
    for number, button in story_buttons.items():
        if number != _current_button and button.is_pressed:
            return number
    return None


def run():
    global _process, _current_button

    # ── horn replaced → idle ─────────────────────────────────────────────
    if button_horn.is_pressed:
        print("📵 Horn replaced during story — returning to idle.")
        _stop()
        _current_button = None
        return "idle"

    # ── a different button pressed → switch stories immediately ─────────
    number = _pressed_other_button()
    if number is not None:
        print(f"🔘 Switching to story {number}.")
        _stop()
        SharedState.selected_button = number
        _current_button = None
        return "playing"

    # ── start the selected story ──────────────────────────────────────────
    if _process is None:
        _current_button = SharedState.selected_button
        path = _story_path(SharedState.phone_id, _current_button)

        if not os.path.exists(path):
            print(f"[playing] ❌ missing audio: {path}")
            _current_button = None
            return "hangup"

        print(f"🗣️  Playing story {_current_button} for phone {SharedState.phone_id}")
        _process = subprocess.Popen(
            ["aplay", "-D", AUDIO_CARD, path],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        return None

    # ── story finished naturally → hang up ────────────────────────────────
    if _process.poll() is not None:
        print("[playing] ✅ story finished.")
        _process = None
        _current_button = None
        return "hangup"

    return None
