/* ============================================================
   MAKE IT EASY — Main Interaction Script
   scripts/main.js
   ============================================================ */

import { initI18n }      from './i18n.js';
import { initAnalytics } from './analytics.js';

/* ========================================================
   NAVBAR — Glassmorphism on scroll + Mobile hamburger
   ======================================================== */
function initNavbar() {
  const nav  = document.getElementById('navbar');
  const ham  = document.getElementById('hamburger');
  const menu = document.getElementById('mobile-menu');
  const overlay = document.getElementById('menu-overlay');

  // Scroll glass effect
  const onScroll = () => {
    if (window.scrollY > 80) {
      nav.classList.add('scrolled');
    } else {
      nav.classList.remove('scrolled');
    }
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Active link highlight
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-link');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        navLinks.forEach(l => l.classList.remove('active'));
        const active = document.querySelector(`.nav-link[href="#${entry.target.id}"]`);
        if (active) active.classList.add('active');
      }
    });
  }, { rootMargin: '-40% 0px -55% 0px' });

  sections.forEach(s => observer.observe(s));

  // Hamburger toggle
  let menuOpen = false;
  function toggleMenu(open) {
    menuOpen = open;
    ham.setAttribute('aria-expanded', String(open));
    menu.classList.toggle('open', open);
    overlay.classList.toggle('visible', open);
    document.body.style.overflow = open ? 'hidden' : '';
    ham.querySelector('.bar1').style.transform = open ? 'rotate(45deg) translate(5px, 5px)' : '';
    ham.querySelector('.bar2').style.opacity   = open ? '0' : '1';
    ham.querySelector('.bar3').style.transform = open ? 'rotate(-45deg) translate(5px, -5px)' : '';
  }

  ham?.addEventListener('click', () => toggleMenu(!menuOpen));
  overlay?.addEventListener('click', () => toggleMenu(false));
  menu?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => toggleMenu(false)));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && menuOpen) toggleMenu(false); });
}

/* ========================================================
   SCROLL REVEAL — IntersectionObserver for .reveal
   ======================================================== */
function initScrollReveal() {
  const els = document.querySelectorAll('.reveal');
  if (!els.length) return;

  const obs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  els.forEach(el => obs.observe(el));
}

/* ========================================================
   HERO — Particle system
   ======================================================== */
