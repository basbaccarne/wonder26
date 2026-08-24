# idle: handset is on the hook.
# The booth breathes quietly and, once per hour, dials in an unanswered
# "incoming call" (a few rings on the external ring speaker) to draw attention.
# Picking up the horn — at any point — moves straight to "waiting".

import os
import time
import random
import datetime
import subprocess

from hardware import button_horn
from states.shared import SharedState, AUDIO_CARD_RING, AUDIO_DIR, RINGS_PER_CALL, RING_INTERVAL

RING_PATH = os.path.join(AUDIO_DIR, "ring.wav")
DEBOUNCE  = 0.3


# ── Scheduler ─────────────────────────────────────────────────────────────
def _schedule_next_ring():
    now = time.time()
    SharedState.idle_hour_start   = now
    SharedState.idle_trigger_time = now + random.uniform(0, 3600)
    SharedState.triggered_this_hour = False
    next_at = datetime.datetime.fromtimestamp(SharedState.idle_trigger_time)
    print(f"[idle] next ring at {next_at.strftime('%H:%M:%S')}")


# ── Audio ────────────────────────────────────────────────────────────────
def _play_ring():
    if not os.path.exists(RING_PATH):
        print(f"[idle] ❌ missing audio: {RING_PATH}")
        return None
    return subprocess.Popen(
        ["aplay", "-D", AUDIO_CARD_RING, RING_PATH],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )


# ── Input ────────────────────────────────────────────────────────────────
def _check_horn():
    if not button_horn.is_pressed:
        print("\n📞 Horn picked up")
        time.sleep(DEBOUNCE)
        return "waiting"
    return None


def _interruptible_sleep(seconds):
    end = time.time() + seconds
    while time.time() < end:
        result = _check_horn()
        if result:
            return result
        time.sleep(0.05)
    return None


# ── Incoming call (unanswered) ───────────────────────────────────────────
def _ring_call():
    print(f"\n📞 Incoming call — {RINGS_PER_CALL} rings")

    for i in range(RINGS_PER_CALL):
        print(f"[idle] 🔔 ring {i + 1}/{RINGS_PER_CALL}")

        proc = _play_ring()
        if proc:
            while proc.poll() is None:
                result = _check_horn()
                if result:
                    proc.terminate()
                    proc.wait()
                    return result
                time.sleep(0.05)

        if i < RINGS_PER_CALL - 1:
            result = _interruptible_sleep(RING_INTERVAL)
            if result:
                return result

    print("[idle] 📵 call ended, nobody picked up")
    return None


# ── Main entry point ─────────────────────────────────────────────────────
def run():
    if SharedState.idle_hour_start is None:
        _schedule_next_ring()

    now = time.time()
    if now - SharedState.idle_hour_start >= 3600:
        _schedule_next_ring()

    # horn always wins
    result = _check_horn()
    if result:
        return result

    if not SharedState.triggered_this_hour and now >= SharedState.idle_trigger_time:
        SharedState.triggered_this_hour = True
        print(f"\n📞 TRIGGERED at {datetime.datetime.now()}")
        return _ring_call()

    return None
