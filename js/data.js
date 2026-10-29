'use strict';

/* ============================================================
   MULTIVERSO DE MISIONES — datos y constantes
   ============================================================ */

const STORAGE_KEY = 'multiverso-misiones-v2';

const REALMS = {
  db: {
    name: 'Dragon Ball',
    emoji: '🐉',
    color: '#ff9f1c',
    colors: ['#ffd166', '#ff9f1c'],
    fx: ['#ffd166', '#ff9f1c', '#ff5e1a', '#fff3c4']
  },
  ch: {
    name: 'Campeones',
    emoji: '⚽',
    color: '#19d38b',
    colors: ['#7cf5c4', '#19d38b'],
    fx: ['#7cf5c4', '#19d38b', '#0ea5e9', '#ffffff']
  },
  hp: {
    name: 'Harry Potter',
    emoji: '🪄',
    color: '#a78bfa',
    colors: ['#c4b5fd', '#8b5cf6'],
    fx: ['#c4b5fd', '#a78bfa', '#fbbf24', '#ffffff']
  }
};

const KID_META = {
  enrique: { accent: ['#ffb020', '#ff5e3a'] },
  eduardo: { accent: ['#2dd4bf', '#3b82f6'] }
};

const LEVELS = [
  { xp: 0, name: 'Aprendiz del Multiverso' },
  { xp: 80, name: 'Explorador' },
  { xp: 200, name: 'Guerrero' },
  { xp: 380, name: 'Héroe' },
  { xp: 600, name: 'Campeón' },
  { xp: 900, name: 'Leyenda' },
  { xp: 1300, name: 'Guardián' },
  { xp: 1800, name: 'Maestro' },
  { xp: 2400, name: 'Gran Maestro' },
  { xp: 3200, name: 'Elegido del Multiverso' }
];

const BADGES = [
  { id: 'first', icon: '🌟', name: 'Primer paso', desc: 'Completa tu primera misión', check: k => k.stats.total >= 1 },
  { id: 'ten', icon: '⚡', name: 'Aprendiz', desc: 'Completa 10 misiones', check: k => k.stats.total >= 10 },
  { id: 'fifty', icon: '🛡️', name: 'Veterano', desc: 'Completa 50 misiones', check: k => k.stats.total >= 50 },
  { id: 'perfect', icon: '🏆', name: 'Día perfecto', desc: 'Completa todas las misiones de un día', check: k => k.stats.perfectDays >= 1 },
  { id: 'streak3', icon: '🔥', name: 'En racha', desc: '3 días seguidos con misiones', check: k => k.bestStreak >= 3 },
  { id: 'streak7', icon: '🚀', name: 'Imparable', desc: '7 días seguidos con misiones', check: k => k.bestStreak >= 7 },
  { id: 'challenge5', icon: '🎯', name: 'Retador', desc: 'Completa 5 retos de la ruleta', check: k => k.stats.challenges >= 5 },
  { id: 'coins500', icon: '💎', name: 'Coleccionista', desc: 'Gana 500 puntos en total', check: k => k.stats.coinsEarned >= 500 },
  { id: 'redeem1', icon: '🎁', name: 'Primer canje', desc: 'Canjea tu primer premio', check: k => k.stats.rewardsRedeemed >= 1 },
  { id: 'level5', icon: '👑', name: 'Campeón', desc: 'Alcanza el nivel 5', check: k => levelInfo(k.xp).level >= 5 },
  { id: 'level10', icon: '🌀', name: 'Elegido', desc: 'Alcanza el nivel 10', check: k => levelInfo(k.xp).level >= 10 }
];

const TABS = [
  { id: 'missions', icon: '🎯', label: 'Misiones' },
  { id: 'wheel', icon: '🎡', label: 'Ruleta' },
  { id: 'rewards', icon: '🎁', label: 'Premios' },
  { id: 'progress', icon: '🏅', label: 'Logros' }
];

const WEEK_LABELS = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

