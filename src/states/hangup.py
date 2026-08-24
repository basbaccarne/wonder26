# hangup: plays the "phone hanging up" click after a story finishes on its
# own, then returns to "waiting" so another story can be picked. Replacing
# the horn aborts straight to idle.

import os
import subprocess

from hardware import button_horn
from states.shared import AUDIO_CARD, AUDIO_DIR

HANGUP_PATH = os.path.join(AUDIO_DIR, "hangup.wav")

_process = None


def run():
    global _process

    # ── horn replaced → idle ─────────────────────────────────────────────
    if button_horn.is_pressed:
        if _process is not None and _process.poll() is None:
            _process.terminate()
            _process.wait()
        print("📵 Horn replaced — returning to idle.")
        return "idle"

    # ── start the click ────────────────────────────────────────────────────
    if _process is None:
        if not os.path.exists(HANGUP_PATH):
            print(f"[hangup] ❌ missing audio: {HANGUP_PATH}")
            return "waiting"

        print("☎️  Playing hang-up click...")
        _process = subprocess.Popen(
            ["aplay", "-D", AUDIO_CARD, HANGUP_PATH],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        return None

    # ── click finished → back to waiting ──────────────────────────────────
    if _process.poll() is not None:
        return "waiting"

    return None
