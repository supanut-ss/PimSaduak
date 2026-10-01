export const DEFAULT_LABEL_PRESET_ID = '100x150';
export const CUSTOM_LABEL_PRESET_ID = 'custom';
export const MIN_LABEL_WIDTH_MM = 60;
export const MIN_LABEL_HEIGHT_MM = 85;
export const MAX_LABEL_DIMENSION_MM = 500;

export const LABEL_PRESETS = [
  { id: '100x150', label: '10 × 15 ซม. · 4 × 6 นิ้ว', widthMm: 100, heightMm: 150 },
  { id: '100x100', label: '10 × 10 ซม. · 4 × 4 นิ้ว', widthMm: 100, heightMm: 100 },
  { id: '100x200', label: '10 × 20 ซม. · 4 × 8 นิ้ว', widthMm: 100, heightMm: 200 },
  { id: 'a6', label: 'A6 · 10.5 × 14.8 ซม.', widthMm: 105, heightMm: 148 },
  { id: CUSTOM_LABEL_PRESET_ID, label: 'กำหนดขนาดเอง', widthMm: null, heightMm: null },
];

const MILLIMETERS_PER_UNIT = { cm: 10, in: 25.4 };

export function toMillimeters(value, unit) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || !MILLIMETERS_PER_UNIT[unit]) return NaN;
  return numericValue * MILLIMETERS_PER_UNIT[unit];
}

export function fromMillimeters(value, unit) {
  if (!Number.isFinite(value) || !MILLIMETERS_PER_UNIT[unit]) return '';
  const digits = unit === 'cm' ? 1 : 2;
  return String(Number((value / MILLIMETERS_PER_UNIT[unit]).toFixed(digits)));
}

export function formatDimensionLimit(valueMm, unit, bound) {
  const divisor = MILLIMETERS_PER_UNIT[unit];
  if (!divisor) return '';
  const digits = unit === 'cm' ? 1 : 2;
  const factor = 10 ** digits;
  const value = (valueMm / divisor) * factor;
  const rounded = bound === 'min' ? Math.ceil(value) : Math.floor(value);
  return String(Number((rounded / factor).toFixed(digits)));
}

export function formatLabelSize(widthMm, heightMm, unit = 'cm') {
  const divisor = MILLIMETERS_PER_UNIT[unit];
  if (!divisor) return '';
  const digits = unit === 'cm' ? 1 : 2;
  const format = (value) => String(Number((value / divisor).toFixed(digits)));
  return `${format(widthMm)} × ${format(heightMm)} ${unit === 'cm' ? 'ซม.' : 'นิ้ว'}`;
}

export function getLabelScale(widthMm, heightMm) {
  const availableWidthMm = widthMm - 16;
  const availableHeightMm = heightMm - 16;
  const scale = Math.min(availableWidthMm / 84, availableHeightMm / 134);
  return Math.max(0.5, Math.min(1.5, scale));
}

export function validateCustomLabelSize(width, height, unit) {
  const widthMm = toMillimeters(width, unit);
  const heightMm = toMillimeters(height, unit);
  const widthValid = Number.isFinite(widthMm)
    && widthMm >= MIN_LABEL_WIDTH_MM
    && widthMm <= MAX_LABEL_DIMENSION_MM;
  const heightValid = Number.isFinite(heightMm)
    && heightMm >= MIN_LABEL_HEIGHT_MM
    && heightMm <= MAX_LABEL_DIMENSION_MM;

  return {
    valid: widthValid && heightValid,
    widthValid,
    heightValid,
    widthMm,
    heightMm,
  };
}
