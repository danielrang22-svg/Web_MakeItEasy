/* ============================================================
   MAKE IT EASY — Analytics & Marketing Layer
   scripts/analytics.js
   ============================================================ */

/* ---- GA4 stub (replace G-XXXXXXXX with real ID) ---- */
const GA4_ID = 'G-XXXXXXXX'; // TODO: replace with real GA4 Measurement ID

function initGA4() {
  if (typeof gtag !== 'function') return;
  gtag('config', GA4_ID, {
    page_title: document.title,
    page_location: window.location.href,
    send_page_view: true,
  });
}

/* ---- Structured event tracker ---- */
function trackEvent(eventName, params = {}) {
  // GA4
  if (typeof gtag === 'function') {
    gtag('event', eventName, params);
  }
  // Meta Pixel
  if (typeof fbq === 'function') {
    fbq('trackCustom', eventName, params);
  }
  // Console in dev
  if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
    console.log('[Analytics]', eventName, params);
  }
}

/* ---- UTM Parameter Capture ---- */
function captureUTM() {
  const params = new URLSearchParams(location.search);
  const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
  const utm = {};
  utmKeys.forEach(k => {
    const v = params.get(k);
    if (v) { utm[k] = v; sessionStorage.setItem(k, v); }
    else    { const s = sessionStorage.getItem(k); if (s) utm[k] = s; }
  });
  return utm;
}

/* ---- Inject UTM into form hidden fields ---- */
function injectUTMIntoForm(formEl) {
  const utm = captureUTM();
  Object.entries(utm).forEach(([k, v]) => {
    let hidden = formEl.querySelector(`input[name="${k}"]`);
    if (!hidden) {
      hidden = document.createElement('input');
      hidden.type = 'hidden';
      hidden.name = k;
      formEl.appendChild(hidden);
    }
    hidden.value = v;
  });
  // timestamp + source page
  const ts = formEl.querySelector('input[name="timestamp"]');
  if (ts) ts.value = new Date().toISOString();
  const sp = formEl.querySelector('input[name="source_page"]');
  if (sp) sp.value = window.location.href;
}

/* ---- Export ---- */
export function initAnalytics() {
  // Capture UTM immediately
  captureUTM();

  // Wire up CTA click tracking
  document.querySelectorAll('[data-track]').forEach(el => {
    el.addEventListener('click', () => {
      const event = el.dataset.track;
      const label = el.dataset.trackLabel || el.textContent.trim().substring(0, 40);
      const plan  = el.dataset.trackPlan  || undefined;
      trackEvent(event, { event_label: label, plan_selected: plan });
    });
  });

  // WhatsApp click
  document.querySelectorAll('a[href*="wa.me"]').forEach(el => {
    el.addEventListener('click', () => {
      trackEvent('whatsapp_click', { event_category: 'Contact', event_label: 'WhatsApp Button' });
    });
  });

  // Language change
  document.addEventListener('localeChanged', (e) => {
    trackEvent('language_changed', { language: e.detail.locale });
  });

  // Scroll depth
  let depths = [25, 50, 75, 90];
  window.addEventListener('scroll', () => {
    const pct = Math.round((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100);
    depths = depths.filter(d => {
      if (pct >= d) {
        trackEvent('scroll_depth', { depth: d });
        return false;
      }
      return true;
    });
  }, { passive: true });

  // Form submission
  const contactForm = document.getElementById('contact-form');
  if (contactForm) {
    injectUTMIntoForm(contactForm);
    contactForm.addEventListener('submit', (e) => {
      const planInput = contactForm.querySelector('[name="plan_interes"]');
      trackEvent('generate_lead', {
        event_category: 'Form',
        event_label: planInput?.value || 'No definido',
        value: 1,
      });
      // Also FB Pixel standard event
      if (typeof fbq === 'function') fbq('track', 'Lead');
    });
  }

  // Time on page
  let startTime = Date.now();
  window.addEventListener('beforeunload', () => {
    const seconds = Math.round((Date.now() - startTime) / 1000);
    navigator.sendBeacon?.('/api/beacon', JSON.stringify({ event: 'time_on_page', seconds }));
  });

  // Init GA4 if script loaded
  if (typeof gtag !== 'undefined') initGA4();
}

export { trackEvent, captureUTM, injectUTMIntoForm };
