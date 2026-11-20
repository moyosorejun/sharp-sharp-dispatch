**SHARP SHARP DISPATCH**

Brand and UI Design Brief

For: Claude Code (frontend build). Owner: Moyosore Junaid. Version 1,
November 2026.

# 1. How to use this document

This brief describes the look, feel and screens of the web frontend for
**Ada**, the English and Pidgin voice support agent for Sharp Sharp
Dispatch (a fictional Nigerian delivery company). The backend already
exists in this repo: server/ (Express + Vapi tools) and
supabase/schema.sql. Build the frontend in a new web/ folder.

Rules for the build:

- Follow the design tokens in section 5 exactly. Do not invent new
  colours.

- The reference boards are **inspiration only**. Do not copy any logo,
  wordmark, illustration or layout from them. Create original shapes and
  patterns in the same spirit.

- The product must never look like a generic purple SaaS template. If a
  choice feels default, push it toward the Lagos energy described in
  section 3.

- Keep the copy short. Use Pidgin where marked. Do not use em dashes in
  any UI copy.

# 2. Product recap

Ada answers calls about deliveries, looks up orders, and notices when a
caller is confused. When confusion rises she climbs an **explanation
ladder**: normal answer (level 0), smaller steps (level 1), a Nigerian
analogy (level 2), then a handoff to a human (level 3). The UI has two
jobs:

1.  **Show the experience:** let a visitor talk to Ada in the browser
    and watch her notice confusion live.

2.  **Show the data:** a dashboard of calls, confusion over time, ladder
    levels and escalations.

# 3. Brand personality

"Sharp sharp" means fast, no dulling. The brand should feel like Lagos
at its best: quick, loud in a good way, warm, and proud of how we talk.
Underneath the energy it must still feel trustworthy, because people are
asking about their money and their packages.

| **Trait**            | **What it looks like in the UI**                                                                                            |
|----------------------|-----------------------------------------------------------------------------------------------------------------------------|
| Fast and energetic   | Bold wide headlines, tilted moving ribbons, packages that float and bounce, short punchy copy.                              |
| Proudly Nigerian     | Naija green as the hero colour, Adire-inspired squiggle textures, Pidgin microcopy, local analogies.                        |
| Patient and kind     | Calm spacing around the call UI, soft motion when Ada is listening, confusion shown as a helpful signal, never as an error. |
| Playful but credible | Gamified meters and badges, but clean data tables and readable charts on the dashboard.                                     |

# 4. Inspiration boards and what to take from each

## 4.1 Colour and brand silhouette (Dribbble collection)

Source: dribbble.com/mojunaid9/collections/7998446-sharp-sharp-delivery

| **Reference**                            | **What to take**                                                                                                                                                                                        |
|------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Digital Product Design (Coker Oluwafemi) | Black background with thin vertical magenta pin-stripes and crisp white line icons. Use this for dark hero or footer sections: ink background, pin-stripe texture, white outline icons.                 |
| Nigeria (Scott Verchin)                  | Flat, bright Naija green field with a heavy wordmark whose letters are sliced and split between dark green and white. Use the idea of sliced or split letterforms for the main headline only (see 6.2). |
| New Nigeria Count Down (TheAkura\_)      | Deep teal-green background covered in hand-drawn squiggle and Adire-like marks in teal and magenta, with bold condensed white type. Use as the inspiration for an original background pattern.          |
| Kuvo Fintech App (Eunice Akpa)           | Mint green canvas with dark forest-green and white phone screens, rounded cards, simple flows. Use for the dashboard: mint and forest green, clean cards, calm data UI.                                 |

## 4.2 Shapes, 3D effects and ambience (Lapa Ninja board)

Source: lapa.ninja/board/e799-6d49-947d-0d36-4251-a464

