from gpiozero import Button
import time

# Live raw-pin monitor — bypasses all event/debounce logic so you can see
# exactly what the Pi reads on each pin as you press things.

pins = {
    "horn":     17,
    "button_1": 27,
    "button_2": 22,
    "button_3": 24,
    "button_4": 23,
}

buttons = {name: Button(pin, pull_up=True) for name, pin in pins.items()}

print("Watching pins — press buttons and watch for PRESSED. Ctrl+C to exit.\n")
try:
    while True:
        line = " | ".join(
            f"{name}(GPIO{pin}): {'PRESSED' if buttons[name].is_pressed else 'released '}"
            for name, pin in pins.items()
        )
        print(line, end="\r")
        time.sleep(0.1)
except KeyboardInterrupt:
    print("\nStopped.")
