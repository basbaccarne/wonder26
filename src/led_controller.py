# LED Controller for the WONDERfull Stories telephone
# NOTE: The main script must be run with sudo (e.g. `sudo python3 main.py`).
# The rpi_ws281x library requires direct access to /dev/mem for PWM/DMA hardware
# control, which is a privileged operation protected by the OS.
#
# Usage:
#   from led_controller import LEDController
#   led = LEDController()
#   led.start()
#   led.set_state("idle")       # call whenever your state machine transitions
#   led.stop()                  # call in the finally block next to Device.close_all()

import threading
import board
import neopixel

# ── Config ───────────────────────────────────────────────────────────────────
PIN             = board.D10
NUM_LEDS        = 16
BRIGHTNESS      = 0.3       # 0.0 – 1.0
ORDER           = neopixel.GRB
# ─────────────────────────────────────────────────────────────────────────────

# Warm palette
DIMAMBER = (60,  20,  0)
ORANGE   = (255, 40,  0)
CREAM    = (255, 200, 80)


class LEDController:
    """
    Runs LED animations in a background thread.
    Call set_state(state_name) to switch animations without blocking the app.
    Each animation loop checks _interrupted() so it exits cleanly on transition.

    States:
        idle     Slow amber breathe — the phone is quietly waiting on the hook
        waiting  Slow orange spinner — handset is up, pick a story
        playing  Gentle cream pulse — a story (with its own hang-up sound) is being told
    """

    def __init__(self):
        self._pixels        = neopixel.NeoPixel(
                                PIN, NUM_LEDS,
                                brightness=BRIGHTNESS,
                                pixel_order=ORDER,
                                auto_write=False)
        self._state         = None
        self._stop_event    = threading.Event()
        self._state_changed = threading.Event()
        self._lock          = threading.Lock()
        self._thread        = threading.Thread(target=self._run, daemon=True)

    def start(self):
        self._thread.start()

    def stop(self):
        self._stop_event.set()
        self._state_changed.set()   # unblock any sleeping animation
        self._thread.join(timeout=2)
        self._pixels.fill((0, 0, 0))
        self._pixels.show()

    def set_state(self, state_name: str):
        with self._lock:
            if self._state != state_name:
                self._state = state_name
                self._state_changed.set()

    # ── Background thread ────────────────────────────────────────────────────

    def _run(self):
        while not self._stop_event.is_set():
            self._state_changed.clear()
            with self._lock:
                current = self._state

            animations = {
                "idle":    self._anim_idle,
                "waiting": self._anim_waiting,
                "playing": self._anim_playing,
            }
            anim_fn = animations.get(current, self._anim_idle)
            anim_fn()

    def _interrupted(self):
        return self._state_changed.is_set() or self._stop_event.is_set()

    def _sleep(self, seconds):
        """Interruptible sleep — returns early on state change."""
        self._state_changed.wait(timeout=seconds)

    # ── Animations ───────────────────────────────────────────────────────────

    def _anim_idle(self):
        """Slow amber breathe — the phone is quietly waiting on the hook."""
        for brightness in list(range(0, 100, 2)) + list(range(100, 0, -2)):
            if self._interrupted():
                return
            scaled = tuple(int(c * brightness / 100) for c in DIMAMBER)
            self._pixels.fill(scaled)
            self._pixels.show()
            self._sleep(0.025)

    def _anim_waiting(self):
        """Slow orange spinner with glowing trail — handset is up, pick a story."""
        tail_length = 4
        for i in range(NUM_LEDS):
            if self._interrupted():
                return
            self._pixels.fill((0, 0, 0))
            for t in range(tail_length):
                idx = (i - t) % NUM_LEDS
                fade = 1.0 - (t / tail_length)
                self._pixels[idx] = tuple(int(c * fade) for c in ORANGE)
            self._pixels.show()
            self._sleep(0.07)

    def _anim_playing(self):
        """Gentle cream pulse — warm and reassuring, a story is being told."""
        for brightness in list(range(0, 100, 3)) + list(range(100, 0, -3)):
            if self._interrupted():
                return
            scaled = tuple(int(c * brightness / 100) for c in CREAM)
            self._pixels.fill(scaled)
            self._pixels.show()
            self._sleep(0.018)
