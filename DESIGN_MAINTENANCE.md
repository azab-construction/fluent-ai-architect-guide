# Design Maintenance Guide

## For Developers: Keeping the Design Clean and Professional

This guide helps you maintain the professional design standards implemented in this project. Follow these rules to ensure consistency across all new features and updates.

---

## Golden Rules

### Rule 1: Never Add Custom Colors
❌ **Don't do this:**
```jsx
<div className="bg-[#7c3aed]">   // Custom purple
<div className="text-[#dc2626]">  // Custom red
```

✓ **Do this instead:**
```jsx
<div className="bg-primary">       // Uses --primary token
<div className="text-destructive"> // Uses --destructive token
```

**Why?** Design tokens ensure consistency. If we need to adjust the color later, it updates everywhere automatically.

---

### Rule 2: Use Tailwind Spacing Scale Only
❌ **Don't do this:**
```jsx
<div className="p-[14px] m-[18px] gap-[7px]">  // Arbitrary values
```

✓ **Do this instead:**
```jsx
<div className="p-4 m-4 gap-3">  // Standard scale
```

**Spacing Scale:**
- `0.5` = 2px
- `1` = 4px
- `2` = 8px
- `3` = 12px
- `4` = 16px
- `6` = 24px
- `8` = 32px

**Why?** A consistent scale creates visual rhythm and is easier to maintain.

---

### Rule 3: Color Contrast Matters
❌ **Don't do this:**
```jsx
<div className="bg-secondary text-secondary-foreground">
  {/* If secondary foreground is too light, contrast fails */}
</div>
```

✓ **Do this instead:**
```jsx
<div className="bg-primary text-primary-foreground">
  {/* Primary + Primary-foreground always have 4.5:1+ contrast */}
</div>
```

**Why?** We need WCAG AA compliance (4.5:1 for normal text, 3:1 for large text).

---

### Rule 4: Keep Components Small and Focused
❌ **Don't do this:**
```jsx
// ChatInterface.tsx - 500+ lines doing everything
export const ChatInterface = () => {
  // Handling messages, uploads, github, 3D models, etc.
  return (...)
}
```

✓ **Do this instead:**
```jsx
// ChatMessages.tsx - just messages
export const ChatMessages = ({ messages }) => {
  return (...)
}

// ChatInput.tsx - just input
export const ChatInput = ({ onSend }) => {
  return (...)
}

// ChatInterface.tsx - orchestrate
export const ChatInterface = () => {
  return (
    <>
      <ChatMessages />
      <ChatInput />
    </>
  )
}
```

**Why?** Smaller components are easier to test, reuse, and maintain.

---

## Design Checklist for New Features

Before submitting a PR, verify:

### Visual Design
- [ ] Uses only approved colors (see Color System)
- [ ] Follows spacing scale (no arbitrary values)
- [ ] Text has sufficient contrast (test with axe DevTools)
- [ ] Icons are 16px, 20px, or 24px (not custom sizes)
- [ ] Component follows the design system patterns

### Responsive Design
- [ ] Works on mobile (320px+)
- [ ] Works on tablet (640px+)
- [ ] Works on desktop (1024px+)
- [ ] Touch targets are ≥40px
- [ ] Text is readable at all sizes

### Accessibility
- [ ] Keyboard navigation works (Tab, Enter, Escape)
- [ ] Focus indicators are visible
- [ ] ARIA labels on icon-only buttons
- [ ] Color not the only way to convey meaning
- [ ] Form labels properly associated

### Dark Mode
- [ ] Component works in dark mode
- [ ] No hardcoded colors (all tokens)
- [ ] Text is readable in both modes
- [ ] Contrast maintained

---

## Common Patterns

### Button Component Usage

```jsx
// Primary action (main CTA)
<Button className="bg-primary text-primary-foreground hover:bg-primary/90">
  Save Changes
</Button>

// Secondary action
<Button variant="outline">
  Cancel
</Button>

// Danger action
<Button variant="destructive">
  Delete
</Button>

// Icon-only button
<Button variant="ghost" size="icon" title="Settings">
  <Settings className="w-4 h-4" />
</Button>
```

### Input Component Usage

```jsx
// Standard input
<input className="border border-border rounded-lg px-3 py-2" />

// Input with icon
<div className="flex items-center gap-2 border border-border rounded-lg px-3 py-2">
  <Search className="w-4 h-4 text-muted-foreground" />
  <input className="border-0 bg-transparent outline-none" />
</div>
```

### Message Bubble

```jsx
{/* User message */}
<div className="flex justify-end">
  <div className="bg-primary text-primary-foreground rounded-lg px-4 py-3">
    {message}
  </div>
</div>

{/* Assistant message */}
<div className="flex justify-start">
  <div className="bg-secondary text-foreground rounded-lg px-4 py-3">
    {message}
  </div>
</div>
```

