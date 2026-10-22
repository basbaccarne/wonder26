import * as THREE from 'three'

// Colours from the Ghent University styleguide
// (https://styleguide.ugent.be/basic-principles/colours.html): UGent Blue and
// White as the base, UGent Yellow as the accent, black for text. Softer
// surfaces use the allowed tints in 10% steps instead of invented colours.
export const ugent = {
  blue: 0x1e64c8, // UGent Blue, Pantone 300
  yellow: 0xffd200, // UGent Yellow, Pantone 109
  white: 0xffffff,
  black: 0x000000,
  blue10: 0xe9f0fa, // tints of UGent Blue
  blue20: 0xd2e0f4,
  blue40: 0xa5c1e9,
  blue60: 0x78a2de,
  yellow40: 0xffed99, // tint of UGent Yellow
}

const css = (hex) => `#${hex.toString(16).padStart(6, '0')}`

// The diorama's roles mapped onto that palette.
export const palette = {
  background: ugent.blue,
  floor: css(ugent.blue10),
  plankLine: css(ugent.blue20),
  slabEdge: ugent.blue40,
  wallLeft: ugent.white,
  wallBack: ugent.blue20,
  wallTop: ugent.white,
  niche: ugent.blue,
  shelf: ugent.white,
  rug: ugent.yellow,
  rugBorder: ugent.white,
  cloud: ugent.white,
  accent: ugent.yellow,
  logoBlue: ugent.blue,
  logoYellow: ugent.yellow,
}

// UGent Panno Text is licensed to UGent staff (installed on staff PCs);
// Arial is the styleguide's official fallback.
export const fontStack = '"UGent Panno Text", Arial, sans-serif'

const shadowed = (mesh, cast = true) => {
  mesh.castShadow = cast
  mesh.receiveShadow = true
  return mesh
}

const mat = (color, roughness = 0.75) => new THREE.MeshStandardMaterial({ color, roughness })

function plankTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 512
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = palette.floor
  ctx.fillRect(0, 0, 512, 512)
  ctx.strokeStyle = palette.plankLine
  ctx.lineWidth = 3
  const rows = 8
  for (let r = 0; r < rows; r++) {
    const y = (r / rows) * 512
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(512, y)
    ctx.stroke()
    // Staggered plank joints.
    const offset = r % 2 ? 128 : 0
    for (let x = offset; x < 512; x += 256) {
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x, y + 512 / rows)
      ctx.stroke()
    }
  }
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(2, 2)
  return tex
}

// A wireframe made of thin cylinders (WebGL lines are always 1px wide).
function wireframe(geometry, color, radius = 0.012) {
  const group = new THREE.Group()
  const material = mat(color, 0.4)
  const edges = new THREE.EdgesGeometry(geometry).attributes.position
  const a = new THREE.Vector3()
  const b = new THREE.Vector3()
  for (let i = 0; i < edges.count; i += 2) {
    a.fromBufferAttribute(edges, i)
    b.fromBufferAttribute(edges, i + 1)
    const length = a.distanceTo(b)
    const rod = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 8), material))
    rod.position.copy(a).add(b).multiplyScalar(0.5)
    rod.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize())
    group.add(rod)
    for (const p of [a, b]) {
      const joint = new THREE.Mesh(new THREE.SphereGeometry(radius, 8, 6), material)
      joint.position.copy(p)
      group.add(joint)
    }
  }
  return group
}

