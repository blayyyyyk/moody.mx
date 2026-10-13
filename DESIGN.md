---
version: alpha
name: moody.mx
description: A personal computing environment and experimental portfolio in equal measure.
colors:
  primary: "hsl(0 0% 9%)"
  primary-foreground: "hsl(0 0% 98%)"
  secondary: "hsl(0 0% 96.1%)"
  secondary-foreground: "hsl(0 0% 9%)"
  background: "hsl(0 0% 100%)"
  foreground: "hsl(0 0% 3.9%)"
  muted: "hsl(0 0% 96.1%)"
  muted-foreground: "hsl(0 0% 45.1%)"
  accent: "hsl(0 0% 96.1%)"
  accent-foreground: "hsl(0 0% 9%)"
  border: "hsl(0 0% 89.8%)"
  ring: "hsl(0 0% 3.9%)"
  blue-400: "oklch(70.7% 0.165 254.624)"
  blue-500: "oklch(62.3% 0.214 259.815)"
  glitch-pink: "#e68be7"
  glitch-green: "#68f5b3"
  glitch-cyan: "#6df3ff"
typography:
  mono:
    fontFamily: '"JetBrains Mono", ui-monospace, monospace'
  hero:
    fontSize: 200px
    fontWeight: 600
  hero-mobile:
    fontSize: 48px
    fontWeight: 600
  section:
    fontSize: 96px
    fontWeight: 500
    lineHeight: 1
  section-mobile:
    fontSize: 48px
    fontWeight: 500
    lineHeight: 1
  project-title:
    fontSize: 30px
    fontWeight: 300
    lineHeight: 36px
  body:
    fontSize: 16px
    fontWeight: 400
    lineHeight: 24px
  compact:
    fontSize: 14px
    lineHeight: 20px
  small:
    fontSize: 12px
    lineHeight: 16px
  micro:
    fontSize: 10px
rounded:
  none: 0px
spacing:
  divider: 1px
  1: 4px
  2: 8px
  3: 12px
  4: 16px
  6: 24px
  12: 48px
components:
  button-default:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.primary}"
    rounded: "{rounded.none}"
    height: 36px
    typography: "{typography.compact}"
  button-default-hover:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.secondary}"
  button-link:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.primary}"
    rounded: "{rounded.none}"
    height: 36px
  button-link-hover:
    backgroundColor: "{colors.blue-500}"
    textColor: "{colors.primary}"
  badge-outline:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.primary}"
    rounded: "{rounded.none}"
  badge-filled:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.secondary}"
    rounded: "{rounded.none}"
  detail-trigger:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.primary}"
    rounded: "{rounded.none}"
  detail-drawer:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.primary}"
    rounded: "{rounded.none}"
---

# Design System: moody.mx

## Overview

**Reviewed with Blake on 2026-10-12.** All eight sections approved, including square-edged interface handles and separators as a requirement for future updates.

**Creative North Star: "Computing as a creative medium"**

A personal computing environment and an experimental portfolio in equal measure. Dense, precise information coexists with playful procedural graphics and expressive photography; neither side should be polished away.

Computing and creativity are equally important to Blake. The interface makes that relationship visible: a precise, monospace, thin-bordered framework holds an animated ASCII landscape, glitch typography, interactive wireframe objects, research details, and full-color photography. Preserve both the technical clarity and the handmade, exploratory character.

### Authority and change boundaries

- **Confirmed intent** is binding guidance established with Blake during the design interview. It outranks an accidental implementation detail.
- **Current baseline** describes the inspected implementation, not a promise that every measurement is permanent. Preserve the character while tuning sizes, spacing, reflow, and touch targets to suit content and viewport.
- **Confirmed intent — implementation gap** identifies a requirement Blake approved that the inspected site does not yet consistently implement. Do not describe those requirements as already shipped.
- **Provisional** means the present implementation is not an approved design rule. Preserve unrelated behavior while resolving it; ask when the resolution would change a protected feature.

**Protected signatures:** replacing the ASCII landscape and perimeter text, oversized glitching headings, square thin-bordered panels, interactive wireframe objects, or dense information/photo mosaic requires Blake's approval. Drawers and carousels are also protected interaction patterns. Routine refinements within those patterns do not require approval for every pixel.

**The Character-over-Measurements Rule.** Keep the relationships that identify the site: large headings against compact information, dense panels against open graphic areas, restrained interface color against vivid photographs. Existing measurements are the starting point for those relationships, not a reason to clip content or obscure controls.

