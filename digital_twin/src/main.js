import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { createCloud, createPhone, updateCord } from './scene.js'
import { createRoom, palette, ugent } from './room.js'
import { createWallBoard } from './wallboard.js'
import { createHud } from './hud.js'

// MP3s in public/audio, converted from ../audio_files by `npm run audio`.
const audioUrl = (path) => `${import.meta.env.BASE_URL}audio/${path}.mp3`

// --- renderer, camera, controls -------------------------------------------

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.toneMapping = THREE.NeutralToneMapping
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
document.body.appendChild(renderer.domElement)

const scene = new THREE.Scene()
scene.background = new THREE.Color(palette.background)

// Narrow field of view for a near-isometric diorama look.
const camera = new THREE.PerspectiveCamera(30, window.innerWidth / window.innerHeight, 0.1, 100)
camera.position.set(5.1, 4.2, 5.9)

// Rotation is limited to the open side of the diorama, so the two walls
// always stay behind the scene.
const controls = new OrbitControls(camera, renderer.domElement)
controls.target.set(0.1, 1.1, 0)
controls.enableDamping = true
controls.enablePan = false
controls.minDistance = 2.5
controls.maxDistance = 12
controls.minAzimuthAngle = -0.1
controls.maxAzimuthAngle = Math.PI / 2 + 0.1
controls.minPolarAngle = 0.35
controls.maxPolarAngle = 1.4

// --- lights -----------------------------------------------------------------

scene.add(new THREE.HemisphereLight(0xffffff, ugent.blue40, 1.6))
const sun = new THREE.DirectionalLight(0xffffff, 2.2)
sun.position.set(3, 6, 4)
sun.castShadow = true
sun.shadow.mapSize.set(2048, 2048)
sun.shadow.camera.left = sun.shadow.camera.bottom = -4
sun.shadow.camera.right = sun.shadow.camera.top = 4
sun.shadow.bias = -0.0005
sun.shadow.normalBias = 0.02
scene.add(sun)
const fill = new THREE.DirectionalLight(ugent.blue20, 0.6)
fill.position.set(-2, 2, 5)
scene.add(fill)

// --- room, clouds, phones ---------------------------------------------------

const room = createRoom()
scene.add(room)

// Layout follows the top-down sketch of the installation: a big round cloud
// at table height, with the small, lower (wheelchair height) cloud tucked
// against its back-left edge. Coordinates below are in sketch space (-z = top
// of the sketch); the whole setup slowly turns (see SPIN_SPEED) and starts
// at a random angle on every load.
const setup = new THREE.Group()
setup.position.set(0.1, 0, 0.2)
setup.rotation.y = Math.random() * Math.PI * 2
scene.add(setup)

const bigCloud = createCloud({ width: 1.8, depth: 1.5, height: 0.78, seed: 7 })
bigCloud.position.set(0.2, 0, 0.2)
setup.add(bigCloud)

const smallCloud = createCloud({ width: 0.9, depth: 0.8, height: 0.68, seed: 3 })
smallCloud.position.set(-0.34, 0, -0.42)
setup.add(smallCloud)

// Phone ids match the folders in audio_files (phone_0, phone_1, ...).
// Each phone faces outwards, towards where a visitor stands; `facing` is the
// yaw in radians (0 = towards the bottom of the sketch).
const PHONE_SCALE = 1.5 // a bit larger than life, so they read at diorama scale
const phones = [
  { id: 0, cloud: bigCloud, x: -0.29, z: 0.27, facing: -0.17, color: ugent.blue, accent: ugent.yellow },
  { id: 1, cloud: bigCloud, x: 0.43, z: -0.17, facing: 1.27, color: ugent.yellow, accent: ugent.blue },
  { id: 2, cloud: smallCloud, x: -0.04, z: -0.03, facing: -2.5, color: ugent.blue, accent: ugent.yellow },
].map(({ id, cloud, x, z, facing, color, accent }) => {
  const phone = createPhone({ id, color, accent })
  phone.group.position.set(x, cloud.userData.topY, z)
  phone.group.rotation.y = facing
  phone.group.scale.setScalar(PHONE_SCALE)
  cloud.add(phone.group)

  // Rest the phone flat on the tabletop and push away puffs under its base
  // (0.24 x 0.2 m, so a circle of the half-diagonal plus a small margin) —
  // in every cloud, since the clouds overlap.
  setup.updateMatrixWorld(true)
  const base = phone.group.getWorldPosition(new THREE.Vector3())
  for (const other of [bigCloud, smallCloud]) {
    const p = other.worldToLocal(base.clone())
    other.userData.clearSpot(p.x, p.z, 0.16 * PHONE_SCALE + 0.02, p.y)
  }
  updateCord(phone)
  return phone
})

