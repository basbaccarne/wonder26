// All copy for the twin: the overarching question, one theme per phone and
// one perspective (speaker) per button. Edit freely; the wall and the info
// card are rendered from this file.
//
// Speaker photos: drop a square image in src/assets/speakers/ and set `photo` to its
// file name (e.g. 'tom-de-deyn.jpg'). Without a photo, initials are shown.

// What the installation is about: computational design.
export const about = {
  kicker: 'Computationeel ontwerpen verandert Design Engineering',
  tagline: 'De ingenieurontwerper als regisseur van een oneindige wereld aan ontwerpopties.',
  paragraphs: [
    'Computationeel ontwerpen combineert menselijke creativiteit met de kracht van algoritmes. ' +
      'In plaats van één ontwerp te maken, definieert de ontwerper een slimme set regels waarna de ' +
      'computer duizenden mogelijke oplossingen genereert en optimaliseert.',
    'Ontdek hoe deze revolutionaire aanpak leidt tot performantere producten, minder materiaalverbruik ' +
      'en ontwerpen op maat die perfect aansluiten bij de nieuwste digitale productietechnieken zoals 3D-printing.',
    'Een blik op de toekomst van design, engineering en maakindustrie.',
  ],
}

// The question the installation asks, and how to answer it: the phones.
export const intro = {
  title: 'Are we ready?',
  text:
    'Niemand weet hoe de toekomst eruit zal zien. Van student, tot onderzoeker, tot ondernemer. ' +
    'Elk heeft een unieke blik op de uitdagingen waar we voor staan, maar ook op de opportuniteiten.',
  cta: 'Luister naar drie perspectieven via de telefoons hieronder.',
}

// Index = phone id (audio_files/phone_0 … phone_2).
// stories[i] plays audio_files/phone_{id}/button_{i + 1}.wav.
export const themes = [
  {
    name: 'Skills',
    text:
      'De maakskills van vandaag zijn niet de maakskills van morgen. Nieuwe technologieën en ' +
      'computationele tools veranderen de manier waarop we ontwerpen, maken en problemen oplossen. ' +
      'Dat roept enkele cruciale vragen op.',
    question: 'Zijn we hier klaar voor?',
    questions: [
      'Zijn manuele skills nog belangrijk in een wereld van computationeel ontwerpen?',
      'Welke skills maken het verschil tussen een ontwerper en een algoritme?',
      'Hoe ziet het skillprofiel van de ontwerper van morgen eruit?',
    ],
    stories: [
      { perspective: 'Onderzoeker', name: 'Yannick Christiaens', role: 'Docent industrieel ontwerpen', org: 'UGent', photo: 'yannick.jpg' },
      { perspective: 'Student', name: 'Sid De Munck', role: 'Masterstudent industrieel ontwerpen', org: 'UGent', photo: 'sid.jpg' },
      { perspective: 'Ondernemer', name: 'Aline Ollevier', role: 'Founder en zaakvoerder', org: 'Nozzle', photo: 'aline.jpg' },
    ],
  },
  {
    name: 'Productie',
    text:
      'Productie is altijd in beweging. Nieuwe technologieën, tools en methodieken brengen steeds ' +
      'nieuwe mogelijkheden en uitdagingen met zich mee. Massapersonalisatie, betaalbare productie op ' +
      'kleine schaal, nieuwe mogelijkheden om voorheen moeilijk produceerbare vormen te creëren, …',
    question: 'Zijn we hier klaar voor?',
    questions: [
      'Hoe zal computationeel ontwerpen de wereld rond ons veranderen?',
      'Welke disruptieve veranderingen brengt computationeel ontwerpen voor de toekomstige designsector?',
      'Hoe verandert computationeel ontwerpen de manier waarop we nieuwe producten produceren?',
    ],
    stories: [
      { perspective: 'Onderzoeker', name: 'Davy Parmentier', role: 'Postdoctoraal onderzoeker industrieel ontwerpen', org: 'UGent', photo: 'davy.jpg' },
      { perspective: 'Student', name: 'Elias Verdegem', role: 'Masterstudent industrieel ontwerpen', org: 'UGent', photo: 'elias.jpg' },
      { perspective: 'Ondernemer', name: 'Hannes van der Burgt', role: 'Chief Operating Officer', org: 'Ziggzagg', photo: 'hannes.jpg' },
    ],
  },
  {
    name: 'Mens vs machine',
    text:
      'Computationeel ontwerpen verschuift de grenzen tussen menselijke creativiteit en technologische ' +
      'ondersteuning. Mens en algoritme in symbiose? Naarmate het computationele denken een grotere rol ' +
      'gaat spelen in het ontwerpproces, ontstaan nieuwe vragen over autonomie, samenwerking en controle.',
    question: 'Zijn we hier klaar voor?',
    questions: [
      'Veranderen de fundamenten van het ontwerpproces?',
      'Hoeveel autonomie mag een algoritme krijgen in een ontwerpproces?',
      'Hoe ziet de symbiose tussen ontwerper en technologie eruit?',
    ],
    stories: [
      { perspective: 'Onderzoeker', name: 'Yannick Christiaens', role: 'Docent industrieel ontwerpen', org: 'UGent', photo: 'yannick.jpg' },
      { perspective: 'Student', name: 'Tom De Deyn', role: 'Kersvers alumnus industrieel ontwerpen', org: 'UGent', photo: 'tom.jpg' },
      { perspective: 'Ondernemer', name: 'Aline Ollevier', role: 'Founder en zaakvoerder', org: 'Nozzle', photo: 'aline.jpg' },
    ],
  },
]

// Speaker photos bundled from src/assets/speakers/, looked up by file name.
const photos = import.meta.glob('./assets/speakers/*.{jpg,jpeg,png,webp}', { eager: true, query: '?url', import: 'default' })
export function photoUrl(story) {
  return story.photo ? photos[`./assets/speakers/${story.photo}`] ?? null : null
}
