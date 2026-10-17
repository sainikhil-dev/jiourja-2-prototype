# JioUrja 2.0 — Energy-as-a-Service platform prototype

A working prototype of **JioUrja 2.0**, a concept Energy-as-a-Service platform that helps Indian MSMEs reduce electricity costs through rooftop solar, appropriately sized battery storage, flexible payment options and long-term service.

Built by **Team Miles Ahead, FMS Delhi** for **Reliance Industries' The Ultimate Pitch XII** (national semi-finale).

> **Disclaimer.** JioUrja 2.0 is an original concept. It is not an official Reliance service and has not been launched or authorised by Reliance Industries. Every customer, person, tariff value and result in this app is fictional or illustrative and is labelled that way in the UI.

---

## 1. What it does

The prototype covers the full journey for an MSME customer and the JioUrja employees who serve them. Both sides read and write **one shared data model**.

| Customer portal (simple, mobile-first, English/हिंदी) | Partner console (staff, analytical) |
|---|---|
| Landing page, segment selector (MSME live; Large Industry and Data Centre as concept pages) | Overview with portfolio metrics computed from the records |
| 3–5-minute enquiry: bill → business → rooftop (map, manual entry or "not sure") → review | Customer pipeline with search, filters and inline stage updates |
| Plain-language preliminary recommendation with a savings range and confidence level | Interactive rooftop canvas: outline, obstacles, setbacks, panel layout and geometric shade by month and hour |
| Comparison of PPA and loan plans, with working EMI; choosing a plan sends a request for review | Energy Studio: 24-h load and solar profiles, ToD tariff, bill breakdown, solar-only vs solar + BESS, cash flows |
| Printable preliminary proposal generated from the engine | Calculation Assumptions panel (per customer and global) with recalculation |
| Site-visit booking and an 8-stage progress tracker | Commercial assessment: 9-item checklist, decision, risk flags, proposal approval |
| Active-system dashboard (Home / Savings / My Plan / Help) | Installation & maintenance: survey confirmation, scheduling, commissioning, tickets, simulated alerts |
| Service tickets that staff can update and the customer can track | Portfolio monitoring: generation, savings, availability, overdue payments, alerts and per-site drill-down |
| **Pay Now**: a bill-payment flow (UPI / card / net banking selector, demo confirmation, receipt with reference number, payment history) that clears overdue invoices and settles the regular PPA/EMI bill | Read-only **Payments** card on each active customer showing payment history and overdue status, feeding the portfolio's "Payment exceptions" and "Outstanding payments" stats |

A **Start Guided Demo** panel takes you through the competition storyline in 16 steps. Each step is completed by doing the real action in the UI, and the panel detects when the step is done.

## 2. Tech stack

React 18 · TypeScript (strict) · Vite 5 · Tailwind CSS 3 · Recharts · Lucide icons · React Router 6 · Leaflet (map roof tracing using keyless Esri imagery and Nominatim search, with a fallback when offline) · Vitest + Testing Library · Playwright.

- No backend, no paid APIs and no secrets are needed.
- State is persisted to `localStorage`. Uploaded files (bills, roof photos) are kept in the browser's IndexedDB.
- Changes made in one browser tab sync to other tabs.

## 3. Run locally

```bash
npm install
npm run dev          # http://localhost:5173
npm test             # 34 unit + workflow tests (Vitest)
npm run build        # type-check + production build to dist/
npm run test:e2e     # Playwright scripted demo (desktop + mobile); builds and serves dist/ on :4173
```

Requires Node 18 or later. Partner console demo PIN: **2026** (pre-filled).

To reset all demo data, use **Reset demo data** (bottom of the landing page) or **Partner console → Assumptions & Demo → Reset Demo Data**.

## 4. Deploy a public preview

The app is a static SPA. Any static host works, as long as it rewrites unknown paths to `index.html`:

- **Vercel**: import the repo. Framework: Vite. Build: `npm run build`. Output: `dist`. SPA rewrites are already set in `vercel.json`.
- **Netlify**: build `npm run build`, publish `dist`. SPA rewrites are already set in `public/_redirects`.
- **GitHub Pages / any CDN**: upload `dist/` and configure a 404 → `index.html` fallback.

## 5. Project structure

