import assert from 'node:assert/strict';
import test from 'node:test';
import {
  LABEL_PRESETS,
  DEFAULT_LABEL_PRESET_ID,
  formatDimensionLimit,
  formatLabelSize,
  fromMillimeters,
  getLabelScale,
  toMillimeters,
  validateCustomLabelSize,
} from '../src/labelSizes.js';

test('provides four practical standard label sizes with 10 × 15 cm as the default', () => {
  const standardSizes = LABEL_PRESETS.filter((preset) => preset.id !== 'custom');

  assert.equal(standardSizes.length, 4);
  assert.equal(DEFAULT_LABEL_PRESET_ID, '100x150');
  assert.deepEqual(
    [standardSizes[0].widthMm, standardSizes[0].heightMm],
    [100, 150],
  );
  assert.deepEqual(
    [standardSizes[3].widthMm, standardSizes[3].heightMm],
    [105, 148],
  );
});

test('converts custom sizes between centimeters and inches', () => {
  assert.equal(toMillimeters('10', 'cm'), 100);
  assert.equal(toMillimeters('4', 'in'), 101.6);
  assert.equal(fromMillimeters(101.6, 'in'), '4');
  assert.equal(fromMillimeters(105, 'cm'), '10.5');
  assert.equal(formatLabelSize(105, 148), '10.5 × 14.8 ซม.');
  assert.equal(formatDimensionLimit(60, 'in', 'min'), '2.37');
  assert.equal(formatDimensionLimit(500, 'in', 'max'), '19.68');
});

test('validates width and height separately and scales print content to fit the page', () => {
  assert.equal(validateCustomLabelSize('10', '15', 'cm').valid, true);
  assert.equal(validateCustomLabelSize('5', '15', 'cm').widthValid, false);
  assert.equal(validateCustomLabelSize('10', '8', 'cm').heightValid, false);
  assert.equal(validateCustomLabelSize('4', '6', 'in').valid, true);
  assert.equal(validateCustomLabelSize('2.37', '3.35', 'in').valid, true);
  assert.equal(getLabelScale(100, 150), 1);
  assert.ok(getLabelScale(100, 100) < 1);
  assert.ok(getLabelScale(100, 200) > getLabelScale(100, 100));
});
