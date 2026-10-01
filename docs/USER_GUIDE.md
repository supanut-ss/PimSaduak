# PimSaduak: Program Overview and User Guide

> English version first. ภาษาไทยอยู่ด้านล่าง: [ไปที่ส่วนภาษาไทย](#th)

<a id="en"></a>

## 1. What is PimSaduak?

PimSaduak is a web page for printing parcel shipping labels. You type in (or import) the recipient and sender details, choose a label size, check the preview, and print.

- **No account and no internet service needed.** Everything runs inside your web browser.
- **Your data stays on your computer.** Nothing is sent to a server.
- **Works for one label or hundreds.** Print a single label by hand, or load a spreadsheet and print many at once.

## 2. What it can do

| Feature | Plain-language description |
|---|---|
| Single label | Fill in a form and print one label. |
| Batch import | Load an Excel, CSV, or text file. Each row becomes one label. |
| QR code / Barcode | Add a QR code or a barcode (e.g. a tracking number) to the label, or leave it out. |
| Label sizes | Pick a common size or type your own width and height. |
| Live preview | See exactly what the label will look like before printing. |
| Import templates | Download a ready-made example file to fill in. |
| Print history | Past print requests are saved in your browser so you can find and reprint them. |

## 3. Getting started

### Opening the program

If someone has already set it up for you, just open the web address they gave you.

To run it yourself (needs [Node.js](https://nodejs.org) installed):

```bash
npm install
npm run dev
```

Then open the address shown in the terminal (usually `http://localhost:5173`).

## 4. How to use it

### Step 1: Choose the label size

- Pick a size from the **Paper size** list:
  - 10 × 15 cm (4 × 6 in), the most common parcel label
  - 10 × 10 cm (4 × 4 in)
  - 10 × 20 cm (4 × 8 in)
  - A6 (10.5 × 14.8 cm)
  - **Custom size**
- For a custom size, enter the width and height and choose cm or inches.
  - Width and height must be between about 6 × 8.5 cm and 50 cm.
  - If a value is out of range, a red message tells you.
- Choose the size that matches the paper in your printer.

### Step 2: Fill in the label details

For a single label, fill in:

- **Recipient name** and **recipient address** (required)
- Recipient phone (optional)
- Sender name, phone, and address (optional)

### Step 3 (optional): Add a QR code or barcode

- Choose **QR Code**, **Barcode**, or **None**.
- Type what the code should contain, for example a tracking number or a web link.
- Limits:
  - Barcode: up to 30 characters
  - QR code: up to 180 characters
- If the code cannot be created from what you typed, the program shows a message explaining why.

### Step 4: Check the preview and print

- The preview shows the label as it will print.
- Click the print button. Your browser's print window opens.
- In the print window, select your printer and make sure the paper size matches the label size you chose. Turn off headers, footers, and scaling for the best result.

## 5. Printing many labels from a file

### Prepare the file

1. Click one of the template buttons (**Excel**, **CSV**, or **Text**) to download an example file.
2. Open it and replace the example rows with your own. **One row = one label.**
3. Keep the first row (the column titles) as it is.

The columns are:

| Column | Required? | Notes |
|---|---|---|
| Recipient name | Yes | |
| Recipient phone | No | Store as text so the leading 0 is kept. |
| Recipient address | Yes | |
| Sender name | No | |
| Sender phone | No | |
| Sender address | No | |
| Code type | No | `QR`, `Barcode`, or empty |
| Code value | No | Required if you chose a code type |

The program also understands some alternative column titles (for example `recipient`, `address`, `tracking number`), in Thai or English.

### Import and review

1. Click **Choose file from device** and select your file.
   - Accepted: `.xlsx`, `.xls`, `.csv`, `.txt`, `.tsv`
   - Limits: 10 MB and **200 rows per file**
2. The rows appear in a list. Rows with problems are marked with a short message (for example, a missing name or address).
3. Open a row to fix it directly in the program.
4. Untick any row you don't want to print.
5. The summary shows how many rows are selected and how many still have errors. Fix errors before printing.
6. Click print.

Use **Clear list** to remove everything and start over.

## 6. Print history and reprinting

- Every print request is saved in your browser.
- You can search the history, **reprint** an old label, or **delete** an entry (it asks you to confirm).
- Important to know:
  - History is stored **only in this browser on this computer**. A different browser, a different computer, or private/incognito mode will not show it.
  - Clearing your browser's site data erases the history.
  - It records that you *asked* to print. It cannot confirm that the paper actually came out of the printer.

## 7. Privacy

- No data is uploaded anywhere. Names, addresses, and phone numbers stay on your device.
- Because history is kept in the browser, avoid using a shared computer for sensitive addresses, or delete entries when you are done.

## 8. Troubleshooting

| Problem | What to try |
|---|---|
| File won't import | Check the type (`.xlsx`, `.xls`, `.csv`, `.txt`, `.tsv`), size (≤ 10 MB), and row count (≤ 200). |
| Columns not recognised | Download a template and copy your data into it. |
| Phone numbers lose the leading 0 | Format the phone columns as Text in Excel. |
| Barcode or QR code shows an error | Shorten the text (30 chars for barcode, 180 for QR) and remove unusual characters. |
| Label is cut off or the wrong size when printed | In the print window, set the paper size to match the label, and set margins to None and scale to 100%. |
| Thai text looks garbled in a CSV | Save the CSV as UTF-8, or use the Excel template instead. |
| History disappeared | The browser's site data was cleared, or you are using a different browser/profile. |

## 9. For developers (short)

- Built with React and Vite. Barcodes use JsBarcode, QR codes use `qrcode`, spreadsheets use SheetJS (`xlsx`).
- Commands: `npm run dev` (develop), `npm run build` (production build), `npm test` (run tests).
- The implementation plan is in [PLAN.md](../PLAN.md).

---

<a id="th"></a>

# PimSaduak: รายละเอียดโปรแกรมและคู่มือการใช้งาน (ภาษาไทย)

[Back to English](#en)

## 1. PimSaduak คืออะไร

PimSaduak เป็นหน้าเว็บสำหรับพิมพ์ใบปะหน้าพัสดุ กรอก (หรือนำเข้า) ข้อมูลผู้รับและผู้ส่ง เลือกขนาดฉลาก ดูตัวอย่าง แล้วสั่งพิมพ์ได้เลย

- **ไม่ต้องสมัครสมาชิก ไม่ต้องใช้บริการออนไลน์** ทุกอย่างทำงานในเบราว์เซอร์
- **ข้อมูลอยู่ในเครื่องคุณเท่านั้น** ไม่ถูกส่งไปที่เซิร์ฟเวอร์
- **พิมพ์ได้ทั้งใบเดียวและหลายร้อยใบ** กรอกเองทีละใบ หรือนำเข้าจากไฟล์ตารางแล้วพิมพ์ทีเดียว

## 2. ทำอะไรได้บ้าง

| ฟีเจอร์ | คำอธิบาย |
|---|---|
| ฉลากใบเดียว | กรอกฟอร์มแล้วพิมพ์ 1 ใบ |
| นำเข้าหลายรายการ | โหลดไฟล์ Excel, CSV หรือข้อความ แต่ละแถวเป็นฉลาก 1 ใบ |
| QR Code / Barcode | ใส่ QR Code หรือ Barcode (เช่น เลขพัสดุ) หรือไม่ใส่ก็ได้ |
| ขนาดฉลาก | เลือกขนาดมาตรฐาน หรือกำหนดกว้าง×สูงเอง |
| ตัวอย่างสด | เห็นหน้าตาฉลากจริงก่อนพิมพ์ |
| เทมเพลตนำเข้า | ดาวน์โหลดไฟล์ตัวอย่างไปกรอกต่อได้ทันที |
| ประวัติการพิมพ์ | เก็บคำขอพิมพ์ไว้ในเบราว์เซอร์ ค้นหาและพิมพ์ซ้ำได้ |

## 3. เริ่มต้นใช้งาน

หากมีคนติดตั้งให้แล้ว เปิดที่อยู่เว็บที่ได้รับได้เลย

หากต้องการรันเอง (ต้องติดตั้ง [Node.js](https://nodejs.org) ก่อน):

```bash
npm install
npm run dev
```

จากนั้นเปิดที่อยู่ที่แสดงในหน้าต่างคำสั่ง (ปกติคือ `http://localhost:5173`)

## 4. วิธีใช้งาน

### ขั้นที่ 1: เลือกขนาดฉลาก

- เลือกจากรายการ **ขนาดกระดาษ**:
  - 10 × 15 ซม. (4 × 6 นิ้ว) ขนาดที่ใช้บ่อยที่สุด
  - 10 × 10 ซม. (4 × 4 นิ้ว)
  - 10 × 20 ซม. (4 × 8 นิ้ว)
  - A6 (10.5 × 14.8 ซม.)
  - **กำหนดขนาดเอง**
- ถ้ากำหนดเอง ให้ใส่กว้างและสูง แล้วเลือกหน่วย ซม. หรือ นิ้ว
  - ขนาดต้องอยู่ระหว่างประมาณ 6 × 8.5 ซม. ถึง 50 ซม.
  - หากเกินช่วง จะมีข้อความสีแดงแจ้ง
- เลือกให้ตรงกับกระดาษในเครื่องพิมพ์

### ขั้นที่ 2: กรอกข้อมูลบนฉลาก

สำหรับฉลากใบเดียว กรอก:

- **ชื่อผู้รับ** และ **ที่อยู่ผู้รับ** (จำเป็น)
- เบอร์โทรผู้รับ (ไม่บังคับ)
- ชื่อ เบอร์โทร และที่อยู่ผู้ส่ง (ไม่บังคับ)

### ขั้นที่ 3 (ไม่บังคับ): ใส่ QR Code หรือ Barcode

- เลือก **QR Code**, **Barcode** หรือ **ไม่ใส่**
- พิมพ์ข้อมูลที่ต้องการในโค้ด เช่น เลขพัสดุหรือลิงก์
- ข้อจำกัด:
  - Barcode: ไม่เกิน 30 ตัวอักษร
  - QR Code: ไม่เกิน 180 ตัวอักษร
- หากสร้างโค้ดจากข้อมูลที่ใส่ไม่ได้ โปรแกรมจะแจ้งสาเหตุ

### ขั้นที่ 4: ตรวจตัวอย่างและพิมพ์

- ตัวอย่างแสดงฉลากตามที่จะพิมพ์จริง
- กดปุ่มพิมพ์ หน้าต่างพิมพ์ของเบราว์เซอร์จะเปิดขึ้น
- ในหน้าต่างพิมพ์ เลือกเครื่องพิมพ์ และตั้งขนาดกระดาษให้ตรงกับฉลาก ปิดหัวกระดาษ/ท้ายกระดาษ และการย่อขยาย เพื่อผลที่ดีที่สุด

## 5. พิมพ์หลายใบจากไฟล์

### เตรียมไฟล์

1. กดปุ่มเทมเพลต (**Excel**, **CSV** หรือ **Text**) เพื่อดาวน์โหลดไฟล์ตัวอย่าง
2. เปิดไฟล์ แล้วแทนที่แถวตัวอย่างด้วยข้อมูลของคุณ **1 แถว = 1 ฉลาก**
3. คงแถวแรก (ชื่อคอลัมน์) ไว้ตามเดิม

คอลัมน์ที่ใช้:

| คอลัมน์ | จำเป็นไหม | หมายเหตุ |
|---|---|---|
| ชื่อผู้รับ | จำเป็น | |
| เบอร์โทรผู้รับ | ไม่ | ตั้งเป็นข้อความเพื่อให้เลข 0 ตัวหน้าไม่หาย |
| ที่อยู่ผู้รับ | จำเป็น | |
| ชื่อผู้ส่ง | ไม่ | |
| เบอร์โทรผู้ส่ง | ไม่ | |
| ที่อยู่ผู้ส่ง | ไม่ | |
| ประเภทโค้ด | ไม่ | `QR`, `Barcode` หรือเว้นว่าง |
| ข้อมูลโค้ด | ไม่ | ต้องใส่ถ้าเลือกประเภทโค้ด |

โปรแกรมรองรับชื่อคอลัมน์ทางเลือกบางแบบด้วย (เช่น `recipient`, `address`, `tracking number`) ทั้งไทยและอังกฤษ

### นำเข้าและตรวจสอบ

1. กด **เลือกไฟล์จากอุปกรณ์** แล้วเลือกไฟล์
   - รองรับ: `.xlsx`, `.xls`, `.csv`, `.txt`, `.tsv`
   - ข้อจำกัด: 10 MB และ **200 แถวต่อไฟล์**
2. รายการจะแสดงขึ้น แถวที่มีปัญหาจะมีข้อความสั้นๆ กำกับ (เช่น ไม่มีชื่อหรือที่อยู่)
3. เปิดแถวเพื่อแก้ไขในโปรแกรมได้เลย
4. เอาเครื่องหมายถูกออกจากแถวที่ไม่ต้องการพิมพ์
5. สรุปด้านบนบอกจำนวนที่เลือกและจำนวนที่ยังมีข้อผิดพลาด ต้องแก้ก่อนพิมพ์
6. กดพิมพ์

กด **ล้างรายการ** เพื่อเริ่มใหม่

## 6. ประวัติการพิมพ์และการพิมพ์ซ้ำ

- ทุกคำขอพิมพ์ถูกบันทึกไว้ในเบราว์เซอร์
- ค้นหาประวัติ **พิมพ์ซ้ำ** หรือ **ลบ** รายการได้ (ลบต้องกดยืนยัน)
- ควรรู้:
  - ประวัติเก็บ **เฉพาะในเบราว์เซอร์และเครื่องนี้** เปลี่ยนเบราว์เซอร์ เปลี่ยนเครื่อง หรือใช้โหมดส่วนตัวจะไม่เห็น
  - ถ้าล้างข้อมูลเว็บไซต์ในเบราว์เซอร์ ประวัติจะหาย
  - บันทึกเพียงว่าคุณ *สั่ง* พิมพ์ ไม่สามารถยืนยันได้ว่ากระดาษออกจากเครื่องพิมพ์จริง

## 7. ความเป็นส่วนตัว

- ไม่มีการอัปโหลดข้อมูลไปที่ใด ชื่อ ที่อยู่ และเบอร์โทรอยู่ในอุปกรณ์ของคุณ
- เนื่องจากประวัติเก็บในเบราว์เซอร์ ไม่ควรใช้เครื่องที่ใช้ร่วมกับผู้อื่นกับที่อยู่ที่อ่อนไหว หรือควรลบประวัติเมื่อใช้เสร็จ

## 8. แก้ปัญหาเบื้องต้น

| ปัญหา | ลองทำ |
|---|---|
| นำเข้าไฟล์ไม่ได้ | ตรวจชนิดไฟล์ (`.xlsx`, `.xls`, `.csv`, `.txt`, `.tsv`) ขนาด (≤ 10 MB) และจำนวนแถว (≤ 200) |
| ไม่รู้จักคอลัมน์ | ดาวน์โหลดเทมเพลตแล้วคัดลอกข้อมูลลงไป |
| เบอร์โทรเลข 0 ตัวหน้าหาย | ตั้งคอลัมน์เบอร์โทรใน Excel เป็นชนิดข้อความ (Text) |
| Barcode/QR Code ขึ้นข้อผิดพลาด | ลดความยาว (Barcode 30, QR 180 ตัวอักษร) และเอาอักขระแปลกๆ ออก |
| พิมพ์แล้วฉลากถูกตัดหรือขนาดไม่ตรง | ในหน้าต่างพิมพ์ ตั้งขนาดกระดาษให้ตรงกับฉลาก ขอบเป็น None และสเกล 100% |
| ภาษาไทยในไฟล์ CSV เพี้ยน | บันทึก CSV แบบ UTF-8 หรือใช้เทมเพลต Excel แทน |
| ประวัติหาย | ถูกล้างข้อมูลเบราว์เซอร์ หรือใช้คนละเบราว์เซอร์/โปรไฟล์ |

## 9. สำหรับนักพัฒนา (สั้นๆ)

- สร้างด้วย React และ Vite ใช้ JsBarcode (Barcode), `qrcode` (QR Code), SheetJS `xlsx` (ไฟล์ตาราง)
- คำสั่ง: `npm run dev` (พัฒนา), `npm run build` (สร้างไฟล์ใช้งานจริง), `npm test` (รันเทสต์)
- แผนการพัฒนาอยู่ที่ [PLAN.md](../PLAN.md)
