# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Visitors to the NUTN CSIE graduation project exhibition, including department students, professors, and alumni returning to campus. They need to understand the exhibition, discover projects and their schedule, and find practical venue and transportation information.

## Product Purpose

Provide the 116th class graduation project exhibition with a public website that helps visitors understand the event, browse project and schedule information, and plan their visit. Success means visitors can quickly find the information they need before or during the exhibition.

## Positioning

An event-specific information hub that brings the exhibition introduction, project details, parallel group schedules, venue maps, and transportation guidance together so visitors can move from discovering the work to planning an in-person visit in one place.

## Operating Context

- The exhibition is a single-day, in-person event scheduled for 2026-12-12 at the National University of Tainan, Fucheng Campus, Wen-hui Building B1.
- The site is used before and during the event, including on mobile devices while visitors are navigating the campus.
- Exhibition information is maintained in the project repository and may be updated as the department confirms details.

## Capabilities and Constraints

- The site provides an introduction, a schedule for two project groups, a project index with detail dialogs, venue maps, and transportation information.
- The implementation is a framework-free static HTML/CSS/JavaScript website deployed through Cloudflare Pages. Keep it deployable as static files without requiring a server-side application.
- The exhibition has two groups: 智慧感知與訊號分析組 and 智慧推論與決策系統組.
- Some project titles and abstracts are still examples or pending confirmation. Do not present unconfirmed material as official; only publish details supplied or verified by the department.
- Conference tags indicate projects with confirmed conference acceptance/submission status as specified by the department; do not infer or add tags.
- Advisor information and student IDs are not to be displayed on the public site.
- Preserve the current desktop and mobile support. The mobile experience prioritizes stable rendering and interaction.

## Brand Commitments

- Public identity: NUTN CSIE 116 畢業專題成果展.
- Traditional Chinese is the primary language; English project titles are included when confirmed.

## Evidence on Hand

- `README.md` documents the site's purpose, static deployment model, features, and supported-browser expectations.
- `index.html` contains the current event introduction, date, venue, maps, and transport content.
- `script.js` contains the current group, schedule, project, member, and confirmed conference-tag data. Some project names remain placeholders.
- `assets/images/campus-map-2026.png` and `assets/images/exhibition-floorplan-2026.png` are the current venue graphics.

## Product Principles

- Prefer accurate, department-confirmed information over filling gaps with invented details.
- Keep exhibition discovery, schedule browsing, and visit planning in one straightforward place.
- Make essential information easy to find on both desktop and mobile, especially during an on-campus visit.

## Accessibility & Inclusion

- Support desktop and mobile web use.
- Preserve the existing keyboard interaction, semantic tabs/dialogs, and accessible labels documented for the site.
