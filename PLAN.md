# PimSaduak implementation plan

## Product goal

Help small sellers create readable parcel labels quickly from one page. The app runs in React in the browser, sends no data to a server, and needs no API or server database.

## Product decisions

- Keep label entry, preview, and the main action together on one responsive page.
- Use a mobile-first layout, safe-area-aware sticky header, and persistent print action on phones and portrait tablets; use a split workspace on wider screens.
- Keep the label itself white with dark, print-friendly text; use pastel colors for the surrounding interface and action cues.
- Start with a 10 × 15 cm label. Later presets: 10 × 10 cm, 8 × 5 cm, and A6 (10.5 × 14.8 cm), plus a custom size in centimeters or inches.
- Use browser storage for local print history. Prefer IndexedDB for batches and label snapshots when that step is implemented.
- Treat the browser print dialog as a print request. The browser cannot confirm that a physical label was successfully printed.

## Visual direction

- Audience: small online sellers who need to prepare one or many parcels with minimal setup.
- Palette: cloud `#F3F8FC`, paper `#FFFFFF`, ink `#29313F`, lavender `#B9A7E8`, mint `#A9DCCB`, and peach `#F6D2BD`.
- Typography: system sans-serif with Thai-capable fallbacks (`Noto Sans Thai`, `Tahoma`, sans-serif).
- Layout: compact header, recipient and sender form on the left, live label preview on the right; stack the form and preview on narrow screens.
- Principle: make the printed address the strongest element, and keep pastel color outside the printed area.

```text
┌ PimSaduak · Easy Print Label                 เก็บข้อมูลในเบราว์เซอร์ ┐
│ พิมพ์ใบแปะหน้าพัสดุ                   1 ใบ · 10 × 15 ซม.          │
├─────────────────────────────────────┬──────────────────────────────┤
│ ผู้รับ                              │ ตัวอย่างฉลาก                │
│ ชื่อ · โทรศัพท์ · ที่อยู่            │ ┌────────────────────────┐ │
│                                     │ │ ผู้รับ                   │ │
│ ผู้ส่ง                              │ │ ชื่อ เบอร์โทร ที่อยู่   │ │
│ ชื่อ · โทรศัพท์ · ที่อยู่            │ │ ผู้ส่ง                    │ │
│                                     │ └────────────────────────┘ │
│                                     │ [พิมพ์ใบแปะหน้าพัสดุ]       │
└─────────────────────────────────────┴──────────────────────────────┘
```

## Steps and acceptance criteria

### Step 1 — Single-label foundation (complete)

- Create a runnable React and Vite app using JavaScript.
- Add recipient and sender fields with an instant label preview.
- Print only the 10 × 15 cm label, with required recipient name and address.
- Acceptance: `npm run build` succeeds; editing fields updates the preview; browser printing hides the app UI and sizes the label to 100 × 150 mm.
- Commit as `feat: add single parcel label printing`.

### Step 1.1 — Cross-device experience (complete)

- Adapt the form, preview, and print action for phone, tablet portrait/landscape, and desktop widths.
- Keep touch controls at least 48 px high and account for notches and gesture areas.
- Acceptance: checked 320 px and 375 px phones, 768 px tablet portrait, 1024 px tablet landscape, a short desktop viewport, and 1440 px desktop. No horizontal overflow appeared; the print action stayed available above the safe-area inset on compact screens.

### Step 2 — Optional QR and barcode (complete)

- Add a choice of no code, QR code, or barcode and an input for its value.
- Keep generated code data local; support one code type per label.
- Acceptance: preview and printed output show the selected code and encode the entered value.
- QR codes are generated in the browser as 512 px PNG data URLs and support up to 180 characters, including Thai text.
- Barcodes use Code 128, accept printable ASCII up to 30 characters, and show validation before printing.
- Verification: `npm run build` succeeds; browser checks confirmed both preview and print markup contain the selected code, generated QR output is shared by both labels, and widths from 320 px through 1440 px have no horizontal overflow.

### Step 3 — File import and templates (complete)

- Import `.xlsx`, `.xls`, `.csv`, `.tsv`, and tab-delimited `.txt` files locally in the browser, with a 10 MB file limit and a 200-row batch limit.
- Provide downloadable Excel, CSV, and text templates with example rows; keep phone numbers as text so leading zeroes survive import.
- Show imported rows, explain validation errors, and let the user edit or exclude rows before printing selected labels.
- Acceptance: valid rows become labels; invalid rows are explained and cannot be selected until corrected.
- Verification: `npm test` and `npm run build` pass; browser checks confirmed CSV, Excel, and text imports, editing and selecting rows, template actions, and no horizontal overflow from 320 px through 1440 px.

### Step 4 — Label sizes

- Add standard presets and custom width/height in centimeters or inches.
- Reflect selected dimensions in the preview and print stylesheet.
- Acceptance: the preview aspect ratio and print page size follow the selected dimensions.

### Step 5 — Local history and reprint

- Store print batches and label snapshots in IndexedDB on the current browser.
- Add history search, reprint, and delete actions.
- Acceptance: history survives reload in the same browser and reprints the original label content and size.

### Step 6 — Usability pass

- Check keyboard use, clear validation, small-screen layout, and print alignment.
- Explain that browser data belongs to the current browser profile and may be cleared by browser settings.
- Acceptance: complete one-label and multi-label flows with keyboard and pointer; confirm print output on supported browsers.

## Step 1 implementation notes

- Stack: React, Vite, plain JavaScript, and CSS.
- Keep form values in React state; no data leaves the browser.
- Use a separate print-only label and `@page` sizing so the screen controls do not appear on paper.
- Verification: `npm run build`.