// --- copy: wall board + info card ---------------------------------------------
// Both follow the state machine below; texts live in content.js.

const phoneColors = phones.map((p) => p.color)
const board = createWallBoard({ phoneColors, width: 3.1 })
board.mesh.position.set(0.25, 1.98, room.userData.backWallZ + 0.002)
scene.add(board.mesh)
const touch = window.matchMedia('(pointer: coarse)').matches
const hudElement = document.getElementById('hud')
const hud = createHud(hudElement, {
  phoneColors,
  touch,
  onPickUp: (i) => phones[i] !== active && pickUp(phones[i]),
  onSelect: (n) => active && pressButton(active, n + 1),
  onHangUp: () => active && hangUp(),
})
hud.showIntro()

// --- audio + state machine --------------------------------------------------
// Mirrors the physical phone: idle -> waiting (handset up) -> playing (button)
// -> back to waiting when the story ends; hanging up returns to idle.

const audio = new Audio()
let active = null // the phone whose handset is up
let state = 'idle'
let playingButton = null

function play(path, { loop = false, onEnded = null } = {}) {
  audio.pause()
  audio.src = audioUrl(path)
  audio.loop = loop
  audio.onended = onEnded
  audio.currentTime = 0
  audio.play().catch((err) => console.warn('audio playback failed', path, err))
}

function stopAudio() {
  audio.pause()
  audio.onended = null
  audio.removeAttribute('src')
  audio.load()
}

function enterWaiting() {
  state = 'waiting'
  playingButton = null
  play('waiting', { loop: true })
  board.show(active.id)
  hud.showTheme(active.id)
}

function pickUp(phone) {
  if (active) hangUp()
  active = phone
  phone.ringUntil = 0
  enterWaiting()
}

function hangUp() {
  stopAudio()
  active = null
  state = 'idle'
  playingButton = null
  board.show(hovered?.userData.phoneId ?? null)
  hud.showIntro()
}

function pressButton(phone, number) {
  if (phone !== active) {
    hud.flash('Neem eerst de hoorn op.')
    return
  }
  const button = phone.buttons[number - 1]
  button.userData.pressedAt = performance.now()
  state = 'playing'
  playingButton = button
  play(`phone_${phone.id}/button_${number}`, { onEnded: enterWaiting })
  hud.showStory(phone.id, number - 1)
}

// --- picking ----------------------------------------------------------------

const raycaster = new THREE.Raycaster()
const pointer = new THREE.Vector2()
const interactive = phones.flatMap((p) => [p.handset, ...p.buttons])

function pick(event) {
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1
  raycaster.setFromCamera(pointer, camera)
  const hit = raycaster.intersectObjects(interactive, true)[0]
  if (!hit) return null
  let obj = hit.object
  while (obj && !obj.userData.kind) obj = obj.parent
  return obj
}

let hovered = null
renderer.domElement.addEventListener('pointermove', (event) => {
  hovered = pick(event)
  renderer.domElement.style.cursor = hovered ? 'pointer' : ''
  // While no handset is up, hovering a phone previews its theme on the wall.
  if (!active) board.show(hovered?.userData.phoneId ?? null)
})

