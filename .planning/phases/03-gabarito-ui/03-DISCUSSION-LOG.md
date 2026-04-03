# Phase 3: Gabarito UI - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.

**Date:** 2026-04-03
**Phase:** 3 — Gabarito UI

---

## Areas Discussed

All 4 gray areas selected by user.

---

### Area 1: Results Placement

**Q:** Where should the gabarito results live?
**Options:** Inline on same page / Separate /gabarito route
**Selected:** Inline on the same page

**Q:** Should the input form stay visible while results are shown, or collapse/hide?
**Options:** Hide form, show results only / Keep form visible above results
**Selected:** Hide form, show results only

---

### Area 2: Progressive Loading UX

**Q:** How should the grid behave while answers are streaming in?
**Options:** Show grid immediately fill cells as they arrive / Full-page spinner then reveal all at once
**Selected:** Show grid immediately, fill cells as they arrive

**Q:** What should empty (not-yet-answered) grid cells look like while streaming?
**Options:** Animated pulse skeleton / Static muted placeholder / Nothing — only show cells as they arrive
**Selected:** Animated pulse skeleton

---

### Area 3: Verbose Cards Layout

**Q:** How should verbose explanations be displayed?
**Options:** Expandable list below the grid / Click grid cell to open explanation
**Selected:** Expandable list below the grid

**Q:** Should cards be collapsed by default or all expanded?
**Options:** Collapsed by default / All expanded
**Selected:** Collapsed by default, expand on click

---

### Area 4: Confidence Indicator

**Q:** Should confidence (high/medium/low) be shown in the grid?
**Options:** Yes — color-code the answer letter / No — keep the grid clean / Only show for low confidence
**Selected:** Yes — color-code the answer letter (high=primary, medium=muted, low=amber/red)

---

*Discussion completed: 2026-04-03*
