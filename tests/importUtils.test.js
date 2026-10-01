import assert from 'node:assert/strict';
import test from 'node:test';
import * as XLSX from 'xlsx';
import {
  createDelimitedTemplate,
  createExcelTemplateWorkbook,
  getImportedRowErrors,
  parseLabelFile,
} from '../src/importUtils.js';

function createFile(content, name) {
  return Object.assign(new Blob([content]), { name, lastModified: 1 });
}

test('imports UTF-8 CSV, keeps leading zeroes, and reports invalid rows', async () => {
  const csv = [
    'ชื่อผู้รับ,เบอร์โทรผู้รับ,ที่อยู่ผู้รับ,ประเภทโค้ด,ข้อมูลโค้ด',
    '"คุณมีนา, ใจดี",0810000123,"ที่อยู่, กรุงเทพมหานคร",QR,TRACK-001',
    'คุณสมชาย,0890000123,,Barcode,บาร์โค้ด',
  ].join('\r\n');
  const rows = await parseLabelFile(createFile(csv, 'labels.csv'));

  assert.equal(rows.length, 2);
  assert.equal(rows[0].form.recipientPhone, '0810000123');
  assert.equal(rows[0].form.recipientName, 'คุณมีนา, ใจดี');
  assert.equal(rows[0].included, true);
  assert.deepEqual(getImportedRowErrors(rows[1].form, rows[1].typeError), [
    'กรอกที่อยู่ผู้รับ',
    'Barcode รองรับเฉพาะภาษาอังกฤษ ตัวเลข และสัญลักษณ์มาตรฐาน',
  ]);
  assert.equal(rows[1].included, false);
  assert.equal(rows[1].editing, true);
});

test('imports tab-delimited text with Thai headers and phone numbers', async () => {
  const text = [
    'ชื่อผู้รับ\tที่อยู่ผู้รับ\tเบอร์โทรผู้รับ',
    'คุณทดสอบ ใจดี\t9 ถนนตัวอย่าง กรุงเทพฯ 10110\t0890012345',
  ].join('\r\n');
  const rows = await parseLabelFile(createFile(text, 'labels.txt'));

  assert.equal(rows.length, 1);
  assert.equal(rows[0].form.recipientPhone, '0890012345');
  assert.equal(rows[0].included, true);
});

test('imports Excel sheets and treats template phone columns as text', async () => {
  const workbook = await createExcelTemplateWorkbook();
  const templateSheet = workbook.Sheets[workbook.SheetNames[0]];
  assert.equal(templateSheet.B2.t, 's');
  assert.equal(templateSheet.B2.z, '@');

  const bytes = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  const rows = await parseLabelFile(createFile(bytes, 'template.xlsx'));

  assert.equal(rows.length, 2);
  assert.equal(rows[0].form.recipientPhone, '0812345678');
  assert.equal(rows[1].form.recipientPhone, '0861234567');
  assert.equal(rows[0].form.codeType, 'qr');
  assert.equal(rows[1].form.codeType, 'barcode');
});

test('downloads CSV and text templates that can be imported without losing phone zeroes', async () => {
  const csvRows = await parseLabelFile(createFile(createDelimitedTemplate('csv'), 'template.csv'));
  const textRows = await parseLabelFile(createFile(createDelimitedTemplate('txt'), 'template.txt'));

  assert.equal(csvRows.length, 2);
  assert.equal(csvRows[0].form.recipientPhone, '0812345678');
  assert.equal(textRows.length, 2);
  assert.equal(textRows[1].form.recipientPhone, '0861234567');
});
