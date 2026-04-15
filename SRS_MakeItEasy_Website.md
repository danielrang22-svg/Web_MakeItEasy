# DOCUMENTO DE ESPECIFICACIÓN DE REQUISITOS DEL SISTEMA (SRS)
## Make it Easy — Intelligent Automation | Sitio Web Corporativo
**Versión:** 1.0  
**Fecha:** Marzo 2025  
**Clasificación:** Confidencial  
**Contacto:** daniel.makeiteasy@gmail.com | cristian.makeiteasy@gmail.com

---

## TABLA DE CONTENIDO

1. Introducción y Propósito
2. Alcance del Sistema
3. Definiciones y Acrónimos
4. Arquitectura General
5. Requisitos Funcionales
6. Requisitos No Funcionales
7. Sistema de Diseño (Design System)
8. Estructura de Páginas y Contenido
9. Componentes UI
10. Integraciones y APIs
11. Requisitos de SEO y Analytics
12. Seguridad
13. Infraestructura y Despliegue
14. Criterios de Aceptación

---

## 1. INTRODUCCIÓN Y PROPÓSITO

### 1.1 Propósito del Documento
Este documento describe todos los requisitos técnicos, funcionales y de diseño para el desarrollo del sitio web corporativo de **Make it Easy — Intelligent Automation**. Sirve como contrato técnico entre el equipo de desarrollo y los stakeholders del proyecto.

### 1.2 Visión del Producto
Crear un sitio web de alta conversión que posicione a Make it Easy como la empresa líder en automatización inteligente para empresas colombianas. El sitio debe reflejar la identidad de marca definida en el Design System ("The Luminous Engine") y generar leads calificados a través de un diagnóstico gratuito.

### 1.3 Objetivos de Negocio
| ID | Objetivo | KPI de Éxito |
|----|----------|--------------|
| OB-01 | Generar leads calificados | ≥ 15 leads/mes en mes 3 |
| OB-02 | Comunicar propuesta de valor | Bounce rate < 50% |
| OB-03 | Mostrar planes comerciales | CTR al CTA ≥ 8% |
| OB-04 | Construir credibilidad de marca | Tiempo en sitio > 2:30 min |
| OB-05 | Posicionamiento SEO local | Top 5 en "automatización empresas Colombia" |

---

## 2. ALCANCE DEL SISTEMA

### 2.1 Incluido en el Alcance
- Sitio web público de una sola página (One-Page) con navegación por secciones
- Formulario de contacto / agendamiento de diagnóstico gratuito
- Sección de planes comerciales interactiva
- Integración con WhatsApp Business
- Panel de gestión de leads (básico)
- Versión responsive (mobile, tablet, desktop)

### 2.2 Excluido del Alcance (Fase 1)
- Portal de clientes / login
- Dashboard de clientes
- Blog / publicaciones
- E-commerce / pagos en línea
- Aplicación móvil nativa

### 2.3 Fases del Proyecto
```
Fase 1 (MVP — 3 semanas):   Sitio One-Page + Formulario + WhatsApp
Fase 2 (4-8 semanas):       Blog + SEO avanzado + Casos de éxito
Fase 3 (3+ meses):          Portal de clientes + Automatización de leads
```

---

## 3. DEFINICIONES Y ACRÓNIMOS

| Término | Definición |
|---------|------------|
| **SRS** | Software Requirements Specification |
| **CTA** | Call To Action — Botón o elemento de llamada a acción |
| **Lead** | Prospecto de cliente que deja sus datos de contacto |
| **One-Page** | Sitio web de una sola página con secciones navegables |
| **Glassmorphism** | Efecto visual de vidrio esmerilado con blur y transparencia |
| **Bento Grid** | Sistema de layout en tarjetas de diferentes tamaños tipo caja |
| **LCP** | Largest Contentful Paint — métrica de rendimiento web |
| **CLS** | Cumulative Layout Shift — métrica de estabilidad visual |
| **FID** | First Input Delay — métrica de interactividad |

---

## 4. ARQUITECTURA GENERAL

### 4.1 Stack Tecnológico Recomendado