```
src/
  types/index.ts          Domain types: Customer, ElectricityBill, TariffSchedule, LoadProfile, RoofAssessment,
                          ShadeObstacle, SolarSystem, BatterySystem, EnergySimulation, CommercialProposal,
                          EligibilityReview, SiteSurvey, Installation, Telemetry, ServiceTicket …
  engine/                 UI-free calculation engine
    assumptions.ts        Illustrative default assumptions and tariff (all editable)
    tariff.ts             Component-wise bill (energy, wheeling, FAC, ToD, fixed/demand, duty, export credit)
    solar.ts              Sun position, Pune hourly solar shape, monthly yields
    roof.ts               Polygon area, setbacks, obstacle exclusion, panel layout, shadow geometry, confidence
    loadProfile.ts        Bill-based estimated profiles, synthetic profiles, CSV interval import
    dispatch.ts           365-day hourly simulation with rule-based battery dispatch
    finance.ts            EMI, NPV, IRR, lifecycle/provider/customer cash flows, cost-reflective PPA pricing
    recommend.ts          Solar sizing, battery co-optimisation, recommendation and plain-language messages
    telemetry.ts          SIMULATED monitoring for active systems (derived from the engine, clearly labelled)
  data/seed.ts            Fictional seeded customers, surveys, tickets and staff
  store/                  Shared store (localStorage) and pure state transitions used by both portals
  pages/customer/         Onboarding, Results, PaymentOptions, BookSurvey, Portal (tracker + dashboard)
  pages/console/          Overview, Pipeline, CustomerDetail, Roof, EnergyStudio, Commercial, Operations, Portfolio, Settings
  pages/ProposalDoc.tsx   Printable proposal / statement
  components/             UI kit, RoofCanvas, RoofMap, GuidedDemo, tracker and energy-flow widgets
  i18n/                   English / Hindi labels
tests/                    Vitest: engine.test.ts, workflow.test.tsx
e2e/demo.spec.ts          Playwright scripted demo
```

## 6. How the engine works

1. **Load.** A monthly bill cannot reveal a 15-minute profile, so new enquiries get an *estimated* hourly profile built from stated working hours and scaled to the bill. Seeded customers use *synthetic* profiles. Staff can upload real interval CSV data (`time,kW`, `timestamp,kW` or `timestamp,kWh`; 15/30/60-minute). Every profile carries its provenance label.
2. **Solar.** Monthly specific yield × performance ratio, distributed over the day with a sun-path shape for Pune, plus deterministic day-to-day weather variation. The result is multiplied by the roof model's month × hour shade-loss matrix.
3. **Roof and shade.** Gross area comes from the outline. Setbacks and obstacle clearances are excluded by grid sampling, and panels are laid out in both orientations. Shadows are the convex hull of each obstacle footprint, projected by height ÷ tan(sun elevation) away from the sun azimuth. Shaded sample points are weighted by severity, with a 1.5× penalty for partial module shading. This is labelled as a simplified geometric model.
4. **Dispatch (hourly, 8,760 steps).** In each hour:
   - solar serves the load first;
   - surplus solar charges the battery within power, capacity and SOC limits;
   - the rest is exported, up to any export limit, and anything beyond that is curtailed;
   - the battery discharges only inside configured windows, and only when the avoided tariff exceeds the export value lost plus a cycle-wear cost;
   - grid charging happens only if enabled and economic;
   - charging and discharging never happen in the same hour;
   - energy balance is preserved, and throughput, cycles and losses are tracked.
5. **Bills.** Each tariff component is computed separately. Fixed and demand charges are **never** reduced by solar. The effective bill rate and the avoidable rate per solar unit are reported separately.
6. **Economics** are kept in three separate views:
   - *Lifecycle (owner)*: NPV, IRR, payback, O&M escalation, insurance, solar degradation, battery fade and replacement.
   - *Provider (PPA)*: revenue, operating cost, NPV at the hurdle rate and IRR. Revenue is never described as profit.
   - *Customer*: avoided cost **minus** PPA payments, or minus EMI and O&M. Gross avoided cost is never described as net savings.

   By default the PPA rate is *cost-reflective*: it is solved so that the provider earns exactly its target return. A manual rate can also be set.
7. **Recommendation.** Solar size is chosen to maximise the customer's PV net benefit under the PPA, capped by roof capacity and sanctioned load. Each battery size is co-optimised with the solar size. A battery is recommended only if it improves customer net benefit **and** its incremental lifecycle benefit/cost ratio is at least 1.10. Otherwise the recommendation is solar-only. The engine does not simply pick the largest system.

Results for the seeded cases with default assumptions:

| Case | Profile | Result |
|---|---|---|
| Shree Ganesh Industries (sample enquiry, daytime manufacturer) | 10,000 units/month, 9 AM–9 PM, 251 m² roof with water tank and neighbouring building | **Solar-only, ~23.6 kW.** 5% modelled shade. Battery benefit/cost ≈ 0.15 |
| Kulkarni Polymers (Customer 2, evening shift) | 1–11 PM shift, export capped at 10 kW | **Solar + 20 kWh battery.** 40 and 60 kWh rejected. Flips to solar-only if battery CAPEX rises to ₹30k/kWh |
| Sai Fabrication Works (Customer 3, rented) | ₹28k bill, landlord NOC pending, lease shorter than PPA term | Low confidence; "Additional documents required"; risk flags raised |

## 7. Tests

`npm test` runs 37 tests, covering every check requested in the brief:

1. Solar generation never exceeds the production input, and all solar energy is accounted for.
2. Battery SOC stays within its limits.
3. Charging and discharging respect power and energy limits and never happen in the same interval. Without grid charging, the battery charges only from solar.
4. Interval and annual energy balance hold.
5. No battery means no discharge, no cycles and no battery costs.
6. More shade means less production.
7. Less generation never increases avoided cost.
8. Fixed/demand charges are not eliminated by solar.
9. PPA payments are deducted before net savings are reported.
10. EMI is correct, including a full amortisation check.
11. Solar-only can win, and a battery is not automatically the largest size.
12. Portal and console records stay synchronised, and proposals equal the engine output after assumptions change.
13. A booked survey appears in the employee queue (rendered UI).
14. A staff-resolved ticket shows as resolved in the customer dashboard (rendered UI).

There are also tests for IRR/NPV, PPA pricing, CSV import, onboarding validation and a full onboarding UI flow. `e2e/demo.spec.ts` drives the whole 26-step demo in a real browser.

## 8. Guided demo walkthrough (60–90 s)

1. Landing → **Start Guided Demo** → **Try Sample Pune Factory** → Continue ×2 → **Yes, this is my factory rooftop** → Continue → **See my estimate**.
2. Read the plan (Solar only, savings range, confidence) → **Compare payment options** → **Choose this plan** → **Book My Free Site Assessment** → **Request visit**.
3. Guided panel → **Take me there** (signs in as the demo Solutions Manager) → the new enquiry in the pipeline.
4. Rooftop: drag the time slider to ~4 PM to see the neighbouring building's shadow, select the water tank and raise its height → **Mark Roof Assessment Verified**.
5. Commercial: tick checks → decision **Preliminarily suitable for PPA**.
6. Energy Studio: load curve → **Solar vs Solar + BESS** table → **Financial model** (customer vs provider) → **Mark electricity assessment reviewed**. Optional: open Kulkarni Polymers to see a battery recommended.
7. Installation & Maintenance → **Confirm** the visit.
8. Customer portal → visit confirmed, roof verified → **Switch demo customer** → Mahalaxmi Food Products (or Om Packaging, which has a battery) → Home / Savings / My Plan → Help → **Request an engineer**.
9. Console → Service tickets → open → **Mark resolved** → customer Help tab shows *resolved*.
10. Optional: switch to **Deccan Precision Tools**, which has a sample overdue invoice — the Home tab shows a red "Payment overdue" banner → **Pay Now** → choose UPI/Card/Net banking → confirm → the overdue banner clears, a receipt with a reference number appears in **My Plan → Payment history**, and the console's Customer Detail page shows the same payment and flips to "Up to date".

## 9. Working features vs simulated / future integrations

**Genuinely working (local):**
- onboarding with validation and persistence;
- bill and photo upload, stored locally and viewable by staff;
- map roof tracing with area calculation (needs internet for imagery);
- roof canvas geometry and shade model;
- the full calculation engine, recommendation, EMI, PPA pricing and cash flows;
- assumption editing with recalculation;
- CSV interval import;
- proposal generation, versioning and printing (Print → Save as PDF);
- bill payment (Pay Now): clears overdue invoices or settles the current cycle, records a receipt with a reference number, and is visible to staff — clearly labelled as a demo confirmation with no real payment gateway;
- survey booking and confirmation;
- stage tracking;
- commercial checklist and decisions;
- installation scheduling and commissioning;
- the ticket workflow;
- portfolio metrics from records;
- Hindi labels;
- cross-tab sync and reset.

**Simulated or illustrative (labelled in the UI):**
- seeded customers and their interval data;
- tariff values (not a MERC tariff order);
- CAPEX and O&M prices;
- monitoring data for active systems (derived from the engine, not hardware);
- fault alerts;
- overdue-payment sample;
- installation documents;
- staff sign-in (demo PIN, no real authentication);
- support phone number.

**Not implemented / future integrations:**
- automatic bill OCR (uploaded bills are stored, but values must be typed);
- satellite-based roof detection or irradiance APIs;
- live inverter or smart-meter telemetry;
- credit bureau, bank or lender integrations (none are accessed);
- DISCOM net-metering applications;
- e-signature;
- a real payment gateway / bank connection (bill payment in the app is a labelled demo confirmation — see above);
- technician dispatch;
- a server-side database and real authentication.

## 10. Known limitations

- Single-browser persistence: the demo data lives in `localStorage` and is not shared between devices.
- The map traced outline is converted to metres; obstacles from map tracing still have to be placed by staff on the canvas.
- Panels are laid out on a flat plane. Inter-row self-shading, tilt and azimuth optimisation, and string/inverter design are not modelled.
- Shading uses mid-month sun positions and a 5-point sample per panel. It is a screening model that requires on-site verification.
- Battery degradation is approximated with annual fade plus a cycle/calendar-based replacement. Demand-charge reduction from batteries is deliberately not credited.
- Interval data is modelled at hourly resolution; 15-minute uploads are averaged to hourly.
