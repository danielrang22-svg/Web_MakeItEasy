
/* ==========================================================================
   ECOSYSTEM TABS & MOCKUPS (#herramientas.html)
   ========================================================================== */

// Data provider for CRM and ERP mocks
function getMockupData() {
  const loc = typeof window.currentLocale !== 'undefined' ? window.currentLocale : 'es-CO';
  const data = {
    'es-CO': {
      crmRev: 24500000,
      erpCF: 48200000,
      erpExp: 12500000,
      nomina: 14500000,
      fact: 11000000,
      imp: 6450000,
      sym: '$',
      format: 'es-CO'
    },
    'en-US': {
      crmRev: 24500,
      erpCF: 48200,
      erpExp: 12500,
      nomina: 14500,
      fact: 11000,
      imp: 6450,
      sym: '$',
      format: 'en-US'
    },
    'en-EU': {
      crmRev: 22000,
      erpCF: 44000,
      erpExp: 11000,
      nomina: 13000,
      fact: 10000,
      imp: 5800,
      sym: '€',
      format: 'es-ES'
    }
  };
  return data[loc] || data['es-CO'];
}

function animateCrmMockup() {
  const mockData = getMockupData();
  const revEl = document.querySelector('#tab-crm .crm-counter[data-target]');
  if(revEl) revEl.setAttribute('data-target', mockData.crmRev);

  const counters = document.querySelectorAll('#tab-crm .crm-counter');
  counters.forEach(c => {
    const target = parseInt(c.getAttribute('data-target'));
    const isCurrency = c.textContent.includes('$');
    const isPercent = c.textContent.includes('%');
    
    let current = 0;
    const step = target / 40;
    const timer = setInterval(() => {
      current += step;
      if (current >= target) {
        current = target;
        clearInterval(timer);
      }
      let valStr = new Intl.NumberFormat(mockData.format).format(Math.floor(current));
      if (isCurrency) valStr = mockData.sym + valStr;
      if (isPercent) valStr = valStr + '%';
      c.textContent = valStr;
    }, 25);
  });

  const kanbanItems = document.querySelectorAll('#tab-crm .kanban-item');
  kanbanItems.forEach((item, idx) => {
    item.style.transform = 'translateY(20px)';
    item.style.opacity = '0';
    setTimeout(() => {
      item.style.transition = 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)';
      item.style.transform = 'translateY(0)';
      item.style.opacity = '1';
    }, 150 * (idx + 1));
  });
}

function animateErpMockup() {
  const bars = document.querySelectorAll('#tab-erp .erp-bar');
  bars.forEach((bar, idx) => {
    const targetH = bar.getAttribute('data-h');
    bar.style.height = '0%';
    setTimeout(() => {
      bar.style.height = targetH;
    }, 100 * (idx + 1));
  });

  const mockData = getMockupData();
  const els = document.querySelectorAll('#tab-erp .erp-counter');
  
  if(els.length >= 6) {
      els[0].setAttribute('data-target', mockData.erpCF);
      els[1].setAttribute('data-target', mockData.erpExp);
      els[2].setAttribute('data-target', mockData.nomina);
      els[3].setAttribute('data-target', mockData.nomina);
      els[4].setAttribute('data-target', mockData.fact);
      els[5].setAttribute('data-target', mockData.imp);
  }

  const counters = document.querySelectorAll('#tab-erp .erp-counter');
  counters.forEach(c => {
    const target = parseInt(c.getAttribute('data-target'));
    const isCurrency = c.textContent.includes('$');
    const isPercent = c.textContent.includes('%');
    
    let current = 0;
    const step = target / 40;
    const timer = setInterval(() => {
      current += step;
      if (current >= target) {
        current = target;
        clearInterval(timer);
      }
      let valStr = new Intl.NumberFormat(mockData.format).format(Math.floor(current));
      if (isCurrency) valStr = mockData.sym + valStr;
      if (isPercent) valStr = valStr + '%';
      c.textContent = valStr;
    }, 25);
  });

  const donut = document.querySelector('.erp-donut-chart');
  if (donut) {
    donut.style.background = 'conic-gradient(rgba(255,255,255,0.05) 100%, rgba(255,255,255,0.05) 100%)';
    setTimeout(() => {
      donut.style.transition = 'background 1s ease-out';
      donut.style.background = 'conic-gradient(#8ff5ff 45%, rgba(255,255,255,0.05) 0%)';
    }, 100);
  }
}



