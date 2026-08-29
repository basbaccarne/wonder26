import os
import yaml


BASE_DIR   = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONFIG_PATH = os.path.join(BASE_DIR, "config.yaml")
AUDIO_DIR   = os.path.join(os.path.dirname(BASE_DIR), "audio_files")


def _load_config(path: str = CONFIG_PATH) -> dict:
    with open(path, "r") as f:
        return yaml.safe_load(f)


_config = _load_config()

AUDIO_CARD      = _config.get("audio_card",      "default")
AUDIO_CARD_RING = _config.get("audio_card_ring", "i2s_amp")
AUDIO_VOLUME    = _config.get("audio_volume",    80)
RINGS_PER_CALL  = _config.get("rings_per_call",  4)
RING_INTERVAL   = _config.get("ring_interval",   2)


class SharedState:
    phone_id             = 0
    selected_button      = None   # which story button was pressed (1-4)
    idle_hour_start      = None
    idle_trigger_time    = None
    triggered_this_hour  = False

    # a session runs from horn-up to horn-down; see logger.py
    session_id           = None
    session_start        = None
    session_interactions = 0
