# Design System Strategy: Intelligent Automation

## 1. Overview & Creative North Star
The Creative North Star for this design system is **"The Luminous Engine."** 

Unlike standard enterprise software that feels rigid and utilitarian, this system treats intelligent automation as a sophisticated, living machinery. We break the "template" look by moving away from flat, boxed containers in favor of an editorial, high-end digital experience. This is achieved through **Tonal Depth Layering**, where hierarchy is defined by light and translucency rather than lines. The goal is to create a sense of "Enterprise Grade" reliability combined with "Modern Tech" agility—using expansive whitespace, intentional asymmetry in Bento-style grids, and sharp, high-contrast typography scales.

---

## 2. Colors
Our palette is rooted in the "Deep Space" spectrum, utilizing high-chroma accents to guide the user’s eye through complex data.

### The Palette
- **Foundations:** `surface` (#0a0e16) and `surface_container` (#151a23).
- **Accents:** `primary` (#8ff5ff - Electric Cyan) and `secondary` (#af88ff - Deep Purple).
- **States:** `error` (#ff716c) for critical alerts, and `tertiary` (#47c4ff) for informational highlights.

### Semantic Rules
*   **The "No-Line" Rule:** We explicitly prohibit 1px solid borders for sectioning. Divisions must be achieved through background shifts. For example, a `surface_container_low` section should sit directly against a `surface` background to create a clean, architectural break.
*   **Surface Hierarchy & Nesting:** Treat the UI as physical layers. Use `surface_container_lowest` for the deepest background, and `surface_container_highest` for the most prominent interactive cards.
*   **The "Glass & Gradient" Rule:** Floating elements (modals, dropdowns, navigation) must utilize Glassmorphism. Use semi-transparent `surface_variant` colors with a `backdrop-blur` effect to allow the "Luminous Engine" to glow through the interface.
*   **Signature Textures:** Main CTAs should not be flat. Use a subtle linear gradient transitioning from `primary` (#8ff5ff) to `primary_container` (#00eefc) at a 135-degree angle to provide a premium, tactile quality.

---

## 3. Typography
We use **Plus Jakarta Sans** as our sole typeface. Its geometric precision and wide apertures provide a tech-forward, authoritative voice.

*   **Display Scale (`display-lg` at 3.5rem):** Reserved for hero value propositions. Use tight letter-spacing (-0.02em) to create a "locked-in" editorial feel.
*   **Headline Scale (`headline-md` at 1.75rem):** Used for Bento Box headers. These should be high-contrast (`on_surface`) to ensure immediate legibility.
*   **The Body-Label Relationship:** `body-lg` (1rem) is for primary descriptive text. Use `label-md` (0.75rem) in all-caps with increased letter-spacing for "Overlines" or "Categories" to create a clear vertical hierarchy.
*   **Visual Identity:** The contrast between the massive Display type and the refined, small Labels conveys a sense of scale and precision—essential for an "Intelligent Automation" platform.

---

## 4. Elevation & Depth
In this system, depth is a functional tool, not a decoration. We mimic the behavior of light passing through frosted glass.

*   **The Layering Principle:** Stack surfaces to create focus.
    *   *Level 0:* `surface` (The Base)
    *   *Level 1:* `surface_container_low` (In-page sections)
    *   *Level 2:* `surface_container_highest` (Interactive cards)
*   **Ambient Shadows:** For floating components, use an extra-diffused shadow: `box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4)`. The shadow must never be pure black; it should feel like a deep navy occlusion of the background.
*   **The "Ghost Border":** If a container requires further definition (e.g., in high-density data views), use the `outline_variant` token at 15% opacity. This creates a "glint" on the edge of the glass rather than a heavy stroke.
*   **Glassmorphism:** Apply a `backdrop-filter: blur(12px)` to any element with a `surface_variant` background to ensure the background "glow" of the navy and charcoal colors creates a cohesive atmosphere.

---

## 5. Components

### Buttons
*   **Primary:** `primary` background, `on_primary` text. Corners: `full` (pill-shape) or `md` (1.5rem). High-contrast is mandatory for CTAs.
*   **Secondary:** Glass-style. `surface_variant` with 40% opacity, `backdrop-blur`, and a Ghost Border.
*   **Tertiary:** Text-only using `primary` color with a subtle underline on hover.

### Bento-Box Cards
*   **Style:** Corners set to `lg` (2rem). Background: `surface_container_high`. 
*   **Rule:** Forbid divider lines. Use `spacing-8` (2.75rem) to separate internal card content.
*   **Interaction:** On hover, the card should shift to `surface_bright` with a 4px vertical lift.

### Input Fields
*   **Style:** Minimalist. No bottom line. Instead, use a `surface_container_low` background with `sm` (0.5rem) rounded corners.
*   **States:** On focus, the Ghost Border should animate to 100% opacity using the `primary` (cyan) color.

### Automation Chips
*   **Purpose:** To show active workflows or status.
*   **Style:** Semi-transparent backgrounds using `secondary_container` with `secondary` text. This "Purple Glow" distinguishes automated processes from manual ones.

---

## 6. Information Hierarchy & Visual Trust

To mirror the "Visual Trust" of the reference, the layout must follow a **Value-First Architecture**:

1.  **Direct Value Props:** Use the `display-md` scale to state exactly *what* the automation does. No fluff.
2.  **Evidence Layers:** Below the value prop, use a Bento Box grid to display "Features" or "Integrations." Each box must contain one clear icon and one `title-md` headline.
3.  **Social Proof:** Place partner logos in a dedicated `surface_container_low` band. Use a greyscale filter at 50% opacity, shifting to full color on hover to maintain a "Sophisticated Enterprise" aesthetic.

### Do's
*   **Do** use asymmetrical spacing to create a rhythmic, editorial flow.
*   **Do** use `backdrop-blur` on navigation bars to maintain the "Luminous Engine" feel.
*   **Do** prioritize `primary` (Electric Cyan) for path-to-purchase actions.

### Don'ts
*   **Don't** use 1px solid borders to separate sections.
*   **Don't** use standard "drop shadows" (small blur, high opacity).
*   **Don't** clutter the Bento Box cards; if a card has more than 3 lines of text, it needs a larger grid span.
*   **Don't** use pure white backgrounds. The darkest `surface` (#0a0e16) is our home.