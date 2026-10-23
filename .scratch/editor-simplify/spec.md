# Editor simplification

**Status:** done

## Problem Statement

The editor is hard to learn. The properties sidebar is one long scroll that mixes replacing the design (website branding, templates), page settings (background) and per-element editing (logo, text, guest fields, Connect button). Templates can be picked in three places, selected-element controls duplicate the group controls, the toolbar holds about 13 controls with Reset beside Undo, a device override hint repeats under almost every number field, and inputs are raw px and hex boxes.

## Solution

A "select something to edit it" editor. With nothing selected the sidebar shows the page: a Change design button, the list of elements and the background. With an element selected it shows only that element, with a back button. Everything that replaces the design lives in one Change design dialog. The toolbar keeps the design's identity, the device switcher, history, Preview, Save, Publish and a menu holding Reset.

Device overrides leave the editor UI. The portal schema keeps them, so template tweaks, brand heading fitting and per-device background image positions still work. Every edit sets the shared value and clears that property's overrides on every device, so an edit always shows on the canvas.

Number inputs become sliders, colours become a compact row, and layout values sit under a collapsed Layout section.

## Tickets

Each ticket ships as its own PR, in order.

1. `issues/01-change-design-dialog.md`
2. `issues/02-trim-toolbar.md`
3. `issues/03-select-to-edit-sidebar.md`
4. `issues/04-remove-override-ui.md`
5. `issues/05-friendlier-inputs.md`
