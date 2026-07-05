# Bismillah Sweets — UI/UX Modernization Design Blueprint

**Project:** Bismillah Sweets Payroll & AI Automation System
**Objective:** Premium, mobile-first UI overhaul of the existing payroll application
**Target Device Strategy:** Mobile-first → Progressive enhancement to desktop
**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS

---

## Locked Design Decisions — DO NOT CHANGE

These decisions are confirmed by the client and must not be altered during implementation:

### Locked Color Palette

| Token | Hex | Usage |
|---|---|---|
| `--color-primary` | `#8B0000` | Dark red — primary buttons, headings, nav active, score values |
| `--color-primary-light` | `#990a0a` | Slightly lighter dark red — hover states on primary elements |
| `--color-primary-dark` | `#5C0000` | Nearly black red — subtle backgrounds, pressed states |
| `--color-accent` | `#EAB308` | Dark yellow — action buttons, badges, highlights, indicators |
| `--color-accent-light` | `#FACC15` | Lighter yellow — hover states on accent buttons |
| `--color-accent-dark` | `#CA8A04` | Deeper amber — accent pressed states |
| `--color-bg` | `#FFFFFF` | Pure white — page background |
| `--color-surface` | `#FFFFFF` | Card, modal, sidebar, all surface backgrounds |
| `--color-surface-raised` | `#FAF9F6` | Off-white — elevated surfaces (dropdowns, tooltips) |
| `--color-foreground` | `#1e293b` | Dark slate — primary text (headings, labels, Bengali) |
| `--color-foreground-muted` | `#64748b` | Medium slate — secondary text (descriptions, metadata) |
| `--color-border` | `#e2e8f0` | Light gray — borders, dividers, input outlines |
| `--color-success` | `#16a34a` | Green — positive indicators, approved states |
| `--color-warning` | `#f59e0b` | Amber — warning, pending states |
| `--color-danger` | `#dc2626` | Red — delete actions, critical alerts |

### Locked Typography Rules

| Content Type | Font | CSS Variable | Where Used |
|---|---|---|---|
| All Bengali text (labels, UI copy, names) | Tiro Bangla (400, 600, 700) | `--font-bengali` | Every Bengali string in the UI |
| English text, labels, descriptions | Inter (400, 500, 600) | `--font-body` | All English copy, button text, form labels |
| Numbers only (amounts, counts, dates) | Inter (400, 600, 700) | `--font-body` | Numeric values throughout |

**Font rules — absolute, do not override:**
- Tiro Bangla is loaded from Google Fonts via `@import` at weights: 400, 600, 700 only
- Inter is loaded from Google Fonts via `@import` at weights: 300, 400, 500, 600, 700
- **Never use Tiro Bangla for numbers.** Numbers are always English/numeric and must render in Inter
- **Never use a font other than these two.** No secondary fonts, no system fallbacks for visible text
- Currency symbol `৳` is a symbol, not a number — it renders in the same font as adjacent text (Tiro Bangla next to Bengali, Inter next to English text)

### Locked Button Colors

