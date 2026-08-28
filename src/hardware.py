from gpiozero import Button

# Connect button_horn to GPIO17 and GROUND (hook switch — pressed = handset resting)
button_horn = Button(17)

# Four story-select buttons, one per prerecorded sound
story_buttons = {
    1: Button(27),
    2: Button(22),
    3: Button(24),
    4: Button(23),
}
