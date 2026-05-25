# Design Guide - Fluent AI Architect Guide

## Overview

This project follows a modern, clean design system built for professional architecture and construction professionals. The design emphasizes clarity, minimal clutter, and an intuitive user experience.

---

## Color System

### Light Mode (Default)

| Token | Value | Usage |
|-------|-------|-------|
| **Background** | `240 10% 100%` | Main page background |
| **Foreground** | `240 10% 12%` | Primary text |
| **Card** | `240 10% 100%` | Card surfaces |
| **Primary** | `265 85% 55%` | Buttons, highlights, active states |
| **Primary Foreground** | `0 0% 100%` | Text on primary |
| **Secondary** | `240 8% 96%` | Muted backgrounds |
| **Accent** | `220 90% 56%` | Links, complementary elements |
| **Muted** | `240 5% 65%` | Disabled states |
| **Border** | `240 6% 90%` | Subtle dividers |

### Dark Mode

The dark mode uses higher contrast with:
- **Background**: `240 10% 10%` (Deep dark)
- **Primary**: `265 90% 65%` (Brighter purple)
- **Accent**: `220 95% 65%` (Brighter blue)

All other tokens adapt proportionally for accessible contrast.

---

## Typography

### Font Stack
```
Font Family: System fonts (-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial)
```

### Sizing

| Use Case | Size | Weight | Line Height |
|----------|------|--------|------------|
| Page Title | 24px | 700 (bold) | 1.5 |
| Section Title | 18px | 600 (semibold) | 1.4 |
| Body Text | 14px | 400 (regular) | 1.6 |
| Small Text | 12px | 400 (regular) | 1.5 |
| Label | 13px | 500 (medium) | 1.4 |

### Text Direction

The UI supports both LTR (English) and RTL (Arabic) through the `dir` attribute:
```jsx
<div dir="auto">  // Auto-detect based on content
<div dir="rtl">   // Force RTL for Arabic
<div dir="ltr">   // Force LTR for English
```

---

## Layout System

### Spacing Scale

Using Tailwind's spacing scale (4px base):
- `px-3` = 12px (tight)
- `px-4` = 16px (standard)
- `px-6` = 24px (relaxed)
- `py-3` = 12px
- `py-4` = 16px (standard padding)
- `gap-2` = 8px (compact gap)
- `gap-3` = 12px (standard gap)
- `gap-4` = 16px (relaxed gap)

### Flexbox Patterns

**Sidebar + Content:**
```jsx
<div className="flex h-screen">
  <Sidebar />                    {/* Fixed width: 256px */}
  <main className="flex-1">     {/* Takes remaining space */}
    {children}
  </main>
</div>
```

**Message Bubble:**
```jsx
<div className="flex gap-3">
  <Avatar />                     {/* 32px avatar */}
  <div className="flex-1">       {/* Content takes space */}
    <Message />
  </div>
</div>
```

**Navigation Items:**
```jsx
<Link className="flex items-center gap-3 px-3 py-2.5">
  <Icon className="w-5 h-5 flex-shrink-0" />
  <span className="flex-1">{label}</span>
  <Badge>{badge}</Badge>
</Link>
```

---

## Component Guidelines

### Buttons

**Primary Action:**
```jsx
<Button className="bg-primary text-primary-foreground hover:bg-primary/90">
  Send Message
</Button>
```

**Secondary Action:**
```jsx
<Button variant="outline">
  Cancel
</Button>
```

### Input Fields

- Always wrap in a container with `focus-within:ring-2 focus-within:ring-primary/50`
- Use `.border-0 focus-visible:ring-0` for borderless internal inputs
- Maintain minimum height of 40px for touch targets

### Messages

**User Messages:**
- Background: Primary color
- Text: White
- Alignment: Right side
- Max width: 75-85% on desktop

**Assistant Messages:**
- Background: Secondary/muted
- Text: Foreground color
- Alignment: Left side
- Max width: 75-85% on desktop

### Sidebar Navigation

- Item height: 40px (py-2.5 + px-3 with icon)
- Selected state: `.bg-sidebar-accent text-sidebar-primary`
- Hover state: `.hover:bg-sidebar-accent/50`
- Section padding: `px-3` (12px)
- Icon size: `w-5 h-5` (20px)

---

## Responsiveness

### Breakpoints (Tailwind)

- `sm`: 640px (mobile landscape)
- `md`: 768px (tablet)
- `lg`: 1024px (desktop)
- `xl`: 1280px (wide desktop)