// The "iO" logo: a yellow dot + triangle ("i") and a thick "O", extruded and
// slowly turning above a blue plinth. Shapes are traced in pixels from the
// 447px logo image (y up, centred), then scaled to ~0.55 m tall.
function logo() {
  const group = new THREE.Group()
  const plinth = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.26, 0.4, 40), mat(palette.logoBlue, 0.5)))
  plinth.position.y = 0.2
  group.add(plinth)

  const dot = new THREE.Shape().absarc(-70, 51, 24, 0, Math.PI * 2)
  const triangle = new THREE.Shape([
    new THREE.Vector2(-70, -7), new THREE.Vector2(-100, -74), new THREE.Vector2(-38, -74),
  ])
  const o = new THREE.Shape().absarc(64, 0, 80, 0, Math.PI * 2)
  o.holes.push(new THREE.Path().absarc(64, 0, 44, 0, Math.PI * 2, true))

  const geometry = new THREE.ExtrudeGeometry([dot, triangle, o], {
    depth: 26, bevelEnabled: true, bevelThickness: 4, bevelSize: 3, bevelSegments: 3, curveSegments: 48,
  })
  geometry.center()
  const mark = shadowed(new THREE.Mesh(geometry, mat(palette.logoYellow, 0.35)))
  mark.scale.setScalar(0.55 / 160)

  const spinner = new THREE.Group()
  spinner.add(mark)
  group.add(spinner)
  group.userData.update = (t) => {
    spinner.rotation.y = t * 0.5
    spinner.position.y = 0.75 + Math.sin(t * 1.2) * 0.03
  }
  return group
}

function ballCluster() {
  const group = new THREE.Group()
  const colors = [ugent.yellow, ugent.white, ugent.blue40, ugent.yellow40, ugent.blue60]
  const sphere = new THREE.SphereGeometry(0.035, 16, 12)
  let i = 0
  for (let x = -1; x <= 1; x++)
    for (let y = -1; y <= 1; y++)
      for (let z = -1; z <= 1; z++) {
        if (Math.abs(x) + Math.abs(y) + Math.abs(z) > 2) continue
        const ball = shadowed(new THREE.Mesh(sphere, mat(colors[i++ % colors.length], 0.35)))
        ball.position.set(x, y, z).multiplyScalar(0.055)
        group.add(ball)
      }
  return group
}

// A little floating cloud made of a handful of puffs.
function miniCloud(scale) {
  const group = new THREE.Group()
  const material = mat(palette.cloud, 0.9)
  const sphere = new THREE.SphereGeometry(1, 20, 14)
  for (const [x, y, r] of [[-0.6, 0, 0.45], [0, 0.15, 0.6], [0.6, 0, 0.45], [0.25, -0.1, 0.45], [-0.25, -0.1, 0.45]]) {
    const puff = shadowed(new THREE.Mesh(sphere, material))
    puff.position.set(x, y, 0)
    puff.scale.setScalar(r)
    group.add(puff)
  }
  group.scale.setScalar(scale)
  return group
}

