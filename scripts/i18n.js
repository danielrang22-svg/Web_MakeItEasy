/* ============================================================
   MAKE IT EASY — i18n Engine
   scripts/i18n.js
   ============================================================ */

const LOCALES = {
  'es-CO': { label: 'Colombia', flag: '🇨🇴', currency: 'COP' },
  'en-US': { label: 'US',       flag: '🇺🇸', currency: 'USD' },
  'en-EU': { label: 'Europe',   flag: '🇪🇺', currency: 'EUR' },
};

/* Service pricing matrix per locale */
const SERVICE_PRICES = {
  'es-CO': {
    s1: '$300.000',
    s2: '$500.000',
    s3: '$800.000',
    s4: '$600.000',
    s5: '$500.000',
    s6: '$700.000',
    s7: '$400.000',
    s8: '$1.000.000',
    s9: '$700.000',
    currency_name: 'pesos colombianos (COP)',
  },
  'en-US': {
    s1: '$70',
    s2: '$115',
    s3: '$185',
    s4: '$140',
    s5: '$115',
    s6: '$160',
    s7: '$90',
    s8: '$240',
    s9: '$165',
    currency_name: 'US dollars (USD)',
  },
  'en-EU': {
    s1: '€65',
    s2: '€105',
    s3: '€170',
    s4: '€130',
    s5: '€105',
    s6: '€150',
    s7: '€85',
    s8: '€220',
    s9: '€155',
    currency_name: 'euros (EUR)',
  },
};

/* Keep PRICES for backwards compat */
const PRICES = SERVICE_PRICES;

let currentLocale = 'es-CO';
let translations  = {};

/* ----------- Load translation ----------- */
async function loadLocale(locale) {
  try {
    const res = await fetch(`./i18n/${locale}.json`);
    if (!res.ok) throw new Error(`Could not load ${locale}`);
    translations = await res.json();
    currentLocale = locale;
    localStorage.setItem('mie_locale', locale);
    applyTranslations();
    applyPrices();
    updateHtmlLang();
    updateLangSwitcherUI();
    updateHreflang();
    // Dispatch event so other modules can react
    document.dispatchEvent(new CustomEvent('localeChanged', { detail: { locale } }));
  } catch (err) {
    console.error('[i18n]', err);
  }
}

/* ----------- Detect initial locale ----------- */
function detectLocale() {
  // 1. localStorage
  const stored = localStorage.getItem('mie_locale');
  if (stored && LOCALES[stored]) return stored;

  // 2. browser language
  const lang = navigator.language || navigator.userLanguage || 'es-CO';
  if (lang.startsWith('es')) return 'es-CO';
  if (lang.startsWith('en')) {
    // rough Europe detection by timezone
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const euTZ = ['Europe/', 'Atlantic/Azores', 'Atlantic/Canary'];
      if (euTZ.some(z => tz.startsWith(z))) return 'en-EU';
    } catch {}
    return 'en-US';
  }
  return 'es-CO';
}

/* ----------- Apply all translations ----------- */
function applyTranslations() {
  const t = translations;

  // Walk every element with data-i18n
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    const val = getNestedValue(t, key);
    if (val !== undefined) {
      if (el.dataset.i18nAttr) {
        el.setAttribute(el.dataset.i18nAttr, val);
      } else {
        el.textContent = val;
      }
    }
  });

  // Elements with data-i18n-html (allow inner HTML)
  document.querySelectorAll('[data-i18n-html]').forEach(el => {
    const key = el.dataset.i18nHtml;
    const val = getNestedValue(t, key);
    if (val !== undefined) el.innerHTML = val;
  });

  // Placeholders
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.dataset.i18nPlaceholder;
    const val = getNestedValue(t, key);
    if (val !== undefined) el.placeholder = val;
  });

  // Select options with data-i18n-options
  document.querySelectorAll('[data-i18n-options]').forEach(sel => {
    const key = sel.dataset.i18nOptions;
    const opts = getNestedValue(t, key);
    if (Array.isArray(opts)) {
      const current = sel.value;
      sel.innerHTML = opts.map((o, i) => `<option value="${o}">${o}</option>`).join('');
      if (current) sel.value = current;
    }
  });

  // Currency substitution in text {currency}
  const priceData = PRICES[currentLocale];
  document.querySelectorAll('[data-i18n]').forEach(el => {
    if (el.textContent.includes('{currency}')) {
      el.textContent = el.textContent.replace('{currency}', priceData.currency_name);
    }
  });
}

