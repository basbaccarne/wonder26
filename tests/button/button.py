from gpiozero import Button
import time

# Connect button_horn to GPIO17 and GROUND
# Connect story buttons 1-4 to GPIO27, GPIO22, GPIO23, GPIO24 and GROUND

button_horn = Button(17)
story_buttons = {
    1: Button(27),
    2: Button(22),
    3: Button(23),
    4: Button(24),
}

debounce = 0.3

while True:
    # --- Horn: trigger on RELEASE (picked up) ---
    if not button_horn.is_pressed:
        print("Horn picked up")
        while not button_horn.is_pressed:
            time.sleep(0.01)
        print("Horn replaced")
        time.sleep(debounce)

    # --- Story buttons: trigger on PRESS ---
    for number, button in story_buttons.items():
        if button.is_pressed:
            print(f"Button {number} pressed")
            while button.is_pressed:
                time.sleep(0.01)
            time.sleep(debounce)