### Scope and implementation map

This document covers the existing single-page portfolio and its in-page detail surfaces. Evidence was inspected on 2026-10-12: repository source, the deployed site at 1440 × 1000 and 390 × 844, both theme palettes, and desktop project/photo drawers. It is not a claim of exhaustive browser or accessibility testing.

- Theme roles and general typography: `styles/globals.css`; Tailwind mappings and carousel foundations: `src/app/globals.css`.
- Heading animation: `src/app/clientComponents/heading.tsx` and `styles/Home.module.css`.
- ASCII hero, perimeter text, and identity links: `src/app/clientComponents/{background,banner,links,splash}.tsx`.
- Section composition: `src/app/page.tsx`, its `clientComponents`, and its `serverComponents`.
- Shared controls: `src/components/ui`; inspect the actual consumer before adopting a library default. Several generic primitives retain rounded corners that the portfolio overrides.

The frontmatter records the light-theme baseline and observed type/spacing vocabulary. The theme table below supplies the corresponding dark values. The format does not encode responsive or theme switching by itself; consumers must apply the rules in this document. `.impeccable/design.json` is a companion preview and extension record, not a competing source of design intent.

## Colors

**Confirmed intent:** light and dark are equally authoritative. Both use a neutral interface; photographs, blue link treatments, and short colored glitches provide the principal color accents.

### Roles and themes

The names follow the existing CSS, even where they differ from conventional design-system naming:

- `primary` is the principal **ink and strong border**, not a colorful CTA fill.
- `secondary` is the **main page/panel surface**. Most visible portfolio surfaces use this rather than `background`.
- `foreground` and `background` remain base/library roles. They must not silently replace the more subdued primary/secondary pairing throughout the site.
- `muted-foreground` supports descriptions and secondary information.
- Strong panel outlines use `primary`; the generic `border` role is more subdued and is not a substitute for the signature visible grid.
- `ring` provides the shared control focus treatment.

Light values are in the frontmatter. Apply these dark values to the same semantic roles when `.dark` is active:

| Role | Dark value |
| --- | --- |
| `primary` | `hsl(0 0% 80%)` |
| `primary-foreground` | `hsl(0 0% 9%)` |
| `secondary` | `hsl(0 0% 12%)` |
| `secondary-foreground` | `hsl(0 0% 98%)` |
| `background` | `hsl(0 0% 3.9%)` |
| `foreground` | `hsl(0 0% 98%)` |
| `muted` | `hsl(0 0% 14.9%)` |
| `muted-foreground` | `hsl(0 0% 63.9%)` |
| `accent` | `hsl(0 0% 14.9%)` |
| `accent-foreground` | `hsl(0 0% 98%)` |
| `border` | `hsl(0 0% 14.9%)` |
| `ring` | `hsl(0 0% 83.1%)` |

The inspected CSS gives `card` and `popover` the same values as `background`, and their foreground roles the same values as `foreground`. Their existence does not authorize a separate visual style for portfolio panels. Destructive and chart palettes exist in the stylesheet, but are not evidence of a site-wide red treatment or chart language.

### Accent behavior

- Text links use Tailwind's `blue-400`, normally underlined; the global hover treatment removes the underline.
- Social-link buttons and the publication link bar use `blue-500` on hover. This blue exception is deliberate, not a mismatch to normalize into monochrome.
- Heading afterimages briefly use the three `glitch-*` colors plus white. Keep these colors tied to the effect rather than spreading them into persistent card backgrounds or badges.
- Photographs retain their original color. The neutral frame allows the images to supply their own palette.

**Current baseline:** the theme provider starts from the system preference. The hero has a direct toggle; the navigation offers Light, Dark, and System. It disables transitions during theme changes. Some wireframe materials read CSS colors only on mount; verify their appearance after a theme change rather than treating stale material colors as intentional.

## Typography

**Confirmed intent:** JetBrains Mono is the main typographic voice, including the ASCII landscape. Its precision connects the research and technical metadata to the procedural graphics. Keep the contrast between oversized section labels and dense information.

The frontmatter's size roles inherit `typography.mono` on the main page. They describe observed roles rather than new CSS variable names.

