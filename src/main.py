# Main state machine of the WONDERfull Stories telephone
# The state machine checks the global "state" variable and runs the associated
# module in states/. Each state's run() returns the name of the next state (or
# None to stay put).
#
# Static config lives in config.yaml. Dynamic/shared runtime state lives in
# states/shared.py (SharedState). The DIP switch is read once at startup to
# set SharedState.phone_id, which selects which prerecorded stories play on
# this unit.
#
# States: idle -> waiting -> playing -> hangup -> waiting (loop) -> idle

import os
import importlib
import subprocess
import yaml
import time
import socket
import datetime

from read_phone_id import read_phone_id
from states.shared import SharedState
from led_controller import LEDController

# detect DIP position and write to shared state (then all states can access it using SharedState.phone_id)
SharedState.phone_id = read_phone_id()

# config
with open(os.path.join(os.path.dirname(__file__), "config.yaml"), "r") as f:
    config = yaml.safe_load(f)

AUDIO_CARD      = config.get("audio_card", "default")
audio_volume    = config.get("audio_volume", 80)
SHUTDOWN_HOUR   = config.get("shutdown_hour", 23)
SHUTDOWN_MINUTE = config.get("shutdown_minute", 0)

subprocess.run(["amixer", "-D", AUDIO_CARD, "sset", "PCM", f"{audio_volume}%"], capture_output=True)

# initiate led animations
led = LEDController()
led.start()
led.set_state("idle")  # set initial animation

# Global "state" variable and loaded state to track which module is currently loaded
state = "idle"
loaded_state = None
shutdown_requested = False
startup_time = datetime.datetime.now()
startup_minutes = startup_time.hour * 60 + startup_time.minute


# function to get the ip address
def get_ip():
    try:
        # This does not actually connect to the internet,
        # it just determines the active network interface
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "No network connection"


# opening statements
print("\n-------------------------------")
print("☎️   WONDERfull Stories — Telephone Module")
print(f"IP address: {get_ip()}")
print(f"This device is set to phone ID: {SharedState.phone_id}")
print(f"Starting state machine in state: {state}")
print(f"Scheduled shutdown at: {SHUTDOWN_HOUR:02d}:{SHUTDOWN_MINUTE:02d}")
print("Waiting for the horn to be picked up ...\n")

# Main loop to continuously check the state and run the corresponding module
try:
    while True:
        # --- Scheduled shutdown check ---
        now = datetime.datetime.now()
        shutdown_threshold = SHUTDOWN_HOUR * 60 + SHUTDOWN_MINUTE
        if startup_minutes < shutdown_threshold and now.hour * 60 + now.minute >= shutdown_threshold:
            print(f"\n🕐  Scheduled shutdown time reached ({SHUTDOWN_HOUR:02d}:{SHUTDOWN_MINUTE:02d})")
            shutdown_requested = True
            break
        # ---------------------------------

        try:
            # load module only when state changes
            if loaded_state != state:
                module = importlib.import_module(f"states.{state}")
                importlib.reload(module)
                loaded_state = state

            # run state (module always exists after load)
            next_state = module.run()

            if next_state:
                print(f"\nSwitching to state: {next_state}")
                state = next_state
                led.set_state(state)

        except Exception as e:
            print(f"Error in state {state}: {e}")
            state = "idle"

        # Sleep briefly to prevent high CPU usage
        time.sleep(0.01)

# Allow graceful exit on Ctrl+C
except KeyboardInterrupt:
    print("\n🛑   Program stopped by user")

# Clean up GPIO pin usage on exit
finally:
    led.stop()
    print("\n🧹   GPIO cleaned up. All set up for a new run!")
    print("-------------------------------\n")
    if shutdown_requested:
        print("🔌  Shutting down...")
        subprocess.run(["sudo", "shutdown", "-h", "now"])
