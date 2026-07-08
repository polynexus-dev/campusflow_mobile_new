# CampusNexus — Creative Brief & Brand Reference

This is the reference document behind the two production brochures in this folder:

- `campusflow-brochure.html` — A4 print/PDF brochure (13 pages)
- `campusflow-brochure/index.html` — scrollable web brochure

Every claim in both files is grounded in the real, implemented product across three codebases: the Django backend (`CampusFlow_backend`), the React web app (`CampusFlow-Frontend`), and this Expo mobile app (`campusflow-mobile`). Nothing here describes a feature that doesn't exist in the code.

---

## 1. Positioning

**Problem.** Indian college campuses run attendance, fees, transport, hostel, library, payroll and placements on a patchwork of paper registers, static QR/barcode scanners, and disconnected single-purpose software. Static credentials (roll-call, printed QR, swipe cards) are trivially shared between students. Nothing talks to anything else, so a dean can't see attendance, fee collection, and bus occupancy in one place.

**Solution.** CampusNexus is a single multi-tenant platform — one Django backend, one web dashboard, one mobile app — that unifies biometric attendance with a full campus ERP. Attendance is verified with a **live face match + motion-based liveness challenge**, backed by a **geofence + faculty-issued session code** as a fallback, on a device that's cryptographically bound to one student. Everything else a campus runs — fees, payroll, leave, hostel, library, inventory, placements, exams, transport — lives in the same system, behind the same role-based access model, with an immutable audit trail underneath all of it.

**Value proposition, in business language:**

| Technical implementation | Business translation |
|---|---|
| InsightFace ArcFace 512-d embeddings + dual-signal liveness (SCRFD confidence + texture/FFT anti-spoof) | Enterprise-grade biometric verification that tells a live student apart from a photo, screen replay, or stand-in — without heavy false-positive rates in real classroom lighting |
| `django-tenants` schema-per-tenant isolation + tenant-aware JWT | True multi-tenant SaaS architecture — every college's data lives in its own isolated database schema, with zero cross-tenant leakage risk |
| Geofence (lat/lng/radius/tolerance) + faculty-issued alphanumeric session code | A verification fallback that works even when biometrics or connectivity fail, without opening the door to proxy attendance |
| Immutable `AuditLog` on every create/update/delete | A complete, tamper-evident paper trail for every action in the system — built for accreditation and compliance reporting, not bolted on afterward |
| Django Channels + Redis WebSockets for bus GPS | Real-time transport visibility — administrators and students see exactly where a bus is, not a stale last-known position |
| Role hierarchy (SaaS Admin → College Admin → HOD → Faculty → Support Staff → Student) enforced in `permissions.py` | Access control that mirrors how a real campus is actually run, not a flat list of "users" |
| One React 19 web app + one Expo mobile app, same backend | A single source of truth — what a lecturer approves on the web dashboard is what a student sees on their phone, instantly |

**What we do not claim:** AI/ML beyond the documented face-recognition pipeline, mobile push notifications, offline mode, live third-party integrations beyond configurable SMTP/ERP fields, or formal third-party certifications (ISO/GDPR audits) that haven't actually been obtained. Any statistic that isn't a measured, sourced fact is phrased as illustrative ("built to," "designed to reduce," "up to") rather than as a hard number.

---

## 2. Brand system (already established in the HTML — documented here, not reinvented)

**Name:** CampusNexus (external/marketing brand) — the codebases are internally named CampusFlow; the brochures should stay consistent on "CampusNexus" throughout.

**Color palette**
| Token | Hex | Use |
|---|---|---|
| `--aubergine` | `#4a154b` | Primary brand color, dark backgrounds |
| `--orchid` | `#7C3085` | Primary accent, CTAs, links |
| `--royal` | `#611f69` | Gradient mid-tone |
| `--deep` | `#2d0a30` | Deepest background layer |
| `--bg-dark` | `#0d0010` | Hero/dark section background |
| `--bg` | `#f4f5f7` | Light section background |
| `--text-primary` | `#0f0015` | Body text on light |
| `--text-muted` | `#5e4a65` | Secondary text on light |
| Accent gradient | `#c084fc → #a855f7 → #7C3085 → #4a154b` | `.grad-text`, glow buttons, chart lines |

Neutral white/navy is used for the print brochure's cover and card surfaces; the web brochure leans darker/glassier for hero and feature sections, lighter for content-dense sections (pricing tables, module grids). This split is already correct in the existing files — keep it.