// Only treat it as a click if the pointer barely moved (otherwise it's a rotate).
let downAt = null
renderer.domElement.addEventListener('pointerdown', (event) => {
  downAt = { x: event.clientX, y: event.clientY }
})
renderer.domElement.addEventListener('pointerup', (event) => {
  const tapped = downAt && Math.hypot(event.clientX - downAt.x, event.clientY - downAt.y) <= 5
  const target = tapped ? pick(event) : null
  if (target) {
    const phone = phones[target.userData.phoneId]
    if (target.userData.kind === 'handset') {
      phone === active ? hangUp() : pickUp(phone)
    } else {
      pressButton(phone, target.userData.number)
    }
  }
  // A finger doesn't hover: don't leave a phone highlighted after a touch.
  if (event.pointerType === 'touch') {
    hovered = null
    if (!active) board.show(null)
  }
})

window.addEventListener('keydown', (event) => {
  if (active && ['1', '2', '3'].includes(event.key)) pressButton(active, Number(event.key))
  if (active && event.key === 'Escape') hangUp()
})

// --- sound waves --------------------------------------------------------------
// While a story plays, rings ripple out of the lifted handset.

const waves = []
const waveGeometry = new THREE.TorusGeometry(1, 0.08, 8, 40)
let nextWaveAt = 0

function spawnWave(phone, t) {
  const material = new THREE.MeshBasicMaterial({ color: palette.accent, transparent: true, depthWrite: false })
  const wave = new THREE.Mesh(waveGeometry, material)
  phone.handset.localToWorld(wave.position.set(-0.1, 0, 0))
  wave.userData.born = t
  scene.add(wave)
  waves.push(wave)
}

function updateWaves(t) {
  for (let i = waves.length - 1; i >= 0; i--) {
    const wave = waves[i]
    const age = (t - wave.userData.born) / 1.4
    if (age >= 1) {
      scene.remove(wave)
      wave.material.dispose()
      waves.splice(i, 1)
      continue
    }
    wave.scale.setScalar(0.04 + age * 0.2)
    wave.material.opacity = 0.8 * (1 - age)
    wave.quaternion.copy(camera.quaternion)
  }
}

// --- animation loop ---------------------------------------------------------
// Idle phones occasionally "ring" (the handset rattles on its cradle) to draw
// attention, like the physical booth does.

const clock = new THREE.Clock()
const restQuat = new THREE.Quaternion()
const liftQuat = new THREE.Quaternion()
const jiggle = new THREE.Quaternion()
const jiggleEuler = new THREE.Euler()
let nextRingAt = 4

// The clouds and phones slowly turn around their vertical axis (a full turn
// takes about two minutes), easing to a stop while a handset is up so the
// buttons hold still.
const SPIN_SPEED = (Math.PI * 2) / 120
let spin = SPIN_SPEED

renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.1)
  const t = clock.elapsedTime

  room.userData.update(t)
  spin += ((active ? 0 : SPIN_SPEED) - spin) * Math.min(1, dt * 2)
  setup.rotation.y += spin * dt
  bigCloud.userData.update(t)
  smallCloud.userData.update(t)

  if (t > nextRingAt) {
    const idle = phones.filter((p) => p !== active)
    const phone = idle[Math.floor(Math.random() * idle.length)]
    if (phone) phone.ringUntil = t + 2.4
    nextRingAt = t + 10 + Math.random() * 10
  }

  for (const phone of phones) {
    const goal = phone === active ? 1 : 0
    phone.liftAmount += (goal - phone.liftAmount) * Math.min(1, dt * 8)
    const k = phone.liftAmount

    // Two short rattles per second while ringing; a slight lift on hover.
    const ringing = t < (phone.ringUntil ?? 0) && t % 0.8 < 0.5
    const rattle = ringing ? Math.sin(t * 60) : 0
    const hoverLift = hovered === phone.handset && !active ? 0.012 : 0

    phone.handset.position.lerpVectors(phone.rest.position, phone.lifted.position, k)
    phone.handset.position.y += hoverLift + Math.abs(rattle) * 0.008
    restQuat.setFromEuler(phone.rest.rotation)
    liftQuat.setFromEuler(phone.lifted.rotation)
    phone.handset.quaternion.slerpQuaternions(restQuat, liftQuat, k)
    phone.handset.quaternion.multiply(jiggle.setFromEuler(jiggleEuler.set(0, 0, rattle * 0.08)))
    const pose = `${k.toFixed(3)}|${rattle.toFixed(2)}|${hoverLift}`
    if (pose !== phone.pose) {
      phone.pose = pose
      updateCord(phone)
    }

    // Buttons: pulse while waiting, steady glow on the playing one,
    // a short press-in after a click, and a hint glow on hover.
    for (const button of phone.buttons) {
      let glow = 0
      if (phone === active && state === 'waiting') glow = 0.35 + 0.25 * Math.sin(t * 4)
      if (button === playingButton) glow = 0.9
      if (button === hovered) glow = Math.max(glow, 0.3)
      for (const m of button.userData.materials) m.emissiveIntensity = glow

      const sincePress = (performance.now() - (button.userData.pressedAt ?? -1e9)) / 1000
      const press = Math.max(0, 1 - sincePress / 0.2)
      button.position.y = button.userData.restY - 0.006 * press
    }
  }

  if (state === 'playing' && active && t > nextWaveAt) {
    spawnWave(active, t)
    nextWaveAt = t + 0.5
  }
  updateWaves(t)

  board.update(dt)
  if (state === 'playing' && audio.duration) hud.setProgress(audio.currentTime / audio.duration)

  applyViewShift()
  controls.update()
  renderer.render(scene, camera)
})

