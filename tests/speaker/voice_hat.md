# Capture audio using the Google AIY voice hat
Hardware: [AIY Voice Kit](https://aiyprojects.withgoogle.com/voice/)
Pinout: [schematic](https://github.com/google/aiyprojects-raspbian/blob/aiyprojects/schematics/voice_hat/voice_hat.pdf)
Connect a small speaker to the blue terminal connector (e.g. [3W 8Ω](https://www.dfrobot.com/product-1506.html))

**Add the sound card** 
```bash
sudo nano /boot/config.txt
```
```ini
dtoverlay=googlevoicehat-soundcard
```
```bash
sudo reboot
```

**Check device**
```bash
aplay -l
```
Should show something like
```bash
card 2: sndrpigooglevoi [snd_rpi_googlevoicehat_soundcar], 
device 0: Google voiceHAT SoundCard HiFi voicehat-hifi-0 [Google voiceHAT SoundCard HiFi voicehat-hifi-0]
```
In this example the voice HAT is on ```card 2: sndrpigooglevoi device 0``` = ALSA address ```hw:2,0```

Play a sample file using:
```bash
aplay -D plughw:2,0 /usr/share/sounds/alsa/Front_Center.wav
```

If you want to play this from python you can simply do this as a subprocess:

```python
import subprocess

subprocess.run([
    "aplay",
    "-D", "plughw:2,0",
    "test.wav"
])
```