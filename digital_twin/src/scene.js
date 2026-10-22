import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { ugent, palette, fontStack } from './room.js'

// Seeded random so the clouds look the same on every load.
function mulberry32(seed) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// A cloud built from overlapping puffs, tapering towards the floor, with a
// flat-ish top at `height` for the phones to sit on.
export function createCloud({ width, depth, height, seed = 1 }) {
  const rand = mulberry32(seed)
  const group = new THREE.Group()
  const material = new THREE.MeshStandardMaterial({ color: palette.cloud, roughness: 0.9 })
  const sphere = new THREE.SphereGeometry(1, 24, 16)

  const addPuff = (x, y, z, r) => {
    const puff = new THREE.Mesh(sphere, material)
    puff.position.set(x, y, z)
    puff.scale.setScalar(r)
    puff.castShadow = true
    puff.receiveShadow = true
    puff.userData = { baseScale: puff.scale.clone(), phase: rand() * Math.PI * 2 }
    group.add(puff)
    return puff
  }

  const puffSize = Math.min(width, depth) * 0.28
  const count = Math.round(40 * (width * depth) / 1.2) + 20
  for (let i = 0; i < count; i++) {
    const t = rand() // 0 = bottom, 1 = top
    const spread = 0.35 + 0.65 * Math.pow(t, 0.5)
    const angle = rand() * Math.PI * 2
    const dist = Math.sqrt(rand())
    const r = puffSize * (0.55 + 0.6 * rand()) * (0.6 + 0.4 * t)
    const x = Math.cos(angle) * dist * (width / 2 - r * 0.4) * spread
    const z = Math.sin(angle) * dist * (depth / 2 - r * 0.4) * spread
    const y = 0.12 + t * (height - 0.12 - r * 0.6)
    addPuff(x, y, z, r)
  }

  // Tabletop: a flat elliptical slab whose top is exactly at `height`, with a
  // ring of puffs around its rim. It stays still under the phones. Its outline
  // gets notched wherever a lower object needs room (see clearSpot).
  const notches = []
  const top = new THREE.Mesh(new THREE.BufferGeometry(), material)
  top.position.y = height - 0.04
  top.receiveShadow = true
  group.add(top)
  // The slab's outline as (x, z) points: an ellipse, pushed in around notches.
  const slabOutline = () => {
    const outline = []
    for (let i = 0; i < 160; i++) {
      const a = (i / 160) * Math.PI * 2
      const p = new THREE.Vector2(Math.cos(a) * width * 0.48, Math.sin(a) * depth * 0.48)
      for (const n of notches) {
        const away = p.clone().sub(n.center)
        if (away.length() < n.radius) p.copy(n.center).addScaledVector(away.normalize(), n.radius)
      }
      outline.push(p)
    }
    return outline
  }
  const buildTop = () => {
    const outline = slabOutline().map((p) => new THREE.Vector2(p.x, -p.y)) // shape y maps to world -z
    const geometry = new THREE.ExtrudeGeometry(new THREE.Shape(outline), {
      depth: 0.03, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.015, bevelSegments: 3, curveSegments: 1,
    })
    geometry.rotateX(-Math.PI / 2) // extrude upwards: slab spans y = -0.01 .. 0.04
    top.geometry.dispose()
    top.geometry = geometry
  }
  buildTop()
  const rim = 14
  for (let i = 0; i < rim; i++) {
    const a = (i / rim) * Math.PI * 2 + rand() * 0.2
    const r = puffSize * (0.5 + 0.3 * rand())
    addPuff(Math.cos(a) * width * 0.48, height - r * 0.8, Math.sin(a) * depth * 0.48, r)
  }

  const breathe = 0.035
  const EDGE_PUFF = 0.07 // radius of the puffs that hide the slab's edge
  group.userData.topY = height
  // Slow breathing: every puff swells a little on its own rhythm.
  group.userData.update = (t) => {
    for (const puff of group.children) {
      const { baseScale, phase } = puff.userData
      if (!baseScale) continue
      puff.scale.copy(baseScale).multiplyScalar(1 + breathe * Math.sin(t * 0.8 + phase))
    }
  }
  // Clear a round spot for an object resting at `surfaceY` (by default this
  // cloud's tabletop): any puff that would poke up through it (even at full
  // breath) is lowered until its highest point over the spot sits just below.
  group.userData.clearSpot = (x, z, radius, surfaceY = height) => {
    const lower = surfaceY < height - 0.001
    // A lower object can't stand in the slab: notch the outline around it.
    // (Only works for spots reaching in from the edge, not holes mid-table.)
    // Wide enough that an edge puff centred on the notch's edge stays out of the spot.
    const notchRadius = radius + EDGE_PUFF * (1 + breathe) + 0.005
    if (lower) {
      notches.push({ center: new THREE.Vector2(x, z), radius: notchRadius })
      buildTop()
    }
    const limit = surfaceY - 0.005
    for (const puff of group.children) {
      if (!puff.userData.baseScale) continue
      const r = puff.userData.baseScale.x * (1 + breathe)
      const d = Math.hypot(puff.position.x - x, puff.position.z - z)
      const gap = Math.max(0, d - radius) // horizontal distance from the spot's edge
      if (gap >= r) continue
      const rise = Math.sqrt(r * r - gap * gap)
      if (puff.position.y + rise > limit) puff.position.y = limit - rise
    }
    if (lower) coverEdge()
  }

  // Wherever the slab's edge is no longer hidden by a puff (after notching or
  // lowering puffs), add a puff over it, so the step reads as soft cloud
  // instead of a cut edge. Puffs never reach into a cleared spot.
  const coverEdge = () => {
    const r = EDGE_PUFF
    const outline = slabOutline()
    for (let i = 0; i < outline.length; i++) {
      const p = outline[i]
      const covered = group.children.some((puff) => {
        if (!puff.userData.baseScale) return false
        const pr = puff.userData.baseScale.x
        const d = Math.hypot(puff.position.x - p.x, puff.position.z - p.y)
        return d < pr && puff.position.y + Math.sqrt(pr * pr - d * d) >= height - 0.003
      })
      if (covered) continue
      const c = p.clone()
      for (const n of notches) {
        const away = c.clone().sub(n.center)
        const min = n.radius // the notch already leaves room for an edge puff
        if (away.length() < min) c.copy(n.center).addScaledVector(away.normalize(), min)
      }
      addPuff(c.x, height + 0.012 - r, c.y, r)
    }
  }
  return group
}