// --- responsive camera --------------------------------------------------------
// On narrow or portrait screens the camera backs off so the whole room fits
// the width. Where the cards take a real share of a small screen, the room is
// also fitted to, and centred in, the space they leave free: above the bottom
// panel on phones, right of the cards on short landscape screens.

const creditsElement = document.getElementById('credits')
const panelQuery = window.matchMedia('(max-width: 700px)') // matches the CSS
const sideQuery = window.matchMedia('(max-height: 520px) and (min-width: 701px)') // matches the CSS
const BASE_DISTANCE = camera.position.distanceTo(controls.target) // tuned for a 16:10 desktop window
const viewShift = { x: 0, y: 0 } // current shift of the scene, in pixels

// Space taken by the cards: a panel along the bottom, or a column on the left.
function coveredArea() {
  if (panelQuery.matches) return { left: 0, bottom: window.innerHeight - hudElement.getBoundingClientRect().top }
  if (sideQuery.matches) return { left: hudElement.getBoundingClientRect().right, bottom: 0 }
  return { left: 0, bottom: 0 }
}

function fitCamera() {
  const width = window.innerWidth
  const height = window.innerHeight
  renderer.setSize(width, height)
  camera.aspect = width / height
  const { left, bottom } = coveredArea()
  const freeWidth = Math.max(0.3, (width - left) / width) // share left for the room
  const freeHeight = Math.max(0.3, (height - bottom) / height)
  const distance = Math.max(BASE_DISTANCE, 11 / (camera.aspect * freeWidth), BASE_DISTANCE / freeHeight)
  const direction = camera.position.clone().sub(controls.target).normalize()
  camera.position.copy(controls.target).addScaledVector(direction, distance)
  controls.maxDistance = Math.max(12, distance * 1.4)
  applyViewShift(true)
}

// Shift the rendered view so the room sits centred in the free space. Eases
// when the cards change size (state changes), jumps on resize.
function applyViewShift(immediate = false) {
  const { left, bottom } = coveredArea()
  const target = { x: left / 2, y: bottom / 2 }
  if (!immediate && Math.abs(target.x - viewShift.x) < 0.5 && Math.abs(target.y - viewShift.y) < 0.5) return
  const k = immediate ? 1 : 0.15
  viewShift.x += (target.x - viewShift.x) * k
  viewShift.y += (target.y - viewShift.y) * k
  const { innerWidth: w, innerHeight: h } = window
  if (Math.abs(viewShift.x) > 0.5 || Math.abs(viewShift.y) > 0.5) camera.setViewOffset(w, h, -viewShift.x, viewShift.y, w, h)
  else camera.clearViewOffset()
  camera.updateProjectionMatrix()
}

fitCamera()
window.addEventListener('resize', fitCamera)
creditsElement.querySelector('img').addEventListener('load', fitCamera) // panel height can change once the logo loads
