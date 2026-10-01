# PimSaduak: Developer Guide

Technical reference for the PimSaduak codebase. For end-user instructions see [USER_GUIDE.md](USER_GUIDE.md).

## 1. Overview

PimSaduak is a client-only single-page app that prints parcel shipping labels. There is no backend: parsing, rendering, storage, and printing all happen in the browser.

| Concern | Choice |
|---|---|
| UI | React 19 (function components, hooks only) |
| Build / dev server | Vite 8 with `@vitejs/plugin-react` |
| QR codes | `qrcode` (rendered to a PNG data URL) |
| Barcodes | `jsbarcode` (CODE128, rendered to SVG) |
| Spreadsheets | SheetJS `xlsx`, lazy-loaded with dynamic `import()` (prefetched when batch mode opens) |
| Persistence | IndexedDB (print history only) |
| Tests | Node built-in test runner (`node --test`) |

## 2. Getting started

```bash
npm install
npm run dev      # dev server
npm run build    # production build into dist/
npm run preview  # serve the production build
npm test         # run tests in tests/
```

`xlsx` is installed from the SheetJS CDN tarball (see `package.json`), so the first install needs network access to `cdn.sheetjs.com`.

## 3. Project structure

```text
index.html            Vite entry HTML
src/
  main.jsx            React bootstrap
  App.jsx             All UI components and app state
  App.css             Component styles + print styles (@page, @media print)
  index.css           Global styles
  importUtils.js      File parsing, header matching, validation, templates
  labelSizes.js       Presets, unit conversion, size validation, layout scale
  historyStore.js     Print history records and IndexedDB access
tests/
  importUtils.test.js
  labelSizes.test.js
  historyStore.test.js
PLAN.md               Implementation plan
```

Pure logic lives in the three `src/*.js` modules, which keeps it testable with Node. `App.jsx` is one large file holding every component.

## 4. Architecture

### 4.1 Data flow

```text
Single form ──┐
              ├─> labels ─> ShippingLabel (screen preview)
File import ──┘     │
 (importUtils)      ├─> print sheet (hidden on screen) ─> window.print()
                    └─> historyStore.saveHistoryRecord (IndexedDB)
History entry ─> reprint ─> same print sheet path
```

### 4.2 Label model

```js
{
  recipientName, recipientPhone, recipientAddress,
  senderName, senderPhone, senderAddress,
  codeType,   // 'none' | 'qr' | 'barcode'
  codeValue
}
```

Single mode keeps `form`, `codeType`, and `codeValue` in separate state. Batch mode keeps an array `batchRows` of `{ id, rowNumber, form, typeError, included, editing }`.

### 4.3 Main components (`App.jsx`)

- `App`: owns all state (entry mode, label size, form, batch rows, print batch, history) and the print lifecycle.
- `LabelSizeControls`: preset select plus custom width/height/unit inputs with inline errors.
- `BatchImportSection`, `BatchImportRow`, `BatchRowFields`: upload, template download, per-row editing and include toggle; per-field errors come from `getBatchFieldError`.
- `ShippingLabel`: renders one label, used for both the preview and the print sheet; takes `widthMm`, `heightMm`, `labelScale`.
- `Barcode`: draws CODE128 into an SVG in `useLayoutEffect`; clears the SVG if JsBarcode throws.
- `HistoryEntry`: one history row with reprint and two-step delete.
- `Field`, `AddressField`, `SectionHeading`: small form helpers.

## 5. Modules

### 5.1 `labelSizes.js`

- Presets: `100x150` (default), `100x100`, `100x200`, `a6` (105×148 mm), and `custom`.
- Custom limits: width 60–500 mm, height 85–500 mm.
- `toMillimeters(value, unit)` / `fromMillimeters(mm, unit)`: `unit` is `'cm'` or `'in'`; invalid input gives `NaN` / `''`.
- `validateCustomLabelSize(width, height, unit)` returns `{ valid, widthValid, heightValid, widthMm, heightMm }`.
- `formatDimensionLimit(mm, unit, 'min' | 'max')` rounds min up and max down, so a displayed limit is always an accepted value.
- `formatLabelSize(widthMm, heightMm, unit)` gives display text such as `10 × 15 ซม.`.
- `getLabelScale(widthMm, heightMm)`: the layout is designed for an 84 × 134 mm content area (size minus 16 mm). Scale is `min(availW/84, availH/134)` clamped to 0.5–1.5 and applied with a CSS transform, so non-default sizes fit.

### 5.2 `importUtils.js`

- Limits: `MAX_IMPORT_ROWS = 200`, `MAX_IMPORT_SIZE_BYTES = 10 MB`.
- `parseLabelFile(file)`:
  1. Checks the extension (`xlsx`, `xls`, `csv`, `txt`, `tsv`) and size.
  2. Dynamically imports `xlsx` and reads the first sheet. `sheetRows` is capped at `MAX_IMPORT_ROWS + 2` so huge files are not fully read; `!fullref` detects overflow.
  3. Matches the header row against `headerAliases` (case-insensitive; whitespace, `_`, `-`, and a BOM are ignored). `recipientName` and `recipientAddress` columns are mandatory.
  4. Reads cells as text (`getCellText`) so phone numbers keep their leading zero.
  5. Resolves the code type with `resolveCodeType` (accepts `qr`, `barcode`, `none`, and Thai equivalents), drops fully blank rows, and returns row objects. Rows with errors start as `included: false, editing: true`.
  6. Throws `Error` with a Thai, user-facing message on failure; the UI shows `error.message` directly.
