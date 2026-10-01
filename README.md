# PimSaduak

PimSaduak is a browser-based parcel label printer built with React. Label data stays in the browser; the app does not use a server or API.

## Development

```bash
npm install
npm run dev
```

## Current scope

Create single labels or import batches from Excel, CSV, TSV, and text files. Choose between QR code, barcode, or no code; select a standard label size or enter a custom size in centimeters or inches; review the live preview and print through the browser. Import templates include example rows, and all processing stays in the browser. Print requests are saved in this browser for search, reprint, and deletion; browser storage may be cleared in browser settings, and it cannot confirm a physical print. See [PLAN.md](PLAN.md) for the implementation sequence.