| Button Type | Background | Text Color | Where |
|---|---|---|---|
| Primary action buttons | `var(--color-primary)` (#8B0000 dark red) | White (#FFFFFF) | Approve, Submit, Save, Publish |
| Accent / Action buttons | `var(--color-accent)` (#EAB308 dark yellow) | `var(--color-primary-dark)` (#5C0000) | Download, Export, Generate |
- **Primary buttons are dark red with white text.**
- **Accent buttons are dark yellow with dark red text.**

---

## Brand Token System

### Color Palette (Derived from Locked Values)

See the Locked Color Palette table above. All tokens listed are fixed values.

### Glassmorphism Token Set

```
--glass-bg:          rgba(255, 255, 255, 0.90)
--glass-border:      rgba(0, 0, 0, 0.06)
--glass-blur:        blur(12px)
--glass-shadow:      0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.06)
--glass-shadow-hover: 0 4px 12px rgba(0, 0, 0, 0.06), 0 2px 4px rgba(0, 0, 0, 0.04)
```

### Type Scale

| Role | Font Family | Weight | Size (mobile) | Size (desktop) |
|---|---|---|---|---|
| Display | Tiro Bangla | 700 | 1.75rem (28px) | 2.5rem (40px) |
| H1 | Tiro Bangla | 700 | 1.5rem (24px) | 1.875rem (30px) |
| H2 | Tiro Bangla | 600 | 1.25rem (20px) | 1.5rem (24px) |
| H3 | Tiro Bangla | 600 | 1.125rem (18px) | 1.25rem (20px) |
| Body | Inter | 400 | 0.9375rem (15px) | 1rem (16px) |
| Caption | Inter | 400 | 0.8125rem (13px) | 0.875rem (14px) |
| Numbers | Inter | 600 | 1.25rem (20px) | 1.75rem (28px) |

### Radius Tokens

```
--radius-xs: 6px     Inputs, small badges
--radius-sm: 8px     Cards, buttons
--radius-md: 12px    Modals, large cards
--radius-lg: 16px    Dashboard panels, bottom nav
--radius-full: 9999px  Pills, avatars, checkboxes
```

### Shadow Scale

| Token | CSS | Usage |
|---|---|---|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.04)` | Inputs, small elements |
| `--shadow-md` | `0 4px 6px rgba(0,0,0,0.04), 0 2px 4px rgba(0,0,0,0.04)` | Cards on surface |
| `--shadow-lg` | `0 8px 30px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.06)` | Modals, dropdowns |
| `--shadow-xl` | `0 12px 40px rgba(0,0,0,0.08), 0 8px 20px rgba(0,0,0,0.06)` | Active modals, floating elements |

---

## Phase 1: CSS Variables & Tailwind Tokens

**Deliverable:** `src/app/globals.css`

### Structure

```
src/
└── app/
    └── globals.css          ← Single source of truth for all design tokens