**Typography**
- Display/headings: **Outfit** (600–900 weight) — bold, tight letter-spacing (-0.02em to -0.03em)
- Body: **Inter** (300–600 weight)
- Code/technical labels: **JetBrains Mono** — used sparingly for spec chips, technical timeline labels

**Spacing & shape**
- Radius scale: `--radius-lg: 20px`, `--radius-md: 14px`, `--radius-sm: 8px`
- Shadow scale: `--shadow-lg: 0 24px 64px rgba(74,21,75,0.18)`, `--shadow-md: 0 8px 32px rgba(74,21,75,0.12)`
- Section vertical rhythm: 100px padding top/bottom on the web brochure; A4 print pages use 24mm/20mm margins

**Voice:** direct, confident, specific. Lead with the concrete mechanism (what actually happens), then the benefit. Avoid vague SaaS buzzwords ("synergy," "revolutionary," "next-gen") — the real feature list is strong enough not to need inflation.

---

## 3. Page-by-page structure (A4 print brochure, 13 pages)

1. **Cover** — Product name, tagline ("The Future of Smart Campus Attendance"), hero gradient background, device-mockup silhouette, logo placeholder.
2. **Executive Summary** — Problem/solution/mission in the language of §1. One paragraph each: The Problem, The Approach, Who It's For.
3. **Product Overview** — Diagram description of the three-tier system (mobile → backend → web) and a concrete data flow example: student registers face on mobile → embeddings stored + matched by the Django/InsightFace backend → admin manages, reviews and reports via the web dashboard.
4. **Pain Points** *(existing, kept)* — Why traditional attendance/campus-ops tooling fails, reframed as qualitative pain (no invented industry statistics).
5. **Core Capabilities** *(existing, corrected)* — The 7 anti-proxy feature cards, with the session-code fallback corrected (see §5).
6. **Backend Architecture** *(new)* — Multi-tenant schema-per-tenant diagram description, DRF + JWT auth, Postgres/Redis/Channels stack, security stack.
7. **Web Application** *(new)* — Laptop-mockup description of the admin/faculty dashboards: analytics, bus tracking map, fee/payroll/leave modules.
8. **Mobile Application** *(new)* — Phone-mockup description of student/lecturer/conductor flows: face registration, liveness check-in, bus tracking, fees.
9. **Full Campus ERP Suite** *(existing, kept)* — The 19-module grid.
10. **Security Blueprint** *(existing, corrected)* — Device binding, liveness, ArcFace matching, geofence + session code, audit trail — corrected to remove the fabricated TOTP/HMAC narrative (see §5).
11. **Technology Stack** *(new)* — Three-column card grid: Backend / Web / Mobile, real dependencies only.
12. **Roadmap** *(new)* — Forward-looking, explicitly framed as "coming next," not shipped functionality.
13. **Contact / Back cover** *(existing, kept)* — Contact placeholders, CTA.

## Page-by-page structure (Web brochure — same content, scrollable sections)

Hero → Executive Summary *(new)* → Pain Points → Core Capabilities → Product Overview *(new)* → Web Application *(new)* → Mobile Application *(new)* → Full ERP Suite → Competitive Analysis → Technology Stack *(new)* → Security Blueprint → How It Works → Session Code demo *(corrected from "QR demo")* → Roadmap *(new)* → Testimonials *(anonymized)* → Pricing → Contact → Footer.

---

## 4. Illustration / AI-image-generation prompts

No images are generated for the brochures (both are pure HTML/CSS/SVG — device frames and diagrams are drawn in CSS, not raster images), but if the brand later commissions real illustration or hero photography, use these prompts:

- **Hero art:** "Abstract geometric illustration of a glowing purple-to-magenta neural/network mesh forming the silhouette of a university campus building, deep navy-black background, thin luminous line work, premium enterprise SaaS aesthetic, no text, 21:9"
- **Device mockup backdrop:** "Minimal 3D render of a laptop and smartphone at a 30-degree angle, floating above a soft aubergine-to-black gradient, subtle reflection, studio lighting, product-launch style, no screen content"
- **Architecture diagram base:** "Clean isometric illustration of three connected server/device nodes (phone, cloud database, laptop) linked by glowing purple data-flow lines on a dark background, technical but elegant, minimal labels"
- **Security section backdrop:** "Abstract representation of a fingerprint dissolving into a facial-recognition mesh grid, purple gradient, dark background, subtle, not literal biometric imagery"