### Navigation Item

```jsx
<Link
  to="/page"
  className={`
    flex items-center gap-3 px-3 py-2.5 rounded-lg
    ${active ? 'bg-sidebar-accent text-sidebar-primary' : 'hover:bg-sidebar-accent/50'}
  `}
>
  <Icon className="w-5 h-5 flex-shrink-0" />
  <span>{label}</span>
</Link>
```

---

## When to Refactor

### Refactor if:
1. Component is >400 lines
2. Component has >5 responsibilities
3. Component is duplicated in 3+ places
4. Props object has >10 items
5. Multiple nested ternaries

### Extract if:
1. A section is used in 2+ components
2. A logic pattern repeats
3. A style pattern repeats
4. A validation rule repeats

---

## Common Mistakes to Avoid

### 1. Mixing Color Systems
```jsx
// ❌ Wrong
<div className="bg-blue-500 text-blue-900">

// ✓ Correct
<div className="bg-primary text-primary-foreground">
```

### 2. Inconsistent Spacing
```jsx
// ❌ Wrong
<div className="p-4 m-[8px] gap-6 px-[12px]">

// ✓ Correct
<div className="p-4 m-2 gap-6 px-3">
```

### 3. Insufficient Touch Targets
```jsx
// ❌ Wrong - only 24px
<button className="p-1">
  <Icon />
</button>

// ✓ Correct - 40px+
<button className="p-2">
  <Icon className="w-4 h-4" />
</button>
```

### 4. Missing Focus States
```jsx
// ❌ Wrong - no focus indicator
<input className="border" />

// ✓ Correct
<input className="border focus:ring-2 focus:ring-primary" />
```

### 5. Hardcoded Colors in Dark Mode
```jsx
// ❌ Wrong - breaks in dark mode
<div className="bg-white text-black">

// ✓ Correct
<div className="bg-background text-foreground">
```

---

## Testing Your Design

### Browser DevTools
1. Open DevTools (F12)
2. Toggle device toolbar (Ctrl+Shift+M)
3. Test at: 375px, 640px, 1024px, 1440px
4. Toggle dark mode in settings

### Accessibility Testing
```bash
# Install axe DevTools browser extension
# Or run:
npm install --save-dev axe-playwright
```

### Color Contrast
1. Use WebAIM Contrast Checker: https://webaim.org/resources/contrastchecker/
2. Check text on all color combinations
3. Aim for WCAG AA (4.5:1)

### Keyboard Navigation
1. Tab through every page (no mouse)
2. Verify logical tab order
3. Test Enter/Escape/Space keys
4. Check focus indicators

---

## Git Workflow

### Branch Naming
```
feature/ui-dashboard       // New UI component
fix/sidebar-spacing        // Design bug fix
refactor/chat-messages     // Code quality
```

### Commit Messages
```
✨ feat: New design sidebar with session management
🐛 fix: Incorrect text color in dark mode
♿ a11y: Add ARIA labels to icon buttons
🎨 style: Update color tokens for better contrast
```

### PR Description Template
```markdown
## Changes
- Redesigned [component]
- Updated [feature]

## Design Checklist
- [ ] Color tokens only (no custom colors)
- [ ] Spacing scale used
- [ ] Dark mode tested
- [ ] Responsive design
- [ ] Accessibility tested

## Screenshots
[Before/After]

## Testing
- [ ] Manual testing completed
- [ ] Accessibility audit passed
- [ ] Dark mode verified
```

---

## Color Token Reference

### All Available Tokens

```css
/* Backgrounds */
--background: main page background
--card: card/section background
--popover: dropdown/menu background

/* Text */
--foreground: primary text
--muted-foreground: secondary text

/* Interactive */
--primary: main button color
--primary-foreground: text on primary
--accent: highlights, links
--accent-foreground: text on accent
--secondary: muted backgrounds
--secondary-foreground: text on secondary

/* Semantic */
--destructive: danger/delete
--destructive-foreground: text on destructive

/* UI */
--border: divider lines
--input: input background
--ring: focus outline
--radius: border radius default

/* Sidebar (special) */
--sidebar-background: sidebar background
--sidebar-foreground: sidebar text
--sidebar-primary: sidebar active
--sidebar-accent: sidebar hover
```

---

## Resources

- **Design System**: `src/index.css`
- **Components**: `src/components/ui/`
- **Design Guide**: `DESIGN_GUIDE.md`
- **Component Examples**: Check existing components
- **Tailwind**: https://tailwindcss.com/docs
- **Accessibility**: https://www.a11y-101.com/

---

## Questions?

Refer to:
1. `DESIGN_GUIDE.md` - Design principles
2. `DESIGN_SUMMARY.md` - What changed
3. Existing components - Implementation patterns
4. `src/index.css` - Token definitions

**Stay consistent. Keep it clean. Make it accessible.**

