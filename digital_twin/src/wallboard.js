import * as THREE from 'three'
import { ugent, fontStack } from './room.js'
import { about, intro, themes } from './content.js'

const css = (hex) => `#${hex.toString(16).padStart(6, '0')}`
const W = 2048
const H = 1024
const LEFT = 80

// Greedy word wrap for canvas text.
function wrap(ctx, text, maxWidth) {
  const lines = []
  let line = ''
  for (const word of text.split(' ')) {
    const test = line ? `${line} ${word}` : word
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line)
      line = word
    } else {
      line = test
    }
  }
  if (line) lines.push(line)
  return lines
}

// Heading in capitals with a yellow underline, per the UGent styleguide.
function heading(ctx, text, y, size) {
  ctx.font = `600 ${size}px ${fontStack}`
  ctx.fillStyle = css(ugent.blue)
  ctx.fillText(text.toUpperCase(), LEFT, y)
  const w = ctx.measureText(text.toUpperCase()).width
  ctx.fillStyle = css(ugent.yellow)
  ctx.fillRect(LEFT, y + size * 0.14, w, Math.round(size * 0.08))
}

// The big lettering on the back wall: the overarching question and the three
// themes when idle, or one theme with its questions when a phone is in focus.
// `phoneColors[i]` marks theme i with the colour of its phone.
export function createWallBoard({ phoneColors, width = 2.6 }) {
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 8
  const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, toneMapped: false })
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, (width * H) / W), material)

  const drawIdle = () => {
    ctx.font = `600 56px ${fontStack}`
    ctx.fillStyle = css(ugent.blue)
    ctx.fillText(about.kicker.toUpperCase(), LEFT, 100)
    heading(ctx, intro.title, 290, 200)
    ctx.font = `400 58px ${fontStack}`
    ctx.fillStyle = css(ugent.black)
    let top = 420
    for (const line of wrap(ctx, about.tagline, W - LEFT * 2)) {
      ctx.fillText(line, LEFT, top)
      top += 68
    }
    themes.forEach((theme, i) => {
      const y = top + 90 + i * 115
      ctx.fillStyle = css(phoneColors[i])
      ctx.beginPath()
      ctx.arc(LEFT + 30, y - 28, 30, 0, Math.PI * 2)
      ctx.fill()
      ctx.font = `600 84px ${fontStack}`
      ctx.fillStyle = css(ugent.blue)
      ctx.fillText(`0${i + 1}  ${theme.name.toUpperCase()}`, LEFT + 90, y)
    })
    ctx.font = `400 56px ${fontStack}`
    ctx.fillStyle = css(ugent.black)
    ctx.fillText('Neem een hoorn op en luister.', LEFT, 940)
  }

  const drawTheme = (i) => {
    const theme = themes[i]
    ctx.font = `600 56px ${fontStack}`
    ctx.fillStyle = css(ugent.blue)
    ctx.fillText(`0${i + 1} / 0${themes.length}  ·  ${intro.title.toUpperCase()}`, LEFT, 110)
    heading(ctx, theme.name, 290, 170)
    ctx.font = `600 72px ${fontStack}`
    ctx.fillStyle = css(ugent.black)
    ctx.fillText(theme.question, LEFT, 440)
    ctx.font = `400 58px ${fontStack}`
    let y = 545
    for (const question of theme.questions) {
      ctx.fillStyle = css(ugent.yellow)
      ctx.fillRect(LEFT, y - 34, 24, 24)
      ctx.fillStyle = css(ugent.black)
      for (const line of wrap(ctx, question, W - LEFT * 2 - 60)) {
        ctx.fillText(line, LEFT + 60, y)
        y += 72
      }
      y += 20
    }
  }

  // `shown` is what's on the canvas; `wanted` is what it should become.
  // Changes crossfade: fade out, redraw, fade in.
  let shown = null
  let wanted = null
  let fade = 1
  const render = () => {
    ctx.clearRect(0, 0, W, H)
    ctx.textAlign = 'left'
    ctx.textBaseline = 'alphabetic'
    shown === null ? drawIdle() : drawTheme(shown)
    texture.needsUpdate = true
  }
  render()
  document.fonts?.load(`600 100px ${fontStack}`).then(render).catch(() => {})

  return {
    mesh,
    // Theme index to show, or null for the idle overview.
    show(themeIndex) {
      wanted = themeIndex
    },
    update(dt) {
      if (wanted !== shown) {
        fade = Math.max(0, fade - dt * 6)
        if (fade === 0) {
          shown = wanted
          render()
        }
      } else {
        fade = Math.min(1, fade + dt * 4)
      }
      material.opacity = fade
    },
  }
}
