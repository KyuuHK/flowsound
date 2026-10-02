Create a horizontal timer control dock featuring a soft-tactile, neo-grotesque pill cluster inspired by Apple widget controls and focus.itshassco.com.

### Layout & Composition
- Arrange elements in a single horizontal, centered row (`flex items-center gap-2 select-none`).
- Minimum touch bounding box: Every element must maintain at least 44px x 44px hit boundaries with `touch-action: manipulation`.
- Sequence order:
  1. Preset Pills: `5 Min`, `10 Min`, `25 Min` (Capsules)
  2. Stepper Decrement: `–` (Circle)
  3. Primary Action Trigger: `Start Focus` / `Pause Focus` (Capsule)
  4. Stepper Increment: `+` (Circle)

### Surface & Shadow Styling (Soft-Tactile Tokens)
- Base palette: Off-white canvas background (`#EBEBEF` or `#F0F0F3`).
- Inactive surfaces (`#F3F3F6`): Steppers and unselected pills use a subtle off-white fill with an imperceptible hairline outline (`border border-black/[0.03]`).
- Elevated surfaces (`#FFFFFF`): The active preset pill and the primary action trigger use pure white fills to lift them optically off the dock.
- Dual-layer ambient shadow: Apply a layered shadow recipe to all buttons:
  `box-shadow: 0 4px 12px -2px rgba(0, 0, 0, 0.06), 0 1px 3px rgba(0, 0, 0, 0.04), inset 0 1px 1px rgba(255, 255, 255, 0.9);`

### Button Specifications
- Preset Duration Pills:
  * Geometry: `rounded-full px-5 py-2.5 min-h-[44px] text-sm`
  * Inactive state: Background `#F3F3F6`, text `text-neutral-500 font-medium`, hover `text-neutral-800`
  * Active state: Background `#FFFFFF`, text `text-neutral-900 font-bold`
- Circular Stepper Buttons (`–` and `+`):
  * Geometry: Perfect circle `w-11 h-11 rounded-full flex items-center justify-center`
  * Surface: Background `#F3F3F6`, glyph `text-neutral-900 text-lg font-medium leading-none`
  * Accessible names: `aria-label="Decrease time"` and `aria-label="Increase time"`
- Primary Action Trigger:
  * Geometry: Elongated capsule `rounded-full px-6 py-2.5 min-h-[44px] text-sm font-semibold`
  * Surface: Background `#FFFFFF`, high-contrast vibrant cyan-blue label (`#00A3FF`)
  * Dynamic state: Swaps text and `aria-label` between `"Start Focus"` and `"Pause Focus"`

### Interaction & Accessibility
- Tactile feedback: Snappy spring compression on press (`active:scale-95 transition-transform duration-100 ease-out`).
- Keyboard focus: Unobscured, high-visibility focus ring on tab navigation (`focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 focus:outline-none`).
- Reduced motion: Disable scaling transforms when `@media (prefers-reduced-motion: reduce)` is detected.