```

### Content Blueprint

**What this file must contain:**

1. **`@import url()`** — Google Fonts:
   - Tiro Bangla at weights 400, 600, 700 (use `display=swap`)
   - Inter at weights 300, 400, 500, 600, 700 (use `display=swap`)
   - **Do NOT load any other fonts.**

2. **`:root` block** — All CSS custom properties (using locked hex values):
   - All color tokens from the Locked Color Palette
   - All glassmorphism tokens
   - All radius tokens
   - All shadow tokens
   - Font family stacks:
     ```
     --font-bengali: 'Tiro Bangla', serif;
     --font-body: 'Inter', ui-sans-serif, system-ui, sans-serif;
     ```
   - **`--font-body` is used for all English text AND for all numbers.**
   - **`--font-bengali` is used exclusively for Bengali script text.**

3. **Base element styles:**
   - `body` — background `white`, font-family `var(--font-body)` (default), antialiased rendering
   - `:lang(bn)` elements and elements with `.font-bengali` class — font-family `var(--font-bengali)`
   - `h1, h2, h3, h4, h5, h6` — font-family `var(--font-bengali)`, font-weight `600` or `700`, color `var(--color-foreground)`, line-height `1.3`
   - `a` — color `var(--color-primary)`, hover transition
   - `button, input, select, textarea` — font-family `var(--font-body)`, border-radius reset for form consistency

4. **Utility classes:**

   - Note: `.card`, `.card-hover`, `.glass`, `.glass-hover`, `.btn-primary`, `.btn-accent` classes are correctly defined below — they match the locked color palette.

   **`.glass`**
   ```css
   background: var(--glass-bg);
   border: 1px solid var(--glass-border);
   backdrop-filter: var(--glass-blur);
   -webkit-backdrop-filter: var(--glass-blur);
   box-shadow: var(--glass-shadow);
   border-radius: var(--radius-md);
   ```
   → Uses white background with subtle warm shadows, matching white-background-instead-of-dark brand.

   **`.glass-hover`** — Extends `.glass`, swaps shadow to `--glass-shadow-hover`, adds `transition: box-shadow 0.3s ease, transform 0.2s ease`

   **`.card`** — Extends `.glass`, adds `padding: 1.5rem`, `transition: all 0.25s ease`

   **`.card-hover`** — Extends `.card`, on `:hover` applies `transform: translateY(-2px)` and `--glass-shadow-hover`

   **`.input-field`** — Background `var(--color-surface)`, border `1px solid var(--color-border)`, radius `var(--radius-sm)`, padding `0.75rem 1rem`, focus state with `ring-2 ring-[--color-primary]/20` and `border-color: var(--color-primary)`

   **`.btn`** — `inline-flex`, flex-center, padding `0.625rem 1.25rem`, radius `var(--radius-sm)`, font-family `var(--font-body)`, font-weight `500`, transition `all 0.2s ease`, cursor-pointer, border none

   **`.btn-primary`** — Extends `.btn`, background `var(--color-primary)` (#8B0000 dark red), color `white`, shadow `var(--shadow-md)`, on hover background `var(--color-primary-light)` (#990a0a) and shadow `var(--shadow-lg)`

   **`.btn-accent`** — Extends `.btn`, background `var(--color-accent)` (#EAB308 dark yellow), color `var(--color-primary-dark)` (#5C0000), font-weight `600`, shadow `var(--shadow-sm)`, on hover background `var(--color-accent-light)` (#FACC15)

   **`.metric-value`** — Font-family `var(--font-body)`, font-weight `600`, color `var(--color-primary)`, letterSpacing `-0.02em`, line-height `1.1`

   **`.metric-label`** — Font-family `var(--font-bengali)`, font-weight `400`, color `var(--color-foreground-muted)`, font-size `0.8125rem`

   **`.sidebar-link`** — Flex, items-center, gap `0.75rem`, padding `0.625rem 1rem`, radius `var(--radius-sm)`, color `var(--color-foreground-muted)`, font-family `var(--font-bengali)`, font-weight `500`, transition `all 0.2s ease`, on hover color `var(--color-primary)` bg `var(--color-primary)/5`

   **`.font-bengali`** — `font-family: var(--font-bengali) !important;` — utility class for inline Bengali text elements

5. **`@tailwind` directives** — Must be present: `@tailwind base; @tailwind components; @tailwind utilities;`

6. **Tailwind CSS variable integration** — Map CSS variables into `@layer base` so Tailwind can reference them:

   ```css
   @layer base {
     :root {
       --background: var(--color-bg);
       --foreground: var(--color-foreground);
       --primary: var(--color-primary);
       --primary-foreground: #FFFFFF;
       --secondary: var(--color-accent);
       --secondary-foreground: var(--color-primary-dark);
       --muted: var(--color-foreground-muted);
       --accent: var(--color-accent);
       --accent-foreground: var(--color-primary-dark);
       --border: var(--color-border);
       --ring: var(--color-primary);
       --radius-sm: var(--radius-sm);
       --radius-md: var(--radius-md);
       --radius-lg: var(--radius-lg);
     }
   }
   ```
   → Note: `--secondary-foreground` and `--accent-foreground` are dark red text for use on yellow/accent backgrounds — matching `.btn-accent`.

7. **Animation keyframes:**
   - `@keyframes fadeIn` — opacity 0 → 1, duration 0.25s ease-out
   - `@keyframes fadeInUp` — opacity 0, translateY(8px) → opacity 1, translateY(0)
   - `@keyframes fadeInScale` — opacity 0, scale(0.96) → opacity 1, scale(1)
   - `@keyframes spin` — 0 → 360deg, used for loading spinners
   - `@keyframes slideUp` — translateY(100%) → translateY(0) for bottom bar entrance
   - `@keyframes slideInRight` — translateX(20px) → translateX(0) for sidebar
   - `@keyframes progressShrink` — width 100% → 0%, for toast timer bar

### Implementation Notes

- The `@import` for Google Fonts must use `font-display: swap` for performance
- All variable references inside the `:root` block should use the hex values directly to prevent circular references
- The `.glass` class must use `backdrop-filter` and the `-webkit-` prefix for Safari compatibility
- **Font names in CSS must be exactly `'Tiro Bangla'` and `'Inter'` — no variations**
- The `Tiro Bangla` font is applied to all heading elements, Bengali labels, and any element with `.font-bengali` class
- The `Inter` font is applied to body, numbers, English text, buttons, inputs, and captions
- Numbers within Bengali sentences (like `৳18,000` or `26 কর্মচারী`) should use a `<span className="font-body">` wrapper to ensure Inter renders numerals cleanly

---

## Phase 2: Navigation & Mobile-Responsive Shell

**Deliverable:** `src/app/layout.tsx`

### File Structure Context

```
src/
└── app/
    ├── globals.css           ← Phase 1 output
    └── layout.tsx            ← THIS PHASE — root layout
