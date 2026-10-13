# Project Architecture Rules

- Store blog cover images under `obituary-photos/blog/` and persist their public Supabase URLs in `blogs.image_url`, so every blog surface and SEO tag uses one durable source.
- Generate known-person memorial portraits only through the admin-only licensed-source pipeline, storing provenance and both source/edited files under `obituary-photos/portraits/`, because identity and reuse rights must remain auditable.

- Attribute memorial purchases to blogs only via the last blog CTA/link click stored client-side (30-day window) and saved on memorial_orders at checkout, so blog revenue is never guessed.
- Blog sales sections live in blogs.sales_* / cta_* / interactive_* columns and render via BlogSalesSection, so admins edit them without touching article HTML.
- Normalize browser-created biography paragraph wrappers in the shared rich-text sanitizer and legacy line-break-only stories in the shared display formatter, so creation, editing, and public previews preserve paragraph boundaries consistently.
- Submit visitor tributes through the server-side tribute endpoint, deriving approval settings and notification recipients from stored memorial ownership and admin records, so public submissions cannot grant themselves approval or choose email recipients.
- Check memorial ownership directly as well as manager roles for moderation, so a missing collaborator row cannot lock out the memorial creator.
- Use the shared life-event year validator in creation and editing forms, so invalid or missing years cannot silently save completed events.