| Role | Application and responsive behavior |
| --- | --- |
| Hero | Lowercase `blake`; use `hero-mobile` below `sm` and `hero` from `sm`. The subdued `moody.mx` line sits beneath it, currently at 20% opacity and a heavier weight. |
| Section | Use `section-mobile` below `sm`, then `section`; retain the outlined, full-width heading band and intermittent glitch layers. |
| Project title | Compact card headline; lighter weight than the identity treatment. Publication titles share the size but not necessarily the light weight. |
| Body | Project descriptions, publication abstracts, and general prose. |
| Compact | About descriptions, navigation, and ordinary control text. |
| Small | Dense course descriptions, supporting labels, and footer copy. |
| Micro | Project topic badges and perimeter text. Avoid using this scale for essential reading or unnamed touch controls. |

General markdown headings currently scale from 36px to 60px for `h1`, 24px to 36px for `h2`, and 20px to 24px for `h3` at `lg`. These reading headings are distinct from the display `Heading` component. Paragraphs generally use left alignment on phones and justification from `sm`, while several cards explicitly retain left alignment. Preserve reading order and legibility when adjusting wrapping.

### Font exceptions and accessibility

- Inter is loaded by the root layout, and Plus Jakarta Sans is attached to some expanded project content. Much of that content is overridden by global monospace rules. An import alone is not proof of an intended type hierarchy.
- **Provisional:** sans-serif metadata in the photo drawer. Blake has not adopted this discrepancy as a design rule; inspect the inherited font before extending it to new components.
- **Confirmed intent — implementation gap:** each glitch heading must have one meaningful accessible announcement. Decorative duplicate layers should be hidden from assistive technology, while the visible effect and appropriate heading semantics remain. The current component repeats the text in four `div` elements inside a `span`.
- Long names and headings may reflow or scale to fit. The desktop/mobile sizes are adjustable; clipping is not part of the signature.

## Layout

**Confirmed intent:** use the available width and retain a dense, exploratory composition. Open space around wireframe objects is equally intentional: those areas counterbalance the compact information rather than serving as empty slots to fill.

### Spatial baseline

- The hero occupies the viewport height; section content follows in one continuous page.
- Section gutters, panel gaps, and many internal paddings share `spacing.3`. Thin dividers use `spacing.divider`.
- About's text blocks use the larger `spacing.6` padding from `CardHeader`. This is an existing local variation, not a requirement that every panel use the same inset.
- Grid cells and frames align to square edges. Compact full-width action bars anchor panel bottoms.
- Tailwind's active responsive thresholds are `sm` 640px, `md` 768px, and `lg` 1024px. Use these as existing breakpoints, not evidence that every layout must change at all three.

### Section composition

| Surface | Current larger-screen arrangement | Current narrow-screen adaptation |
| --- | --- | --- |
| Navigation | Sticky full-width strip; five section links and a narrower theme cell from `md`. | Three columns over two rows, including the theme cell. |
| About | Two adjacent panels: text and portrait; approximately half-viewport height from `md`. | Portrait precedes text; text flows vertically. |
| Publications | Text occupies two thirds, wireframe book one third from `md`; row height is half the viewport. | Publication and book stack into two rows; abstract hidden below `sm`. Fixed height currently clips metadata. |
| Timeline | Program accordion at left; two-row course carousel and GPU display at right from `md`. | Carousel moves inside the selected accordion content; controls retain in-page exploration. |
| Projects | Horizontal carousel: one card below `md`, two from `md`, three from `lg`; tall narrow arrow rails. | One card between the rails, with detail-trigger text currently hidden below `md`. |
| Photos | Three-column mixed-size mosaic, with recurring two-column/two-row images and separated frames from `sm`. | Keeps three columns and the mixed-size pattern, using hairline gutters, shorter rows, and overlay expand controls. |

The actual section order is About → Publications → Timeline → Projects → Photos. Navigation currently lists Timeline before Publications; this ordering difference has not been established as a design principle.

**Confirmed intent — implementation gap:** keep mobile recognizably the same site while allowing reflow, readable labels, and larger touch targets. Fixed-height clipping, obscured metadata, and inaccessible icon controls are not protected. The mobile Publications preview is a concrete example to resolve rather than reproduce.

### Photo framing

**Confirmed intent:** mosaic previews may crop images to fill their cells. Detail views must make the complete photograph accessible, preserve its aspect ratio and original color, and retain technical metadata. This lets previews form an expressive composition without sacrificing the photograph itself.

**Current baseline:** previews use cover cropping. Detail views stack the image and metadata below `lg`, and place them side by side from `lg`. The larger image is sized by height on desktop, which can exceed available width. Complete uncropped access is an approved requirement, not a claim that every current drawer already satisfies it.

## Elevation & Depth