```

### Layout Architecture

**Desktop (>=1024px):**
```
┌──────────────────────────────────────┐
│  ┌────────┐  ┌────────────────────┐ │
│  │        │  │                    │ │
│  │ SIDE   │  │  MAIN CONTENT      │ │
│  │ BAR    │  │  AREA              │ │
│  │        │  │                    │ │
│  │ Nav    │  │  (page.tsx)        │ │
│  │ Links  │  │                    │ │
│  │        │  │                    │ │
│  │ Logo   │  │                    │ │
│  │        │  │                    │ │
│  └────────┘  └────────────────────┘ │
└──────────────────────────────────────┘
```

**Mobile (<1024px):**
```
┌──────────────────────────┐
│  HEADER BAR (logo)       │
│                          │
│  MAIN CONTENT AREA       │
│  (page.tsx)              │
│                          │
│                          │
│  ┌────────────────────┐  │
│  │  BOTTOM NAV BAR    │  │
│  │  icons + labels    │  │
│  └────────────────────┘  │
└──────────────────────────┘
```

### Navigation Items

| Label (Bengali + English) | Icon | Route |
|---|---|---|
| ড্যাশবোর্ড / Dashboard | `LayoutDashboard` (Lucide) | `/` |
| কর্মচারী / Employees | `Users` (Lucide) | `/employees` |
| বেতন / Payroll | `Wallet` (Lucide) | `/payroll` |
| রিপোর্ট / Reports | `BarChart3` (Lucide) | `/reports` |

### Desktop Sidebar Specs

- Width: `260px` fixed
- Background: `.glass` class (white surface)
- Border-right: `1px solid var(--color-border)`
- Padding: `1.5rem 1rem`
- Logo section: Tiro Bangla bold text with crimson schoolmark — `.font-bengali text-lg font-bold text-[--color-primary]`, small crimson square accent (`w-3 h-3 bg-[--color-primary] rounded-sm inline-block mr-2`)
- Navigation links: stacked vertically with `gap 0.25rem`
- Each nav link: `.sidebar-link` class, font-family `var(--font-bengali)`, active state adds `bg-[--color-primary]/[0.08] text-[--color-primary] font-semibold`
- Active indicator: `2px solid var(--color-primary)` left border, `border-l-2`
- Section dividers: `hr` with `border-[--color-border] my-4`
- Bottom section: user avatar circle (crimson background, white initial) + "মালিক / Owner" label (`.font-bengali`)
- **All sidebar text uses Tiro Bangla font.** Numbers in stats (if any) use Inter via `.font-body` class.

### Mobile Bottom Navigation Bar Specs

- Position: `fixed bottom-0 left-0 right-0`
- Background: `.glass` class with `z-50`
- Height: `64px`
- Safe area padding: `pb-[env(safe-area-inset-bottom)]` for iPhone
- 4 items evenly distributed: `flex justify-around items-center`
- Each item: icon above label, flex-col, gap `0.25rem`
- Icon: `lucide-react` component, `w-6 h-6`, color
- Label: Bengali text, `.font-bengali`, `text-[0.65rem] font-medium`
- Inactive color: `var(--color-foreground-muted)`
- Active color: `var(--color-primary)`
- Animation on entrance: `@keyframes slideUp` — bar rises from bottom on page load
- Haptic-like feedback: `active:scale-90 transition-transform` on tap

### Mobile Header Bar

- Visible only on mobile (`<1024px`)
- Position: `sticky top-0 z-40`
- Background: `.glass`
- Height: `56px`
- Left: Logo text (Bengali, `.font-bengali`, crimson color)
- Right: optional hamburger (not needed with bottom nav)
- Bottom border: `border-b border-[--color-border]`

### Responsive Breakpoints

| Breakpoint | Label | Behavior |
|---|---|---|
| `<1024px` | Mobile | Bottom nav, no sidebar, header bar |
| `1024px--1280px` | Tablet | Collapsible sidebar (260px open, 0px closed) |
| `>1280px` | Desktop | Full sidebar (260px open), content max-width `1280px` |

### React Safety Pattern

- The sidebar open/closed state on tablet must be managed with deferred state updates
- **Never call setState synchronously inside useEffect for sidebar toggle** — always defer:
  ```tsx
  useEffect(() => {
    Promise.resolve().then(() => setSidebarOpen(false));
  }, [activeRoute]);
  ```
- The bottom nav's active indicator uses `usePathname()` from `next/navigation`
- All navigation links use Next.js `<Link>` components

### Layout Component Structure

```
<SessionProvider>
  <div className="min-h-screen bg-[--color-bg]">
    {/* Desktop Sidebar */}
    <aside className="hidden lg:flex fixed left-0 top-0 h-screen w-[260px] ...">
      ...
    </aside>

    {/* Main wrapper */}
    <div className="lg:ml-[260px]">
      {/* Mobile Header */}
      <header className="lg:hidden sticky top-0 ...">
        ...
      </header>

      {/* Page content — padding-bottom accounts for mobile bottom nav */}
      <main className="p-4 md:p-6 lg:p-8 pb-24 lg:pb-8">
        {children}
      </main>
    </div>

    {/* Mobile Bottom Nav */}
    <nav className="lg:hidden fixed bottom-0 ...">
      ...
    </nav>
  </div>
