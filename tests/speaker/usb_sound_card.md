# Play audio using a 3.5mm jack mic and USB sound adapter
* Using a speaker (or headphones) with a 3.5mm jack
* And a USB sound card like [this one](https://www.bol.com/be/nl/p/externe-geluidskaart-muziekadapter-usb-3-5-mm-mini-jack-kabel-15-cm-zwart/9300000188829315)

Get the ID of the sound cards connected to the pi
```bash
aplay -l
```
This gives output like this
```bash
**** List of PLAYBACK Hardware Devices ****
card 0: vc4hdmi0 [vc4-hdmi-0], 
device 0: MAI PCM i2s-hifi-0 [MAI PCM i2s-hifi-0]
  Subdevices: 1/1
  Subdevice #0: subdevice #0
card 1: vc4hdmi1 [vc4-hdmi-1], 
device 0: MAI PCM i2s-hifi-0 [MAI PCM i2s-hifi-0]
  Subdevices: 1/1
  Subdevice #0: subdevice #0
card 2: sndrpigooglevoi [snd_rpi_googlevoicehat_soundcar], 
device 0: Google voiceHAT SoundCard HiFi voicehat-hifi-0 [Google voiceHAT SoundCard HiFi voicehat-hifi-0]
  Subdevices: 1/1
  Subdevice #0: subdevice #0
card 3: Device [USB Audio Device], 
device 0: USB Audio [USB Audio]
  Subdevices: 1/1
  Subdevice #0: subdevice #0
  ```
In this case, the USB card is on ```card 3: Device [USB Audio Device], device 0``` = ALSA address ```hw:3,0```

Play a sample file using:
```bash
aplay -D plughw:3,0 /usr/share/sounds/alsa/Front_Center.wav
```

If you want to play this from python you can simply do this as a subprocess:

```python
import subprocess

subprocess.run([
    "aplay",
    "-D", "plughw:3,0",
    "test.wav"
])
```