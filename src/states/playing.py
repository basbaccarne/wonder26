# playing: a prerecorded story is playing for this phone's DIP-switch ID.
# Each button_x.wav is a full montage (dial beep, connection sound, pickup,
# the voice, and a hang-up sound baked into its own ending), so when it
# finishes naturally we go straight back to "waiting". Replacing the horn
# aborts straight to idle. Pressing a *different* story button switches
# immediately, with no extra sound in between.

import os
import subprocess

import logger
from hardware import button_horn, story_buttons
from states.shared import SharedState, AUDIO_CARD, AUDIO_DIR

_process       = None
_active_button = None   # which button the running _process was started for


def _stop():
    global _process
    if _process is not None and _process.poll() is None:
        _process.terminate()
        _process.wait()
    _process = None


def _story_path(phone_id, button_number):
    return os.path.join(AUDIO_DIR, f"phone_{phone_id}", f"button_{button_number}.wav")


def _newly_pressed_button():
    """A button other than the one currently loaded, physically pressed right now."""
    for number, button in story_buttons.items():
        if number != _active_button and button.is_pressed:
            return number
    return None


def run():
    global _process, _active_button

    # ── horn replaced → idle ─────────────────────────────────────────────
    if button_horn.is_pressed:
        print("📵 Horn replaced during story — returning to idle.")
        _stop()
        _active_button = None
        return "idle"

    # ── a different button pressed → target it (switch happens below) ───
    number = _newly_pressed_button()
    if number is not None:
        SharedState.selected_button = number

    # ── (re)start playback if the target story isn't the one running ────
    # Note: _active_button is set to the new button *before* we return, not
    # left as None — otherwise a still-held button would look "newly
    # pressed" again on the next loop tick and restart the file forever.
    if SharedState.selected_button != _active_button:
        _stop()

        path = _story_path(SharedState.phone_id, SharedState.selected_button)
        if not os.path.exists(path):
            print(f"[playing] ❌ missing audio: {path}")
            _active_button = None
            return "waiting"

        print(f"🗣️  Playing story {SharedState.selected_button} for phone {SharedState.phone_id}")
        _process = subprocess.Popen(
            ["aplay", "-D", AUDIO_CARD, path],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        _active_button = SharedState.selected_button

        logger.log_interaction(SharedState.session_id, SharedState.phone_id, _active_button)
        SharedState.session_interactions += 1
        return None

    # ── story finished naturally (hang-up sound is baked into the file) ───
    if _process is not None and _process.poll() is not None:
        print("[playing] ✅ story finished.")
        _process = None
        _active_button = None
        return "waiting"

    return None
