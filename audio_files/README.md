# Audio files

Not included in the repo — record/produce these yourself and drop them in
place. All files are `.wav`, played with `aplay`.

## Shared across all four phones

| file          | plays when                                            |
|---------------|--------------------------------------------------------|
| `ring.wav`    | an unanswered incoming call rings, in `idle`           |
| `waiting.wav` | the handset is up and no story is playing, in `waiting`|

`ring.wav` plays on the external ring speaker (`audio_card_ring` in
`config.yaml`); `waiting.wav` plays through the horn earpiece (`audio_card`).

## Per phone (set by the DIP switch — `phone_0` .. `phone_3`)

| file                          | plays when                                   |
|-------------------------------|-----------------------------------------------|
| `phone_{id}/button_1.wav`     | story button 1 is pressed                     |
| `phone_{id}/button_2.wav`     | story button 2 is pressed                     |
| `phone_{id}/button_3.wav`     | story button 3 is pressed                     |
| `phone_{id}/button_4.wav`     | story button 4 is pressed                     |

Each `button_x.wav` is a full montage — dial beep, connection sound, pickup,
the voice, and a hang-up sound at the end — so the state machine just plays
it start to finish and returns to `waiting` when it's done; no separate
hang-up file or state is involved.

Each of the four physical phones can carry a completely different set of four
stories — that's what makes each phone distinct.