</SessionProvider>
```

---

## Phase 3: Premium Dashboard & Card Redesign

**Deliverable:** `src/app/page.tsx`

### Dashboard Layout

```
┌──────────────────────────────────────┐
│  eyebrow label  —  "আজকের সারাংশ"  │
│  H1: ড্যাশবোর্ড                      │
│  last-updated: 2 min ago → refresh  │
├──────────────────────────────────────┤
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌────┐ │
│  │Total │ │Active│ │This  │ │AI  │ │
│  │Emp.  │ │Staff │ │Month │ │Opt.│ │
│  │    12│ │     8│ │ ৳45K │ │ 3  │ │
│  │ tile│ │ tile │ │ tile │ │tile│ │
│  └──────┘ └──────┘ └──────┘ └────┘ │
├──────────────────────────────────────┤
│  ┌────────────────┬────────────────┐│
│  │                │                ││
│  │  অপেক্ষমান    │  আজকের         ││
│  │  Payslips      │  সময়সূচী      ││
│  │  (list)        │  (timeline)     ││
│  │                │                ││
│  └────────────────┴────────────────┘│
├──────────────────────────────────────┤
│  ┌────────────────────────────────┐  │
│  │  AI পরামর্শ                    │   │
│  │  (insight cards)               │   │
│  └────────────────────────────────┘  │
└──────────────────────────────────────┘
```

### Metric Card Specs

```tsx
<div className="card">
  {/* Icon container */}
  <div className="flex items-center justify-between mb-3">
    <div className="w-10 h-10 rounded-[--radius-sm] flex items-center justify-center
      bg-[--color-primary]/[0.08] text-[--color-primary]">
      <IconComponent className="w-5 h-5" />
    </div>
    {trend && (
      <span className="text-xs font-medium text-[--color-success] flex items-center gap-0.5">
        <TrendingUp className="w-3 h-3" />
        {trend}
      </span>
    )}
  </div>

  {/* Value — Inter font for numbers */}
  <p className="metric-value text-2xl md:text-3xl">
    <span className="font-body">{value}</span>
  </p>

  {/* Label — Bengali, Tiro Bangla */}
  <p className="metric-label mt-1 font-bengali">{label_bn}</p>
  {label_en && (
    <p className="text-xs text-[--color-foreground-muted] mt-0.5 font-body">{label_en}</p>
  )}
