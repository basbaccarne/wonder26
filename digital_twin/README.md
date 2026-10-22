# Digital twin

A browser version of the WONDERfull Stories installation, presented as
**"Are we ready?"** (computational design and the future of Design
Engineering), built with [Three.js](https://threejs.org/) and
[Vite](https://vite.dev/).

A diorama (inspired by the Three.js Journey room, styled after the
[Ghent University styleguide](https://styleguide.ugent.be/?lang=en)) holds the setup from
the installation's floor plan: a big round cloud at table height with two
phones, and a smaller, lower cloud at wheelchair height with one phone, tucked
against its edge. Each phone faces outwards towards where a visitor stands.
The clouds slowly turn (starting at a random angle on every load) and pause
while a handset is up. Camera rotation is limited to the open side of the room.
Click a handset
to pick it up, then press button 1, 2 or 3 to hear a story — the same flow as
the physical phones (idle → waiting → playing → back to waiting when the story
ends). Click the handset again (or press `Esc`) to hang up.

The twin plays the same recordings as the physical phones: phones 1–3 map to
`phone_0` … `phone_2`, buttons to `button_1` … `button_3`. The phones use the
WAVs in [`../audio_files`](../audio_files); the twin uses small MP3 copies in
`public/audio/` (about 8 MB instead of 124 MB). After changing a recording,
regenerate them with `npm run audio` (needs [ffmpeg](https://ffmpeg.org/) on
the PATH).

## Run

```bash
cd digital_twin
npm install
npm run dev
```

Then open the URL Vite prints (usually http://localhost:5173).

## Publish (UGent webshare)

The built site is fully static (HTML, JS, images, MP3), so any static host
works, including a UGent webshare:

1. `npm run build` — creates `dist/` (about 8.5 MB).
2. Mount the webshare (e.g. as `W:`) and copy the **contents** of `dist/` to
   it: to the root (start page at `naam.ugent.be`) or to a subfolder such as
   `W:\are-we-ready\` (`naam.ugent.be/are-we-ready/`). Paths are relative,
   so both work.
3. Don't overwrite the webshare's own `.htaccess` and `.default.html`.
4. Check it on a laptop and a phone; errors show up in the webshare's
   `logs/error_log_443.log`.

## Files

- [src/main.js](src/main.js) — renderer, camera/controls, cloud + phone layout, state machine, click handling and phone animations
- [src/scene.js](src/scene.js) — cloud and phone models built from primitives
- [src/room.js](src/room.js) — the diorama (floor, walls, shelf, rug, logo) and its animated props
- [src/content.js](src/content.js) — **all copy**: the intro on computational design, the question "Are we ready?", one theme per phone (Skills, Productie, Mens vs machine) with its questions, and one speaker per button
- [src/wallboard.js](src/wallboard.js) — the lettering on the back wall: overview when idle, the theme and its questions when a phone is hovered or picked up
- [src/hud.js](src/hud.js) — the info card: intro, then the theme and its perspectives, then the speaker (photo or initials, name, role, progress) while a story plays
- [src/assets/](src/assets/) — the UGent Campus Kortrijk logo, and in `speakers/` the speaker photos (400×400 JPG), referenced by file name from `content.js`; full-size originals in `speakers/originals/` stay local (gitignored)
- [index.html](index.html) — page shell, including the credits card (UGent Campus Kortrijk logo, link to the programme in the study guide)

## Responsive

The info card and the credits card share one layout (`#overlay`), so they
never overlap: on wide screens the info card sits top left and scrolls if
space runs out; on phones (≤ 700 px wide) both cards form a bottom panel, with
a button to collapse the info card; on short landscape screens they form a
narrow column on the left. The camera backs off on narrow screens and is
shifted so the room is centred in the space the cards leave free.

The info card has buttons that mirror the phones (pick a theme, choose
perspective 1–3, hang up), so the twin also works where the 3D buttons are
too small to tap, and with the keyboard alone.

## Style

Colours follow the UGent styleguide: UGent Blue `#1E64C8` and white as the
base, UGent Yellow `#FFD200` as the accent, black for text, and tints in 10%
steps for softer surfaces (defined once in `ugent` / `palette` in
[src/room.js](src/room.js)). Text uses UGent Panno Text when it is installed
(UGent staff PCs), with Arial as the official fallback. Headings are set in
capitals and underlined.

## Little animations

- clouds slowly breathe; mini clouds drift above the room
- wireframes spin and the ball cluster bounces on the shelf; the iO logo slowly turns on its plinth
- the clouds with the phones slowly turn around their vertical axis
- every 10–20 s an idle phone rattles its handset, like the booth ringing itself
- hovering a phone previews its theme on the wall; the wall crossfades between states
- buttons pulse while waiting, glow while playing, and sound waves ripple from the lifted handset
