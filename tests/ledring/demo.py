"""
Grove LEd Ring (WS2813)
-------------------------
Wiring: Ring to 5V (red), ground (black) and Pin 12 (GPIO 18) (yellow)

Setup: disable audio PWM (conflicts)
sudo nano  /boot/firmware/config.txt
    > dtparam=audio=off

Enable SPI (for WS2813 timing) 
    > sudo raspi-config
    > Interfacing Options  
    > SPI


NOTE: This script must be run with sudo (e.g. `sudo python demo.py`).
The rpi_ws281x library requires direct access to /dev/mem for PWM/DMA hardware
control, which is a privileged operation protected by the OS.

"""

import time
import board
import neopixel

# ── Config ──────────────────────────────────────────
PIN        = board.D10   # GPIO 10)
NUM_LEDS   = 16         # change to match your ring size
BRIGHTNESS = 0.3        # 0.0 – 1.0  (start low to protect eyes!)
ORDER      = neopixel.GRB
# ────────────────────────────────────────────────────

pixels = neopixel.NeoPixel(PIN, NUM_LEDS, brightness=BRIGHTNESS,
                           pixel_order=ORDER, auto_write=False)

def color_wipe(color, delay=0.05):
    """Light up LEDs one by one."""
    for i in range(NUM_LEDS):
        pixels[i] = color
        pixels.show()
        time.sleep(delay)

def rainbow_cycle(delay=0.01):
    """Full rainbow spread across the ring, cycling through hues."""
    for j in range(255):
        for i in range(NUM_LEDS):
            hue = int((i / NUM_LEDS * 255 + j) % 255)
            pixels[i] = wheel(hue)
        pixels.show()
        time.sleep(delay)

def wheel(pos):
    """Map 0-254 to an RGB color (green→red→blue→green)."""
    pos = pos % 255
    if pos < 85:
        return (pos * 3, 255 - pos * 3, 0)
    elif pos < 170:
        pos -= 85
        return (255 - pos * 3, 0, pos * 3)
    else:
        pos -= 170
        return (0, pos * 3, 255 - pos * 3)

try:
    print("Starting LED demo — Ctrl+C to quit")
    while True:
        color_wipe((255, 0, 0))   # Red
        color_wipe((0, 255, 0))   # Green
        color_wipe((0, 0, 255))   # Blue
        rainbow_cycle()
finally:
    pixels.fill((0, 0, 0))        # LEDs off on exit
    pixels.show()