const TAB_COPY = {
  'es-CO': {
    'tab-agent': {
      badge: 'Agentes IA — Make it Easy',
      title: 'Prueba Tu Agente de IA Gratis',
      subtitle: 'Selecciona tu rubro, configura los objetivos y ve en tiempo real cómo un Agente Inteligente interactúa con tus clientes antes de comprarlo.'
    },
    'tab-crm': {
      badge: 'CRM & Ventas — Make it Easy',
      title: 'CRM Inteligente para Tu Negocio',
      subtitle: 'Visualiza tu pipeline de ventas, gestiona contactos y cierra más negocios. Un CRM potenciado por IA que automatiza el seguimiento de clientes.'
    },
    'tab-erp': {
      badge: 'ERP & Finanzas — Make it Easy',
      title: 'Control Total de tus Finanzas',
      subtitle: 'Nómina, facturación, impuestos y flujo de caja en un solo lugar. Automatización financiera con reportes en tiempo real para tomar mejores decisiones.'
    }
  },
  'en-US': {
    'tab-agent': {
      badge: 'AI Agents — Make it Easy',
      title: 'Try Your Free AI Agent',
      subtitle: 'Select your business type, configure objectives, and see in real-time how a Smart Agent interacts with your customers before buying.'
    },
    'tab-crm': {
      badge: 'CRM & Sales — Make it Easy',
      title: 'Smart CRM for Your Business',
      subtitle: 'Visualize your sales pipeline, manage contacts, and close more deals. An AI-powered CRM that automates customer follow-ups.'
    },
    'tab-erp': {
      badge: 'ERP & Finance — Make it Easy',
      title: 'Total Control of Your Finances',
      subtitle: 'Payroll, invoicing, taxes, and cash flow in one place. Financial automation with real-time reports to make better decisions.'
    }
  },
  'en-EU': {
    'tab-agent': {
      badge: 'AI Agents — Make it Easy',
      title: 'Try Your Free AI Agent',
      subtitle: 'Select your business type, configure objectives, and see in real-time how a Smart Agent interacts with your customers before buying.'
    },
    'tab-crm': {
      badge: 'CRM & Sales — Make it Easy',
      title: 'Smart CRM for Your Business',
      subtitle: 'Visualize your sales pipeline, manage contacts, and close more deals. An AI-powered CRM that automates customer follow-ups.'
    },
    'tab-erp': {
      badge: 'ERP & Finance — Make it Easy',
      title: 'Total Control of Your Finances',
      subtitle: 'Payroll, invoicing, taxes, and cash flow in one place. Financial automation with real-time reports to make better decisions.'
    }
  }
};

function updateActiveTabHeader() {
  const activeTab = document.querySelector('.eco-tab-btn.active');
  if (!activeTab) return;
  const targetId = activeTab.getAttribute('data-target');
  const loc = typeof window.currentLocale !== 'undefined' ? window.currentLocale : 'es-CO';
  const copy = (TAB_COPY[loc] || TAB_COPY['es-CO'])[targetId];
  if (copy) {
    const badge = document.querySelector('.agent-simulator-section-page .badge-primary');
    const headline = document.getElementById('probador-headline');
    const subtitle = document.getElementById('probador-subtitle');
    if (badge) {
      badge.style.opacity = '0';
      setTimeout(() => { badge.textContent = copy.badge; badge.style.opacity = '1'; }, 200);
    }
    if (headline) {
      headline.style.opacity = '0';
      setTimeout(() => { headline.textContent = copy.title; headline.style.opacity = '1'; }, 250);
    }
    if (subtitle) {
      subtitle.style.opacity = '0';
      setTimeout(() => { subtitle.textContent = copy.subtitle; subtitle.style.opacity = '1'; }, 300);
    }
  }
}
function initEcosystemTabs() {
  const tabs = document.querySelectorAll('.eco-tab-btn');
  const indicator = document.getElementById('tab-indicator');
  const views = document.querySelectorAll('.eco-view');
  
  if (!tabs.length || !indicator) return;

  function updateIndicator(activeTab) {
    indicator.style.left = activeTab.offsetLeft + 'px';
    indicator.style.width = activeTab.offsetWidth + 'px';
  }

  const activeTab = document.querySelector('.eco-tab-btn.active');
  if (activeTab) {
    setTimeout(() => updateIndicator(activeTab), 100);
  }

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active', 'text-white'));
      tabs.forEach(t => t.classList.add('text-muted'));
      
      tab.classList.remove('text-muted');
      tab.classList.add('active', 'text-white');
      
      updateIndicator(tab);

      const targetId = tab.getAttribute('data-target');
      updateActiveTabHeader();

      views.forEach(view => {
        if (view.id === targetId) {
          view.classList.remove('hidden');
          setTimeout(() => {
            view.classList.remove('opacity-0');
            view.classList.add('opacity-100');
          }, 50);
          
          if (targetId === 'tab-crm') animateCrmMockup();
          if (targetId === 'tab-erp') animateErpMockup();
        } else {
          view.classList.add('hidden', 'opacity-0');
          view.classList.remove('opacity-100');
        }
      });
    });
  });
}

// Re-animate mockups when locale changes
document.addEventListener('localeChanged', () => {
  const crmView = document.getElementById('tab-crm');
  const erpView = document.getElementById('tab-erp');
  
  if (crmView && !crmView.classList.contains('hidden')) {
    animateCrmMockup();
  }
  if (erpView && !erpView.classList.contains('hidden')) {
    animateErpMockup();
  }
  
  if (typeof updateActiveTabHeader === "function") updateActiveTabHeader();
});


