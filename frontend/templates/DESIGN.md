---
name: Fiery Precision
colors:
  surface: '#f9f9f9'
  surface-dim: '#dadada'
  surface-bright: '#f9f9f9'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3f3'
  surface-container: '#eeeeee'
  surface-container-high: '#e8e8e8'
  surface-container-highest: '#e2e2e2'
  on-surface: '#1a1c1c'
  on-surface-variant: '#5b403d'
  inverse-surface: '#2f3131'
  inverse-on-surface: '#f1f1f1'
  outline: '#906f6c'
  outline-variant: '#e4beb9'
  surface-tint: '#bb171c'
  primary: '#b7131a'
  on-primary: '#ffffff'
  primary-container: '#db322f'
  on-primary-container: '#fffbff'
  inverse-primary: '#ffb4ac'
  secondary: '#5f5e5e'
  on-secondary: '#ffffff'
  secondary-container: '#e2dfde'
  on-secondary-container: '#636262'
  tertiary: '#7b5500'
  on-tertiary: '#ffffff'
  tertiary-container: '#9b6b00'
  on-tertiary-container: '#fffbff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdad6'
  primary-fixed-dim: '#ffb4ac'
  on-primary-fixed: '#410002'
  on-primary-fixed-variant: '#93000d'
  secondary-fixed: '#e5e2e1'
  secondary-fixed-dim: '#c8c6c5'
  on-secondary-fixed: '#1b1c1c'
  on-secondary-fixed-variant: '#474746'
  tertiary-fixed: '#ffdeac'
  tertiary-fixed-dim: '#ffba38'
  on-tertiary-fixed: '#281900'
  on-tertiary-fixed-variant: '#604100'
  background: '#f9f9f9'
  on-background: '#1a1c1c'
  surface-variant: '#e2e2e2'
typography:
  display-lg:
    fontFamily: Hanken Grotesk
    fontSize: 48px
    fontWeight: '800'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Hanken Grotesk
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
  headline-lg-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  title-md:
    fontFamily: Hanken Grotesk
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-caps:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  gutter: 16px
  margin-mobile: 16px
  margin-desktop: 48px
  container-max: 1280px
---

## Brand & Style
The design system is engineered to capture the intense energy of "Bul-mat" (smoky fire flavor) while maintaining the analytical rigor of an AI-driven discovery platform. The brand personality is **authoritative, energetic, and precise**. It targets food enthusiasts who seek data-backed recommendations rather than mere subjective reviews.

The visual style is **Modern-Analytical**. It balances high-impact color blocks with a structured, information-heavy layout. It avoids decorative "fluff" in favor of functional density, using sharp edges and high-contrast elements to evoke a sense of expertise and technical sophistication. The emotional response should be one of trust in the "science" of flavor.

## Colors
This design system utilizes a high-contrast palette to drive hierarchy and brand recognition.

- **Primary (Deep Red):** Used for critical actions, brand accents, and indicating "Intensity" or "Spiciness" levels. It represents the heat and energy of the dish.
- **Secondary (Charcoal Black):** Used for navigation bars, headers, and primary typography to provide a professional, grounded foundation.
- **Tertiary (Flame Amber):** Specifically reserved for AI analysis highlights, rating stars, and "Expert Choice" badges to contrast against the red.
- **Surface Palette:** Employs a range of cool grays (`#F5F5F5` to `#EEEEEE`) to create distinct "data zones" similar to the provided reference map, ensuring legibility in information-dense views.

## Typography
The typography strategy prioritizes **clarity and technical authority**. 

- **Hanken Grotesk** is used for all headlines and brand moments. Its geometric precision conveys modernity and professional "discovery."
- **Inter** serves as the primary workhorse for body copy and restaurant lists, ensuring maximum legibility at small sizes across map interfaces.
- **JetBrains Mono** is introduced for "Analytical Labels" (e.g., AI score, sodium levels, distance data). The monospaced nature of the font reinforces the data-driven, systematic nature of the product.

## Layout & Spacing
The layout follows a **structured grid system** inspired by information dashboards and geographical maps.

- **Grid System:** A 12-column fixed grid for desktop to house side-by-side analytical panels and map views. Mobile uses a single-column fluid layout with bottom-sheet interactions.
- **Information Partitioning:** Use heavy borders (1px to 2px) and distinct background fills to separate regional data, mimicking the "box-out" style of the reference image.
- **Density:** The design favors high information density. Spacing between list items is tight (8px to 12px) to allow users to scan multiple restaurant options without excessive scrolling.

## Elevation & Depth
To maintain an "analytical" and "mapped" feel, the design system avoids soft, organic shadows. Instead, it uses **architectural layering**:

- **Flat Planes:** Most content exists on a flat plane with 1px borders (`#E0E0E0`) to define boundaries.
- **Hard Offsets:** Use 2px to 4px hard black shadows (0% blur) for primary buttons or "active" cards to give them a tactile, "pressed" quality.
- **Z-Axis Hierarchy:** The map is the base layer (Z-0). Information panels sit at Z-10 with sharp, high-contrast borders. Overlays and AI insights use the Charcoal Black background to "punch out" from the lighter map interface.

## Shapes
The shape language is **industrial and disciplined**. 

- **Sharp Corners:** A base radius of `4px` (Soft) is used for containers and cards to maintain a precise, professional look. 
- **Interactive Elements:** Buttons and input fields use the same `4px` radius. Avoid pill shapes or high roundedness, as they conflict with the "analytical" and "authoritative" brand persona.
- **Iconography:** Use thick-stroke (2pt minimum) icons with "capped" ends. Icons should be strictly functional, representing heat, location, and data metrics.

## Components
- **Action Buttons:** Primary buttons are Solid Charcoal Black with White text, or Solid Red with White text. Use a "Hard Offset" shadow on hover to simulate physical pressing.
- **Data Chips:** Small, rectangular chips with `JetBrains Mono` text. Use color-coding for spiciness (Light Red to Deep Red) and AI reliability scores (Amber).
- **Restaurant Cards:** Highly structured with a 1px border. The header of the card should include the restaurant name in `Hanken Grotesk`, followed by a "Data Row" featuring monospaced labels for distance and AI rating.
- **Regional Header:** Inspired by the reference map, regional headers (e.g., "서울", "경기도") should be inverted: White text on a Charcoal Black rectangular background.
- **AI Analysis Panel:** A specialized component using a slightly tinted background (5% Red) to distinguish "Automated Insight" from general user reviews.