## 5. Corrections applied to the existing HTML (what changed and why)

These are factual corrections against the verified codebase — not style changes:

| Old claim (fabricated) | Corrected claim (verified) | Why |
|---|---|---|
| "Rotating TOTP-QR Fallback," HMAC-SHA256-signed QR rotating every 15s | Faculty-issued alphanumeric session code, valid for the attendance window, combined with the geofence check | Backend has no TOTP/HMAC session-code signing; the real mechanism is a plain code generated per lecture (`models/lecture.py`, `views/lecturer_attendance.py`) |
| "128-dim embedding, cosine similarity > 0.82" | 512-d ArcFace embedding, cosine similarity ≥ 0.55 (configurable via `FACE_SIMILARITY_THRESHOLD`) | Matches `face_utils.py` exactly |
| "Raw image discarded within 30 seconds," "on-device landmark mesh" | Face images are processed server-side into embeddings for matching; flagged/failed attempts are retained in `FraudAlert` for human review | The on-device/30-second claims aren't implemented; fraud alerts do retain images, so "zero images ever stored" is inaccurate |
| Hero stat: "0 Raw Images Stored" | Replaced with "512-d Biometric Embeddings" | Same reason as above |
| Hero stat: "15s QR Token Rotation" | Replaced with "3-Angle Biometric Enrollment" | No token rotation exists |
| Logo strip naming real institutions (MIT, COEP, Symbiosis, BITS Pilani, etc.) as customers | Generic "Built for institutions of every size" strip with role/segment labels instead of named brands | No verified customer relationship with these real institutions — false association risk |
| Testimonials with named individuals + real institution names (COEP, Symbiosis) | Anonymized role-based quotes (e.g. "Dean of Academics, Engineering College") | User decision — avoid attributing fabricated quotes to real, identifiable institutions |
| Hard stats: "34% of lectures affected nationwide," "61% of geofence systems bypassed," "99% proxy prevention rate," "45h saved/year" | Reframed as qualitative/illustrative language ("built to eliminate," "reclaim teaching time") without invented precision | Unsourced statistics presented as fact |
| Footer badges: "GDPR Compliant," "ISO 27001" | Replaced with "Privacy-by-Design," "Tenant-Isolated Data," "Immutable Audit Trail" | These are real architectural properties; ISO 27001/GDPR are formal certifications that require a third-party audit, which isn't evidenced anywhere in the codebase |

---

## 6. Figma-ready layout guidance

- **Frames:** A4 portrait (210×297mm) for the print set; a 1440px-wide desktop frame + 768px tablet + 390px mobile frame for the web brochure, matching the existing responsive breakpoints (1024px, 768px, 480px already defined in the CSS).
- **Grid:** 12-column grid, 24px gutter, 1200px max content width (matches `.container { max-width: 1200px }`).
- **Component list to build as reusable Figma components:** nav bar, hero CTA button (`.btn-glow`), feature card (`.feat-card`), pain card (`.pain-card`), pricing card (`.pricing-card` + `.featured` variant), testimonial card, security-timeline item, device mockup frame (laptop + phone), section label/tag chip.
- **Auto-layout:** every card grid in the HTML uses CSS `grid` with `auto-fit`/`auto-fill` and `minmax()` — replicate with Figma auto-layout wrap so the design stays responsive-accurate.

## 7. Print-ready / interactive PDF / deck notes

- **Print-ready A4:** the print file already uses `page-break-after: always` per `.brochure-page` — after adding the 6 new pages, re-check that no card grid overflows a page's 297mm height in Chrome's print preview (`Ctrl+P` → Save as PDF).
- **Interactive PDF:** if exporting for digital distribution, add a linked table of contents (page 1 or 2) and PDF bookmarks per page — most PDF export tools (e.g. Adobe Acrobat, or headless Chrome + `pdf-lib`) can generate bookmarks from `<h1>/<h2>` tags if the HTML is annotated with `id` attributes matching each page (already true for the web file's sections; add matching `id`s to each `.brochure-page` in the print file).
- **Slide-deck adaptation:** for an investor/sales deck (16:9), condense to 10 slides by merging: Cover, Executive Summary, Product Overview, Key Features (top 4 only), Backend+Web+Mobile (one "How it's built" slide with 3 columns instead of 3 pages), Security, ERP Suite (top 8 modules), Roadmap, Pricing, Contact. Keep the same color/type system; widen hero type scale for projector legibility.