// The diorama: a floor slab with two thick walls (left and back), a shelf
// niche, wall lettering, a rug and a few animated props. Floor top is y = 0.
export function createRoom({ width = 4.0, depth = 3.4, height = 2.8 } = {}) {
  const group = new THREE.Group()
  const updates = []
  const wallT = 0.2
  const slabH = 0.16

  // Floor slab: planks on top, darker edge around.
  const edge = mat(palette.slabEdge)
  const top = new THREE.MeshStandardMaterial({ map: plankTexture(), roughness: 0.8 })
  const slab = shadowed(new THREE.Mesh(
    new THREE.BoxGeometry(width + wallT, slabH, depth + wallT),
    [edge, edge, top, edge, edge, edge],
  ), false)
  slab.position.set(-wallT / 2, -slabH / 2, -wallT / 2)
  group.add(slab)

  // Walls, with a light cap on their top edge.
  const addWall = (w, d, x, z, color) => {
    const wall = shadowed(new THREE.Mesh(new THREE.BoxGeometry(w, height, d), mat(color, 0.9)))
    wall.position.set(x, height / 2, z)
    group.add(wall)
    const cap = new THREE.Mesh(new THREE.BoxGeometry(w + 0.001, 0.02, d + 0.001), mat(palette.wallTop))
    cap.position.set(x, height + 0.01, z)
    group.add(cap)
  }
  addWall(wallT, depth + wallT, -width / 2 - wallT / 2, -wallT / 2, palette.wallLeft)
  addWall(width, wallT, 0, -depth / 2 - wallT / 2, palette.wallBack)

  // Shelf niche in the left wall.
  const nicheZ = -0.3
  const niche = new THREE.Mesh(new THREE.BoxGeometry(0.01, 1.3, 2.2), mat(palette.niche, 0.9))
  niche.position.set(-width / 2 + 0.005, 1.45, nicheZ)
  group.add(niche)
  for (const y of [0.95, 1.5]) {
    const shelf = shadowed(new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.04, 2.2), mat(palette.shelf)))
    shelf.position.set(-width / 2 + 0.17, y, nicheZ)
    group.add(shelf)
  }

  // Spinning wireframes on the top shelf, a bobbing ball cluster below.
  const cube = wireframe(new THREE.BoxGeometry(0.22, 0.22, 0.22), ugent.yellow)
  cube.position.set(-width / 2 + 0.17, 1.72, nicheZ + 0.55)
  const octa = wireframe(new THREE.OctahedronGeometry(0.15), ugent.white)
  octa.position.set(-width / 2 + 0.17, 1.72, nicheZ - 0.2)
  const balls = ballCluster()
  balls.position.set(-width / 2 + 0.17, 1.1, nicheZ - 0.6)
  group.add(cube, octa, balls)
  updates.push((t) => {
    cube.rotation.set(t * 0.4, t * 0.6, 0)
    octa.rotation.set(0, t * 0.8, t * 0.3)
    balls.position.y = 1.1 + Math.abs(Math.sin(t * 2)) * 0.06
    balls.rotation.y = t * 0.5
  })

  // Oval rug with a soft, rounded edge and an inset border line.
  const rugA = 1.45, rugB = 1.2 // semi-axes
  const rug = new THREE.Group()
  rug.position.set(0.1, 0, 0.3)
  rug.rotation.x = -Math.PI / 2 // shapes are drawn flat in x/y
  group.add(rug)
  const rugGeometry = new THREE.ExtrudeGeometry(new THREE.Shape().absellipse(0, 0, rugA, rugB, 0, Math.PI * 2), {
    depth: 0.008, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.025, bevelSegments: 5, curveSegments: 96,
  })
  const rugBody = shadowed(new THREE.Mesh(rugGeometry, mat(palette.rug, 0.95)), false)
  rugBody.position.z = 0.006 // bevel reaches below the shape; sit it on the floor
  rug.add(rugBody)
  const inset = 0.12, line = 0.035
  const border = new THREE.Shape().absellipse(0, 0, rugA - inset, rugB - inset, 0, Math.PI * 2)
  border.holes.push(new THREE.Path().absellipse(0, 0, rugA - inset - line, rugB - inset - line, 0, Math.PI * 2, true))
  const borderLine = new THREE.Mesh(new THREE.ShapeGeometry(border, 96), mat(palette.rugBorder, 0.95))
  borderLine.position.z = 0.0205 // just above the rug's top face
  borderLine.receiveShadow = true
  rug.add(borderLine)

  // Logo in the back-right corner.
  const mark = logo()
  mark.position.set(width / 2 - 0.45, 0, -depth / 2 + 0.45)
  group.add(mark)
  updates.push(mark.userData.update)

  // Little clouds drifting above the room, clear of the wall board.
  for (const [x, y, z, s, speed] of [[-1.0, 3.25, -0.6, 0.2, 0.5], [0.9, 3.4, 0.2, 0.16, 0.7], [0.2, 3.1, 1.1, 0.12, 0.9]]) {
    const cloud = miniCloud(s)
    group.add(cloud)
    updates.push((t) => {
      cloud.position.set(x + Math.sin(t * speed * 0.3) * 0.35, y + Math.sin(t * speed) * 0.05, z)
    })
  }

  group.userData.update = (t) => updates.forEach((fn) => fn(t))
  group.userData.backWallZ = -depth / 2 // inner face, for mounting the wall board
  return group
}
