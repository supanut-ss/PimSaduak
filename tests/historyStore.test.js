import test from 'node:test';
import assert from 'node:assert/strict';
import { createHistoryRecord, filterHistoryRecords } from '../src/historyStore.js';

function makeLabel(name = 'คุณทดสอบ ใจดี') {
  return {
    form: {
      recipientName: name,
      recipientPhone: '0812345678',
      recipientAddress: '99 ถนนตัวอย่าง กรุงเทพมหานคร 10110',
      senderName: 'ร้านตัวอย่าง',
      senderPhone: '0898765432',
      senderAddress: 'เชียงใหม่ 50000',
      codeType: 'qr',
      codeValue: 'ORDER-2026-001',
    },
    codeType: 'qr',
    codeValue: 'ORDER-2026-001',
  };
}

test('creates a local history snapshot with its original label size and copied form values', () => {
  const label = makeLabel();
  const record = createHistoryRecord({
    labels: [label],
    widthMm: 101.6,
    heightMm: 152.4,
    unit: 'in',
    id: 'history-1',
    createdAt: '2026-10-01T10:00:00.000Z',
  });
  label.form.recipientName = 'changed after save';

  assert.equal(record.source, 'single');
  assert.equal(record.sizeText, '4 × 6 นิ้ว');
  assert.equal(record.widthMm, 101.6);
  assert.equal(record.heightMm, 152.4);
  assert.equal(record.labelCount, 1);
  assert.equal(record.labels[0].form.recipientName, 'คุณทดสอบ ใจดี');
  assert.equal(record.labels[0].form.codeType, undefined);
  assert.equal(record.labels[0].codeValue, 'ORDER-2026-001');
});

test('defaults batch records and searches recipient, address, code, and size', () => {
  const first = createHistoryRecord({ labels: [makeLabel(), makeLabel('คุณมีนา'), makeLabel('คุณต้น')], widthMm: 100, heightMm: 200 });
  const second = createHistoryRecord({ labels: [makeLabel('คุณอรุณ')], widthMm: 105, heightMm: 148 });

  assert.equal(first.source, 'batch');
  assert.equal(first.labelCount, 3);
  assert.deepEqual(filterHistoryRecords([first, second], 'คุณมีนา'), [first]);
  assert.deepEqual(filterHistoryRecords([first, second], 'กรุงเทพมหานคร'), [first, second]);
  assert.deepEqual(filterHistoryRecords([first, second], 'order-2026-001'), [first, second]);
  assert.deepEqual(filterHistoryRecords([first, second], '10 × 20'), [first]);
  assert.deepEqual(filterHistoryRecords([first, second], '   '), [first, second]);
});

test('rejects empty snapshots and missing dimensions', () => {
  assert.throws(() => createHistoryRecord({ labels: [], widthMm: 100, heightMm: 150 }), /at least one label/);
  assert.throws(() => createHistoryRecord({ labels: [makeLabel()], widthMm: Number.NaN, heightMm: 150 }), /valid label dimensions/);
});