```
┌─────────────────────────────────────────────┐
│               FRONTEND                       │
│  Next.js 14 (App Router) + TypeScript        │
│  Tailwind CSS + Framer Motion                │
│  Componentes: shadcn/ui (base)               │
└─────────────────────────────────────────────┘
          │                    │
┌─────────────────┐  ┌──────────────────────┐
│   CMS (Opcional)│  │   BACKEND / API       │
│   Sanity.io o   │  │   Next.js API Routes  │
│   Contentful    │  │   (formularios, leads) │
└─────────────────┘  └──────────────────────┘
          │                    │
┌─────────────────────────────────────────────┐
│              SERVICIOS EXTERNOS              │
│  Resend (Email) │ Google Analytics 4        │
│  WhatsApp API   │ Meta Pixel (opcional)     │
│  Calendly API   │ Hotjar (heatmaps)         │
└─────────────────────────────────────────────┘
          │
┌─────────────────────────────────────────────┐
│              INFRAESTRUCTURA                 │
│  Vercel (deploy) + dominio .com.co           │
│  Cloudflare (DNS + CDN + seguridad)          │
└─────────────────────────────────────────────┘
```

### 4.2 Alternativa Simplificada (Sin backend propio)
Si se prefiere velocidad de implementación sobre flexibilidad:
```
HTML/CSS/JS puro  +  Vite build tool
Formularios:          Formspree o Netlify Forms
Deploy:               Netlify o Vercel (static)
Dominio:              makeiteasy.com.co
```

### 4.3 Estructura de Archivos (Next.js)
```
/
├── app/
│   ├── layout.tsx          # Layout raíz + metadatos SEO
│   ├── page.tsx            # One-page principal
│   └── api/
│       └── contact/
│           └── route.ts    # Endpoint formulario de contacto
├── components/
│   ├── ui/                 # Componentes base (botones, cards, inputs)
│   ├── sections/           # Secciones del one-page
│   │   ├── Hero.tsx
│   │   ├── About.tsx
│   │   ├── Services.tsx
│   │   ├── Process.tsx
│   │   ├── Plans.tsx
│   │   ├── Contact.tsx
│   │   └── Footer.tsx
│   └── layout/
│       └── Navbar.tsx
├── lib/
│   ├── utils.ts
│   └── email.ts            # Lógica de envío de emails
├── public/
│   ├── logo.svg
│   └── og-image.png        # Open Graph image
├── styles/
│   └── globals.css         # Variables CSS del Design System
└── content/
    └── services.ts         # Datos de servicios y planes
```

---

## 5. REQUISITOS FUNCIONALES

### RF-01: Navegación Principal
**Descripción:** El sitio debe tener una barra de navegación fija (sticky) con scroll suave a cada sección.