| **Reference**                       | **What to take**                                                                                                                                                                                                                                                                                                                                                                        |
|-------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| PrettyDamnQuick (delivery software) | The strongest match. Flat illustrated packages floating in space, a cyclist courier, a gamified delivery bar made of box segments with a score counter, tilted marquee ribbons crossing each other, a spinning circular "play" badge, wide extra-bold headlines, deep dark backgrounds with bright blocks. Take: floating packages, segmented meters, crossing ribbons, spinning badge. |
| Cycle (product feedback tool)       | Warm cream background with big geometric colour blocks (quarter circles, squares, pills) in green, yellow, blue and lilac, playful characters, lots of white space, a bold colour band at the bottom. Take: geometric block compositions and the cream light theme for the dashboard.                                                                                                   |
| Relay for Figma                     | Could not be rendered during research. Mo to confirm what to take (likely the dimensional, 3D-feeling shapes). Until confirmed, treat as general support for soft 3D depth on shapes.                                                                                                                                                                                                   |
| Arthur                              | Could not be rendered during research. Mo to confirm what to take. Until confirmed, ignore.                                                                                                                                                                                                                                                                                             |

# 5. Colour system

Hex values were sampled by eye from the references and tuned to work
together. Treat them as the source of truth for this project.

| **Name**       | **Swatch** | **Hex**  | **Role**                                                                               |
|----------------|------------|----------|----------------------------------------------------------------------------------------|
| Naija Green    |            | \#2BCB35 | Primary brand colour. Hero blocks, primary buttons (with ink text), confusion level 0. |
| Forest         |            | \#0F3B2E | Main dark colour. Dark sections, headings on light backgrounds, table headers.         |
| Adire Teal     |            | \#1F5E4F | Secondary dark. Pattern backgrounds, cards on forest sections.                         |
| Mint           |            | \#66EFA8 | Highlights, success states, dashboard accents, confusion level 1.                      |
| Package Yellow |            | \#FFC21A | Packages, badges, warnings, confusion level 2.                                         |
| Owambe Magenta |            | \#E01E8C | Accent. Ribbons, pin-stripes, live indicators, confusion level 3 and escalations.      |
| Ink            |            | \#0B0B0B | Text, outlines, hard shadows, dark hero background.                                    |
| Cream          |            | \#FFF8EE | Light background for dashboard and content sections.                                   |
| White          |            | \#FFFFFF | Cards, text on dark.                                                                   |

### Usage rules

- Rough balance: 60% dark (Ink, Forest) or Cream depending on the page,
  30% Naija Green and Mint, 10% Magenta and Yellow.

- **Text on Naija Green, Mint and Yellow is always Ink.** White on Naija
  Green fails contrast.

- White text on Magenta only for bold text 16px and up (buttons,
  badges).

- Never put Magenta text on Naija Green, or Green text on Magenta.

- Confusion colours are fixed: 0 Naija Green, 1 Mint, 2 Package Yellow,
  3 Owambe Magenta. Use them everywhere confusion appears.

### CSS tokens

> :root {
>
> --ss-green: \#2BCB35; --ss-forest: \#0F3B2E; --ss-teal: \#1F5E4F;
>
> --ss-mint: \#66EFA8; --ss-yellow: \#FFC21A; --ss-magenta: \#E01E8C;
>
> --ss-ink: \#0B0B0B; --ss-cream: \#FFF8EE; --ss-white: \#FFFFFF;
>
> --conf-0: var(--ss-green); --conf-1: var(--ss-mint);
>
> --conf-2: var(--ss-yellow); --conf-3: var(--ss-magenta);
>
> --radius-sm: 10px; --radius-md: 18px; --radius-lg: 28px;
> --radius-pill: 999px;
>
> --border: 2px solid var(--ss-ink);
>
> --shadow-hard: 5px 5px 0 var(--ss-ink);
>
> --shadow-hard-sm: 3px 3px 0 var(--ss-ink);
>
> }

# 6. Typography

| **Use**                    | **Font (Google Fonts)**  | **Notes**                                                                                          |
|----------------------------|--------------------------|----------------------------------------------------------------------------------------------------|
| Display / headlines        | Unbounded, 700 to 900    | Wide and heavy, like the PrettyDamnQuick headlines. Tight letter spacing (-0.02em). Sentence case. |
| Body and UI                | DM Sans, 400 / 500 / 700 | Clean and friendly. 16px base, 1.5 line height.                                                    |
| Order IDs, numbers, timers | Space Mono, 700          | For SSD-1004, call durations, scores. Feels like a delivery label.                                 |