The interface is predominantly flat and line-defined. Borders, contrasting surfaces, size, and alignment establish the hierarchy; the graphics provide literal and animated depth.

- Main content panels share the page surface rather than appearing as floating sheets.
- Drawers and dialogs overlay the page with a black scrim at 80% opacity. Preserve enough context for visitors to understand that they are inspecting an item within the same page.
- Sticky navigation sits above section content; detail overlays sit above both. Current layers use navigation `z-20` and modal `z-50`.
- Existing localized shadows occur on shared buttons, course cards/carousel viewports, and the portrait credit strip. They are implementation evidence, not a mandate to add shadows to every panel or a basis for claiming the site is completely shadow-free.
- Wireframe book/GPU forms use a surface-colored mesh and theme-colored edges, with open space around them. Keep this graphic breathing room when adjusting the surrounding density.

## Shapes

**Confirmed intent:** square, thin-bordered panels are a protected signature. Rectangular cards, topic tags, navigation cells, links, detail sheets, and controls belong to the same sharp-edged vocabulary. Apply square interface geometry throughout, including small handles and separators.

- Use `rounded.none` for portfolio panels and rectangular controls. Generic library radii are not visual authority for these surfaces.
- Strong dividers and panel outlines currently use a 1px primary-colored stroke. Preserve their fine-line character when accommodating display or accessibility needs.
- Lucide outline icons support metadata and actions; existing common sizes are 12px for badge icons and 16px for controls. Keep icon stroke and text color coordinated across themes and hover states.
- **Confirmed intent — implementation gap:** the current circular metadata separators and rounded drawer drag handle must become square-edged equivalents when those surfaces are updated. Their current rounding is not an approved exception. This interface rule does not alter the subjects of photographs or the modeled geometry of graphic objects.

## Components

### ASCII hero and perimeter text

The opening screen is a piece of creative computing, not merely a background behind a conventional introduction. Preserve the procedural ASCII landscape, centered lowercase identity, subdued domain line, moving perimeter text, and compact identity links.

**Current baseline:** `background.tsx` renders an animated noise-based plane through an ASCII effect using ` .:*o&8@B`, with pointer input affecting the surface. The perimeter has four moving edges, including rotated text, at a configured speed of 15. The hero's link grid is two by two and approximately 250px wide, with a small theme toggle above it.

These mechanisms explain the current appearance; their exact shader constants are not frozen design tokens. Changes should retain the ASCII material, movement, framing, and balance with the identity text.

### Glitch headings and motion

Headings remain readable for most of an 8.2-second cycle, then briefly shake and separate into colored afterimages. The current easing is `cubic-bezier(.36,.07,.19,.97)`, with the main burst concentrated near the end of the cycle. Preserve this intermittent character rather than turning all text into a constant distortion.

Wireframe objects rotate and bob at rest, then orient toward pointer position on hover. The shared mesh currently uses a 0.1 interpolation factor and a rotation accumulator advancing at 1.5 radians per second. Photo previews fade in over one second; photo metadata tickers pause on hover. These are observed motion baselines, not universal durations for every interaction.

**Confirmed intent — implementation gap:** honor reduced-motion preferences with static or gentler equivalents that retain the layout and signature imagery. Normal mode keeps the expressive animation. The inspected custom effects do not yet consistently implement this preference. Pointer-only embellishments must not be necessary to access the associated information.

### Buttons, links, and navigation

- **Default/outline:** neutral surface with primary text; hover reverses ink and surface. Outline controls retain the fine border.
- **Link buttons:** primary text on the page surface, with deliberate blue hover fill. Ordinary text links use the blue text treatment described in Colors.
- **Focus:** the shared Button includes a 3px ring at half-opacity using the ring role and a focus border. Preserve visible focus when specializing controls.
- **Disabled:** shared buttons reduce opacity to 50% and suppress pointer events. Carousel arrows may use this when the carousel is not looping.
- **Active/selected:** there is no verified site-wide pressed or active-section design contract. Theme choice is offered through a menu; do not infer a colored active navigation state from the unused theme palettes.

The navigation remains an explicit grid of section links after scrolling past the hero. Its phone layout is still the visible two-row grid rather than a hidden menu. No forms or text-input patterns are currently established by the inspected portfolio.

### Badges and compact information

Use small, square metadata labels close to the content they describe. Project topics are outlined and especially compact. Course cards mix outlined people labels with filled location/date labels; publication metadata uses outlined tags and inline icons. These variants express compact information grouping, not a new semantic color palette.