const DEFAULT_TASKS = [
  { id: 'en-01', kid: 'enrique', title: 'Levantarme a la primera', icon: '⏰', realm: 'db', points: 5 },
  { id: 'en-02', kid: 'enrique', title: 'Desayunar sin pantallas', icon: '🥐', realm: 'ch', points: 5 },
  { id: 'en-03', kid: 'enrique', title: 'Cepillarme los dientes', icon: '🦷', realm: 'hp', points: 5 },
  { id: 'en-04', kid: 'enrique', title: 'Hacer la cama', icon: '🛏️', realm: 'hp', points: 10 },
  { id: 'en-05', kid: 'enrique', title: 'Deberes al día', icon: '📚', realm: 'hp', points: 20 },
  { id: 'en-06', kid: 'enrique', title: 'Leer 20 minutos', icon: '📖', realm: 'hp', points: 15 },
  { id: 'en-07', kid: 'enrique', title: 'Entrenar 15 minutos', icon: '🥋', realm: 'db', points: 15 },
  { id: 'en-08', kid: 'enrique', title: 'Recoger mi habitación', icon: '🧸', realm: 'ch', points: 10 },
  { id: 'en-09', kid: 'enrique', title: 'Ayudar en casa', icon: '🧹', realm: 'ch', points: 10 },
  { id: 'en-10', kid: 'enrique', title: 'Preparar la mochila', icon: '🎒', realm: 'hp', points: 10 },
  { id: 'en-11', kid: 'enrique', title: 'Dormir a mi hora', icon: '🌙', realm: 'db', points: 5 },
  { id: 'ed-01', kid: 'eduardo', title: 'Levantarme a la primera', icon: '⏰', realm: 'db', points: 5 },
  { id: 'ed-02', kid: 'eduardo', title: 'Desayunar sin pantallas', icon: '🥐', realm: 'ch', points: 5 },
  { id: 'ed-03', kid: 'eduardo', title: 'Cepillarme los dientes', icon: '🦷', realm: 'hp', points: 5 },
  { id: 'ed-04', kid: 'eduardo', title: 'Hacer la cama', icon: '🛏️', realm: 'hp', points: 10 },
  { id: 'ed-05', kid: 'eduardo', title: 'Deberes al día', icon: '📚', realm: 'hp', points: 20 },
  { id: 'ed-06', kid: 'eduardo', title: 'Leer 10 minutos', icon: '📖', realm: 'hp', points: 15 },
  { id: 'ed-07', kid: 'eduardo', title: 'Entrenar 15 minutos', icon: '🥋', realm: 'db', points: 15 },
  { id: 'ed-08', kid: 'eduardo', title: 'Recoger los juguetes', icon: '🧸', realm: 'ch', points: 10 },
  { id: 'ed-09', kid: 'eduardo', title: 'Ayudar en casa', icon: '🧹', realm: 'ch', points: 10 },
  { id: 'ed-10', kid: 'eduardo', title: 'Dormir a mi hora', icon: '🌙', realm: 'db', points: 5 }
].map(t => ({ ...t, days: [0, 1, 2, 3, 4, 5, 6], doneDate: null }));

const DEFAULT_REWARDS = [
  { id: 'rw-01', icon: '🍰', title: 'Postre sorpresa', cost: 60 },
  { id: 'rw-02', icon: '🍦', title: 'Helado', cost: 80 },
  { id: 'rw-03', icon: '🍕', title: 'Elegir la cena', cost: 100 },
  { id: 'rw-04', icon: '🎬', title: 'Elegir la película', cost: 120 },
  { id: 'rw-05', icon: '📱', title: '30 min extra de pantalla', cost: 150 },
  { id: 'rw-06', icon: '🎲', title: 'Noche de juegos de mesa', cost: 150 },
  { id: 'rw-07', icon: '⛺', title: 'Acampada en el salón', cost: 200 },
  { id: 'rw-08', icon: '🚲', title: 'Excursión en bici', cost: 250 },
  { id: 'rw-09', icon: '🧸', title: 'Juguete pequeño', cost: 300 },
  { id: 'rw-10', icon: '🎢', title: 'Parque de atracciones', cost: 400 }
];

