# Phase 5: Design System Foundation

## 1. Design Philosophy
* **Trust & Security:** Crisp lines, ample whitespace, high-contrast text. No playful or chaotic elements.
* **Speed:** Snappy micro-interactions, immediate visual feedback.
* **Premium Feel:** Subtle glassmorphism in overlays, deep rich dark mode, precise typography.

## 2. Core Tokens
* **Typography:** `Inter` or `Geist` for UI text (clean, legible). `Fira Code` or `JetBrains Mono` for passwords, secrets, and code blocks to ensure character distinction (0 vs O, l vs 1).
* **Color Palette (Light Mode):**
  * Background: `#F9FAFB` (Subtle gray)
  * Surface: `#FFFFFF` (Cards, panels)
  * Primary: `#0F172A` (Deep Slate - buttons, active states)
  * Accent: `#3B82F6` (Electric Blue - focus rings, links)
  * Danger: `#EF4444` (Red)
  * Success: `#10B981` (Emerald)
* **Color Palette (Dark Mode):**
  * Background: `#0B0F19` (Very dark blue/gray)
  * Surface: `#111827`
  * Primary: `#F8FAFC`
  * Accent: `#60A5FA`
* **Spacing Scale:** 4px baseline (4, 8, 12, 16, 24, 32, 48, 64).
* **Border Radius:** 8px for standard inputs/buttons. 12px for cards. 16px for modals.
* **Elevation:**
  * Base: Flat.
  * Hover: Subtle drop shadow (`0 4px 6px -1px rgba(0,0,0,0.1)`).
  * Modal: Deep shadow (`0 20px 25px -5px rgba(0,0,0,0.2)`).

## 3. Motion Guidelines
* **Duration:** 150ms for micro-interactions (hover, focus). 300ms for structural transitions (modal open, pane slide).
* **Easing:** Ease-out for appearing, ease-in for exiting.

## 4. Form Design
* Labels above inputs.
* Inputs have subtle borders that turn strong Accent color on focus.
* Password fields always feature a "reveal/hide" eye icon.
* Read-only password fields use a monospace font and dot-masking.
