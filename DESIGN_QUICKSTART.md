# Design System - Quick Start Guide

## TL;DR - 5 Minute Overview

### Color Palette (Use These Only)
```css
Primary:    265 85% 55%   (Purple) - main brand color
Accent:     220 90% 56%   (Blue)   - complementary highlights
Secondary:  240 8% 96%    (Gray)   - muted backgrounds
Foreground: 240 10% 12%   (Dark)   - text color
Destructive: 0 84% 60%    (Red)    - danger actions
```

### Spacing (Use Tailwind Scale)
```
px-3 py-2.5    - standard button padding
px-4 py-3      - standard card padding
px-6           - page padding
gap-2, gap-3   - standard gaps
```

### Golden Rules
1. **No custom colors** - Use design tokens only
2. **No arbitrary spacing** - Use Tailwind scale
3. **Dark mode compatible** - Test in both modes
4. **Accessible always** - Use aria-labels, test keyboard

---

## Common Tasks

### I Need to Add a Button
```jsx
// Primary action
<Button className="bg-primary text-primary-foreground hover:bg-primary/90">
  Save
</Button>

// Danger action
<Button variant="destructive">
  Delete
</Button>

// Just an icon
<Button variant="ghost" size="icon" title="Help">
  <Info className="w-4 h-4" />
</Button>
```

### I Need a Form Input
```jsx
<div className="flex items-center gap-2 border border-border rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-primary/50">
  <Icon className="w-4 h-4 text-muted-foreground" />
  <input className="flex-1 border-0 bg-transparent outline-none" />
</div>
```

### I Need a Message Bubble
```jsx
{/* User message */}
<div className="flex justify-end">
  <div className="bg-primary text-primary-foreground rounded-lg px-4 py-3">
    User message here
  </div>
</div>

{/* AI message */}
<div className="flex justify-start">
  <div className="bg-secondary text-foreground rounded-lg px-4 py-3">
    AI response here
  </div>
</div>
```

### I Need a Navigation Item
```jsx
<Link
  to="/page"
  className={`
    flex items-center gap-3 px-3 py-2.5 rounded-lg
    ${active 
      ? 'bg-sidebar-accent text-sidebar-primary font-semibold'
      : 'hover:bg-sidebar-accent/50'
    }
  `}
>
  <Icon className="w-5 h-5 flex-shrink-0" />
  <span>{label}</span>
</Link>
```

---

## Color Reference

### Interactive Elements
- **Buttons**: Use `bg-primary text-primary-foreground`
- **Links**: Use `text-accent hover:underline`
- **Hover States**: Use `/90` opacity: `hover:bg-primary/90`
- **Disabled**: Use `opacity-50 cursor-not-allowed`

### Text Colors
- **Primary Text**: `text-foreground`
- **Secondary Text**: `text-muted-foreground`
- **Placeholder**: `placeholder-muted-foreground`
- **Links**: `text-accent`

### Backgrounds
- **Pages**: `bg-background`
- **Cards**: `bg-card` or `bg-secondary`
- **Inputs**: `bg-input` or `bg-secondary`
- **Sidebar**: `bg-sidebar-background`

---

## Responsive Breakpoints

```jsx
// Mobile first
<div className="px-4">           {/* Mobile: px-4 */}
  <div className="hidden sm:block"> {/* Hide on mobile */}
    Desktop only
  </div>
</div>

// Common pattern
<div className="px-4 sm:px-6 lg:px-8">
  More padding on larger screens
</div>
```

---

## Accessibility Quick Checks

### Before Shipping Code
- [ ] `<button>` has `aria-label` if icon-only
- [ ] `<input>` has `<label>` and `id` match
- [ ] `focus:ring-2 focus:ring-primary` on interactive elements
- [ ] Text color has 4.5:1 contrast ratio
- [ ] No color-only meaning (add text/icon)
- [ ] Touch targets are 40px+ (`h-10 w-10`)

---

## Dark Mode Verification

### Test These
1. Light and dark backgrounds render correctly
2. Text is readable in both modes
3. Icons are visible
4. Borders are subtle but present
5. Focus indicators show up

**Quick Check:**
```
Use DevTools → Settings → Emulate CSS media feature prefers-color-scheme: dark
```

---

## Common Spacing Values

```
px-2   = 8px left/right
px-3   = 12px left/right
px-4   = 16px left/right
px-6   = 24px left/right

py-2   = 8px top/bottom
py-2.5 = 10px top/bottom (button padding)
py-3   = 12px top/bottom
py-4   = 16px top/bottom

gap-1  = 4px between items
gap-2  = 8px between items
gap-3  = 12px between items
gap-4  = 16px between items
```

---

## TypeScript Props

```typescript
interface ButtonProps {
  variant?: 'default' | 'outline' | 'ghost' | 'destructive';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
}

interface InputProps {
  type?: string;
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  className?: string;
}
```

---

## File Locations

| What | Where |
|------|-------|
| Colors | `src/index.css` (lines 7-60) |
| Components | `src/components/ui/` |
| Layout | `src/components/layout/` |
| Pages | `src/pages/` |
| Design Guide | `DESIGN_GUIDE.md` |
| Rules | `DESIGN_MAINTENANCE.md` |

---

## Need More Help?

1. **Full Design System** → Read `DESIGN_GUIDE.md`
2. **Rules & Patterns** → Read `DESIGN_MAINTENANCE.md`
3. **What Changed** → Read `DESIGN_SUMMARY.md`
4. **See Examples** → Check `src/components/ui/`

---

## Checklist Before PR

```markdown
- [ ] Uses design tokens only (no custom colors)
- [ ] Spacing uses Tailwind scale (no arbitrary values)
- [ ] Dark mode tested
- [ ] Accessibility tested (keyboard, screen reader)
- [ ] Responsive design (mobile, tablet, desktop)
- [ ] Touch targets 40px+
- [ ] Focus indicators visible
- [ ] Color contrast 4.5:1+
```

---

## Most Important Rules

1. **Colors**: Only use values from `src/index.css`
2. **Spacing**: Only use `px-1/2/3/4/6/8`, `py-...`, `gap-...`
3. **Dark Mode**: Test everything in dark mode
4. **Accessibility**: Every interactive element needs focus/aria
5. **Responsive**: Works at 375px, 640px, 1024px, 1440px

---

**Questions?** Check `DESIGN_MAINTENANCE.md` or existing components.

