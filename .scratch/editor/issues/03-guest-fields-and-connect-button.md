# 03: Guest fields and Connect button

**What to build:** A user can configure zero, one or two guest input fields chosen from Name, Email and Phone, swap a field's type, remove fields, reorder them, and set label, placeholder and required status. They can style the Connect button's background colour, text colour, label, border radius and width. Both are selectable in the canvas and update immediately in both device modes. Clicking Connect in the canvas never initiates a network connection.

**Blocked by:** 02

**Status:** done

- [x] Schema allows at most two guest fields, only of type name, email or phone, with optional label, placeholder and required (tested)
- [x] Schema validates button colours, radius and width ranges (tested)
- [x] Sidebar Guest fields group adds, swaps, removes and reorders fields, and prevents adding a third
- [x] Sidebar Connect button group edits background colour, text colour, label, radius and width; invalid values are handled
- [x] Fields and button render in desktop and mobile layouts and update immediately
- [x] Fields and button are selectable in the canvas using the pattern from 02
- [x] Interacting with fields or the Connect button in edit or preview mode triggers no network request or form submission