### 6.1 Type scale

Hero 64 to 88px (clamp), H1 48px, H2 32px, H3 22px, body 16px, small
13px, label 12px uppercase with 0.08em tracking.

### 6.2 Sliced headline effect (hero only)

Inspired by the split letterforms in the green "Nigeria" reference, but
original. Render the hero headline twice, stacked: the top layer in Ink
clipped to the upper half with clip-path, the bottom layer in White or
Forest clipped to the lower half and shifted 3px right. The result looks
like a word cut by a blade: sharp sharp. Use it once per page at most.

# 7. Shapes, 3D and ambience

### 7.1 Shape language

- **Geometric blocks** (from Cycle): quarter circles, half circles,
  pills and squares in brand colours, arranged in loose clusters at
  section edges. Build as inline SVG.

- **Hard outlines and hard shadows:** cards and buttons use a 2px Ink
  border and an offset shadow (--shadow-hard). On press, the element
  moves 3px down-right and the shadow shrinks, so buttons feel physical.

- **Rounded, never sharp corners** on cards (18 to 28px). Pills for
  chips and tags.

### 7.2 The 3D package

The hero object of the brand. A Package Yellow parcel box with a darker
top face, a tape stripe and a small Sharp Sharp label. Build it as a CSS
3D cube (transform-style: preserve-3d, 6 faces) or an isometric SVG. It
floats with a slow bob (translateY 8px, 4s, ease-in-out, infinite) and a
soft oval shadow below that shrinks as it rises. Use 2 to 4 packages of
different sizes in the hero, slightly rotated.

### 7.3 Ribbons and badges

- **Crossing marquee ribbons** (from PrettyDamnQuick): two full-width
  bands, one Magenta tilted -4deg and one Yellow tilted +3deg, crossing
  each other. Text scrolls slowly in opposite directions: "Sharp sharp
  delivery • We dey come • Abeg no vex • Ada dey here for you •".

- **Spinning badge:** a circular badge with text on a circular path,
  "Talk to Ada • Talk to Ada •", rotating 12s per turn, with a mic icon
  in the middle. This is the main call to action on the landing page.

### 7.4 Textures

- **Adire squiggle pattern:** an original repeating SVG of squiggles,
  dots and short dashes in Adire Teal and Magenta on Forest, at 15 to
  25% opacity. Use behind dark sections. Draw it fresh; do not trace the
  reference.

- **Pin-stripes:** thin 1px Magenta vertical lines every 24px on Ink,
  for the footer and the call screen background edges.

### 7.5 Ambience by page

| **Page**  | **Ambience**                                                                                                                         |
|-----------|--------------------------------------------------------------------------------------------------------------------------------------|
| Landing   | Night-time Lagos energy. Ink and Forest backgrounds, Naija Green blocks, floating packages, crossing ribbons, Adire texture.         |
| Live call | Calm focus. Forest background, lots of space, Ada orb in the centre, colour only where it carries meaning (confusion, live state).   |
| Dashboard | Daylight and clarity. Cream background, white cards with hard shadows, Mint and Forest accents, geometric blocks only in the header. |

# 8. Signature components

### 8.1 Ada orb

A 220px circle made of 3 or 4 overlapping geometric shapes (quarter
circles and a pill) that slowly rotate around each other. It reacts to
the call:

| **State**        | **Behaviour**                                                                                                  |
|------------------|----------------------------------------------------------------------------------------------------------------|
| Idle             | Shapes drift slowly. Label: "Tap to talk to Ada".                                                              |
| Listening        | Shapes pulse with the caller's volume (Vapi volume-level event). Ring in Mint.                                 |
| Thinking         | Shapes gather into the centre and spin faster. Label: "Ada dey check..."                                       |
| Speaking         | Shapes expand and contract with Ada's volume.                                                                  |
| Confusion colour | The outer ring takes the colour of the latest confusion score (--conf-0 to --conf-3), with a 400ms transition. |

### 8.2 Confusion meter