const CHALLENGES = {
  db: [
    { icon: '🦵', text: 'Haz 10 sentadillas como un guerrero saiyan', points: 10 },
    { icon: '💪', text: 'Aguanta 30 segundos en plancha', points: 15 },
    { icon: '🦶', text: 'Salta 20 veces a la pata coja', points: 10 },
    { icon: '🔥', text: 'Imita tu ataque más fuerte y grita su nombre', points: 5 },
    { icon: '🌀', text: 'Respira hondo 5 veces para concentrar tu ki', points: 5 },
    { icon: '🤝', text: 'Ayuda a tu hermano en algo sin que te lo pidan', points: 15 },
    { icon: '🧸', text: 'Recoge 10 juguetes en menos de 1 minuto', points: 15 },
    { icon: '💧', text: 'Bébete un vaso de agua', points: 5 },
    { icon: '💥', text: 'Haz 5 flexiones (o con las rodillas apoyadas)', points: 10 },
    { icon: '🏃', text: 'Carrera de 1 minuto por el pasillo', points: 10 }
  ],
  ch: [
    { icon: '⚽', text: 'Haz 20 toques de balón sin que caiga', points: 15 },
    { icon: '🥅', text: 'Marca 5 goles en una portería pequeña', points: 10 },
    { icon: '🦶', text: 'Da 10 pases con alguien de la familia', points: 10 },
    { icon: '🤸', text: 'Estira como antes de un partido', points: 10 },
    { icon: '✨', text: 'Inventa un truco nuevo con el balón', points: 15 },
    { icon: '🛋️', text: 'Haz un túnel a un cojín', points: 5 },
    { icon: '🏃', text: 'Corre 2 minutos sin parar', points: 10 },
    { icon: '🍽️', text: 'Pon la mesa como un campeón', points: 10 },
    { icon: '🎤', text: 'Canta el himno de tu equipo favorito', points: 5 },
    { icon: '👟', text: 'Ordena tus zapatillas y las de casa', points: 10 }
  ],
  hp: [
    { icon: '🔤', text: 'Aprende 3 palabras nuevas en inglés', points: 15 },
    { icon: '📖', text: 'Lee 5 páginas de un libro', points: 15 },
    { icon: '🪄', text: 'Escribe tu hechizo favorito en un papel', points: 5 },
    { icon: '🧹', text: 'Ordena tu escritorio con magia', points: 10 },
    { icon: '🔴', text: 'Encuentra un objeto rojo en 30 segundos', points: 5 },
    { icon: '🏰', text: 'Dibuja tu casa de Hogwarts', points: 15 },
    { icon: '🧪', text: 'Prepara una poción (un batido)', points: 15 },
    { icon: '🔢', text: 'Recita los números del 1 al 20 en inglés', points: 10 },
    { icon: '🤫', text: 'Haz una buena acción secreta', points: 20 },
    { icon: '🧩', text: 'Resuelve un acertijo de mago', points: 10 }
  ]
};

const TASK_EMOJIS = [
  '⚡', '📚', '🦷', '🛏️', '🧸', '🥋', '🧹', '🌙', '🍎', '💧', '🏃', '⚽',
  '🪄', '📖', '🎨', '🎹', '🧺', '🐶', '🎯', '🏆', '🧠', '🎒', '🧴', '🍽️',
  '🚿', '👟', '🧘', '🌱'
];

const REWARD_EMOJIS = [
  '🍦', '🍰', '🎬', '📱', '🎢', '🍕', '🧸', '⛺', '🚲', '🎲', '🎮', '🏊',
  '🍿', '🎳', '🧩', '🎨', '⚽', '🥾', '🍔', '🎁'
];

/* ---------------- Avatares (SVG originales, estilo fan) ---------------- */

