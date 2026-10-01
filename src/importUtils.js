export const MAX_IMPORT_ROWS = 200;
export const MAX_IMPORT_SIZE_BYTES = 10 * 1024 * 1024;

const templateHeaders = [
  'ชื่อผู้รับ',
  'เบอร์โทรผู้รับ',
  'ที่อยู่ผู้รับ',
  'ชื่อผู้ส่ง',
  'เบอร์โทรผู้ส่ง',
  'ที่อยู่ผู้ส่ง',
  'ประเภทโค้ด',
  'ข้อมูลโค้ด',
];

const templateRows = [
  [
    'คุณสายใจ ใจดี',
    '0812345678',
    '99/1 ถนนสุขุมวิท แขวงคลองตัน เขตคลองเตย กรุงเทพฯ 10110',
    'ร้านบ้านสวน',
    '0898765432',
    '88/2 ถนนพระราม 4 เขตบางรัก กรุงเทพฯ 10500',
    'QR',
    'https://track.example/TH123456789',
  ],
  [
    'คุณสมชาย รักดี',
    '0861234567',
    '12/3 ถนนนิมมานเหมินท์ อำเภอเมือง เชียงใหม่ 50200',
    'ร้านบ้านสวน',
    '0898765432',
    '88/2 ถนนพระราม 4 เขตบางรัก กรุงเทพฯ 10500',
    'Barcode',
    'TH987654321',
  ],
];

const headerAliases = {
  recipientName: ['recipientname', 'recipient', 'ชื่อผู้รับ', 'ชื่อผู้รับพัสดุ', 'ชื่อผู้รับสินค้า'],
  recipientPhone: ['recipientphone', 'recipienttel', 'recipientmobile', 'เบอร์โทรผู้รับ', 'โทรศัพท์ผู้รับ', 'เบอร์ผู้รับ'],
  recipientAddress: ['recipientaddress', 'deliveryaddress', 'ที่อยู่ผู้รับ', 'ที่อยู่จัดส่ง', 'ที่อยู่ผู้รับพัสดุ', 'address'],
  senderName: ['sendername', 'sender', 'ชื่อผู้ส่ง', 'ชื่อผู้ส่งพัสดุ'],
  senderPhone: ['senderphone', 'sendertel', 'sendermobile', 'เบอร์โทรผู้ส่ง', 'โทรศัพท์ผู้ส่ง', 'เบอร์ผู้ส่ง'],
  senderAddress: ['senderaddress', 'ที่อยู่ผู้ส่ง'],
  codeType: ['codetype', 'barcodeType', 'ประเภทโค้ด', 'ประเภทบาร์โค้ด', 'ชนิดรหัส', 'รูปแบบรหัส'],
  codeValue: ['codevalue', 'trackingcode', 'trackingnumber', 'ข้อมูลโค้ด', 'ข้อมูลรหัส', 'รหัสติดตาม', 'เลขพัสดุ'],
};

function normalizeHeader(value) {
  return String(value ?? '')
    .replace(/^\uFEFF/, '')
    .toLocaleLowerCase()
    .replace(/[\s_\-–—]/g, '');
}

function getCellText(XLSX, worksheet, rowIndex, columnIndex) {
  const cell = worksheet[XLSX.utils.encode_cell({ r: rowIndex, c: columnIndex })];
  if (!cell || cell.v == null) return '';
  return String(cell.t === 's' ? cell.v : (cell.w ?? cell.v)).trim();
}

function resolveCodeType(value, codeValue) {
  const normalized = normalizeHeader(value);
  const hasCodeValue = Boolean(codeValue.trim());

  if (!normalized) {
    return hasCodeValue
      ? { codeType: 'none', typeError: 'ระบุประเภทโค้ดเมื่อมีข้อมูลโค้ด' }
      : { codeType: 'none', typeError: '' };
  }

  if (['none', 'no', 'ไม่มี', 'ไม่ใส่', 'ไม่ใช้'].includes(normalized)) {
    return hasCodeValue
      ? { codeType: 'none', typeError: 'ลบข้อมูลโค้ดหรือเลือก QR Code หรือ Barcode' }
      : { codeType: 'none', typeError: '' };
  }

  if (['qr', 'qrcode', 'คิวอาร์', 'คิวอาร์โค้ด'].includes(normalized)) {
    return { codeType: 'qr', typeError: '' };
  }

  if (['barcode', 'บาร์โค้ด', 'บาร์โคด'].includes(normalized)) {
    return { codeType: 'barcode', typeError: '' };
  }

  return { codeType: 'none', typeError: 'เลือกประเภทโค้ดเป็น ไม่มี, QR Code หรือ Barcode' };
}

