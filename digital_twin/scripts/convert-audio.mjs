// Converts the installation's WAV files (../audio_files, used by the physical
// phones) into small MP3s for the web twin (public/audio). Only the files the
// twin plays are converted: the waiting sound, and buttons 1–3 of phones 0–2.
//
// Run with `npm run audio` whenever the recordings change. Needs ffmpeg on
// the PATH.

import { spawnSync } from 'node:child_process'
import { mkdirSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const source = join(root, '..', 'audio_files')
const target = join(root, 'public', 'audio')

const files = ['waiting']
for (let phone = 0; phone < 3; phone++) {
  for (let button = 1; button <= 3; button++) files.push(`phone_${phone}/button_${button}`)
}

let total = 0
for (const file of files) {
  const input = join(source, `${file}.wav`)
  const output = join(target, `${file}.mp3`)
  mkdirSync(dirname(output), { recursive: true })
  // Mono, 44.1 kHz, 96 kbps: clear for voice and sound effects, ~0.7 MB/min.
  const result = spawnSync(
    'ffmpeg',
    ['-y', '-loglevel', 'error', '-i', input, '-ac', '1', '-ar', '44100', '-codec:a', 'libmp3lame', '-b:a', '96k', output],
    { stdio: 'inherit' },
  )
  if (result.error || result.status !== 0) {
    console.error(`Failed to convert ${input}`, result.error ?? '')
    process.exit(1)
  }
  const { size } = statSync(output)
  total += size
  console.log(`${file}.mp3  ${(size / 1e6).toFixed(1)} MB`)
}
console.log(`Total: ${(total / 1e6).toFixed(1)} MB in ${target}`)