### Mobile Strategy

1. **Sidebar**: Hidden by default, toggle with menu button
   ```jsx
   <div className="hidden lg:block"> {/* Hidden on mobile */}
     <Sidebar />
   </div>
   ```

2. **Content**: Full width on mobile
   ```jsx
   <main className="w-full lg:flex-1">
   ```

3. **Padding**: Reduced on mobile
   ```jsx
   <div className="px-4 sm:px-6 lg:px-8">
   ```

---

## Accessibility (a11y)

### WCAG 2.1 Level AA Compliance

1. **Color Contrast**
   - Text on background: ≥4.5:1
   - Large text (18px+): ≥3:1
   - UI components: ≥3:1

2. **Keyboard Navigation**
   - All interactive elements are focusable
   - Tab order is logical
   - Focus indicators are visible

3. **ARIA Labels**
   ```jsx
   <button aria-label="Send message" aria-disabled={isLoading}>
     <Send className="w-4 h-4" />
   </button>
   ```

4. **Icon-Only Buttons**
   - Must have `title` or `aria-label`
   - Minimum size: 44px × 44px

5. **Form Labels**
   ```jsx
   <label htmlFor="email">Email</label>
   <Input id="email" type="email" />
   ```

---

## Dark Mode

Dark mode is automatically applied when:
1. System preference is dark (CSS media query)
2. User toggles theme in settings
3. Preference is stored in `localStorage`

```jsx
// In HTML
<html className={theme === 'dark' ? 'dark' : ''}>

// CSS adapts automatically
.dark {
  --background: 240 10% 10%;
  // ... other dark tokens
}
```

---

## Animation & Transitions

### Approved Animations

1. **Hover States**
   ```jsx
   className="transition-all duration-200 hover:bg-primary/90"
   ```

2. **Loading Spinner**
   ```jsx
   <div className="animate-spin rounded-full h-3 w-3 border-2 border-primary border-t-transparent" />
   ```

3. **Slide In**
   ```jsx
   className="animate-in fade-in slide-in-from-bottom-2"
   ```

### Avoid

- Complex parallax effects
- Auto-playing animations
- Animations longer than 300ms for UI feedback

---

## Best Practices

### Dos

- Use semantic HTML (`<button>`, `<nav>`, `<main>`, `<header>`)
- Keep components focused and single-purpose
- Leverage Tailwind utilities for styling
- Test with screen readers
- Maintain consistent spacing
- Use color intentionally (not just for decoration)

### Don'ts

- Don't create custom colors - use design tokens
- Don't mix spacing units (stick to Tailwind scale)
- Don't hide focus indicators
- Don't rely on color alone for meaning
- Don't create components larger than 500 LOC

---

## Common Patterns

### Empty State

```jsx
<div className="flex flex-col items-center justify-center py-12">
  <MessageSquare className="w-12 h-12 text-muted mb-4" />
  <p className="text-lg font-medium">No messages yet</p>
  <p className="text-sm text-muted-foreground">Start a conversation to begin</p>
</div>
```

### Loading State

```jsx
<div className="space-y-3">
  <Skeleton className="h-4 w-3/4" />
  <Skeleton className="h-4 w-1/2" />
  <Skeleton className="h-32 w-full" />
</div>
```

### Error State

```jsx
<div className="rounded-lg bg-destructive/10 border border-destructive/30 p-4">
  <div className="flex gap-3">
    <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" />
    <div>
      <p className="font-medium text-destructive">Error</p>
      <p className="text-sm text-destructive/80">{errorMessage}</p>
    </div>
  </div>
</div>
```

---

## UI Checklist for New Components

- [ ] Responsive design tested (mobile, tablet, desktop)
- [ ] Dark mode verified
- [ ] Keyboard navigation working
- [ ] ARIA labels added
- [ ] Color contrast ≥4.5:1
- [ ] Focus indicators visible
- [ ] Touch targets ≥44px
- [ ] Loading states handled
- [ ] Error states handled
- [ ] Empty states handled
- [ ] RTL/Arabic text tested

---

## Resources

- **Design System Variables**: `src/index.css` (lines 7-60)
- **Component Examples**: `src/components/ui/`
- **Layout Components**: `src/components/layout/`
- **Accessibility Utilities**: `src/lib/a11y-utils.ts`
- **Tailwind Docs**: https://tailwindcss.com
- **shadcn/ui**: https://ui.shadcn.com
