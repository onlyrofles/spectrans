// Shared code for the public site (index.html) and the owner panel (admin.html).
// Prototype storage: owner changes live in localStorage of the current browser.
// For a real client this becomes a tiny API (e.g. Cloudflare Worker + D1).
(function () {
  'use strict';

  var KEY = 'spectrans.fleet.v2';     // full fleet list saved by the owner panel
  var OLD_KEY = 'spectrans.fleet.v1'; // older format: per-item overrides only

  var STATUS = {
    free: { label: 'Свободна' },
    busy: { label: 'В работе' },
    confirm: { label: 'Уточнить наличие' }
  };

  var CATEGORIES = [
    { id: 'road', name: 'Дорожно-строительная' },
    { id: 'lift', name: 'Краны, вышки, бурение' },
    { id: 'cargo', name: 'Грузовой транспорт' },
    { id: 'crew', name: 'Перевозка людей и быт' },
    { id: 'light', name: 'Лёгкий транспорт' }
  ];

  // Fleet from the company's own catalog (Tilda site + Instagram highlights).
  // price: tenge per month, null = "on request". minMonths: minimal rental term.
  var DEFAULTS = [
    { id: 'cat320', cat: 'road', name: 'Экскаватор гусеничный CAT 320', specs: ['Ковш 1,2 м³'] },
    { id: 't170', cat: 'road', name: 'Бульдозер ЧТЗ Б10М (Т-170)', specs: ['Рыхлитель', 'Отвал'] },
    { id: 'sem816', cat: 'road', name: 'Бульдозер SEM 816D', specs: ['Рыхлитель', 'Отвал'] },
    { id: 'sem655', cat: 'road', name: 'Фронтальный погрузчик SEM 655D', specs: ['Ковш 3 м³', 'Грузоподъёмность 5 т'] },
    { id: 'sem518', cat: 'road', name: 'Каток грунтовый SEM 518', specs: ['Масса 18 т'] },
    { id: 'sem919', cat: 'road', name: 'Автогрейдер SEM 919', specs: ['Планировка и профилирование'] },
    { id: 'dz98', cat: 'road', name: 'Автогрейдер тяжёлый ДЗ-98', specs: ['Колёсная формула 6×6'] },

    { id: 'crane-ivanovets-kamaz', cat: 'lift', name: 'Автокран «Ивановец» на базе КамАЗ', specs: ['25 т', 'Стрела 21 м', 'Вездеход'] },
    { id: 'crane-chelyabinets', cat: 'lift', name: 'Автокран «Челябинец» на базе Урал', specs: ['25 т', 'Стрела 21 м', 'Вездеход'] },
    { id: 'crane-ulyanovets', cat: 'lift', name: 'Автокран «Ульяновец» на базе Урал', specs: ['25 т', 'Стрела 21 м', 'Вездеход'] },
    { id: 'crane-ivanovets-ural', cat: 'lift', name: 'Автокран «Ивановец» на базе Урал', specs: ['16 т', 'Стрела 18 м', 'Вездеход'] },
    { id: 'agp28', cat: 'lift', name: 'Автовышка АГП-28 на базе КамАЗ', specs: ['Высота 28 м', 'Вездеход'] },
    { id: 'yamobur', cat: 'lift', name: 'Ямобур на базе Урал', specs: ['Бурение до 5 м', 'Буры 200–800 мм', '4×4'] },

    { id: 'ural-platform', cat: 'cargo', name: 'Урал тягач с полуприцепом-площадкой', specs: ['Площадка 12 м', 'Вездеход'] },
    { id: 'ural-manip-trailer', cat: 'cargo', name: 'Урал тягач с манипулятором и полуприцепом', specs: ['Площадка 12 м', 'Вездеход'] },
    { id: 'kamaz-platform', cat: 'cargo', name: 'КамАЗ тягач с полуприцепом-площадкой', specs: ['Площадка 12 м', 'Вездеход'] },
    { id: 'kamaz-dump', cat: 'cargo', name: 'Самосвал КамАЗ', specs: ['Кузов 15 м³'] },
    { id: 'ural-manip3', cat: 'cargo', name: 'Урал бортовой с манипулятором 3 т', specs: ['КМУ 3 т', 'Вездеход'] },
    { id: 'ural-manip4', cat: 'cargo', name: 'Урал бортовой с манипулятором 4 т и прицепом', specs: ['КМУ 4 т', 'Прицеп 6 м', 'Вездеход'] },
    { id: 'ural-pipe', cat: 'cargo', name: 'Урал-трубоплетевоз', specs: ['Роспуск до 30 м', 'Вездеход'] },
    { id: 'ural-water', cat: 'cargo', name: 'Урал тягач с цистерной под техводу', specs: ['18 м³', 'Вездеход'], photo: null },
    { id: 'ural-fuel', cat: 'cargo', name: 'Урал топливозаправщик', specs: ['5 500 л', 'Насос и счётчик ГСМ', 'Вездеход'] },
    { id: 'tral25', cat: 'cargo', name: 'Трал 25 т с тягачом Урал', specs: ['Перевозка техники', 'Вездеход'] },
    { id: 'tral-kraz', cat: 'cargo', name: 'Трал 60 т с тягачом КрАЗ', specs: ['Перевозка техники', 'Вездеход'] },

    { id: 'ural-kung9', cat: 'crew', name: 'Урал кунг-вахтовка с кузовом', specs: ['9 мест', '4×4', 'Вездеход'] },
    { id: 'ural-bus', cat: 'crew', name: 'Урал вахтовый автобус', specs: ['28 мест', 'Вездеход'] },
    { id: 'ural-speckung', cat: 'crew', name: 'Урал спецкунг для проживания', specs: ['До 6 человек', 'Вездеход'] },
    { id: 'vagon', cat: 'crew', name: 'Вагончики жилые', specs: ['Проживание на объекте'] },

    { id: 'gazelle-next', cat: 'light', name: 'ГАЗель NEXT фермер, тент', specs: ['Кузов 5,2 м'] },
    { id: 'gazelle-business', cat: 'light', name: 'ГАЗель Бизнес цельнометаллическая', specs: ['Грузопассажирская'] },
    { id: 'sprinter', cat: 'light', name: 'Mercedes-Benz Sprinter с прицепом', specs: ['Фургон', 'Прицеп до 5 т'] }
  ].map(function (e) {
    return Object.assign({ photo: 'img/' + e.id + '.jpg', price: null, minMonths: 1, status: 'free' }, e);
  });

  // Escape text before putting it into HTML (names and specs are typed by the owner)
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // Only our own image files or uploaded images (data URLs) are allowed
  function cleanPhoto(p) {
    if (typeof p !== 'string') return null;
    if (/^img\/[\w.-]+\.(jpe?g|png|webp)$/i.test(p)) return p;
    if (/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(p) && p.length < 600000) return p;
    return null;
  }

  function cleanItem(x) {
    if (!x || typeof x !== 'object') return null;
    var id = typeof x.id === 'string' && /^[\w-]{1,40}$/.test(x.id) ? x.id : null;
    var name = typeof x.name === 'string' ? x.name.trim().slice(0, 90) : '';
    if (!id || !name) return null;
    return {
      id: id,
      cat: CATEGORIES.some(function (c) { return c.id === x.cat; }) ? x.cat : CATEGORIES[0].id,
      name: name,
      specs: (Array.isArray(x.specs) ? x.specs : []).filter(function (s) { return typeof s === 'string' && s.trim(); })
        .map(function (s) { return s.trim().slice(0, 40); }).slice(0, 6),
      photo: cleanPhoto(x.photo),
      price: x.price > 0 ? Math.round(x.price) : null,
      minMonths: x.minMonths >= 1 && x.minMonths <= 24 ? Math.round(x.minMonths) : 1,
      status: STATUS[x.status] ? x.status : 'free'
    };
  }

  // Defaults with the older per-item overrides (price, term, status) applied
  function fromOldFormat() {
    var o;
    try { o = JSON.parse(localStorage.getItem(OLD_KEY)) || {}; } catch (e) { o = {}; }
    return DEFAULTS.map(function (d) {
      var e = Object.assign({}, d, { specs: d.specs.slice() }), x = o[d.id] || {};
      if (x.price > 0) e.price = Math.round(x.price);
      if (x.minMonths >= 1 && x.minMonths <= 24) e.minMonths = Math.round(x.minMonths);
      if (STATUS[x.status]) e.status = x.status;
      return e;
    });
  }

  function load() {
    var raw = null;
    try { raw = JSON.parse(localStorage.getItem(KEY)); } catch (e) { /* broken data: use defaults */ }
    if (!raw || !Array.isArray(raw.items)) return fromOldFormat();
    var seen = {};
    return raw.items.map(cleanItem).filter(function (e) {
      if (!e || seen[e.id]) return false;
      seen[e.id] = true;
      return true;
    });
  }

  // Returns false when the browser storage is full (e.g. too many uploaded photos)
  function save(list) {
    try { localStorage.setItem(KEY, JSON.stringify({ items: list })); return true; } catch (e) { return false; }
  }

  function reset() {
    try { localStorage.removeItem(KEY); localStorage.removeItem(OLD_KEY); } catch (e) { /* storage unavailable */ }
  }

  function newId() {
    return 'u' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  // Fires when the other page (site or panel in another tab) changes the data
  function onChange(cb) {
    window.addEventListener('storage', function (ev) {
      if (ev.key === KEY || ev.key === OLD_KEY || ev.key === null) cb();
    });
  }

  function money(n) { return Math.round(n).toLocaleString('ru-RU') + ' ₸'; }

  function plural(n, one, few, many) {
    var m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
    return many;
  }

  function months(n) { return n + ' ' + plural(n, 'месяц', 'месяца', 'месяцев'); }

  function category(id) {
    return CATEGORIES.filter(function (c) { return c.id === id; })[0] || { id: id, name: id };
  }

  // Line icons (Lucide-style), inserted into <i data-icon="name"></i>
  var ICONS = {
    truck: '<path d="M10 17h4V5H2v12h3"/><path d="M20 17h2v-3.3a4 4 0 0 0-1.2-2.9L19 9h-5v8h1"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>',
    pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    checkCircle: '<path d="M22 11.1V12a10 10 0 1 1-5.9-9.1"/><path d="M22 4 12 14l-3-3"/>',
    arrowDown: '<path d="M12 5v14M19 12l-7 7-7-7"/>',
    arrowRight: '<path d="M5 12h14M12 5l7 7-7 7"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    close: '<path d="M18 6 6 18M6 6l12 12"/>',
    calc: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 6h8M16 14v4M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M8 18h.01M12 18h.01"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
    chat: '<path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z"/>',
    garage: '<path d="M3 21V8l9-5 9 5v13"/><path d="M7 21v-9h10v9M7 15h10M7 18h10"/>',
    hardhat: '<path d="M2 18a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1Z"/><path d="M10 10V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5M4 15v-3a6 6 0 0 1 6-6M14 6a6 6 0 0 1 6 6v3"/>',
    wrench: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.8-3.8a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9l-3.8 3.8Z"/>',
    doc: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M16 13H8M16 17H8"/>',
    lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    reset: '<path d="M3 12a9 9 0 1 0 9-9 9.7 9.7 0 0 0-6.7 2.7L3 8"/><path d="M3 3v5h5"/>',
    external: '<path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
    user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    building: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01"/>',
    message: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z"/>',
    camera: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3Z"/><circle cx="12" cy="13" r="3"/>',
    instagram: '<rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17.5 6.5h.01"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
    pencil: '<path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/>',
    trash: '<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>',
    moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M6.3 17.7l-1.4 1.4M19.1 4.9l-1.4 1.4"/>'
  };

  function icon(name, extraClass) {
    return '<svg class="ico' + (extraClass ? ' ' + extraClass : '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[name] || '') + '</svg>';
  }

  function hydrateIcons(root) {
    (root || document).querySelectorAll('i[data-icon]').forEach(function (el) {
      el.outerHTML = icon(el.getAttribute('data-icon'), el.className);
    });
  }

  // Photo or a neutral placeholder when the company has no photo yet
  function photoHtml(e, cls) {
    return e.photo
      ? '<img class="' + cls + '" src="' + esc(e.photo) + '" alt="' + esc(e.name) + '" loading="lazy">'
      : '<span class="' + cls + ' no-photo">' + icon('camera') + '<small>Фото скоро</small></span>';
  }

  // ---------- Light / dark theme ----------
  // The initial theme is set by a tiny inline script in <head> (no flash).
  var THEME_KEY = 'spectrans.theme';
  var media = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

  function savedTheme() {
    try {
      var t = localStorage.getItem(THEME_KEY);
      return t === 'light' || t === 'dark' ? t : null;
    } catch (e) { return null; }
  }

  function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    document.querySelectorAll('[data-theme-toggle]').forEach(function (b) {
      b.setAttribute('aria-label', t === 'dark' ? 'Включить светлую тему' : 'Включить тёмную тему');
      b.title = b.getAttribute('aria-label');
    });
  }

  function initTheme() {
    applyTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light');
    document.addEventListener('click', function (ev) {
      if (!ev.target.closest('[data-theme-toggle]')) return;
      var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      try { localStorage.setItem(THEME_KEY, next); } catch (e) { /* storage unavailable */ }
    });
    // Follow the system setting until the visitor picks a theme by hand
    if (media && media.addEventListener) {
      media.addEventListener('change', function (ev) {
        if (!savedTheme()) applyTheme(ev.matches ? 'dark' : 'light');
      });
    }
    // Keep the site and the owner panel in sync across tabs
    window.addEventListener('storage', function (ev) {
      if (ev.key === THEME_KEY && savedTheme()) applyTheme(savedTheme());
    });
  }

  initTheme();

  window.Fleet = {
    STATUS: STATUS, CATEGORIES: CATEGORIES, load: load, save: save, reset: reset, onChange: onChange,
    cleanItem: cleanItem, newId: newId, esc: esc,
    money: money, plural: plural, months: months, category: category,
    icon: icon, hydrateIcons: hydrateIcons, photoHtml: photoHtml
  };
})();