/* ----------- Apply pricing ----------- */
function applyPrices() {
  const p = SERVICE_PRICES[currentLocale];
  const fromLabel = translations.services_pricing?.from || 'Desde';

  // Update each service card price
  for (let i = 1; i <= 9; i++) {
    const el = document.getElementById(`sp-price-${i}`);
    if (el) el.innerHTML = `<span class="sp-from">${fromLabel}</span> <strong>${p['s'+i]}</strong>`;
  }

  // Currency badge
  document.querySelectorAll('.currency-badge').forEach(el => {
    el.textContent = LOCALES[currentLocale].currency;
  });

  // Replace {currency} in sub text
  const priceData = SERVICE_PRICES[currentLocale];
  document.querySelectorAll('[data-i18n]').forEach(el => {
    if (el.textContent.includes('{currency}')) {
      el.textContent = el.textContent.replace('{currency}', priceData.currency_name);
    }
  });
}

/* ----------- HTML lang attribute ----------- */
function updateHtmlLang() {
  const langMap = { 'es-CO': 'es-CO', 'en-US': 'en-US', 'en-EU': 'en-GB' };
  document.documentElement.lang = langMap[currentLocale] || 'es';
}

/* ----------- hreflang links ----------- */
function updateHreflang() {
  // Remove existing
  document.querySelectorAll('link[rel="alternate"][hreflang]').forEach(l => l.remove());
  const base = window.location.origin + window.location.pathname;
  const map = { 'es-CO': 'es-CO', 'en-US': 'en-US', 'en-EU': 'en-GB' };
  Object.keys(LOCALES).forEach(loc => {
    const link = document.createElement('link');
    link.rel = 'alternate';
    link.hreflang = map[loc];
    link.href = `${base}?lang=${loc}`;
    document.head.appendChild(link);
  });
}

/* ----------- Switcher UI update ----------- */
function updateLangSwitcherUI() {
  const btn = document.getElementById('lang-btn');
  if (!btn) return;
  const info = LOCALES[currentLocale];
  btn.innerHTML = `<span>${info.flag}</span><span>${info.label}</span><span class="material-symbols-outlined" style="font-size:1rem">expand_more</span>`;
}

/* ----------- Build lang switcher dropdown ----------- */
function buildLangSwitcher() {
  const container = document.getElementById('lang-switcher');
  if (!container) return;

  const btn = document.createElement('button');
  btn.id = 'lang-btn';
  btn.className = 'lang-btn';
  btn.setAttribute('aria-haspopup', 'listbox');
  btn.setAttribute('aria-expanded', 'false');

  const dropdown = document.createElement('ul');
  dropdown.id = 'lang-dropdown';
  dropdown.className = 'lang-dropdown';
  dropdown.setAttribute('role', 'listbox');
  dropdown.setAttribute('aria-label', 'Select language');

  Object.keys(LOCALES).forEach(loc => {
    const info = LOCALES[loc];
    const li = document.createElement('li');
    li.setAttribute('role', 'option');
    li.setAttribute('data-locale', loc);
    li.innerHTML = `<span>${info.flag}</span><span>${info.label}</span>`;
    li.addEventListener('click', () => {
      loadLocale(loc);
      closeDropdown();
    });
    dropdown.appendChild(li);
  });

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = btn.getAttribute('aria-expanded') === 'true';
    btn.setAttribute('aria-expanded', String(!open));
    dropdown.classList.toggle('open', !open);
  });

  document.addEventListener('click', closeDropdown);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeDropdown();
  });

  function closeDropdown() {
    btn.setAttribute('aria-expanded', 'false');
    dropdown.classList.remove('open');
  }

  container.appendChild(btn);
  container.appendChild(dropdown);
  updateLangSwitcherUI();
}

/* ----------- Utility: nested key access ----------- */
function getNestedValue(obj, path) {
  return path.split('.').reduce((acc, key) => {
    return acc && acc[key] !== undefined ? acc[key] : undefined;
  }, obj);
}

/* ----------- Public API ----------- */
window.MIE_i18n = {
  load: loadLocale,
  current: () => currentLocale,
  t: (key) => getNestedValue(translations, key),
  locales: LOCALES,
  prices: PRICES,
};

/* ----------- Init ----------- */
export async function initI18n() {
  buildLangSwitcher();
  const searchLang = new URLSearchParams(location.search).get('lang');
  const locale = (searchLang && LOCALES[searchLang]) ? searchLang : detectLocale();
  await loadLocale(locale);
}