- `getCodeError(codeType, codeValue)`: QR ≤ 180 chars; barcode ≤ 30 chars and printable ASCII only (`\x20-\x7E`); an empty value is an error when a type is selected.
- `getImportedRowErrors(form, typeError)`: list of row problems; empty means printable.
- `createDelimitedTemplate('csv' | 'txt')`, `createExcelTemplateWorkbook()`, `downloadImportTemplate(format)`: build example files (CSV comma-separated, text tab-separated).

To support another column name, add it to `headerAliases`. Aliases are normalized like headers, so any case and no separators is fine.

### 5.3 `historyStore.js`

- IndexedDB database `pimsaduak-print-history`, version 1, object store `print-requests`.
- `createHistoryRecord({ labels, widthMm, heightMm, unit, sizeText, source, id, createdAt })` returns:

  ```js
  {
    id, createdAt,
    source,                      // 'single' | 'batch' | 'reprint'
    widthMm, heightMm, unit, sizeText,
    labelCount,
    labels: [{ form, codeType, codeValue }]
  }
  ```

  It throws `TypeError` for an empty `labels` array or non-finite dimensions. `id` uses `crypto.randomUUID()` with a fallback.
- `filterHistoryRecords(records, query)`: case-insensitive substring search over size text, form values, code type, and code value.
- `listHistoryRecords()`, `saveHistoryRecord(record)`, `deleteHistoryRecord(id)`: async IndexedDB operations. If IndexedDB is unavailable, `listHistoryRecords` rejects and the UI shows `historyError` instead of crashing.

History records contain personal data (names, addresses, phones). They never leave the browser; keep that in mind before adding export or sync.

## 6. Printing

- Printing uses the browser's native `window.print()`.
- The page has two trees: the interactive UI (class `screen-ui`) and `<main class="print-sheet">`, which holds one `ShippingLabel` per label to print. Under `@media print` the UI is hidden and only the sheet shows, one label per page.
- `App.jsx` renders an inline `<style>` with `@page { size: <w>mm <h>mm; margin: 0 }` and matching print-width rules for the current label size (`labelWidthCss` / `labelHeightCss`). The static `@page` rule in `App.css` (100 × 150 mm) is only the default.
- Batch flow: selected rows are copied into `printBatch`, QR data URLs are generated and decoded up front (`generateQrDataUrl`), then `printBatchReady` flips and a layout effect calls `window.print()`. This avoids printing before QR images are ready.
- The `afterprint` event clears `printBatch` and `historyPrintJob`.
- A print request is saved to history when printing starts. The app cannot know whether paper was actually produced.
- Reprint (`handleHistoryReprint`) rebuilds labels from a stored record, prints at the stored size (`historyPrintJob`), and saves a new record with `source: 'reprint'`.

## 7. Testing

Tests cover the pure modules only; there are no component or browser tests.

```bash
npm test
```

| File | Covers |
|---|---|
| `tests/labelSizes.test.js` | Unit conversion, limits, validation |
| `tests/importUtils.test.js` | Parsing, aliases, code validation, templates |
| `tests/historyStore.test.js` | Record creation, filtering |

Add tests next to the module you change. Printing, IndexedDB in a real browser, and layout need manual checks: run `npm run dev`, print to PDF at several sizes, and confirm nothing is clipped.

## 8. Conventions

- Code, identifiers, comments, commit messages, and project docs are in English; user-facing UI strings are in Thai.
- ES modules throughout (`"type": "module"`). The pure modules import each other with the `.js` extension so Node can run them.
- Keep logic that does not need React in `src/*.js` and test it there.
- Accessibility: inputs have labels, errors use `aria-invalid` and `aria-describedby`, and live error text uses `role="alert"`. Preserve this when adding fields.

## 9. Extending

| Task | Where |
|---|---|
| Add a label size preset | `LABEL_PRESETS` in `labelSizes.js` |
| Change custom size limits | `MIN_LABEL_*` / `MAX_LABEL_DIMENSION_MM` in `labelSizes.js` |
| Accept another import column name | `headerAliases` in `importUtils.js` |
| Change the 200-row / 10 MB import limits | `MAX_IMPORT_ROWS` / `MAX_IMPORT_SIZE_BYTES` in `importUtils.js` (update the user guide too) |
| Add a new label field | `initialForm` and `batchFieldDefinitions` in `App.jsx`; `headerAliases` and template rows in `importUtils.js`; `ShippingLabel`; the history record shape |
| Change the history schema | Bump `HISTORY_DATABASE_VERSION` and handle migration in `onupgradeneeded` in `historyStore.js` |

## 10. Known limitations

- `App.jsx` is a single large file; splitting components out is a reasonable cleanup.
- Import reads only the first sheet of a workbook.
- History is per browser profile, with no sync or export.
- History records a print request, not a confirmed print.