</div>
```

### Metric Cards Data

| Card | Icon | Value (`.font-body`) | Label Bengali (`.font-bengali`) | Trend |
|---|---|---|---|---|
| মোট কর্মচারী / Total Employees | `Users` | `{count}` | "মোট কর্মচারী" | — |
| সক্রিয় কর্মচারী / Active Staff | `UserCheck` | `{count}` | "সক্রিয় কর্মচারী" | — |
| এই মাসের বেতন / Monthly Payroll | `Banknote` | "৳{amount}" | "এই মাসের বেতন" | — |
| AI সুপারিশ / AI Insights | `Sparkles` | `{count}` | "AI পরামর্শ" | — |

### Pending Payslips Section

- Section eyebrow: "অপেক্ষমান" — `text-xs font-semibold uppercase tracking-wider text-[--color-accent] font-bengali`
- Section heading: "পেন্ডিং বেতন স্লিপ" — `text-lg font-semibold .font-bengali text-[--color-foreground]`
- Each slip as a **glass card**:
  - Employee name: `.font-bengali font-semibold`
  - Amount: `.font-body` class, Inter font for the number
  - Status badge: Pill with `.btn-accent` coloring (dark yellow bg, dark red text)
  - Approve button: `.btn-primary` (dark red bg, white text)

### AI Insights Panel

- Eyebrow: "AI পরামর্শ" — `.font-bengali text-xs font-semibold uppercase tracking-wider text-[--color-accent]`
- 2-3 insight cards inside `.glass` wrapper:
  - Sparkle icon + `.font-bengali` text

### Refresh Behavior

- Refresh button: `RefreshCw` icon, on click triggers manual refresh
- Loading: spinner via `animate-spin` class
- **React safety:** All realtime subscription callbacks must defer state updates:
  ```tsx
  subscriptionCallback = (payload) => {
    Promise.resolve().then(() => {
      setDashboardData(prev => ({ ...prev, ...payload }));
    });
  };
  ```

---

## Phase 4: Responsive Tables, Forms, and Modals

**Deliverables:**
- `src/app/employees/page.tsx`
- `src/app/payroll/page.tsx`
- Modal components (payslip view, employee form)
- Salary slip download popup

### Responsive Pattern: Card-Deck on Mobile, Table on Desktop

**Mobile Card (below lg):**

```tsx
{/* Mobile Card View */}
<div className="lg:hidden space-y-3">
  {employees.map(emp => (
    <div key={emp.id} className="card cursor-pointer">
      {/* Employee name and role — Bengali + Tiro Bangla */}
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-[--color-primary]/10
          flex items-center justify-center text-[--color-primary] font-bengali font-bold text-sm">
          {emp.name.charAt(0)}
        </div>
        <div>
          <p className="font-semibold text-[--color-foreground] font-bengali">{emp.name}</p>
          <p className="text-sm text-[--color-foreground-muted] font-bengali">{emp.role}</p>
        </div>
      </div>
      {/* Detail grid */}
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div><span className="text-[--color-foreground-muted]">ফোন:</span> <span className="font-body">{emp.phone}</span></div>
        <div><span className="text-[--color-foreground-muted]">বেতন:</span> <span className="font-body">৳{emp.salary.toLocaleString()}</span></div>
        {/* etc */}
      </div>
    </div>
  ))}
</div>
```

**Desktop Table (lg+):**

Standard `.glass` table — same structure as brief, all Bengali columns use `.font-bengali`, numeric columns use `.font-body`.

### Table Styling Specifications

- Container: `.glass` wrapper with `overflow-x-auto`
- Header row: background `var(--color-surface-raised)`, `.font-bengali`, uppercase tracking
- Body rows: bottom border `1px solid var(--color-border)`, hover bg `var(--color-primary)/[0.02]`, transition
- Cells: padding `0.75rem 1rem`
- Action buttons: icon-only, `w-8 h-8 rounded-full`, hover bg `var(--color-primary)/10`

### Modal Component Specs

```tsx
{/* Backdrop */}
<div className="fixed inset-0 z-50 flex items-center justify-center p-4
  bg-black/40 backdrop-blur-sm animate-fade-in">

  {/* Modal container — glass surface */}
  <div className="glass w-full max-w-lg max-h-[90vh] overflow-y-auto
    animate-fadeInScale">

    {/* Header */}
    <div className="flex items-center justify-between p-5 border-b border-[--color-border]">
      <h2 className="text-lg font-semibold text-[--color-foreground] font-bengali">
        {title_bn}
      </h2>
      <button onClick={onClose} className="w-8 h-8 rounded-full ...">
        <X className="w-4 h-4" />
      </button>
    </div>

    <div className="p-5">
      {/* Modal body — Bengali text uses .font-bengali class */}
    </div>
  </div>