Inspired by the segmented "total deliveries" bar in PrettyDamnQuick. A
bar of small package-shaped segments that fill as confusion rises, plus
a Space Mono score counter ("0 / 3"). Labels below: Clear, Unsure,
Confused, Lost. Each segment fills with its confusion colour and does a
small bounce when it lights up.

### 8.3 Explanation ladder

A vertical stepper with 4 rungs: L0 Normal answer, L1 Smaller steps, L2
Analogy, L3 Human handoff. The current rung is highlighted with a
hard-shadow card and a small walking-figure or package icon that climbs
the ladder. Under each rung, a one-line description. When Ada reaches
L3, the rung turns Magenta and the escalation toast appears.

### 8.4 Live transcript

Chat bubbles. Caller on the right in White with Ink border, Ada on the
left in Mint. Each caller bubble has a small chip for language
("Pidgin", "English", "Mixed") and, if confusion was detected, a
coloured dot plus the signal in plain words, for example "asked again"
or "Pidgin confusion phrase".

### 8.5 Order card and route tracker

When check_order runs, slide in an order card: order ID in Space Mono,
item, from and to, payment method, and a horizontal route with stops:
Received, Picked up, To hub, At hub, Out for delivery, Delivered. The
current stop shows a floating mini package. Failed, on hold, returned
and cancelled show as a Magenta or Yellow flag on the route.

### 8.6 Escalation toast

Magenta card with a hard shadow that drops in from the top right: "Ada
don call human. Ticket \#12. Person go call you back within 2 hours."
Auto-dismiss after 8 seconds.

### 8.7 Buttons and chips

- Primary: Naija Green fill, Ink text, Ink border, hard shadow, pill
  shape.

- Secondary: White fill, Ink text, Ink border, hard shadow.

- Danger or live: Magenta fill, White bold text.

- Chips: pill, 12px uppercase label, 1.5px Ink border.

# 9. Screens

## 9.1 Landing page ( / )

3.  **Nav:** wordmark "Sharp Sharp" in Unbounded with a small package
    icon, links (How it works, Dashboard, GitHub), and a "Talk to Ada"
    button.

4.  **Hero (Ink background, Adire texture):** sliced headline "Customer
    care wey sabi when you no understand." Subline in English: "Ada is a
    voice agent that speaks English and Pidgin, and changes how she
    explains things when you're lost." Spinning "Talk to Ada" badge,
    floating 3D packages, geometric blocks.

5.  **Try these orders:** a row of chips with test IDs (SSD-1004 at hub,
    SSD-1006 failed delivery, SSD-1008 address issue, SSD-1002 out for
    delivery) and suggested lines to say, like "Abeg check 1004" then
    "Wetin be hub?".

6.  **Crossing ribbons** section divider.

7.  **How Ada notices confusion (Cream background):** three cards:
    Listens (Pidgin and English phrases), Notices (repeats, pauses,
    short unsure replies), Adapts (the ladder). Then the ladder
    explained visually.

8.  **Under the hood:** simple architecture strip: Vapi, Express,
    Supabase, n8n, with icons.

9.  **Footer (Ink with pin-stripes):** "Sharp Sharp Dispatch is a
    fictional company built as a demo by Moyosore Junaid." Links to
    GitHub and LinkedIn.

## 9.2 Live call view (modal over the landing page, or /call)

Desktop layout in three columns: left, live transcript; centre, Ada orb
with an End call button; right, confusion meter, ladder and order card.
On mobile, the orb sits on top and the three panels become swipeable
tabs (Transcript, Confusion, Order).

## 9.3 Dashboard ( /dashboard )

- **KPI tiles (4):** total calls, average max confusion, escalation
  rate, share of Pidgin calls. Space Mono numbers, small sparkline.

- **Calls table:** date, duration, main language chip, max confusion
  (coloured dot), escalated (yes/no), link to detail.

- **Ladder outcomes chart:** for calls that reached level 1 or 2, how
  many resolved without escalation (stacked bar).

- **Escalations list:** reason, summary, order ID, whether n8n was
  notified.

## 9.4 Call detail ( /dashboard/calls/:id )

