from gpiozero import Button
from signal import pause

# Connect button_horn to GPIO17 and GROUND
# Connect story buttons 1-4 to GPIO27, GPIO22, GPIO24, GPIO23 and GROUND

button_horn = Button(17)
story_buttons = {
    1: Button(27),
    2: Button(22),
    3: Button(24),
    4: Button(23),
}

button_horn.when_released = lambda: print("Horn picked up")
button_horn.when_pressed  = lambda: print("Horn replaced")

for number, button in story_buttons.items():
    button.when_pressed = (lambda n: lambda: print(f"Button {n} pressed"))(number)

print("Listening for horn and button events (Ctrl+C to exit)...")
pause()
