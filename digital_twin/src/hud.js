import { about, intro, themes, photoUrl } from './content.js'

const css = (hex) => `#${hex.toString(16).padStart(6, '0')}`
const escape = (text) =>
  String(text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

const initials = (story) =>
  (story.name ?? story.perspective)
    .split(/\s+/)
    .filter((word) => /^[A-ZÀ-Ý]/.test(word)) // skip particles like "de", "van"
    .map((word) => word[0])
    .slice(0, 2)
    .join('')

function avatar(story) {
  const url = photoUrl(story)
  return url
    ? `<img class="avatar" src="${escape(url)}" alt="">`
    : `<div class="avatar avatar--initials" aria-hidden="true">${escape(initials(story))}</div>`
}

// "Functie, organisatie": what's known about a speaker besides the name.
const speakerLine = (story) => [story.role, story.org].filter(Boolean).join(', ')

// The info card: intro when idle, the theme and its three perspectives while
// a handset is up, and the speaker while a story plays. Its buttons mirror
// the phones (pick up, choose a story, hang up), so the twin also works where
// the 3D buttons are too small to tap, or with the keyboard alone.
// Parts marked "more" are hidden when the card is collapsed (on phones).
export function createHud(element, { phoneColors, touch, onPickUp, onSelect, onHangUp }) {
  let progressBar = null
  let flashTimer = null
  let collapsed = false

  const kicker = (i, withTheme = false) =>
    `<p class="kicker"><span class="dot" style="background:${css(phoneColors[i])}"></span>` +
    `Telefoon ${i + 1}${withTheme ? ` · ${escape(themes[i].name)}` : ''}</p>`
  const hangUpButton = `<button type="button" class="text-button" data-action="hangup">Inhaken</button>`

  const render = (html, hint) => {
    element.innerHTML =
      `<button type="button" class="collapse" data-action="collapse" aria-expanded="${!collapsed}" ` +
      `aria-label="${collapsed ? 'Toon meer tekst' : 'Toon minder tekst'}"></button>` +
      `${html}<p class="hint more" id="hud-hint">${escape(hint ?? '')}</p>`
    element.classList.toggle('collapsed', collapsed)
    progressBar = element.querySelector('.progress span')
  }

  element.addEventListener('click', (event) => {
    const button = event.target.closest('[data-action]')
    if (!button) return
    const { action, index } = button.dataset
    if (action === 'pickup') onPickUp(Number(index))
    if (action === 'select') onSelect(Number(index))
    if (action === 'hangup') onHangUp()
    if (action === 'collapse') {
      collapsed = !collapsed
      element.classList.toggle('collapsed', collapsed)
      button.setAttribute('aria-expanded', String(!collapsed))
      button.setAttribute('aria-label', collapsed ? 'Toon meer tekst' : 'Toon minder tekst')
    }
  })

  return {
    showIntro() {
      const choices = themes
        .map(
          (theme, i) =>
            `<li><button type="button" class="choice" data-action="pickup" data-index="${i}">` +
            `<span class="num">0${i + 1}</span><span class="label">${escape(theme.name)}</span></button></li>`,
        )
        .join('')
      render(
        `<p class="kicker">${escape(about.kicker)}</p>` +
          `<h1>${escape(intro.title)}</h1>` +
          `<div class="more">` +
          `<p class="lead">${escape(about.tagline)}</p>` +
          `<p>${escape(intro.text)}</p>` +
          `<details><summary>Wat is computationeel ontwerpen?</summary>` +
          about.paragraphs.map((p) => `<p>${escape(p)}</p>`).join('') +
          `</details></div>` +
          `<p class="label-small">${escape(intro.cta)}</p>` +
          `<ul class="choices">${choices}</ul>`,
        touch
          ? 'Tik op een thema of een hoorn · sleep om te draaien · knijp om te zoomen'
          : 'Klik op een thema of een hoorn · sleep om te draaien · scroll om te zoomen',
      )
    },

    showTheme(i) {
      const theme = themes[i]
      const choices = theme.stories
        .map(
          (story, n) =>
            `<li><button type="button" class="choice" data-action="select" data-index="${n}">` +
            `<span class="num">${n + 1}</span><span class="label">${escape(story.perspective)}` +
            `${story.name ? `<span class="sub">${escape(story.name)}</span>` : ''}</span></button></li>`,
        )
        .join('')
      render(
        kicker(i) +
          `<h1>${escape(theme.name)}</h1>` +
          `<div class="more"><p>${escape(theme.text)}</p></div>` +
          `<p class="label-small">Kies een perspectief</p><ul class="choices">${choices}</ul>` +
          `<div class="actions">${hangUpButton}</div>`,
      )
    },

    showStory(i, n) {
      const stories = themes[i].stories
      const story = stories[n]
      const switches = stories
        .map(
          (s, m) =>
            `<button type="button" class="segment${m === n ? ' segment--current' : ''}" data-action="select" ` +
            `data-index="${m}" aria-label="Perspectief ${m + 1}: ${escape(s.perspective)}"` +
            `${m === n ? ' aria-current="true"' : ''}>${m + 1}</button>`,
        )
        .join('')
      render(
        kicker(i, true) +
          `<div class="speaker">${avatar(story)}<div>` +
          `<p class="perspective">${escape(story.perspective)}</p>` +
          `<p class="name">${escape(story.name ?? 'Naam volgt')}</p>` +
          `<p class="role">${escape(speakerLine(story) || 'Functie en organisatie volgen')}</p>` +
          `</div></div>` +
          `<div class="progress" role="progressbar" aria-label="Voortgang verhaal"><span></span></div>` +
          `<div class="actions"><div class="segmented" role="group" aria-label="Perspectief">${switches}</div>` +
          `${hangUpButton}</div>`,
      )
    },

    // Fraction 0–1 of the current story.
    setProgress(fraction) {
      if (progressBar) progressBar.style.width = `${Math.min(1, fraction) * 100}%`
    },

    // A short message in place of the hint line.
    flash(message) {
      const hint = element.querySelector('#hud-hint')
      if (!hint) return
      const previous = hint.textContent
      hint.textContent = message
      hint.classList.add('hint--flash')
      clearTimeout(flashTimer)
      flashTimer = setTimeout(() => {
        hint.textContent = previous
        hint.classList.remove('hint--flash')
      }, 2000)
    },
  }
}