A confusion timeline chart (turn number on X, confusion 0 to 3 on Y,
line coloured by level, ladder level shown as steps underneath), the
full transcript with per-turn chips, pause times, and the escalation
card if one happened.

# 10. Motion

- Durations: 150ms for buttons, 300 to 400ms for panels and colour
  changes, 4s loops for floating packages, 12s per turn for the spinning
  badge, 30 to 40s per loop for ribbons.

- Easing: cubic-bezier(0.34, 1.56, 0.64, 1) (a small overshoot) for
  things that pop in; ease-in-out for loops.

- Respect prefers-reduced-motion: stop ribbons, badges and floating,
  keep colour changes.

- Motion must never block reading the transcript.

# 11. Implementation notes for Claude Code

### Stack

- React + Vite + TypeScript in web/, Tailwind CSS with the tokens from
  section 5 added to the theme, React Router.

- Vapi Web SDK (@vapi-ai/web) with the public key and the assistant ID
  in web/.env (VITE_VAPI_PUBLIC_KEY, VITE_VAPI_ASSISTANT_ID).

- Recharts for dashboard charts. Framer Motion for animation if needed;
  plain CSS keyframes are fine for loops.

### Live call data

- Use SDK events for the orb and transcript: call-start, call-end,
  speech-start, speech-end, volume-level, message (transcripts). Check
  the current SDK docs for exact event names before coding.

- Get the call ID when the call starts, then poll GET
  /api/calls/:id/turns every 1.5s while the call is live to update the
  confusion meter, ladder and transcript chips. Polling is fine for a
  demo; no realtime setup needed.

### Endpoints to add to server/index.js (read only)

- GET /api/calls: latest 50 calls.

- GET /api/calls/:id: call plus its turns and escalations.

- GET /api/calls/:id/turns: turns for a live call.

- GET /api/orders/:id: one order, for the order card.

- GET /api/stats: KPI numbers for the dashboard.

Keep the Supabase service key on the server only. Add CORS for the web
app origin.

### Quality bar

- Responsive from 360px to 1440px.

- Lighthouse accessibility 90+. All interactive elements reachable by
  keyboard with a visible focus ring (3px Mint outline).

- Empty, loading and error states for every panel, written in friendly
  copy ("No calls yet. Talk to Ada to start.").

# 12. Microcopy bank

| **Where**        | **Copy**                                                    |
|------------------|-------------------------------------------------------------|
| Talk button      | Talk to Ada                                                 |
| Orb idle         | Tap to talk to Ada                                          |
| Orb thinking     | Ada dey check...                                            |
| Mic permission   | Abeg allow your mic so Ada fit hear you.                    |
| Call ended       | Call don end. Thank you!                                    |
| Escalation toast | Ada don call human. Person go call you back within 2 hours. |
| Empty dashboard  | No calls yet. Talk to Ada to start.                         |
| Error            | Something no work. Abeg try again.                          |

# 13. Do not

- Do not copy any logo, wordmark, illustration, icon set or pattern from
  the reference boards.

- Do not use the Nigerian flag or coat of arms.

- Do not use stock photos of people. Shapes, packages and icons carry
  the visuals.

- Do not use purple gradients, glassmorphism or generic SaaS hero
  layouts.

- Do not show confusion as red errors. It is a helpful signal.

# 14. Open items for Mo

- Confirm what to take from **Relay for Figma** and **Arthur** on the
  Lapa board (they did not load during research).

- Confirm the final company name after a quick search that "Sharp Sharp
  Dispatch" is not a real business.

- Logo: for now use the Unbounded wordmark plus the package icon. A
  proper logo can come later.

# 15. Prompt to start Claude Code

> Read docs/design-brief.docx (or its markdown export) and the existing
>
> server/ and supabase/ code. Build the frontend in web/ exactly as the
>
> brief describes: tokens, typography, signature components, and the
>
> landing, live call and dashboard screens. Start with the design tokens
>
> and the Button, Chip, Card and Package components, show me the landing
>
> page, then build the live call view, then the dashboard. Add the read
>
> only API endpoints from section 11 to server/index.js.