function initHeroParticles() {
  const canvas = document.getElementById('hero-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let W, H, particles = [];

  function resize() {
    W = canvas.width  = canvas.offsetWidth;
    H = canvas.height = canvas.offsetHeight;
  }
  resize();
  window.addEventListener('resize', resize, { passive: true });

  class Particle {
    constructor() { this.reset(); }
    reset() {
      this.x  = Math.random() * W;
      this.y  = Math.random() * H;
      this.r  = Math.random() * 1.5 + 0.5;
      this.vx = (Math.random() - 0.5) * 0.4;
      this.vy = (Math.random() - 0.5) * 0.4;
      this.alpha = Math.random() * 0.6 + 0.1;
      this.color = Math.random() > 0.6 ? '175,136,255' : '143,245,255';
    }
    update() {
      this.x += this.vx; this.y += this.vy;
      if (this.x < 0 || this.x > W || this.y < 0 || this.y > H) this.reset();
    }
    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${this.color},${this.alpha})`;
      ctx.fill();
    }
  }

  // Draw connection lines
  function drawLines() {
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 100) {
          ctx.beginPath();
          ctx.strokeStyle = `rgba(143,245,255,${0.08 * (1 - dist / 100)})`;
          ctx.lineWidth = 0.5;
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.stroke();
        }
      }
    }
  }

  const COUNT = Math.min(80, Math.floor(W * H / 8000));
  particles = Array.from({ length: COUNT }, () => new Particle());

  function loop() {
    ctx.clearRect(0, 0, W, H);
    particles.forEach(p => { p.update(); p.draw(); });
    drawLines();
    requestAnimationFrame(loop);
  }
  loop();
}

/* ========================================================
   SERVICES — Expand on click
   ======================================================== */
function initServiceCards() {
  document.querySelectorAll('.service-card').forEach(card => {
    card.addEventListener('click', () => {
      const expand = card.querySelector('.service-expand');
      if (!expand) return;
      const isOpen = expand.classList.contains('open');
      // Close all others
      document.querySelectorAll('.service-expand.open').forEach(e => {
        e.classList.remove('open');
        e.style.maxHeight = null;
      });
      if (!isOpen) {
        expand.classList.add('open');
        expand.style.maxHeight = expand.scrollHeight + 'px';
      }
    });
  });
}

/* ========================================================
   PROCESS — Step animation
   ======================================================== */
function initProcessTimeline() {
  const steps = document.querySelectorAll('.process-step');
  const obs = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        setTimeout(() => entry.target.classList.add('active'), i * 150);
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.3 });
  steps.forEach(s => obs.observe(s));
}

/* ========================================================
   PRICING — Plan selection + form pre-fill
   ======================================================== */
function initPricing() {
  document.querySelectorAll('.plan-cta').forEach(btn => {
    btn.addEventListener('click', () => {
      const plan = btn.dataset.plan;
      if (!plan) return;

      // Scroll to contact
      const contactSection = document.getElementById('contacto');
      if (contactSection) {
        contactSection.scrollIntoView({ behavior: 'smooth' });
        // Pre-fill plan select after scroll
        setTimeout(() => {
          const planSelect = document.getElementById('field-plan');
          if (planSelect) {
            // Find the matching option text
            for (const opt of planSelect.options) {
              if (opt.value.toLowerCase().includes(plan.toLowerCase())) {
                planSelect.value = opt.value;
                break;
              }
            }
            planSelect.dispatchEvent(new Event('change'));
          }
        }, 800);
      }
    });
  });
}

/* ========================================================
   CONTACT FORM — Validation + Submission
   ======================================================== */
function initContactForm() {
  const form    = document.getElementById('contact-form');
  if (!form) return;

  const success = document.getElementById('form-success');
  const submit  = form.querySelector('[type="submit"]');
  const spinner = submit?.querySelector('.spinner');
  const btnText = submit?.querySelector('.btn-text');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validateForm(form)) return;

    // Loading state
    if (spinner) spinner.classList.remove('hidden');
    if (btnText) btnText.textContent = window.MIE_i18n?.t('contact.submitting') || 'Enviando...';
    if (submit)  submit.disabled = true;

    // Build payload
    const data = Object.fromEntries(new FormData(form));
    data.timestamp   = new Date().toISOString();
    data.source_page = window.location.href;

    try {
      // ⚙️ Formspree endpoint: configura el ID en index.html (<meta name="formspree-id" content="XXXXXXXX">)
      const formspreeId = document.querySelector('meta[name="formspree-id"]')?.content;
      const endpoint = (formspreeId && formspreeId !== 'REPLACE_FORM_ID')
        ? `https://formspree.io/f/${formspreeId}`
        : form.dataset.endpoint || null;

      if (!endpoint) {
        console.warn('[MakeItEasy] Formspree no configurado. Añade <meta name="formspree-id" content="TU_ID"> en index.html.');
        throw new Error('Endpoint not configured');
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        form.style.display = 'none';
        if (success) success.classList.remove('hidden');
        // Track
        if (typeof gtag === 'function') {
          gtag('event', 'generate_lead', {
            event_category: 'Form',
            event_label: data.plan_interes || 'No definido',
            value: 1,
          });
        }
      } else {
        throw new Error('Server error');
      }
    } catch {
      const errEl = document.getElementById('form-error');
      if (errEl) errEl.classList.remove('hidden');
      setTimeout(() => errEl?.classList.add('hidden'), 5000);
    } finally {
      if (spinner) spinner.classList.add('hidden');
      if (btnText) {
        const t = window.MIE_i18n?.t('contact.submit') || 'Solicitar Diagnóstico';
        btnText.textContent = t;
      }
      if (submit) submit.disabled = false;
    }
  });

  // Real-time validation
  form.querySelectorAll('[required]').forEach(field => {
    ['blur', 'input'].forEach(ev => {
      field.addEventListener(ev, () => validateField(field));
    });
  });
}

function validateField(field) {
  const val = field.value.trim();
  let ok = val !== '';
  if (field.type === 'email') ok = ok && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
  const err = field.parentElement.querySelector('.field-error');
  if (err) err.style.display = ok ? 'none' : 'block';
  field.classList.toggle('error', !ok);
  return ok;
}

function validateForm(form) {
  let allOk = true;
  form.querySelectorAll('[required]').forEach(f => {
    if (!validateField(f)) allOk = false;
  });
  const checkbox = form.querySelector('[type="checkbox"][required]');
  if (checkbox && !checkbox.checked) {
    const err = checkbox.parentElement.querySelector('.field-error');
    if (err) err.style.display = 'block';
    allOk = false;
  }
  return allOk;
}

/* ========================================================
   BACK TO TOP
   ======================================================== */