// Numbered texture for the top face of a story button.
function numberTexture(n, background, ink) {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 128
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = background
  ctx.fillRect(0, 0, 128, 128)
  ctx.fillStyle = ink
  ctx.font = `600 80px ${fontStack}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  // The cylinder's cap UVs run sideways; turn the digit 90° counter-clockwise
  // so it reads upright on the button.
  ctx.translate(64, 64)
  ctx.rotate(-Math.PI / 2)
  ctx.fillText(String(n), 0, 6)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

const css = (hex) => `#${hex.toString(16).padStart(6, '0')}`

// Retro desk-phone body: a rounded box tapered towards the top, with the top
// pushed back so the front becomes the classic sloped face.
const BODY = { width: 0.22, height: 0.09, depth: 0.2 }
function bodyGeometry() {
  const { width, height, depth } = BODY
  const geometry = new RoundedBoxGeometry(width, height, depth, 6, 0.028)
  const pos = geometry.attributes.position
  for (let i = 0; i < pos.count; i++) {
    const h = (pos.getY(i) + height / 2) / height // 0 at the bottom, 1 on top
    pos.setX(i, pos.getX(i) * (1 - 0.22 * h))
    pos.setZ(i, pos.getZ(i) * (1 - 0.35 * h) - 0.03 * h)
    pos.setY(i, pos.getY(i) + height / 2)
  }
  geometry.computeVertexNormals()
  return geometry
}

// Bell-shaped ear/mouth cup, opening downwards (-y), neck at the origin.
function cupGeometry() {
  const profile = [
    [0, -0.036], [0.026, -0.036], [0.033, -0.033], [0.035, -0.026],
    [0.032, -0.015], [0.026, -0.006], [0.021, 0.001], [0.016, 0.006], [0, 0.009],
  ].map(([x, y]) => new THREE.Vector2(x, y))
  return new THREE.LatheGeometry(profile, 40)
}

const X_AXIS = new THREE.Vector3(1, 0, 0)
const Y_AXIS = new THREE.Vector3(0, 1, 0)

// A coiled cord: a helix wound around a guiding curve.
class CoilCurve extends THREE.Curve {
  constructor(path, turns, radius) {
    super()
    this.path = path
    this.turns = turns
    this.radius = radius
  }

  getPoint(t, target = new THREE.Vector3()) {
    const tangent = this.path.getTangent(t)
    const normal = new THREE.Vector3().crossVectors(tangent, Math.abs(tangent.y) > 0.9 ? X_AXIS : Y_AXIS).normalize()
    const binormal = new THREE.Vector3().crossVectors(tangent, normal)
    const a = t * this.turns * Math.PI * 2
    return this.path.getPoint(t, target)
      .addScaledVector(normal, Math.cos(a) * this.radius)
      .addScaledVector(binormal, Math.sin(a) * this.radius)
  }
}

// A retro desk telephone in one UGent colour, with the other as the accent on
// its buttons. Facing +z. Returns the group plus references to the handset
// and buttons for interaction.
export function createPhone({ id, color = ugent.blue, accent = ugent.yellow }) {
  const group = new THREE.Group()
  // Glossy, like the bakelite-style originals.
  const body = new THREE.MeshPhysicalMaterial({ color, roughness: 0.35, clearcoat: 0.8, clearcoatRoughness: 0.25 })
  const grilleMaterial = new THREE.MeshStandardMaterial({ color: ugent.white, roughness: 0.4 })

  const shadowed = (mesh) => {
    mesh.castShadow = true
    mesh.receiveShadow = true
    return mesh
  }

  group.add(shadowed(new THREE.Mesh(bodyGeometry(), body)))

  // Frame lying on the sloped front face; the buttons sit on it.
  const face = new THREE.Group()
  face.position.set(0, 0.047, 0.066)
  face.rotation.x = 0.95 // tilt to the slope of the front face
  group.add(face)

  // Cradle: two rounded forks on top.
  for (const x of [-0.055, 0.055]) {
    const fork = shadowed(new THREE.Mesh(new THREE.CapsuleGeometry(0.012, 0.02, 6, 16), body))
    fork.position.set(x, 0.1, -0.03)
    fork.rotation.z = x > 0 ? -0.25 : 0.25
    group.add(fork)
  }

  // Handset: a gently curved handle with a bell-shaped cup at each end.
  const handset = new THREE.Group()
  // The handle's ends run down into the cups' necks, and a rounded joint at
  // each end blends the two into one piece.
  const handleCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.108, -0.016, 0),
    new THREE.Vector3(-0.1, 0.002, 0),
    new THREE.Vector3(-0.06, 0.017, 0),
    new THREE.Vector3(0, 0.022, 0),
    new THREE.Vector3(0.06, 0.017, 0),
    new THREE.Vector3(0.1, 0.002, 0),
    new THREE.Vector3(0.108, -0.016, 0),
  ])
  handset.add(shadowed(new THREE.Mesh(new THREE.TubeGeometry(handleCurve, 64, 0.016, 20, false), body)))
  const cup = cupGeometry()
  for (const x of [-0.105, 0.105]) {
    const joint = shadowed(new THREE.Mesh(new THREE.SphereGeometry(0.0195, 24, 16), body))
    joint.position.set(x * 0.985, -0.001, 0)
    handset.add(joint)
    const piece = shadowed(new THREE.Mesh(cup, body))
    piece.position.set(x, -0.004, 0)
    piece.rotation.z = x > 0 ? 0.12 : -0.12 // tilt slightly outwards
    handset.add(piece)
    const grille = new THREE.Mesh(new THREE.CircleGeometry(0.02, 32), grilleMaterial)
    grille.rotation.x = Math.PI / 2
    grille.position.y = -0.0365
    piece.add(grille)
  }
  handset.userData = { kind: 'handset', phoneId: id }
  const rest = { position: new THREE.Vector3(0, 0.133, -0.03), rotation: new THREE.Euler(0, 0, 0) }
  const lifted = { position: new THREE.Vector3(0.05, 0.32, 0.08), rotation: new THREE.Euler(-0.5, 0.3, 0.35) }
  handset.position.copy(rest.position)
  group.add(handset)

  // Coiled cord in the phone's colour, rebuilt by updateCord.
  const cord = new THREE.Mesh(new THREE.BufferGeometry(), body)
  cord.castShadow = true
  group.add(cord)

  // Three big story buttons in a row on the front face, in the accent colour.
  const ink = accent === ugent.yellow ? css(ugent.blue) : css(ugent.white)
  const buttons = [1, 2, 3].map((n, i) => {
    const glow = new THREE.MeshStandardMaterial({ color: ugent.white, map: numberTexture(n, css(accent), ink), roughness: 0.4, emissive: accent, emissiveIntensity: 0 })
    const side = new THREE.MeshStandardMaterial({ color: accent, roughness: 0.4, emissive: accent, emissiveIntensity: 0 })
    const button = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.019, 0.014, 40), [side, glow, side]))
    button.position.set((i - 1) * 0.045, 0.004, 0)
    button.userData = { kind: 'button', phoneId: id, number: n, materials: [side, glow], restY: 0.004 }
    face.add(button)
    return button
  })

  return { id, color, group, handset, buttons, cord, rest, lifted, liftAmount: 0 }
}

// Rebuild the coiled cord from the back corner of the body to the mouthpiece.
const cordStart = new THREE.Vector3(-0.085, 0.02, -0.075)
const cordEnd = new THREE.Vector3()
export function updateCord(phone) {
  phone.handset.updateMatrix()
  cordEnd.set(-0.105, -0.03, 0).applyMatrix4(phone.handset.matrix)
  const mid = cordStart.clone().lerp(cordEnd, 0.5)
  mid.x -= 0.07
  mid.z -= 0.02
  mid.y = Math.max(0.012, mid.y - 0.05 * (1 - phone.liftAmount) - 0.03) // never sag below the base
  const path = new THREE.CatmullRomCurve3([
    cordStart, cordStart.clone().add(new THREE.Vector3(-0.03, -0.006, -0.01)), mid, cordEnd,
  ])
  const turns = Math.round(path.getLength() / 0.006)
  phone.cord.geometry.dispose()
  phone.cord.geometry = new THREE.TubeGeometry(new CoilCurve(path, turns, 0.0055), turns * 10, 0.0022, 6, false)
}
