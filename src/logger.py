# CSV logging of sessions (horn-up to horn-down) and story interactions.
# Append-only — a row is written once and never rewritten — so a hard power
# loss (e.g. at the scheduled shutdown) can never corrupt earlier rows.

import csv
import os
import time
import uuid
import datetime

from states.shared import AUDIO_DIR

LOG_DIR            = os.path.join(os.path.dirname(AUDIO_DIR), "logs")
SESSIONS_PATH      = os.path.join(LOG_DIR, "sessions.csv")
INTERACTIONS_PATH  = os.path.join(LOG_DIR, "interactions.csv")

SESSIONS_HEADER     = ["timestamp", "event", "session_id", "phone_id", "duration_seconds", "interaction_count"]
INTERACTIONS_HEADER = ["timestamp", "session_id", "phone_id", "button"]


def _ensure_file(path, header):
    os.makedirs(LOG_DIR, exist_ok=True)
    if not os.path.exists(path):
        with open(path, "w", newline="") as f:
            csv.writer(f).writerow(header)


def _append(path, header, row):
    _ensure_file(path, header)
    with open(path, "a", newline="") as f:
        csv.writer(f).writerow(row)


def _now_iso():
    return datetime.datetime.now().isoformat(timespec="seconds")


def start_session(phone_id):
    """Call once when the horn is picked up. Returns (session_id, start_time)."""
    session_id = uuid.uuid4().hex[:8]
    _append(SESSIONS_PATH, SESSIONS_HEADER, [_now_iso(), "start", session_id, phone_id, "", ""])
    return session_id, time.time()


def end_session(session_id, phone_id, start_time, interaction_count):
    """Call once when the horn is replaced (also on error/shutdown cleanup)."""
    duration = round(time.time() - start_time, 1)
    _append(SESSIONS_PATH, SESSIONS_HEADER, [_now_iso(), "end", session_id, phone_id, duration, interaction_count])


def log_interaction(session_id, phone_id, button):
    """Call every time a story starts playing — including switches mid-story."""
    _append(INTERACTIONS_PATH, INTERACTIONS_HEADER, [_now_iso(), session_id, phone_id, button])