</div>
```

**Mobile bottom sheet behavior (<640px):**
- Position `bottom-0 left-0 right-0`, rounded top corners only (`rounded-t-[--radius-lg]`)
- Uses `.animate-slideUp` animation
- Swipe-down dismiss gesture via touch handlers

### Salary Slip Download Popup

All text in the slip uses the locked fonts:
- Company name "বিসমিল্লাহ sweets": `.font-bengali font-bold text-[--color-primary]`
- "PAY SLIP — July 2026": `.font-body text-sm text-[--color-foreground-muted]`
- Labels like "Employee:", "Base:", "Overtime:": `.font-bengali`
- All numeric amounts (৳18,000, etc.): `.font-body .text-right font-semibold`
- "৳" currency symbol: renders in the font of adjacent text context

### Form Specs

**Input fields:**
- `.input-field` class, font-family inherited from `--font-body`
- Label: `.font-bengali .text-sm .font-medium`
- Submit button: `.btn-primary` (dark red bg, white text)
- Cancel button: plain text button, `.font-bengali`

---

## Phase 5: Micro-interactions & Transitions

**Deliverable:** CSS animations in `globals.css` + component-level implementation

### Global Transition Tokens

Add to `:root`:

```css
--transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);
--transition-base: 250ms cubic-bezier(0.4, 0, 0.2, 1);
--transition-slow: 350ms cubic-bezier(0.4, 0, 0.2, 1);
--ease-out: cubic-bezier(0, 0, 0.2, 1);
--ease-in-out: cubic-bezier(0.4, 0, 0.6, 1);
```

### Button Loading State

```tsx
<button onClick={handleAction} disabled={isLoading}
  className="btn-primary disabled:opacity-60 disabled:cursor-not-allowed">
  {isLoading ? (
    <RefreshCw className="w-4 h-4 animate-spin mr-2" />
  ) : null}
  {isLoading ? 'প্রক্রিয়াকরণ...' : 'Action'}
</button>
```
- Loading text must be Bengali: "প্রক্রিয়াকরণ..." or "সেভ হচ্ছে..."
- Button always uses `.font-body` (Inter) for loading text too

### Hover Micro-interactions

All color transitions use locked palette values.

### Focus States

- `focus-visible:ring-2 focus-visible:ring-[--color-primary]/30 focus-visible:outline-none`

### Modal Animations (CSS keyframes)

```css
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes fadeInScale {
  from { opacity: 0; transform: scale(0.96); }
  to { opacity: 1; transform: scale(1); }
}
@keyframes slideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes progressShrink {
  from { width: 100%; }
  to { width: 0%; }
}
```

### Toast Notifications

- Bengali text for toast messages (e.g., "সফলভাবে অনুমোদিত")
- Glass surface, `.font-bengali` for toast body text

### Accessibility — Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## Implementation Sequence

```
Phase 1: globals.css       — Tokens, fonts, utilities, animations
  ↓
Phase 2: layout.tsx        — Sidebar + bottom nav shell
  ↓
Phase 3: page.tsx          — Dashboard cards (dark red metrics, yellow badges)
  ↓
Phase 4a: employees/page    — Card-deck table, employee modal/form
  ↓
Phase 4b: payroll/page      — Payroll list, payslip modal, slip popup
  ↓
Phase 4c: reports/page      — Reports tables and analytics
  ↓
Phase 5: Micro-interactions — Hover states, transitions, toasts, loading
```

---

## Execution Rules

1. **DO NOT change the locked design decisions** (colors, fonts, button colors). Implement them exactly as specified in the Locked Design Decisions section at the top of this document.
2. **Complete file outputs only.** Every file must be complete and run as-is — no placeholders, no shorthand, no partial code.
3. **One phase at a time.** Implement Phase N fully before beginning Phase N+1.
4. **Next.js 15 / React 19 safety:** All state updates from callbacks, event handlers, or subscriptions must pass through `Promise.resolve()` microtask deferral.
5. **Mobile-first CSS:** Write mobile styles as default, layer desktop enhancements via `lg:` Tailwind prefix.
6. **Bengali text (bn-BD) is primary.** All UI labels, buttons, headings use Bengali copy. Numbers and English technical terms use Inter.
7. **No hardcoded hex colors in component files.** Use CSS variables (e.g., `text-[--color-primary]`, `bg-[--color-accent]`) exclusively.
8. **Only two fonts exist in this project:** Tiro Bangla and Inter. Do not add font-family overrides that introduce system fonts or other web fonts.
9. **Numbers are always in Inter.** Wrap numeric values in `<span className="font-body">` if they appear inside a Tiro Bangla context to ensure Tiro Bangla does not render Arabic-Indic numerals instead of Latin digits.