**Criterios de aceptación:**
- La navbar debe ser transparente en el top y usar glassmorphism al hacer scroll (backdrop-blur: 12px)
- Links de navegación: Inicio, Nosotros, Servicios, Proceso, Planes, Contacto
- El logo redirige al top de la página
- En mobile: menú hamburguesa con animación de apertura
- El link activo debe destacarse visualmente con el color `primary` (#8ff5ff)
- Botón CTA "Diagnóstico Gratuito" visible siempre en la navbar

---

### RF-02: Sección Hero
**Descripción:** Primera sección visible al cargar, debe capturar atención inmediatamente.

**Contenido requerido:**
- Headline principal: *"Automatizamos tus procesos. Tú escala tu negocio."*
- Subheadline: descripción de valor en máximo 2 líneas
- Dos CTAs: "Agenda tu Diagnóstico Gratis" (primario) + "Ver Servicios" (secundario)
- Elemento visual: animación de engranajes / partículas / flujo de datos que evoque "The Luminous Engine"
- Estadísticas de impacto: 3 métricas (ej: -40% ciclo ventas, -60% errores ops, -70% tiempo facturación)

**Comportamiento:**
- Animación de entrada con stagger (headline → subheadline → CTAs → stats)
- Elemento visual animado en loop (no auto-play con audio)
- El CTA primario hace scroll a la sección de Contacto / abre modal de diagnóstico

---

### RF-03: Sección "Quiénes Somos"
**Descripción:** Comunicar misión, visión y diferenciadores de Make it Easy.

**Contenido requerido:**
- Párrafo introductorio de empresa
- Misión y Visión en formato visual (no solo texto plano)
- 5 diferenciadores en tarjetas Bento:
  1. Soluciones 100% a medida
  2. Expertos en mercado colombiano
  3. Implementación end-to-end
  4. Soporte continuo post-implementación
  5. ROI medible y comprobable

---

### RF-04: Sección "Nuestros Servicios"
**Descripción:** Presentar los 7 servicios con detalle suficiente para generar interés.

**Servicios a mostrar:**
1. Ventas & CRM
2. Logística & Operaciones
3. Finanzas & Compras
4. Diseño y Automatización con IA
5. Integración de Sistemas & Desarrollo Web
6. Legal & Administrativo
7. Capacitación en IA para Empresas

**Comportamiento:**
- Tarjetas en Bento Grid (layout asimétrico)
- Al hacer clic/hover, cada tarjeta expande para mostrar: descripción, qué incluye, beneficios clave
- Animación de expansión suave (300ms ease-in-out)
- Cada servicio tiene un ícono SVG único

---

### RF-05: Sección "Proceso de Trabajo"
**Descripción:** Mostrar las 4 etapas del proceso de forma visual y secuencial.

**Etapas:**
1. Diagnóstico (gratuito)
2. Diseño del Plan
3. Implementación
4. Soporte Continuo

**Comportamiento:**
- Timeline horizontal en desktop, vertical en mobile
- Cada etapa se anima al entrar en el viewport (scroll-triggered)
- Numeración prominente (01, 02, 03, 04)

---

### RF-06: Sección "Planes Comerciales"
**Descripción:** Tabla/cards comparativa de los 3 planes con CTA por plan.

**Planes:**
| Plan | Precio mensual | Precio implementación |
|------|---------------|----------------------|
| Start 🚀 | $1.500.000 COP/mes | $2.000.000 (única vez) |
| Growth 📈 | $3.200.000 COP/mes | $4.500.000 (única vez) |
| Enterprise 🏢 | A convenir | A convenir |

**Comportamiento:**
- El plan Growth debe tener badge "MÁS POPULAR" y escala levemente más grande
- Toggle para mostrar/ocultar características detalladas
- CTA por plan: "Empezar con [Plan]" → abre modal de contacto pre-llenado con el plan seleccionado
- Tabla comparativa completa en versión expandida
- Nota de precios: "No incluye IVA. Diagnóstico inicial gratuito y sin compromiso."

---

### RF-07: Formulario de Contacto / Diagnóstico
**Descripción:** Formulario principal de captura de leads.

**Campos requeridos:**
```
- Nombre completo *
- Empresa *
- Cargo
- Email empresarial *
- Teléfono / WhatsApp *
- Número de empleados (select: 1-10, 11-50, 51-200, 200+)
- Sector de la empresa (select)
- Plan de interés (pre-llenado si viene de sección Planes)
- Mensaje / ¿Qué proceso quieres automatizar? (textarea)
- Checkbox: Acepto la política de privacidad *
```

**Comportamiento:**
- Validación en tiempo real (frontend + backend)
- Al enviar exitosamente:
  1. Mostrar mensaje de confirmación
  2. Enviar email de notificación a daniel.makeiteasy@gmail.com y cristian.makeiteasy@gmail.com
  3. Enviar email de confirmación automático al prospecto
  4. Opcionalmente redirigir a Calendly para agendar cita
- En caso de error: mostrar mensaje claro con opción de intentar de nuevo
- Protección anti-spam: honeypot field + rate limiting

---

### RF-08: Botón Flotante de WhatsApp
**Descripción:** Acceso rápido a WhatsApp Business en toda la página.

**Especificaciones:**
- Posición: fixed, bottom-right, z-index alto
- Número: +57 320 268 2664
- Mensaje pre-llenado: "Hola, quiero agendar mi diagnóstico gratuito con Make it Easy"
- Animación de entrada: aparece 3 segundos después de cargar la página
- Tooltip al hover: "Chatea con nosotros"
- En mobile: enlace directo `https://wa.me/573202682664`

---

### RF-09: Footer
**Descripción:** Footer con información de contacto y links relevantes.

**Contenido:**
- Logo Make it Easy
- Tagline: "Intelligent Automation"
- Columna Servicios: lista de los 7 servicios (anchor links)
- Columna Contacto: emails, teléfono, ciudad
- Copyright: "© 2025 Make it Easy. Todos los derechos reservados."
- Links: Política de Privacidad | Términos de Uso

---

## 6. REQUISITOS NO FUNCIONALES

### RNF-01: Rendimiento (Performance)
| Métrica | Objetivo |
|---------|----------|
| LCP (Largest Contentful Paint) | < 2.5 segundos |
| FID (First Input Delay) | < 100 ms |
| CLS (Cumulative Layout Shift) | < 0.1 |
| Lighthouse Score (Performance) | ≥ 90 / 100 |
| Peso total de página (desktop) | < 2 MB |
| Peso total de página (mobile) | < 1 MB |
| Time to First Byte (TTFB) | < 600 ms |

**Técnicas requeridas:**
- Lazy loading de imágenes (`loading="lazy"`)
- Fuentes web con `font-display: swap`
- Compresión de imágenes: WebP/AVIF preferido sobre JPEG/PNG
- Code splitting automático (Next.js)
- CDN para assets estáticos

---

### RNF-02: Responsive Design
| Breakpoint | Rango | Comportamiento |
|------------|-------|----------------|
| Mobile S | 320px - 375px | Layout de 1 columna, texto escalado |
| Mobile L | 376px - 480px | Layout de 1 columna |
| Tablet | 481px - 768px | Layout de 2 columnas en servicios |
| Desktop | 769px - 1280px | Layout completo Bento Grid |
| Desktop XL | 1281px+ | Máximo ancho: 1400px centrado |

**Reglas:**
- Mobile-first en CSS (min-width breakpoints)
- Touch targets mínimos: 44x44px
- Sin overflow horizontal en ningún breakpoint
- Imágenes con `max-width: 100%`

---

### RNF-03: Accesibilidad (A11y)
- Cumplimiento mínimo: **WCAG 2.1 Nivel AA**
- Contraste de texto: mínimo 4.5:1 (texto normal), 3:1 (texto grande)
- Todos los elementos interactivos accesibles por teclado (Tab, Enter, Space)
- Atributos `alt` descriptivos en todas las imágenes
- Roles ARIA donde corresponda
- Skip-to-content link para lectores de pantalla
- Formularios con labels asociados correctamente

---

### RNF-04: Compatibilidad de Navegadores
| Navegador | Versión mínima | Prioridad |
|-----------|----------------|-----------|
| Chrome | 90+ | Alta |
| Firefox | 88+ | Alta |
| Safari | 14+ | Alta |
| Edge | 90+ | Media |
| Chrome Mobile | 90+ | Alta |
| Safari iOS | 14+ | Alta |
| Samsung Internet | 14+ | Media |

---

### RNF-05: SEO Técnico
**Metadatos obligatorios por página:**
```html
<title>Make it Easy | Automatización Inteligente para Empresas en Colombia</title>
<meta name="description" content="Automatizamos los procesos de tu empresa con IA. CRM, logística, finanzas y más. Diagnóstico gratuito sin compromiso. Bogotá, Colombia." />
<meta name="keywords" content="automatización empresas Colombia, CRM Bogotá, automatización procesos, inteligencia artificial empresas" />

<!-- Open Graph (WhatsApp, LinkedIn, Facebook) -->
<meta property="og:title" content="Make it Easy — Intelligent Automation" />
<meta property="og:description" content="Automatizamos tu empresa para que crezcas sin límites." />
<meta property="og:image" content="https://makeiteasy.com.co/og-image.png" />
<meta property="og:type" content="website" />

<!-- Schema.org JSON-LD -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "Make it Easy",
  "description": "Automatización inteligente de procesos para empresas colombianas",
  "address": { "@type": "PostalAddress", "addressLocality": "Bogotá", "addressCountry": "CO" },
  "telephone": "+573202682664",
  "email": "daniel.makeiteasy@gmail.com"
}
</script>
```

**Estructura de URLs:**
```
https://makeiteasy.com.co/          → Página principal
https://makeiteasy.com.co/#servicios
https://makeiteasy.com.co/#planes
https://makeiteasy.com.co/#contacto
https://makeiteasy.com.co/privacidad
https://makeiteasy.com.co/terminos
```

---

## 7. SISTEMA DE DISEÑO (Design System)

> Basado en el documento oficial DESIGN.md — "The Luminous Engine"

### 7.1 Paleta de Colores
```css
:root {
  /* Fondos */
  --surface:                   #0a0e16;  /* Fondo base (más oscuro) */
  --surface-container-lowest:  #080c13;
  --surface-container-low:     #111620;
  --surface-container:         #151a23;
  --surface-container-high:    #1a2030;
  --surface-container-highest: #1f2638;
  --surface-bright:            #242c40;

  /* Acentos */
  --primary:           #8ff5ff;  /* Electric Cyan — CTAs principales */
  --primary-container: #00eefc;
  --on-primary:        #001f24;  /* Texto sobre fondo primary */
  --secondary:         #af88ff;  /* Deep Purple — chips de automatización */
  --secondary-container: rgba(175, 136, 255, 0.15);
  --tertiary:          #47c4ff;  /* Azul informativo */

  /* Estados */
  --error:    #ff716c;
  --success:  #4ade80;
  --warning:  #fbbf24;

  /* Textos */
  --on-surface:         #e8eaf0;  /* Texto principal */
  --on-surface-variant: #9ba3b8;  /* Texto secundario */
  --outline:            rgba(139, 148, 178, 0.3);
  --outline-variant:    rgba(139, 148, 178, 0.15);  /* Ghost border */

  /* Gradientes */
  --gradient-primary: linear-gradient(135deg, #8ff5ff 0%, #00eefc 100%);
  --gradient-hero:    radial-gradient(ellipse at 60% 40%, rgba(143, 245, 255, 0.08) 0%, transparent 60%),
                      radial-gradient(ellipse at 20% 80%, rgba(175, 136, 255, 0.06) 0%, transparent 50%);
}
```

### 7.2 Tipografía
**Fuente única:** Plus Jakarta Sans (Google Fonts)
```css
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');

/* Escala tipográfica */
--display-lg:   3.5rem  / -0.02em  / 800  /* Hero headline */
--display-md:   2.75rem / -0.02em  / 700  /* Section headlines */
--headline-md:  1.75rem / -0.01em  / 700  /* Bento headers */
--title-lg:     1.25rem / normal   / 600  /* Card titles */
--title-md:     1.1rem  / normal   / 600
--body-lg:      1rem    / 0.015em  / 400  /* Texto descriptivo */
--body-md:      0.9rem  / 0.015em  / 400
--label-md:     0.75rem / 0.08em   / 500  /* OVERLINES EN CAPS */
--label-sm:     0.7rem  / 0.1em    / 500
```

### 7.3 Espaciado
```css
--spacing-1:  0.25rem  (4px)
--spacing-2:  0.5rem   (8px)
--spacing-3:  0.75rem  (12px)
--spacing-4:  1rem     (16px)
--spacing-6:  1.5rem   (24px)
--spacing-8:  2rem     (32px)   /* separador interno de cards */
--spacing-12: 3rem     (48px)
--spacing-16: 4rem     (64px)
--spacing-24: 6rem     (96px)   /* separador entre secciones */
```

### 7.4 Bordes y Radios
```css
--radius-sm:   0.5rem   (8px)   /* inputs */
--radius-md:   1rem     (16px)
--radius-lg:   1.5rem   (24px)  /* CTAs pill */
--radius-xl:   2rem     (32px)  /* Bento cards */
--radius-full: 9999px           /* pill completo */
```

### 7.5 Sombras y Elevación
```css
/* Nivel 1 — Secciones internas */
--shadow-sm: 0 4px 12px rgba(0, 0, 0, 0.2);

/* Nivel 2 — Cards flotantes */
--shadow-md: 0 8px 24px rgba(0, 0, 0, 0.3);

/* Nivel 3 — Modales y dropdowns */
--shadow-lg: 0 20px 40px rgba(0, 0, 0, 0.4);

/* Glow de acento (cyan) */
--glow-primary: 0 0 20px rgba(143, 245, 255, 0.2);
--glow-secondary: 0 0 20px rgba(175, 136, 255, 0.15);
```

### 7.6 Glassmorphism
```css
/* Aplicar a: navbar, modales, dropdowns, cards flotantes */
.glass {
  background: rgba(21, 26, 35, 0.7);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid var(--outline-variant); /* Ghost border */
}
```

### 7.7 Reglas de Diseño Críticas
```
✅ DO:
- Usar shifts de fondo (surface → surface-container) para dividir secciones
- Usar backdrop-blur en navbar al hacer scroll
- CTA principal: gradiente 135° de primary a primary-container
- Bento cards: radius-xl, fondo surface-container-high, hover lift +4px
- Labels/categorías: label-md en MAYÚSCULAS con letter-spacing 0.08em
- Sombras: difusas y grandes (box-shadow: 0 20px 40px rgba(0,0,0,0.4))
- Chips de estado/automatización: secondary-container bg + secondary text

❌ DON'T:
- NO usar bordes 1px solid para separar secciones
- NO usar fondo blanco puro en ningún elemento
- NO usar sombras pequeñas y oscuras (tipo offset 2px)
- NO poner más de 3 líneas de texto en una card sin span mayor
- NO usar fuentes genéricas (Inter, Roboto, Arial)
- NO usar gradiente purple-to-white (cliché de IA)
```

---

## 8. ESTRUCTURA DE PÁGINAS Y CONTENIDO

### 8.1 Mapa del Sitio
```
makeiteasy.com.co/
│
├── # (Hero Section)
│   └── Headline + CTA + Stats de impacto
│
├── #nosotros (About)
│   └── Descripción + Misión + Visión + Diferenciadores
│
├── #servicios (Services)
│   └── 7 Servicios en Bento Grid
│
├── #proceso (Process)
│   └── Timeline 4 pasos
│
├── #planes (Pricing)
│   └── 3 planes + Tabla comparativa
│
├── #contacto (Contact)
│   └── Formulario de diagnóstico + Datos de contacto
│
├── /privacidad
│   └── Política de Privacidad (página separada)
│
└── /terminos
    └── Términos y Condiciones (página separada)
```

### 8.2 Orden de Secciones y Lógica de Flujo
```
1. HERO          → Captar atención, comunicar propuesta de valor
2. ABOUT         → Generar confianza y credibilidad
3. SERVICES      → Mostrar capacidades, despertar interés
4. PROCESS       → Reducir fricción, mostrar metodología clara
5. PRICING       → Facilitar decisión de compra
6. CONTACT       → Convertir lead con bajo compromiso (diagnóstico gratis)
```

---

## 9. COMPONENTES UI

### 9.1 Navbar
```
Estado inicial (top de página):
  background: transparent
  text: on-surface

Estado scroll (> 80px):
  background: glass (rgba(21,26,35,0.85) + blur 12px)
  border-bottom: 1px solid outline-variant
  transition: 300ms ease

Mobile (< 768px):
  Hamburger icon → Drawer/overlay con links
  Animación: slide-in desde arriba o fade
```

### 9.2 Botón Primario (CTA Principal)
```css
.btn-primary {
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-container) 100%);
  color: var(--on-primary);
  padding: 0.75rem 2rem;
  border-radius: var(--radius-full);
  font-weight: 700;
  font-size: var(--body-lg);
  letter-spacing: 0.01em;
  border: none;
  cursor: pointer;
  transition: transform 150ms ease, box-shadow 150ms ease;
}
.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: var(--glow-primary);
}
```

### 9.3 Botón Secundario (Glass)
```css
.btn-secondary {
  background: rgba(21, 26, 35, 0.4);
  backdrop-filter: blur(8px);
  border: 1px solid var(--outline-variant);
  color: var(--primary);
  padding: 0.75rem 2rem;
  border-radius: var(--radius-full);
  font-weight: 600;
  transition: border-color 150ms ease, background 150ms ease;
}
.btn-secondary:hover {
  border-color: var(--primary);
  background: rgba(143, 245, 255, 0.05);
}
```

### 9.4 Bento Card
```css
.bento-card {
  background: var(--surface-container-high);
  border-radius: var(--radius-xl);
  padding: var(--spacing-8);
  transition: transform 200ms ease, background 200ms ease;
  /* Sin bordes — la diferencia de surface crea la separación */
}
.bento-card:hover {
  transform: translateY(-4px);
  background: var(--surface-bright);
  box-shadow: var(--shadow-md);
}
```

### 9.5 Chip de Automatización
```css
.automation-chip {
  background: var(--secondary-container);
  color: var(--secondary);
  border-radius: var(--radius-full);
  padding: 0.3rem 1rem;
  font-size: var(--label-md);
  font-weight: 500;
  letter-spacing: 0.04em;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}
```

### 9.6 Input Field
```css
.input-field {
  background: var(--surface-container-low);
  border: none;
  border-radius: var(--radius-sm);
  padding: 0.875rem 1.25rem;
  color: var(--on-surface);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: var(--body-lg);
  outline: 2px solid transparent;
  transition: outline-color 150ms ease;
  width: 100%;
}
.input-field:focus {
  outline-color: var(--primary); /* Ghost border animado a 100% opacity */
}
.input-field::placeholder {
  color: var(--on-surface-variant);
}
```

---

## 10. INTEGRACIONES Y APIs

### 10.1 Formulario de Contacto
**Opción A — Propia (recomendada):**
- Endpoint: `POST /api/contact`
- Envío de email vía **Resend** (resend.com) — gratuito hasta 3,000 emails/mes
- Notificación interna + Autoreply al cliente

**Opción B — Sin backend:**
- **Formspree** (formspree.io) — hasta 50 envíos/mes gratis
- O **Netlify Forms** si se despliega en Netlify

**Estructura del payload:**
```json
{
  "nombre": "string",
  "empresa": "string",
  "cargo": "string",
  "email": "string",
  "telefono": "string",
  "empleados": "1-10 | 11-50 | 51-200 | 200+",
  "sector": "string",
  "plan_interes": "Start | Growth | Enterprise | No definido",
  "mensaje": "string",
  "privacidad_aceptada": true,
  "timestamp": "ISO8601",
  "source_page": "string"
}
```

### 10.2 WhatsApp Business
```
URL de enlace:
https://wa.me/573202682664?text=Hola%2C%20quiero%20agendar%20mi%20diagnóstico%20gratuito%20con%20Make%20it%20Easy

Nota: Requiere número con WhatsApp Business activo
Opcional: WhatsApp Business API para mensajes automáticos (fase 2)
```

### 10.3 Analytics
```javascript
// Google Analytics 4
gtag('config', 'G-XXXXXXXXXX', {
  page_title: 'Make it Easy Home',
  page_location: window.location.href
});

// Eventos de conversión críticos:
gtag('event', 'generate_lead', {
  event_category: 'Form',
  event_label: plan_interes,
  value: 1
});

gtag('event', 'whatsapp_click', {
  event_category: 'Contact',
  event_label: 'WhatsApp Button'
});

gtag('event', 'cta_click', {
  event_category: 'CTA',
  event_label: cta_text // 'hero_primary' | 'nav_cta' | 'plan_start' etc.
});
```

### 10.4 Calendly (Opcional — Fase 1.5)
```
Integración: Calendly inline embed o popup
Evento: "Diagnóstico Gratuito Make it Easy - 30 min"
Trigger: Después de enviar el formulario exitosamente
URL: calendly.com/makeiteasy/diagnostico-gratuito
```

---

## 11. REQUISITOS DE SEO Y ANALYTICS

### 11.1 SEO On-Page
| Elemento | Requisito |
|---------|-----------|
| Title tag | < 60 caracteres, incluir "Colombia" y keyword principal |
| Meta description | 150-160 caracteres, CTA implícito |
| H1 | Único por página, incluir keyword principal |
| H2-H6 | Jerarquía correcta, keywords secundarias |
| Imágenes | Alt text descriptivo, nombres de archivo con keywords |
| URL | Limpia, sin parámetros innecesarios, con HTTPS |
| Sitemap XML | Generado automáticamente (Next.js sitemap) |
| robots.txt | Configurado correctamente |
| Canonical tags | En todas las páginas |

### 11.2 Core Web Vitals (Objetivos)
```
LCP:  < 2.5s  → Optimizar imagen hero, preload de fuentes
FID:  < 100ms → Minimizar JavaScript de terceros
CLS:  < 0.1   → Definir dimensiones de imágenes, evitar shifts
```

### 11.3 Keywords Objetivo
**Primarias:**
- "automatización de procesos empresas Colombia"
- "automatización inteligente Bogotá"
- "CRM automatización Colombia"

**Secundarias:**
- "automatización con IA empresas"
- "Make it Easy automatización"
- "n8n Make Zapier Colombia"
- "integración sistemas ERP CRM Colombia"

---

## 12. SEGURIDAD

### 12.1 Formulario
- **CSRF Protection**: Token en formularios (Next.js maneja esto automáticamente)
- **Rate Limiting**: Máximo 5 envíos por IP cada 15 minutos
- **Honeypot**: Campo oculto para detectar bots automáticos
- **Sanitización**: Escapar HTML en todos los inputs antes de enviar email
- **Validación doble**: Frontend (UX) + Backend (seguridad)

### 12.2 HTTPS y Headers
```
Strict-Transport-Security: max-age=63072000; includeSubDomains
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
Content-Security-Policy: [configurar según necesidad]
```

### 12.3 GDPR / Ley 1581 de 2012 (Colombia)
- Banner de consentimiento de cookies (si se usan analytics)
- Política de privacidad obligatoria
- Opción de opt-out de cookies de analytics
- Los datos del formulario solo se guardan con consentimiento explícito

---

## 13. INFRAESTRUCTURA Y DESPLIEGUE

### 13.1 Dominio Recomendado
```
Primario:   makeiteasy.com.co
Alternativo: makeiteasy.co  /  makeiteasyautomation.com
Registro:    GoDaddy / Namecheap (dominios .co/$12 USD/año)
```

### 13.2 Hosting
| Opción | Plan | Costo | Recomendación |
|--------|------|-------|---------------|
| **Vercel** | Hobby (gratis) | $0/mes | ✅ Recomendado para Next.js |
| Netlify | Starter (gratis) | $0/mes | ✅ Buena alternativa |
| Cloudflare Pages | Free | $0/mes | ✅ Si se usa HTML estático |
| AWS / GCP | Variable | $5-20/mes | Solo si se necesita backend propio |

### 13.3 CI/CD Pipeline
```
GitHub Repository
    │
    ├── push a main → Deploy automático a producción (Vercel)
    ├── push a develop → Deploy a staging (preview URL)
    └── Pull Request → Preview URL automática para revisión
```

### 13.4 Monitoreo Post-Lanzamiento
- **Uptime**: UptimeRobot (gratis) — alertas si el sitio cae
- **Performance**: Google PageSpeed Insights (manual, quincenal)
- **Errores**: Vercel Analytics o Sentry (free tier)
- **SEO**: Google Search Console (obligatorio)

---

## 14. CRITERIOS DE ACEPTACIÓN

### 14.1 Checklist Funcional (antes de lanzar)
```
DISEÑO Y UI
[ ] Design System aplicado correctamente (colores, tipografía, espaciado)
[ ] Glassmorphism en navbar al hacer scroll
[ ] Animaciones de entrada en todas las secciones
[ ] Hover states en todos los elementos interactivos
[ ] Fondo oscuro (#0a0e16) en todo el sitio
[ ] Bento Grid en sección servicios
[ ] Plan Growth con badge "Más Popular"

FUNCIONALIDAD
[ ] Navegación smooth scroll funcionando
[ ] Formulario enviando emails a ambas cuentas
[ ] Autoreply al prospecto
[ ] Validación de formulario (cliente y servidor)
[ ] Botón de WhatsApp visible y funcional
[ ] Modal/sección de contacto pre-llenada desde Planes
[ ] Links del footer funcionando

RESPONSIVE
[ ] Desktop (1280px): layout completo
[ ] Tablet (768px): layout adaptado
[ ] Mobile (375px): una columna, menú hamburguesa
[ ] Sin overflow horizontal en ningún tamaño

RENDIMIENTO
[ ] Lighthouse Performance ≥ 90 en mobile
[ ] Lighthouse Performance ≥ 95 en desktop
[ ] LCP < 2.5s en conexión 4G simulada
[ ] Imágenes en formato WebP

SEO
[ ] Title y meta description en todos las páginas
[ ] Open Graph tags configurados (probar con og debugger)
[ ] Schema.org LocalBusiness implementado
[ ] Google Search Console verificado
[ ] Sitemap XML accesible en /sitemap.xml

SEGURIDAD
[ ] HTTPS activo
[ ] Headers de seguridad configurados
[ ] Rate limiting en formulario
[ ] Política de privacidad publicada

ANALYTICS
[ ] Google Analytics 4 instalado y verificado
[ ] Evento de lead configurado y disparándose
[ ] Evento de clic en WhatsApp configurado
```

### 14.2 Entregables Finales del Proyecto
1. **Código fuente** en repositorio privado de GitHub
2. **Sitio desplegado** en dominio definitivo con HTTPS
3. **Documento de accesos** (credenciales de Vercel, Google Analytics, dominio)
4. **Manual básico de uso** (cómo cambiar textos, qué hacer si cae el sitio)
5. **Informe de Lighthouse** con scores finales
6. **Google Search Console** configurada y verificada

---

## APÉNDICE A: PRIORIZACIÓN DE DESARROLLO (MoSCoW)

| Requisito | Must Have | Should Have | Could Have | Won't Have (v1) |
|-----------|-----------|-------------|------------|-----------------|
| Hero + CTA | ✅ | | | |
| Servicios (7) | ✅ | | | |
| Formulario de contacto | ✅ | | | |
| WhatsApp flotante | ✅ | | | |
| Planes comerciales | ✅ | | | |
| Responsive mobile | ✅ | | | |
| HTTPS | ✅ | | | |
| Google Analytics | ✅ | | | |
| Animaciones de scroll | | ✅ | | |
| Calendly embed | | ✅ | | |
| Sección proceso | | ✅ | | |
| Blog / artículos | | | ✅ | |
| Portal de clientes | | | | ✅ |
| Chat en vivo | | | | ✅ |

---

## APÉNDICE B: ESTIMACIÓN DE TIEMPOS

| Fase | Tarea | Tiempo estimado |
|------|-------|----------------|
| Setup | Configuración proyecto, repositorio, Vercel | 0.5 días |
| Design System | Variables CSS, componentes base | 1 día |
| Secciones UI | Hero, About, Services, Process | 3 días |
| Planes + Formulario | Sección precios + form con validación | 2 días |
| Integraciones | Email (Resend), WhatsApp, Analytics | 1 día |
| Responsive | Ajustes mobile y tablet | 1 día |
| SEO + Performance | Meta tags, optimización imágenes | 0.5 días |
| QA + Correcciones | Testing en navegadores, correcciones | 1 día |
| Deploy + Dominio | Configuración final en producción | 0.5 días |
| **TOTAL** | | **~10 días hábiles** |

---

*Documento preparado por Claude — Anthropic | Make it Easy — Intelligent Automation*
*Este SRS debe ser revisado y aprobado por Daniel y Cristian antes de iniciar el desarrollo.*