function initBackToTop() {
  const btn = document.getElementById('back-top');
  if (!btn) return;

  window.addEventListener('scroll', () => {
    btn.classList.toggle('visible', window.scrollY > 600);
  }, { passive: true });

  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

/* ========================================================
   COOKIE CONSENT
   ======================================================== */
function initCookieConsent() {
  if (localStorage.getItem('mie_cookie_consent')) return;
  const banner = document.getElementById('cookie-banner');
  if (!banner) return;

  setTimeout(() => banner.classList.add('visible'), 1500);

  document.getElementById('cookie-accept')?.addEventListener('click', () => {
    localStorage.setItem('mie_cookie_consent', 'accepted');
    banner.classList.remove('visible');
    // Load analytics after consent
    loadGA4();
  });

  document.getElementById('cookie-decline')?.addEventListener('click', () => {
    localStorage.setItem('mie_cookie_consent', 'declined');
    banner.classList.remove('visible');
  });

  // If already consented in previous visit
  if (localStorage.getItem('mie_cookie_consent') === 'accepted') loadGA4();
}

function loadGA4() {
  // ⚙️  CONFIGURACIÓN: añade tu GA4 ID en index.html:
  //     <meta name="ga4-id" content="G-XXXXXXXXXX">
  const GA4_ID = document.querySelector('meta[name="ga4-id"]')?.content;
  if (!GA4_ID || GA4_ID === 'G-XXXXXXXXXX') {
    console.warn('[MakeItEasy] GA4 no configurado. Añade <meta name="ga4-id" content="G-XXXXXXXX"> en el <head> de index.html.');
    return;
  }
  if (document.querySelector(`script[src*="${GA4_ID}"]`)) return;
  const s1 = document.createElement('script');
  s1.async = true;
  s1.src = `https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`;
  document.head.appendChild(s1);
  window.dataLayer = window.dataLayer || [];
  window.gtag = function(){ dataLayer.push(arguments); };
  gtag('js', new Date());
  gtag('config', GA4_ID, { send_page_view: true });
}

/* ========================================================
   WHATSAPP BUTTON — appears after 3s
   ======================================================== */
function initWhatsApp() {
  const btn = document.querySelector('.whatsapp-fab');
  if (!btn) return;
  setTimeout(() => btn.classList.add('visible'), 3000);
}

/* ========================================================
   MARQUEE STATS — counter animation
   ======================================================== */
function initCounters() {
  const counters = document.querySelectorAll('[data-count]');
  if (!counters.length) return;

  const obs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('counted');
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  counters.forEach(c => obs.observe(c));
}

/* ========================================================
   ROI CALCULATOR & GLOW EFFECT
   ======================================================== */
function initFeatures() {
  // Glow Cards Effect
  document.querySelectorAll('.glow-card').forEach(card => {
    card.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      card.style.setProperty('--x', `${x}px`);
      card.style.setProperty('--y', `${y}px`);
    });
  });

  // ROI Calculator
  const calcBtn = document.getElementById('calc-btn');
  if (calcBtn) {
    calcBtn.addEventListener('click', () => {
      try {
        const empEl = document.getElementById('calc-employees');
        const hrsEl = document.getElementById('calc-hours');
        const salEl = document.getElementById('calc-salary');
        
        const emp = empEl ? (parseInt(empEl.value) || 0) : 0;
        const hrs = hrsEl ? (parseInt(hrsEl.value) || 0) : 0;
        const sal = salEl ? (parseInt(salEl.value) || 0) : 0;
        
        // employees * hours/week * 4 weeks * (sal/160 hr/month)
        const lost = (emp * hrs * sal) / 40;
        
        const resEl = document.getElementById('calc-result');
        const totalEl = document.getElementById('calc-total');
        
        if (resEl && totalEl) {
          const lang = document.documentElement.lang || 'es-CO';
          const isEur = lang.includes('EU');
          const isUsd = lang.includes('US');
          const langFormat = isEur ? 'de-DE' : 'en-US';
          const cur = isEur ? 'EUR' : (isUsd ? 'USD' : 'COP');
          
          totalEl.textContent = new Intl.NumberFormat(langFormat, { 
            style: 'currency', 
            currency: cur, 
            maximumFractionDigits: 0 
          }).format(lost);
          
          resEl.style.display = 'block';
        }
      } catch (e) {
        console.error('Calculator error:', e);
      }
    });
  }
}

/* ========================================================
   NEWSLETTER FOOTER — Email validation + feedback
   ======================================================== */