function initAgentSimulator() {
  const bizOptions = document.querySelectorAll('.biz-option-card');
  const objOptions = document.querySelectorAll('.obj-pill');
  const startBtn = document.getElementById('btn-start-simulation');
  const chatOverlay = document.getElementById('chat-overlay');
  const chatBody = document.getElementById('sim-chat-body');
  const chatForm = document.getElementById('sim-chat-form');
  const chatInput = document.getElementById('sim-user-input');
  const activeAgentBox = document.getElementById('active-agent-summary-box');
  const quickQuestions = document.getElementById('sim-quick-questions');

  if (!bizOptions.length || !startBtn) return;

  // Single select for business
  bizOptions.forEach(btn => {
    btn.addEventListener('click', () => {
      bizOptions.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // Multi select for objectives
  objOptions.forEach(btn => {
    btn.addEventListener('click', () => {
      btn.classList.toggle('active');
    });
  });

  // Start simulation
  startBtn.addEventListener('click', () => {
    // Show chat overlay
    if (chatOverlay) {
      chatOverlay.style.opacity = '0';
      chatOverlay.style.pointerEvents = 'none';
      setTimeout(() => {
        chatOverlay.style.display = 'none';
      }, 500);
    }
    
    if (activeAgentBox) {
      activeAgentBox.classList.remove('hidden');
    }

    if (chatBody) {
      chatBody.innerHTML = '';
      addMessage('agent', '¡Hola! He sido configurado según tus preferencias. ¿En qué te puedo ayudar hoy?');
    }
  });

  // Chat form submit
  if (chatForm) {
    chatForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = chatInput.value.trim();
      if (!text) return;
      
      addMessage('user', text);
      chatInput.value = '';
      
      showTyping();
      setTimeout(() => {
        removeTyping();
        addMessage('agent', getMockReply(text));
      }, 1500);
    });
  }

  // Quick questions
  if (quickQuestions) {
    quickQuestions.addEventListener('click', (e) => {
      if (e.target.tagName === 'BUTTON' || e.target.closest('button')) {
        const btn = e.target.tagName === 'BUTTON' ? e.target : e.target.closest('button');
        const text = btn.textContent.trim();
        addMessage('user', text);
        
        showTyping();
        setTimeout(() => {
          removeTyping();
          addMessage('agent', getMockReply(text));
        }, 1500);
      }
    });
  }

  function addMessage(sender, text) {
    if (!chatBody) return;
    const isUser = sender === 'user';
    const msgDiv = document.createElement('div');
    msgDiv.className = `flex w-full ${isUser ? 'justify-end' : 'justify-start'} mb-4`;
    
    const bubble = document.createElement('div');
    bubble.className = `max-w-[80%] rounded-2xl px-4 py-3 text-sm ${isUser ? 'bg-primary text-white rounded-br-none' : 'bg-[#1a2333] text-white/90 rounded-bl-none border border-white/5'}`;
    bubble.textContent = text;
    
    msgDiv.appendChild(bubble);
    chatBody.appendChild(msgDiv);
    chatBody.scrollTop = chatBody.scrollHeight;
  }

  function showTyping() {
    if (!chatBody) return;
    const msgDiv = document.createElement('div');
    msgDiv.id = 'typing-indicator';
    msgDiv.className = 'flex w-full justify-start mb-4';
    msgDiv.innerHTML = `<div class="bg-[#1a2333] text-white/90 rounded-2xl rounded-bl-none border border-white/5 px-4 py-3 flex items-center gap-1">
      <span class="w-2 h-2 rounded-full bg-white/50 animate-bounce"></span>
      <span class="w-2 h-2 rounded-full bg-white/50 animate-bounce" style="animation-delay: 0.2s"></span>
      <span class="w-2 h-2 rounded-full bg-white/50 animate-bounce" style="animation-delay: 0.4s"></span>
    </div>`;
    chatBody.appendChild(msgDiv);
    chatBody.scrollTop = chatBody.scrollHeight;
  }

  function removeTyping() {
    const typing = document.getElementById('typing-indicator');
    if (typing) typing.remove();
  }

  function getMockReply(text) {
    const lower = text.toLowerCase();
    if (lower.includes('precio') || lower.includes('costo')) return 'El costo varía según tus necesidades. Nuestros planes inician desde $99/mes.';
    if (lower.includes('agendar') || lower.includes('cita')) return '¡Claro! Te enviaré un enlace para agendar la cita. ¿Qué fecha prefieres?';
    if (lower.includes('gracias')) return '¡Con mucho gusto! Estoy para servirte.';
    return 'Entiendo perfectamente. Mi IA procesará esa información para ofrecerte la mejor respuesta o acción automatizada.';
  }
}
