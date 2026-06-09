---
name: Make It Easy
colors:
  surface: '#0e141e'
  surface-dim: '#0e141e'
  surface-bright: '#333945'
  surface-container-lowest: '#080e18'
  surface-container-low: '#161c26'
  surface-container: '#1a202a'
  surface-container-high: '#242a35'
  surface-container-highest: '#2f3540'
  on-surface: '#dde2f1'
  on-surface-variant: '#bbc9cd'
  inverse-surface: '#dde2f1'
  inverse-on-surface: '#2b313c'
  outline: '#859397'
  outline-variant: '#3c494c'
  surface-tint: '#2fd9f4'
  primary: '#8aebff'
  on-primary: '#00363e'
  primary-container: '#22d3ee'
  on-primary-container: '#005763'
  inverse-primary: '#006877'
  secondary: '#d2bbff'
  on-secondary: '#3e0889'
  secondary-container: '#572ea2'
  on-secondary-container: '#c6aaff'
  tertiary: '#66f796'
  on-tertiary: '#003919'
  tertiary-container: '#45da7d'
  on-tertiary-container: '#005b2c'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#a2eeff'
  primary-fixed-dim: '#2fd9f4'
  on-primary-fixed: '#001f25'
  on-primary-fixed-variant: '#004e5a'
  secondary-fixed: '#eaddff'
  secondary-fixed-dim: '#d2bbff'
  on-secondary-fixed: '#25005a'
  on-secondary-fixed-variant: '#552ca0'
  tertiary-fixed: '#6dfe9c'
  tertiary-fixed-dim: '#4de082'
  on-tertiary-fixed: '#00210c'
  on-tertiary-fixed-variant: '#005227'
  background: '#0e141e'
  on-background: '#dde2f1'
  surface-variant: '#2f3540'
  surface-card: '#161E2C'
  border-glass: rgba(255, 255, 255, 0.1)
  bg-workspace: '#0B111B'
  text-primary: '#FFFFFF'
  text-secondary: '#94A3B8'
typography:
  headline-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 8px
  container-max: 1440px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 40px
---

## Brand & Style
The design system embodies a high-tech, professional atmosphere centered on the themes of AI-driven automation and seamless efficiency. It is designed to evoke a sense of intelligent "ease"—transforming complex workflows into effortless digital experiences.

The visual style is **Modern Corporate with Glassmorphism touches**. It balances the stability of deep enterprise blues with the energetic pulse of vibrant teals and purples. The aesthetic prioritizes data clarity and functional sophistication, utilizing blurred surfaces to create a sense of depth and modern innovation without sacrificing the professional rigor required for CRM and sales tools.

## Colors
The palette is optimized for a high-contrast dark mode. 
- **Primary (Cyan):** Used for primary actions, active AI states, and focus indicators. 
- **Secondary (Purple):** Reserved for automation flows, magical "AI moments," and secondary brand highlights.
- **Tertiary (Green):** Specifically for success states, growth metrics, and "Go-live" indicators.
- **Neutral:** The background uses a deep navy-black (`#0B111B`) to allow vibrant accents to pop. Surface levels are built using semi-transparent overlays or slightly lighter navy shades to maintain a structured workspace hierarchy.

## Typography
The system uses **Plus Jakarta Sans** for headlines to provide a modern, slightly geometric character that feels welcoming yet technical. **Inter** is used for all functional body text and interface labels due to its exceptional legibility in data-heavy environments. 

Headlines should utilize tight letter-spacing for a "locked-in" professional look. Labels for automation nodes or CRM fields use semi-bold weights to ensure visibility against dark backgrounds.

## Layout & Spacing
The design system employs a **12-column fluid grid** for dashboard views and a **fixed-center grid** for marketing or landing pages. 

- **Workspace:** Uses a sidebar-driven layout with a fixed left navigation (240px) and a fluid content area.
- **Rhythm:** An 8px linear scale governs all padding and margins. 
- **Reflow:** On mobile, the 12-column grid collapses to a single column, and horizontal margins reduce to 16px. Sidebar menus transition into a bottom-sheet navigation or full-screen overlay.

## Elevation & Depth
Depth is created through **Glassmorphism** and **Tonal Layering** rather than traditional heavy shadows.

- **Level 1 (Base):** Deep Navy (`#0B111B`).
- **Level 2 (Cards/Modules):** Slightly lighter navy with a 1px subtle border (`rgba(255, 255, 255, 0.05)`).
- **Level 3 (Modals/Popovers):** Semi-transparent background (70% opacity) with a `backdrop-filter: blur(12px)`. These elements should have a subtle top-down inner glow to simulate a light source from above.
- **Shadows:** When used, shadows are highly diffused and tinted with the primary cyan or secondary purple to simulate "glow" from UI elements.

## Shapes
A **Rounded (0.5rem / 8px)** corner radius is the standard for the design system. This provides a professional balance between friendly accessibility and technical precision.

- **Primary Buttons:** Use a slightly higher roundedness (up to 12px) to make them feel more tactile.
- **Input Fields:** Maintain the standard 8px radius.
- **AI Agent Avatars:** Use full pill-shapes (circles) to differentiate "entities" from "containers."

## Components
- **Buttons:** Primary buttons use a solid Teal gradient. Secondary buttons use a "Ghost" style with a 1px border and a subtle purple hover glow.
- **AI Agents:** Represented by glowing circular containers with high-contrast icons. Use a "pulse" animation for active processing states.
- **Automation Nodes:** Rectangular cards with 8px radius, featuring a left-accent border color-coded by function (Purple for Logic, Cyan for Action, Green for Result).
- **Input Fields:** Dark backgrounds with a 1px border that glows Cyan on focus. Labels sit clearly above the field in `label-sm` uppercase.
- **Chips:** Small, low-opacity pills used for CRM status tags (e.g., "Lead," "Contacted") with high-contrast text.
- **Icons:** Use **Material Symbols Outlined** with a 2px stroke. Icons for Automation (workflow), CRM (users), Sales (trending-up), and AI Agents (sparkles/robot) should follow a consistent weight and color theme.