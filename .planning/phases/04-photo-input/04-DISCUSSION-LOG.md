# Phase 4: Photo Input - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions captured in CONTEXT.md — this log preserves the discussion.

**Date:** 2026-04-04
**Phase:** 04-photo-input
**Mode:** discuss
**Areas discussed:** Input mode entry, Camera capture UX, Image queue display, Multi-image add flow

## Areas Discussed

### Input Mode Entry
**Question:** How does Photo Scan fit alongside the existing HTML input?
**Answer:** Tab toggle on same page

**Correction by user:** Also remove the HTML file upload option — too much friction to be usable. HTML tab will keep paste textarea only.

### Camera Capture UX
**Question:** How should the in-browser camera capture work?
**Answer:** Native OS picker via `<input type="file" accept="image/*" capture="environment">`

### Image Queue Display
**Question:** How should queued images be displayed before proceeding to extraction?
**Answer:** Thumbnail grid with remove button (✕) per thumbnail

### Multi-Image Add Flow
**Question:** How does the user add more images after the first upload?
**Answer:** "+ Add image" button (opens picker again). No drag-and-drop.

## No Deferred Ideas

Discussion stayed within phase scope.