export function getCodeError(codeType, codeValue) {
  if (codeType === 'none') return '';
  if (!codeValue.trim()) return 'กรอกข้อมูลที่ต้องการเข้ารหัสก่อนพิมพ์';
  if (codeType === 'qr' && codeValue.length > 180) return 'QR Code รองรับข้อมูลไม่เกิน 180 ตัวอักษร';
  if (codeType === 'barcode' && codeValue.length > 30) return 'Barcode รองรับไม่เกิน 30 ตัวอักษร';
  if (codeType === 'barcode' && !/^[\x20-\x7E]+$/.test(codeValue)) {
    return 'Barcode รองรับเฉพาะภาษาอังกฤษ ตัวเลข และสัญลักษณ์มาตรฐาน';
  }
  return '';
}

export function getImportedRowErrors(form, typeError = '') {
  const errors = [];
  if (!form.recipientName.trim()) errors.push('กรอกชื่อผู้รับ');
  if (!form.recipientAddress.trim()) errors.push('กรอกที่อยู่ผู้รับ');
  if (typeError) errors.push(typeError);

  if (form.codeType === 'none' && form.codeValue.trim() && !typeError) {
    errors.push('ลบข้อมูลโค้ดหรือเลือก QR Code หรือ Barcode');
  } else if (form.codeType !== 'none' && !typeError) {
    const codeError = getCodeError(form.codeType, form.codeValue);
    if (codeError) errors.push(codeError);
  }

  return errors;
}