const AVATARS = {
  saiyan: `
  <svg viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Guerrero saiyan">
    <defs>
      <radialGradient id="avSbg" cx="50%" cy="32%" r="82%">
        <stop offset="0" stop-color="#43284e"/><stop offset="1" stop-color="#160f26"/>
      </radialGradient>
      <linearGradient id="avSgi" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#ff9b2f"/><stop offset="1" stop-color="#e85d04"/>
      </linearGradient>
    </defs>
    <rect width="128" height="128" fill="url(#avSbg)"/>
    <circle cx="64" cy="64" r="57" fill="none" stroke="#ffb020" stroke-width="2" opacity=".32"/>
    <path d="M64 12 L68 24 L78 16 L79 31 L92 24 L89 38 L102 35 L94 48 L104 52 L92 60 L100 70 L86 72 L88 86 L74 80 L68 92 L58 82 L48 90 L46 76 L34 80 L38 66 L26 62 L36 52 L28 42 L42 42 L42 28 L54 34 Z" fill="#ff9f1c" opacity=".14"/>
    <path d="M14 128 C16 104 34 92 64 92 C94 92 112 104 114 128 Z" fill="url(#avSgi)"/>
    <path d="M46 96 L64 116 L82 96 L74 91 L54 91 Z" fill="#1d4ed8"/>
    <rect x="54" y="78" width="20" height="19" rx="8" fill="#e8a97a"/>
    <ellipse cx="64" cy="58" rx="26" ry="29" fill="#f8c99b"/>
    <ellipse cx="38" cy="60" rx="5" ry="7" fill="#f0b384"/>
    <ellipse cx="90" cy="60" rx="5" ry="7" fill="#f0b384"/>
    <path d="M35 58 C32 38 42 24 52 25 C52 14 64 11 68 20 C74 10 86 15 84 26 C94 23 99 36 94 50 C88 38 78 33 64 33 C50 33 40 39 35 58 Z" fill="#17121f"/>
    <path d="M40 30 L33 14 L50 23 Z" fill="#17121f"/>
    <path d="M62 23 L63 6 L74 22 Z" fill="#17121f"/>
    <path d="M86 29 L98 15 L92 34 Z" fill="#17121f"/>
    <path d="M47 50 L60 53" stroke="#1a1423" stroke-width="2.6" stroke-linecap="round"/>
    <path d="M81 50 L68 53" stroke="#1a1423" stroke-width="2.6" stroke-linecap="round"/>
    <ellipse cx="54" cy="59" rx="5" ry="6" fill="#fff"/>
    <ellipse cx="74" cy="59" rx="5" ry="6" fill="#fff"/>
    <circle cx="54" cy="59.5" r="2.8" fill="#1a1423"/>
    <circle cx="74" cy="59.5" r="2.8" fill="#1a1423"/>
    <circle cx="55" cy="58.5" r="1" fill="#fff"/>
    <circle cx="75" cy="58.5" r="1" fill="#fff"/>
    <path d="M64 62 L64 68" stroke="#d99a6a" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M57 73 Q64 79 71 73" stroke="#8c4a32" stroke-width="2.6" fill="none" stroke-linecap="round"/>
    <circle cx="47" cy="68" r="4" fill="#f2a37e" opacity=".45"/>
    <circle cx="81" cy="68" r="4" fill="#f2a37e" opacity=".45"/>
  </svg>`,

  striker: `
  <svg viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Capitán de fútbol">
    <defs>
      <radialGradient id="avCbg" cx="50%" cy="30%" r="82%">
        <stop offset="0" stop-color="#123d3a"/><stop offset="1" stop-color="#0c1b24"/>
      </radialGradient>
      <linearGradient id="avCsh" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#dce7fb"/>
      </linearGradient>
    </defs>
    <rect width="128" height="128" fill="url(#avCbg)"/>
    <circle cx="64" cy="64" r="57" fill="none" stroke="#19d38b" stroke-width="2" opacity=".32"/>
    <path d="M14 128 C16 104 34 92 64 92 C94 92 112 104 114 128 Z" fill="url(#avCsh)"/>
    <path d="M14 128 C16 108 30 97 44 94 L44 128 Z" fill="#c7d8f2" opacity=".7"/>
    <path d="M114 128 C112 108 98 97 84 94 L84 128 Z" fill="#c7d8f2" opacity=".7"/>
    <path d="M52 93 L64 108 L76 93 L70 91 L58 91 Z" fill="#1d4ed8"/>
    <rect x="46" y="112" width="7" height="16" fill="#1d4ed8" opacity=".85"/>
    <rect x="75" y="112" width="7" height="16" fill="#1d4ed8" opacity=".85"/>
    <text x="64" y="124" text-anchor="middle" font-size="16" font-weight="800" fill="#1d4ed8" font-family="system-ui, sans-serif">10</text>
    <rect x="55" y="78" width="18" height="18" rx="7" fill="#e8a97a"/>
    <ellipse cx="64" cy="57" rx="25" ry="28" fill="#f8c99b"/>
    <ellipse cx="39" cy="58" rx="5" ry="7" fill="#f0b384"/>
    <ellipse cx="89" cy="58" rx="5" ry="7" fill="#f0b384"/>
    <path d="M37 56 C34 34 46 24 56 27 C62 18 78 19 82 28 C94 27 97 42 92 54 C88 42 80 36 70 35 C70 43 67 45 64 44 C58 38 50 40 47 47 C44 50 41 53 37 56 Z" fill="#6b3e26"/>
    <path d="M64 32 C70 24 82 26 86 34 C78 30 70 31 64 32 Z" fill="#7f4a2d"/>
    <path d="M48 49 L59 51" stroke="#4a2a18" stroke-width="2.6" stroke-linecap="round"/>
    <path d="M80 49 L69 51" stroke="#4a2a18" stroke-width="2.6" stroke-linecap="round"/>
    <ellipse cx="54" cy="58" rx="5" ry="6" fill="#fff"/>
    <ellipse cx="74" cy="58" rx="5" ry="6" fill="#fff"/>
    <circle cx="54" cy="58" r="2.8" fill="#2b1a12"/>
    <circle cx="74" cy="58" r="2.8" fill="#2b1a12"/>
    <circle cx="55" cy="57" r="1" fill="#fff"/>
    <circle cx="75" cy="57" r="1" fill="#fff"/>
    <path d="M64 61 L64 67" stroke="#d99a6a" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M56 72 Q64 78 72 72" stroke="#8c4a32" stroke-width="2.6" fill="none" stroke-linecap="round"/>
    <circle cx="47" cy="67" r="4" fill="#f2a37e" opacity=".45"/>
    <circle cx="81" cy="67" r="4" fill="#f2a37e" opacity=".45"/>
  </svg>`,

  wizard: `
  <svg viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Mago">
    <defs>
      <radialGradient id="avWbg" cx="50%" cy="30%" r="82%">
        <stop offset="0" stop-color="#372552"/><stop offset="1" stop-color="#120d24"/>
      </radialGradient>
      <linearGradient id="avWrb" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#2c2050"/><stop offset="1" stop-color="#171129"/>
      </linearGradient>
    </defs>
    <rect width="128" height="128" fill="url(#avWbg)"/>
    <circle cx="64" cy="64" r="57" fill="none" stroke="#a78bfa" stroke-width="2" opacity=".32"/>
    <path d="M14 128 C16 102 34 90 64 90 C94 90 112 102 114 128 Z" fill="url(#avWrb)"/>
    <path d="M48 92 Q64 102 80 92 L80 99 Q64 109 48 99 Z" fill="#9f1d2c"/>
    <path d="M52 96 Q64 104 76 96" stroke="#f4c95d" stroke-width="3" fill="none"/>
    <rect x="55" y="76" width="18" height="18" rx="7" fill="#e8b48c"/>
    <ellipse cx="64" cy="56" rx="25" ry="28" fill="#f8cfae"/>
    <ellipse cx="39" cy="57" rx="5" ry="7" fill="#eeb185"/>
    <ellipse cx="89" cy="57" rx="5" ry="7" fill="#eeb185"/>
    <path d="M37 56 C31 36 42 22 54 25 C58 15 74 14 80 24 C93 22 99 37 92 55 C89 44 82 38 72 36 C72 44 66 47 63 43 C57 36 49 39 47 47 C45 51 41 54 37 56 Z" fill="#2e2016"/>
    <path d="M42 34 L37 22 L49 30 Z" fill="#2e2016"/>
    <path d="M88 34 L95 23 L83 29 Z" fill="#2e2016"/>
    <path d="M63 30 L58 37 L63 38 L59 45" stroke="#c86a5a" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="54" cy="59" r="8" fill="none" stroke="#1b1b24" stroke-width="2.6"/>
    <circle cx="74" cy="59" r="8" fill="none" stroke="#1b1b24" stroke-width="2.6"/>
    <path d="M62 59 L66 59" stroke="#1b1b24" stroke-width="2.6"/>
    <path d="M46 57 L39 54" stroke="#1b1b24" stroke-width="2.4" stroke-linecap="round"/>
    <path d="M82 57 L89 54" stroke="#1b1b24" stroke-width="2.4" stroke-linecap="round"/>
    <circle cx="54" cy="59" r="2.6" fill="#2b1a12"/>
    <circle cx="74" cy="59" r="2.6" fill="#2b1a12"/>
    <circle cx="55" cy="58" r=".9" fill="#fff"/>
    <circle cx="75" cy="58" r=".9" fill="#fff"/>
    <path d="M64 61 L64 67" stroke="#d99a6a" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M57 72 Q64 78 71 72" stroke="#8c4a32" stroke-width="2.6" fill="none" stroke-linecap="round"/>
    <path d="M94 118 L112 88" stroke="#6b3e26" stroke-width="4" stroke-linecap="round"/>
    <path d="M112 88 l4 -7" stroke="#f4c95d" stroke-width="3" stroke-linecap="round"/>
    <circle cx="117" cy="79" r="3" fill="#ffe28a"/>
    <path d="M117 72 v-4 M124 79 h4 M112 74 l-3 -3 M123 86 l3 3" stroke="#ffe28a" stroke-width="2" stroke-linecap="round"/>
  </svg>`
};

const AVATAR_NAMES = {
  saiyan: 'Guerrero',
  striker: 'Capitán',
  wizard: 'Mago'
};