Keep metadata readable and allow wrapping at the group level. Essential information should remain accessible when a preview omits it. Avoid treating unknown or invalid data as visual content: the observed project drawer's `Invalid Date` labels are a data issue, not a styling convention.

### Cards, accordions, and carousels

Cards are frames for substantive content: titles, descriptions, topic/metadata labels, and a bottom detail action. Maintain the dense presentation and full-width action bars. Existing project-card heights align across a carousel row.

The timeline's single-open, collapsible program accordion reveals the selected program and its courses. The course carousel loops; the project carousel uses previous/next controls and supports horizontal exploration. Keep those patterns rather than replacing them with an unapproved long list or separate detail pages.

**Current baseline:** course descriptions have internal scrolling; project and publication previews constrain content differently. These local treatments are not a reason to clip information without a usable path to the full content.

### Detail triggers, drawers, and dialogs

- Project and photo detail triggers open square-edged bottom drawers with a primary top border and page-colored surface. Current measured drawer height is capped at 80vh even where a consumer requests five-sixths height.
- Trigger bars pair an expand icon with lightweight text. Hover reverses colors and enlarges the icon to about 130%. Some labels are currently hidden below `md`.
- Project drawers show the repository link, metadata, topics, and rendered README, including code/math where supplied.
- Photo drawers show the larger photograph, technical metadata, and a camera graphic.
- **Implementation distinction:** active course cards in `project.tsx` open centered Radix dialogs. Other course/program drawer helpers also exist in the source. Preserve the active in-page dialog pattern rather than assuming every detail view slides from the bottom.
- Escape dismissal was verified for desktop project/photo drawers. Preserve appropriate focus entry, confinement while modal, return to the invoking control, and keyboard dismissal when modifying modal primitives; verify behavior instead of assuming wrapper usage guarantees it.

### Imagery, wireframes, and loading

Use the existing portrait, authored photographs, and relevant technical/personal objects as the visual material. The portrait retains its visible photographer credit. Photographs are not neutralized to match the interface; their color and varied subjects are part of its expression.

The wireframe book beside Publications and GPU alongside Timeline retain substantial open space. Their role is expressive as well as thematic; filling those panels with extra cards would change the confirmed balance.

**Current baseline:** photo loading uses square skeletons until the image loads, followed by its opacity transition. Shared wireframe loading can show a numeric percentage. Publications has a muted italic empty message. These do not establish comprehensive error, empty, or offline patterns for every section.

### Accessibility requirements and existing gaps

**Confirmed intent:** preserve the appearance while making the experience operable and understandable with keyboard and assistive technology.

- Controls need meaningful accessible names, including icon-only photo expansion and carousel navigation. Visible label simplification must not remove the accessible name.
- Images need descriptive alternatives appropriate to their content. Current filename/URL-based alternatives are not an approved standard.
- Provide visible focus and keyboard access to the same content offered through touch and pointer controls.
- Announce each heading once; treat glitch copies and purely decorative graphics as decoration.
- Keep motion-sensitive alternatives recognizable, as specified above.

**Implementation gaps:** custom expand controls and some carousel arrows lack adequate names; heading layers repeat; image alternatives are often technical paths; modal title coverage is inconsistent; reduced-motion support needs implementation. These are approved constraints for future work, not a claim that an accessibility audit has passed.

## Do's and Don'ts

### Do

- **Do** preserve computing and creativity equally: precise information and expressive visuals belong together.
- **Do** start from the current tokens and component consumers, then tune measurements to preserve their relationships across content and viewport sizes.
- **Do** keep both themes first-class, including procedural graphics, borders, controls, and detail surfaces.
- **Do** retain blue interaction accents, original photo color, and open space around wireframe graphics.
- **Do** distinguish a protected design decision from a provisional implementation detail or approved requirement that has not shipped.
- **Do** verify changed surfaces at desktop and phone widths, in both themes, and in relevant hover, focus, expanded, and reduced-motion states.

### Don't

- **Don't** replace the protected signature features or drawer/carousel exploration model without Blake's approval.
- **Don't** let generic component-library rounding or a font other than JetBrains Mono override the site's square-edged, monospace character.
- **Don't** remove graphic breathing room merely to make information density uniform across every panel.
- **Don't** replicate mobile clipping, inaccessible controls, invalid metadata, or sans-serif photo metadata as if they were approved design rules.
- **Don't** apply stylistic filters to detail photographs or make a crop the only accessible version of an image.
- **Don't** remove expressive motion for everyone when implementing the approved reduced-motion alternative.