export async function parseLabelFile(file) {
  const extension = file.name.split('.').pop()?.toLocaleLowerCase();
  if (!['xlsx', 'xls', 'csv', 'txt', 'tsv'].includes(extension)) {
    throw new Error('รองรับไฟล์ Excel (.xlsx, .xls), CSV และ Text/TSV เท่านั้น');
  }
  if (file.size > MAX_IMPORT_SIZE_BYTES) {
    throw new Error('ไฟล์มีขนาดเกิน 10 MB กรุณาแบ่งไฟล์แล้วนำเข้าใหม่');
  }

  const XLSX = await import('xlsx');
  const isPlainText = ['csv', 'txt', 'tsv'].includes(extension);
  const content = isPlainText ? await file.text() : await file.arrayBuffer();
  const workbook = XLSX.read(content, {
    type: isPlainText ? 'string' : 'array',
    raw: true,
    cellNF: true,
    cellText: true,
    sheetRows: MAX_IMPORT_ROWS + 2,
  });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = firstSheetName ? workbook.Sheets[firstSheetName] : null;
  if (!worksheet?.['!ref']) throw new Error('ไม่พบตารางข้อมูลในไฟล์นี้');

  const range = XLSX.utils.decode_range(worksheet['!ref']);
  const fullRange = worksheet['!fullref']
    ? XLSX.utils.decode_range(worksheet['!fullref'])
    : range;
  if (fullRange.e.r - fullRange.s.r > MAX_IMPORT_ROWS) {
    throw new Error(`นำเข้าได้สูงสุด ${MAX_IMPORT_ROWS} รายการต่อไฟล์`);
  }

  const rawRows = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    raw: true,
    defval: '',
    blankrows: true,
  });
  const headerRow = rawRows[0] ?? [];
  const normalizedHeaders = headerRow.map(normalizeHeader);
  const columns = {};

  for (const [field, aliases] of Object.entries(headerAliases)) {
    const accepted = new Set(aliases.map(normalizeHeader));
    columns[field] = normalizedHeaders.findIndex((header) => accepted.has(header));
  }

  const missingHeaders = ['recipientName', 'recipientAddress'].filter((field) => columns[field] < 0);
  if (missingHeaders.length) {
    throw new Error('ไม่พบหัวคอลัมน์ชื่อผู้รับหรือที่อยู่ผู้รับ กรุณาใช้เทมเพลต PimSaduak');
  }

  const importedRows = rawRows.slice(1).map((row, rowIndex) => {
    const worksheetRow = range.s.r + rowIndex + 1;
    const getValue = (field) => {
      const columnIndex = columns[field];
      if (columnIndex < 0) return '';
      return getCellText(XLSX, worksheet, worksheetRow, range.s.c + columnIndex);
    };

    const codeValue = getValue('codeValue');
    const { codeType, typeError } = resolveCodeType(getValue('codeType'), codeValue);
    const form = {
      recipientName: getValue('recipientName'),
      recipientPhone: getValue('recipientPhone'),
      recipientAddress: getValue('recipientAddress'),
      senderName: getValue('senderName'),
      senderPhone: getValue('senderPhone'),
      senderAddress: getValue('senderAddress'),
      codeType,
      codeValue,
    };
    const isBlank = Object.entries(form)
      .filter(([key]) => key !== 'codeType')
      .every(([, value]) => !value.trim()) && !typeError;

    return isBlank ? null : {
      id: `import-${file.lastModified}-${rowIndex}`,
      rowNumber: range.s.r + rowIndex + 2,
      form,
      typeError,
      included: getImportedRowErrors(form, typeError).length === 0,
      editing: Boolean(getImportedRowErrors(form, typeError).length),
    };
  }).filter(Boolean);

  if (importedRows.length > MAX_IMPORT_ROWS) {
    throw new Error(`นำเข้าได้สูงสุด ${MAX_IMPORT_ROWS} รายการต่อไฟล์`);
  }
  if (!importedRows.length) throw new Error('ไม่พบแถวข้อมูลพัสดุในไฟล์นี้');

  return importedRows;
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function encodeDelimited(rows, separator) {
  const escapeCell = (value) => {
    const text = String(value ?? '');
    return /[\r\n"\t,]/.test(text)
      ? `"${text.replace(/"/g, '""')}"`
      : text;
  };
  return `\uFEFF${rows.map((row) => row.map(escapeCell).join(separator)).join('\r\n')}`;
}

export function createDelimitedTemplate(format) {
  return encodeDelimited([templateHeaders, ...templateRows], format === 'txt' ? '\t' : ',');
}

function createTemplateWorkbook(XLSX) {
  const worksheet = XLSX.utils.aoa_to_sheet([templateHeaders, ...templateRows]);
  worksheet['!cols'] = [
    { wch: 22 }, { wch: 18 }, { wch: 55 }, { wch: 20 },
    { wch: 18 }, { wch: 50 }, { wch: 16 }, { wch: 38 },
  ];

  for (const row of [1, 2]) {
    for (const column of [1, 4]) {
      const cell = worksheet[XLSX.utils.encode_cell({ r: row, c: column })];
      if (cell) {
        cell.t = 's';
        cell.z = '@';
        cell.v = String(cell.v);
      }
    }
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'ข้อมูลพัสดุ');
  return workbook;
}

export async function createExcelTemplateWorkbook() {
  const XLSX = await import('xlsx');
  return createTemplateWorkbook(XLSX);
}

export async function downloadImportTemplate(format) {
  if (format !== 'xlsx') {
    const isText = format === 'txt';
    const content = createDelimitedTemplate(format);
    downloadBlob(
      new Blob([content], { type: `${isText ? 'text/plain' : 'text/csv'};charset=utf-8` }),
      `PimSaduak-template.${isText ? 'txt' : 'csv'}`,
    );
    return;
  }

  const XLSX = await import('xlsx');
  const workbook = createTemplateWorkbook(XLSX);
  XLSX.writeFileXLSX(workbook, 'PimSaduak-template.xlsx', { cellStyles: true });
}