function initNewsletterFooter() {
  const emailInput = document.getElementById('footer-newsletter-email');
  const btn        = document.getElementById('footer-newsletter-btn');
  const msg        = document.getElementById('footer-newsletter-msg');
  if (!emailInput || !btn || !msg) return;

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  btn.addEventListener('click', async () => {
    const email = emailInput.value.trim();

    // Validate
    if (!email || !EMAIL_RE.test(email)) {
      msg.textContent = 'Por favor ingresa un email válido.';
      msg.className = 'footer-newsletter-msg error';
      emailInput.focus();
      return;
    }

    // Loading state
    btn.disabled = true;
    btn.textContent = '...';
    msg.textContent = '';
    msg.className = 'footer-newsletter-msg';

    try {
      // ⚙️ Formspree endpoint: configura el ID en index.html (<meta name="formspree-id" content="XXXXXXXX">)
      const formspreeId = document.querySelector('meta[name="formspree-id"]')?.content;
      const endpoint = (formspreeId && formspreeId !== 'REPLACE_FORM_ID')
        ? `https://formspree.io/f/${formspreeId}`
        : document.getElementById('contact-form')?.dataset?.endpoint || null;

      if (!endpoint) {
        throw new Error('Endpoint not configured');
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          email,
          tipo: 'newsletter',
          timestamp: new Date().toISOString(),
          source_page: window.location.href,
        }),
      });

      if (res.ok) {
        msg.textContent = '✓ ¡Suscrito! Te enviaremos insights pronto.';
        msg.className = 'footer-newsletter-msg success';
        emailInput.value = '';
        if (typeof gtag === 'function') {
          gtag('event', 'newsletter_subscribe', { event_category: 'Footer', value: 1 });
        }
      } else {
        throw new Error('server_error');
      }
    } catch {
      msg.textContent = 'Error al suscribir. Intenta de nuevo.';
      msg.className = 'footer-newsletter-msg error';
    } finally {
      btn.disabled = false;
      btn.textContent = 'Suscribir';
    }
  });

  // Allow Enter key on input
  emailInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') btn.click();
  });
}

/* ========================================================
   TEAM CAROUSEL — auto-rotate + controls
   ======================================================== */
function initTeamCarousel() {
  const track    = document.getElementById('team-carousel-track');
  const carousel = document.getElementById('team-carousel');
  if (!track || !carousel) return;

  const slides    = Array.from(track.querySelectorAll('.team-slide'));
  const dots      = Array.from(carousel.querySelectorAll('.team-dot'));
  const fill      = document.getElementById('team-progress-fill');
  const prevBtn   = document.getElementById('team-prev');
  const nextBtn   = document.getElementById('team-next');
  const TOTAL     = slides.length;
  const INTERVAL  = 5000; // ms between auto-advances

  let current     = 0;
  let timer       = null;
  let startTime   = null;
  let rafId       = null;
  let paused      = false;

  /** Move to a specific slide */
  function goTo(idx) {
    current = ((idx % TOTAL) + TOTAL) % TOTAL;
    track.style.transform = `translateX(-${current * 100}%)`;
    dots.forEach((d, i) => {
      const active = i === current;
      d.classList.toggle('team-dot-active', active);
      d.setAttribute('aria-selected', String(active));
    });
    resetTimer();
  }

  /** Animate progress bar fill over INTERVAL ms */
  function animateFill() {
    if (!fill) return;
    cancelAnimationFrame(rafId);
    startTime = performance.now();

    function step(now) {
      if (paused) { rafId = requestAnimationFrame(step); return; }
      const elapsed = now - startTime;
      const pct     = Math.min((elapsed / INTERVAL) * 100, 100);
      fill.style.width = pct + '%';
      if (pct < 100) {
        rafId = requestAnimationFrame(step);
      }
    }
    rafId = requestAnimationFrame(step);
  }

  /** Start / restart auto-advance timer */
  function resetTimer() {
    clearInterval(timer);
    animateFill();
    timer = setInterval(() => {
      if (!paused) goTo(current + 1);
    }, INTERVAL);
  }

  // Arrow controls
  nextBtn?.addEventListener('click', () => goTo(current + 1));
  prevBtn?.addEventListener('click', () => goTo(current - 1));

  // Dot controls
  dots.forEach(dot => {
    dot.addEventListener('click', () => goTo(Number(dot.dataset.slide)));
  });

  // Pause on hover / focus within
  carousel.addEventListener('mouseenter', () => { paused = true; });
  carousel.addEventListener('mouseleave', () => {
    paused = false;
    startTime = performance.now() - (parseFloat(fill?.style.width || 0) / 100 * INTERVAL);
  });

  // Touch swipe support
  let touchStartX = 0;
  track.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, { passive: true });
  track.addEventListener('touchend',   e => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 50) goTo(current + (dx < 0 ? 1 : -1));
  });

  // Keyboard navigation
  carousel.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight') goTo(current + 1);
    if (e.key === 'ArrowLeft')  goTo(current - 1);
  });

  // Init
  goTo(0);
}

/* ========================================================
   INIT
   ======================================================== */
async function init() {
  // i18n must load first (updates all text)
  await initI18n();

  // UI interactions
  initNavbar();
  initScrollReveal();
  initHeroParticles();
  initServiceCards();
  initProcessTimeline();
  initPricing();
  initContactForm();
  initBackToTop();
  initCookieConsent();
  initWhatsApp();
  initCounters();
  initFeatures();
  initNewsletterFooter();
  initTeamCarousel();

  // Analytics (respects cookie consent)
  initAnalytics();

  // Remove loading class from body
  document.body.classList.remove('loading');
}

// Run when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
