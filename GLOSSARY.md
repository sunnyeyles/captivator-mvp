# Glossary

- **Portal**: the rendered Wi-Fi splash page, drawn by `SplashPage` from a `PortalConfig`.
- **Template**: a `PortalConfig` preset a new Design starts from, never a separate page implementation.
- **Design**: a saved, named portal configuration a user can open and edit.
- **Publish**: freezing a snapshot of a Design's saved state as the Live page.
- **Live**: the single published snapshot guests would see. At most one Design is Live at a time.
- **Unpublished changes**: a Live Design whose saved state differs from its Live snapshot.
- **Unsaved changes**: editor state that differs from the Design's last save.
- **Design assistant**: the editor's chat panel that designs or refines a Design from a prompt, writing the same `PortalConfig` the controls write.
