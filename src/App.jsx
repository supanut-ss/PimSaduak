import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';
import './App.css';
import {
  MAX_IMPORT_ROWS,
  downloadImportTemplate,
  getCodeError,
  getImportedRowErrors,
  parseLabelFile,
} from './importUtils';
import {
  CUSTOM_LABEL_PRESET_ID,
  DEFAULT_LABEL_PRESET_ID,
  LABEL_PRESETS,
  MAX_LABEL_DIMENSION_MM,
  MIN_LABEL_HEIGHT_MM,
  MIN_LABEL_WIDTH_MM,
  formatDimensionLimit,
  formatLabelSize,
  fromMillimeters,
  getLabelScale,
  toMillimeters,
  validateCustomLabelSize,
} from './labelSizes';
import {
  DEFAULT_LABEL_BRAND_NAME,
  createHistoryRecord,
  deleteHistoryRecord,
  filterHistoryRecords,
  listHistoryRecords,
  saveHistoryRecord,
} from './historyStore';

const initialForm = {
  recipientName: '',
  recipientPhone: '',
  recipientAddress: '',
  senderName: '',
  senderPhone: '',
  senderAddress: '',
};

const LABEL_BRAND_STORAGE_KEY = 'pimsaduak-label-brand';

function readSavedLabelBrandName() {
  if (typeof window === 'undefined') return DEFAULT_LABEL_BRAND_NAME;

  try {
    const savedName = window.localStorage.getItem(LABEL_BRAND_STORAGE_KEY);
    return savedName === null ? DEFAULT_LABEL_BRAND_NAME : savedName.slice(0, 40);
  } catch {
    return DEFAULT_LABEL_BRAND_NAME;
  }
}

function Field({ label, name, value, onChange, placeholder, type = 'text', required = false }) {
  const autoComplete = name === 'recipientName'
    ? 'shipping name'
    : name === 'recipientPhone'
      ? 'shipping tel'
      : 'off';

  return (
    <label className="field" htmlFor={name}>
      <span className="field__label">
        {label}
        {required && <span className="field__required">จำเป็น</span>}
      </span>
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
      />
    </label>
  );
}

function AddressField({ label, name, value, onChange, placeholder, required = false }) {
  return (
    <label className="field" htmlFor={name}>
      <span className="field__label">
        {label}
        {required && <span className="field__required">จำเป็น</span>}
      </span>
      <textarea
        id={name}
        name={name}
        rows="3"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={name.includes('recipient') ? 'shipping street-address' : 'off'}
        required={required}
      />
    </label>
  );
}

function SectionHeading({ number, title, description, headingId }) {
  return (
    <div className="section-heading">
      <span className="section-heading__number" aria-hidden="true">{number}</span>
      <div>
        <h2 id={headingId}>{title}</h2>
        <p>{description}</p>
      </div>
    </div>
  );
}

function LabelSizeControls({
  presetId,
  unit,
  customWidth,
  customHeight,
  sizeError,
  onPresetChange,
  onUnitChange,
  onDimensionChange,
}) {
  const minWidth = formatDimensionLimit(MIN_LABEL_WIDTH_MM, unit, 'min');
  const minHeight = formatDimensionLimit(MIN_LABEL_HEIGHT_MM, unit, 'min');
  const maxDimension = formatDimensionLimit(MAX_LABEL_DIMENSION_MM, unit, 'max');

  return (
    <section className="form-section form-section--size" aria-labelledby="label-size-heading">
      <SectionHeading
        number="01"
        title="ขนาดฉลาก"
        description="เลือกขนาดมาตรฐาน หรือกำหนดตามกระดาษของเครื่องพิมพ์"
        headingId="label-size-heading"
      />
      <label className="field" htmlFor="label-preset">
        <span className="field__label">ขนาดกระดาษ</span>
        <select id="label-preset" name="labelPreset" value={presetId} onChange={onPresetChange}>
          {LABEL_PRESETS.map((preset) => (
            <option key={preset.id} value={preset.id}>{preset.label}</option>
          ))}
        </select>
      </label>

      {presetId === CUSTOM_LABEL_PRESET_ID && (
        <>
          <div className="label-size-fields">
            <label className="field" htmlFor="custom-label-width">
              <span className="field__label">กว้าง</span>
              <input
                id="custom-label-width"
                name="customLabelWidth"
                type="number"
                min={minWidth}
                max={maxDimension}
                step={unit === 'cm' ? '0.1' : '0.01'}
                inputMode="decimal"
                value={customWidth}
                onChange={(event) => onDimensionChange('width', event.target.value)}
                aria-invalid={Boolean(sizeError?.widthValid === false)}
                aria-describedby="label-size-hint label-size-error"
                required
              />
            </label>
            <label className="field" htmlFor="custom-label-height">
              <span className="field__label">สูง</span>
              <input
                id="custom-label-height"
                name="customLabelHeight"
                type="number"
                min={minHeight}
                max={maxDimension}
                step={unit === 'cm' ? '0.1' : '0.01'}
                inputMode="decimal"
                value={customHeight}
                onChange={(event) => onDimensionChange('height', event.target.value)}
                aria-invalid={Boolean(sizeError?.heightValid === false)}
                aria-describedby="label-size-hint label-size-error"
                required
              />
            </label>
            <label className="field" htmlFor="custom-label-unit">
              <span className="field__label">หน่วย</span>
              <select
                id="custom-label-unit"
                name="customLabelUnit"
                value={unit}
                disabled={!sizeError?.valid}
                onChange={onUnitChange}
              >
                <option value="cm">ซม.</option>
                <option value="in">นิ้ว</option>
              </select>
            </label>
          </div>
          <p className="label-size-hint" id="label-size-hint">
            กว้าง {minWidth}–{maxDimension} และสูง {minHeight}–{maxDimension} {unit === 'cm' ? 'ซม.' : 'นิ้ว'}
          </p>
          <p className="label-size-error" id="label-size-error" role="alert" aria-live="polite">
            {!sizeError?.widthValid && `ความกว้างต้องอยู่ระหว่าง ${minWidth}–${maxDimension} ${unit === 'cm' ? 'ซม.' : 'นิ้ว'}`}
            {!sizeError?.widthValid && !sizeError?.heightValid && ' · '}
            {!sizeError?.heightValid && `ความสูงต้องอยู่ระหว่าง ${minHeight}–${maxDimension} ${unit === 'cm' ? 'ซม.' : 'นิ้ว'}`}
          </p>
        </>
      )}
    </section>
  );
}

function LabelBrandControl({ value, onChange }) {
  return (
    <div className="label-brand-control">
      <label className="field" htmlFor="label-brand-name">
        <span className="field__label">ชื่อแบรนด์บนฉลาก</span>
        <input
          id="label-brand-name"
          name="labelBrandName"
          type="text"
          value={value}
          onChange={onChange}
          placeholder={DEFAULT_LABEL_BRAND_NAME}
          maxLength={40}
          autoComplete="organization"
          aria-describedby="label-brand-name-hint"
        />
      </label>
      <p className="label-brand-control__hint" id="label-brand-name-hint">
        แสดงที่หัวฉลากทุกใบ และบันทึกไว้ในเบราว์เซอร์นี้
      </p>
    </div>
  );
}

async function generateQrDataUrl(value) {
  const dataUrl = await QRCode.toDataURL(value, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 512,
    color: { dark: '#111111', light: '#ffffff' },
  });
  const image = new Image();
  image.src = dataUrl;
  if (typeof image.decode === 'function') await image.decode();
  return dataUrl;
}

function Barcode({ value }) {
  const svgRef = useRef(null);

  useLayoutEffect(() => {
    if (!svgRef.current || !value) return;

    try {
      JsBarcode(svgRef.current, value, {
        format: 'CODE128',
        width: 1.4,
        height: 42,
        displayValue: true,
        font: 'Arial',
        fontSize: 10,
        textMargin: 2,
        margin: 0,
        lineColor: '#111111',
        background: '#ffffff',
      });
    } catch {
      svgRef.current.replaceChildren();
    }
  }, [value]);

  return <svg ref={svgRef} className="shipping-label__barcode" role="img" aria-label={`Barcode ${value}`} />;
}

const batchFieldDefinitions = [
  { name: 'recipientName', label: 'ชื่อผู้รับ', placeholder: 'ชื่อ–นามสกุล', required: true },
  { name: 'recipientPhone', label: 'เบอร์โทรผู้รับ', placeholder: '08X-XXX-XXXX', type: 'tel' },
  { name: 'recipientAddress', label: 'ที่อยู่ผู้รับ', placeholder: 'บ้านเลขที่ ถนน แขวง/ตำบล เขต/อำเภอ จังหวัด รหัสไปรษณีย์', multiline: true, required: true },
  { name: 'senderName', label: 'ชื่อผู้ส่ง', placeholder: 'ชื่อร้านหรือชื่อผู้ส่ง' },
  { name: 'senderPhone', label: 'เบอร์โทรผู้ส่ง', placeholder: '08X-XXX-XXXX', type: 'tel' },
  { name: 'senderAddress', label: 'ที่อยู่ผู้ส่ง', placeholder: 'บ้านเลขที่ ถนน แขวง/ตำบล เขต/อำเภอ จังหวัด รหัสไปรษณีย์', multiline: true },
];

function getBatchFieldError(item, fieldName) {
  const { form, typeError } = item;

  if (fieldName === 'recipientName' && !form.recipientName.trim()) return 'กรอกชื่อผู้รับ';
  if (fieldName === 'recipientAddress' && !form.recipientAddress.trim()) return 'กรอกที่อยู่ผู้รับ';

  if (fieldName === 'codeType') {
    if (typeError) return typeError;
    if (form.codeType === 'none' && form.codeValue.trim()) {
      return 'ลบข้อมูลโค้ดหรือเลือก QR Code หรือ Barcode';
    }
  }

  if (fieldName === 'codeValue' && !typeError) {
    if (form.codeType === 'none' && form.codeValue.trim()) {
      return 'ลบข้อมูลโค้ดหรือเลือก QR Code หรือ Barcode';
    }
    return getCodeError(form.codeType, form.codeValue);
  }

  return '';
}

function BatchRowFields({ item, onChange }) {
  const codeTypeError = getBatchFieldError(item, 'codeType');
  const codeTypeErrorId = `${item.id}-codeType-error`;
  const codeValueError = getBatchFieldError(item, 'codeValue');
  const codeValueErrorId = `${item.id}-codeValue-error`;

  return (
    <div className="batch-row__editor">
      <div className="field-stack">
        {batchFieldDefinitions.map((field) => {
          const id = `${item.id}-${field.name}`;
          const error = getBatchFieldError(item, field.name);
          const errorId = `${id}-error`;
          return (
            <label className="field" htmlFor={id} key={field.name}>
              <span className="field__label">
                {field.label}
                {field.required && <span className="field__required">จำเป็น</span>}
              </span>
              {field.multiline ? (
                <textarea
                  id={id}
                  name={`${item.id}-${field.name}`}
                  rows="2"
                  value={item.form[field.name]}
                  onChange={(event) => onChange(item.id, field.name, event.target.value)}
                  placeholder={field.placeholder}
                  aria-invalid={error ? 'true' : undefined}
                  aria-describedby={error ? errorId : undefined}
                />
              ) : (
                <input
                  id={id}
                  name={`${item.id}-${field.name}`}
                  type={field.type ?? 'text'}
                  value={item.form[field.name]}
                  onChange={(event) => onChange(item.id, field.name, event.target.value)}
                  placeholder={field.placeholder}
                  inputMode={field.type === 'tel' ? 'tel' : undefined}
                  aria-invalid={error ? 'true' : undefined}
                  aria-describedby={error ? errorId : undefined}
                />
              )}
              {error && <span className="batch-field__error" id={errorId}>{error}</span>}
            </label>
          );
        })}
      </div>

      <div className="batch-row__code-fields">
        <label className="field" htmlFor={`${item.id}-codeType`}>
          <span className="field__label">ประเภทโค้ด</span>
          <select
            id={`${item.id}-codeType`}
            name={`${item.id}-codeType`}
            value={item.form.codeType}
            onChange={(event) => onChange(item.id, 'codeType', event.target.value)}
            aria-invalid={codeTypeError ? 'true' : undefined}
            aria-describedby={codeTypeError ? codeTypeErrorId : undefined}
          >
            <option value="none">ไม่ใส่</option>
            <option value="qr">QR Code</option>
            <option value="barcode">Barcode</option>
          </select>
          {codeTypeError && <span className="batch-field__error" id={codeTypeErrorId}>{codeTypeError}</span>}
        </label>
        <label className="field" htmlFor={`${item.id}-codeValue`}>
          <span className="field__label">ข้อมูลโค้ด</span>
          <input
            id={`${item.id}-codeValue`}
            name={`${item.id}-codeValue`}
            type="text"
            value={item.form.codeValue}
            onChange={(event) => onChange(item.id, 'codeValue', event.target.value)}
            placeholder="เว้นว่างเมื่อไม่ใช้โค้ด"
            maxLength={item.form.codeType === 'barcode' ? 30 : item.form.codeType === 'qr' ? 180 : 512}
            aria-invalid={codeValueError ? 'true' : undefined}
            aria-describedby={codeValueError ? codeValueErrorId : undefined}
          />
          {codeValueError && <span className="batch-field__error" id={codeValueErrorId}>{codeValueError}</span>}
        </label>
      </div>
    </div>
  );
}

function BatchImportSection({
  rows,
  fileName,
  errorMessage,
  notice,
  importing,
  includedCount,
  invalidCount,
  fileInputRef,
  onFileChange,
  onDownloadTemplate,
  onClear,
  onToggleEdit,
  onToggleIncluded,
  onFieldChange,
}) {
  return (
    <section className="form-section batch-import-section">
      <SectionHeading
        number="02"
        title="นำเข้ารายการพัสดุ"
        description="หนึ่งแถวต่อหนึ่งฉลาก ตรวจและแก้ไขข้อมูลก่อนพิมพ์"
      />

      <div className="upload-card">
        <input
          ref={fileInputRef}
          className="file-input"
          id="parcel-import-file"
          type="file"
          accept=".xlsx,.xls,.csv,.txt,.tsv,text/csv,text/tab-separated-values"
          onChange={onFileChange}
          disabled={importing}
          aria-describedby="import-file-hint"
        />
        <label className={`upload-button${importing ? ' upload-button--disabled' : ''}`} htmlFor="parcel-import-file">
          <span className="upload-button__icon" aria-hidden="true">↑</span>
          {importing ? 'กำลังอ่านไฟล์…' : 'เลือกไฟล์จากอุปกรณ์'}
        </label>
        <p className="upload-card__hint" id="import-file-hint">Excel (.xlsx, .xls), CSV หรือ Text/TSV · ไม่เกิน 10 MB และ {MAX_IMPORT_ROWS} รายการต่อไฟล์</p>
      </div>

      <div className="template-card">
        <div>
          <strong>ยังไม่มีไฟล์?</strong>
          <p>ดาวน์โหลดเทมเพลตพร้อมตัวอย่าง และเก็บเบอร์โทรเป็นข้อความ</p>
        </div>
        <div className="template-actions" aria-label="ดาวน์โหลดเทมเพลต">
          <button type="button" onClick={() => onDownloadTemplate('xlsx')}>Excel</button>
          <button type="button" onClick={() => onDownloadTemplate('csv')}>CSV</button>
          <button type="button" onClick={() => onDownloadTemplate('txt')}>Text</button>
        </div>
      </div>

      {errorMessage && <p className="import-alert" role="alert">{errorMessage}</p>}
      {notice && <p className="import-notice" role="status">{notice}</p>}
      {importing && <p className="import-progress" role="status">กำลังตรวจหัวตารางและข้อมูลในไฟล์…</p>}

      {fileName && rows.length > 0 && (
        <div className="batch-review">
          <div className="batch-review__heading">
            <div>
              <h3>ตรวจรายการ</h3>
              <p className="batch-review__filename">{fileName}</p>
            </div>
            <button className="text-button" type="button" onClick={onClear}>ล้างรายการ</button>
          </div>
          <div className="batch-stats" aria-live="polite">
            <span><strong>{includedCount}</strong> เลือกพิมพ์</span>
            <span><strong>{invalidCount}</strong> ต้องแก้</span>
            <span><strong>{rows.length}</strong> รวม</span>
          </div>

          <div className="batch-row-list">
            {rows.map((item) => (
              <BatchImportRow
                key={item.id}
                item={item}
                onToggleEdit={onToggleEdit}
                onToggleIncluded={onToggleIncluded}
                onFieldChange={onFieldChange}
              />
            ))}
          </div>
        </div>
      )}

      {!fileName && !errorMessage && !importing && (
        <div className="import-empty-state">
          <strong>เตรียมไฟล์ได้ในไม่กี่ขั้นตอน</strong>
          <ol>
            <li>ดาวน์โหลดเทมเพลตด้านบน หรือใช้หัวคอลัมน์ชื่อผู้รับและที่อยู่ผู้รับ</li>
            <li>ใส่ข้อมูลหนึ่งพัสดุต่อแถว เบอร์โทรควรตั้งเป็นข้อความ</li>
            <li>เลือกไฟล์ แล้วตรวจแถวที่ต้องแก้ก่อนพิมพ์</li>
          </ol>
        </div>
      )}
    </section>
  );
}

function BatchImportRow({ item, onToggleEdit, onToggleIncluded, onFieldChange }) {
  const errors = getImportedRowErrors(item.form, item.typeError);
  const isValid = errors.length === 0;
  const editorId = `batch-row-${item.id}-editor`;

  return (
    <article className={`batch-row${isValid ? '' : ' batch-row--invalid'}`}>
      <div className="batch-row__topline">
        <span className="batch-row__number">แถว {item.rowNumber}</span>
        <span className={`batch-row__status${isValid ? ' batch-row__status--valid' : ' batch-row__status--invalid'}`}>
          {isValid ? (item.included ? 'พร้อมพิมพ์' : 'ไม่นำไปพิมพ์') : `ต้องแก้ ${errors.length} จุด`}
        </span>
      </div>

      <div className="batch-row__summary">
        <strong>{item.form.recipientName || 'ยังไม่ระบุชื่อผู้รับ'}</strong>
        <span>{item.form.recipientPhone || 'ไม่มีเบอร์โทรผู้รับ'}</span>
        <p>{item.form.recipientAddress || 'ยังไม่ระบุที่อยู่ผู้รับ'}</p>
      </div>

      {errors.length > 0 && (
        <ul className="batch-row__errors" aria-label={`ปัญหาของแถว ${item.rowNumber}`}>
          {errors.map((error) => <li key={error}>{error}</li>)}
        </ul>
      )}

      <div className="batch-row__actions">
        <label className="batch-include">
          <input
            type="checkbox"
            checked={item.included && isValid}
            disabled={!isValid}
            onChange={() => onToggleIncluded(item.id)}
          />
          <span>รวมในการพิมพ์</span>
        </label>
        <button
          className="text-button"
          type="button"
          aria-expanded={item.editing}
          aria-controls={editorId}
          onClick={() => onToggleEdit(item.id)}
        >
          {item.editing ? 'ปิดการแก้ไข' : 'แก้ข้อมูล'}
        </button>
      </div>

      <div className="batch-row__editor-shell" id={editorId} hidden={!item.editing}>
        <BatchRowFields item={item} onChange={onFieldChange} />
      </div>
    </article>
  );
}

function ShippingLabel({
  form,
  className = '',
  codeType = 'none',
  codeValue = '',
  qrDataUrl = '',
  idPrefix,
  widthMm = 100,
  heightMm = 150,
  labelScale = 1,
  brandName = DEFAULT_LABEL_BRAND_NAME,
}) {
  const isPreview = className.includes('--preview');
  const labelId = idPrefix ?? (className || 'preview');
  const recipientName = form.recipientName.trim() || (isPreview ? 'ชื่อผู้รับ' : '');
  const recipientPhone = form.recipientPhone.trim();
  const recipientAddress = form.recipientAddress.trim() || (isPreview ? 'ที่อยู่ผู้รับ' : '');
  const senderName = form.senderName.trim() || (isPreview ? 'ชื่อผู้ส่ง' : '');
  const senderPhone = form.senderPhone.trim();
  const senderAddress = form.senderAddress.trim() || (isPreview ? 'ที่อยู่ผู้ส่ง' : '');
  const printableBrandName = String(brandName ?? '').trim();
  const hasSender = Boolean(senderName || senderPhone || senderAddress);
  const codeError = getCodeError(codeType, codeValue);
  const hasCode = !codeError && (codeType === 'qr' ? Boolean(qrDataUrl) : codeType === 'barcode');
  const showCodePreview = isPreview && codeType !== 'none';

  const labelStyle = {
    aspectRatio: `${widthMm} / ${heightMm}`,
    ...(!isPreview && { width: `${widthMm}mm`, height: `${heightMm}mm` }),
  };
  const layoutStyle = {
    width: `${100 / labelScale}%`,
    height: `${100 / labelScale}%`,
    transform: `scale(${labelScale})`,
    transformOrigin: 'top left',
  };

  return (
    <article
      className={`shipping-label ${className}`}
      aria-label={isPreview ? 'ตัวอย่างใบแปะหน้าพัสดุ' : 'ใบแปะหน้าพัสดุสำหรับพิมพ์'}
      style={labelStyle}
    >
      <div className="shipping-label__layout" style={layoutStyle}>
        <header className="shipping-label__header">
          <span className="shipping-label__mark" aria-hidden="true">
            <svg viewBox="0 0 28 28" fill="none">
              <path d="M4 8.2 14 3l10 5.2v11.6L14 25 4 19.8V8.2Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
              <path d="m4.5 8.5 9.5 5 9.5-5M14 14v10.2" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
            </svg>
          </span>
          {printableBrandName && <span className="shipping-label__wordmark">{printableBrandName}</span>}
          <span className="shipping-label__document">ใบแปะหน้าพัสดุ</span>
        </header>

        <section className="shipping-label__recipient" aria-labelledby={`${labelId}-recipient-title`}>
          <h3 id={`${labelId}-recipient-title`} className="shipping-label__eyebrow">ส่งถึง</h3>
          <p className="shipping-label__name">{recipientName}</p>
          {recipientPhone && <p className="shipping-label__phone">โทร. {recipientPhone}</p>}
          <p className="shipping-label__address">{recipientAddress}</p>
        </section>

        {(hasCode || showCodePreview) && (
          <section className={`shipping-label__code shipping-label__code--${codeType}`} aria-label={codeType === 'qr' ? 'QR Code' : 'Barcode'}>
            {codeType === 'qr' && qrDataUrl
              ? <img src={qrDataUrl} alt="QR Code" />
              : codeType === 'barcode' && !codeError
                ? <Barcode value={codeValue} />
                : isPreview && <span className="shipping-label__code-pending">กรอกข้อมูลเพื่อสร้าง{codeType === 'qr' ? ' QR Code' : ' Barcode'}</span>}
          </section>
        )}

        {(hasSender || isPreview) && (
          <>
            <div className="shipping-label__rule" aria-hidden="true" />
            <section className="shipping-label__sender" aria-labelledby={`${labelId}-sender-title`}>
              <h3 id={`${labelId}-sender-title`} className="shipping-label__eyebrow">ผู้ส่ง</h3>
              {senderName && <p className="shipping-label__sender-name">{senderName}</p>}
              {senderPhone && <p className="shipping-label__sender-phone">โทร. {senderPhone}</p>}
              {senderAddress && <p className="shipping-label__sender-address">{senderAddress}</p>}
            </section>
          </>
        )}

        <footer className="shipping-label__footer">
          <span className="shipping-label__footer-brand">Pim Saduak by Drivetodev.online</span>
        </footer>
      </div>
    </article>
  );
}

function HistoryEntry({ record, pendingDelete, isReprinting, onReprint, onDelete, onCancelDelete }) {
  const date = new Date(record.createdAt);
  const dateText = Number.isNaN(date.valueOf())
    ? ''
    : new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
  const firstRecipient = String(record.labels[0]?.form?.recipientName ?? '').trim();
  const summary = record.labelCount > 1
    ? `${record.labelCount} รายการ${firstRecipient ? ` · ${firstRecipient}` : ''}`
    : firstRecipient || 'ฉลากพัสดุ';

  return (
    <li className="history-entry">
      <div className="history-entry__details">
        <strong>{summary}</strong>
        <span>{[dateText, record.source === 'reprint' ? 'พิมพ์ซ้ำ' : 'คำขอพิมพ์', record.sizeText].filter(Boolean).join(' · ')}</span>
      </div>
      <div className="history-entry__actions">
        <button type="button" onClick={() => onReprint(record)} disabled={isReprinting}>
          {isReprinting ? 'กำลังเตรียม…' : 'พิมพ์ซ้ำ'}
        </button>
        {pendingDelete ? (
          <>
            <button className="history-entry__delete-confirm" type="button" onClick={() => onDelete(record.id)}>ยืนยันลบ</button>
            <button className="history-entry__cancel" type="button" onClick={onCancelDelete}>ยกเลิก</button>
          </>
        ) : (
          <button className="history-entry__delete" type="button" onClick={() => onDelete(record.id)}>ลบ</button>
        )}
      </div>
    </li>
  );
}

function App() {
  const [form, setForm] = useState(initialForm);
  const [labelBrandName, setLabelBrandName] = useState(readSavedLabelBrandName);
  const [codeType, setCodeType] = useState('none');
  const [codeValue, setCodeValue] = useState('');
  const [qrResult, setQrResult] = useState({ value: '', dataUrl: '' });
  const [entryMode, setEntryMode] = useState('single');
  const [labelPresetId, setLabelPresetId] = useState(DEFAULT_LABEL_PRESET_ID);
  const [customLabelUnit, setCustomLabelUnit] = useState('cm');
  const [customLabelWidth, setCustomLabelWidth] = useState('10');
  const [customLabelHeight, setCustomLabelHeight] = useState('15');
  const [customDimensionsMm, setCustomDimensionsMm] = useState({ widthMm: 100, heightMm: 150 });
  const [hasEditedCustomSize, setHasEditedCustomSize] = useState(false);
  const [batchRows, setBatchRows] = useState([]);
  const [batchFileName, setBatchFileName] = useState('');
  const [batchError, setBatchError] = useState('');
  const [batchNotice, setBatchNotice] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [isPreparingPrint, setIsPreparingPrint] = useState(false);
  const [batchPreviewQrResult, setBatchPreviewQrResult] = useState({ key: '', dataUrl: '' });
  const [printBatch, setPrintBatch] = useState([]);
  const [printBatchReady, setPrintBatchReady] = useState(false);
  const [historyRecords, setHistoryRecords] = useState([]);
  const [historyQuery, setHistoryQuery] = useState('');
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState('');
  const [historyMessage, setHistoryMessage] = useState('');
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState('');
  const [reprintingId, setReprintingId] = useState('');
  const [historyPrintJob, setHistoryPrintJob] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    try {
      window.localStorage.setItem(LABEL_BRAND_STORAGE_KEY, labelBrandName);
    } catch {
      // Keep the current session usable when browser storage is unavailable.
    }
  }, [labelBrandName]);

  const selectedLabelPreset = LABEL_PRESETS.find((preset) => preset.id === labelPresetId);
  const customSizeValidation = validateCustomLabelSize(customLabelWidth, customLabelHeight, customLabelUnit);
  const labelDimensions = labelPresetId === CUSTOM_LABEL_PRESET_ID
    ? customDimensionsMm
    : selectedLabelPreset;
  const labelWidthMm = labelDimensions.widthMm;
  const labelHeightMm = labelDimensions.heightMm;
  const labelScale = getLabelScale(labelWidthMm, labelHeightMm);
  const labelSizeValid = labelPresetId !== CUSTOM_LABEL_PRESET_ID || customSizeValidation.valid;
  const labelSizeText = formatLabelSize(
    labelWidthMm,
    labelHeightMm,
    labelPresetId === CUSTOM_LABEL_PRESET_ID ? customLabelUnit : 'cm',
  );
  const printWidthMm = historyPrintJob?.widthMm ?? labelWidthMm;
  const printHeightMm = historyPrintJob?.heightMm ?? labelHeightMm;
  const printLabelScale = getLabelScale(printWidthMm, printHeightMm);
  const labelWidthCss = String(Number(printWidthMm.toFixed(2)));
  const labelHeightCss = String(Number(printHeightMm.toFixed(2)));
  const filteredHistoryRecords = useMemo(
    () => filterHistoryRecords(historyRecords, historyQuery),
    [historyRecords, historyQuery],
  );
  const hasRecipient = Boolean(form.recipientName.trim() && form.recipientAddress.trim());
  const codeError = getCodeError(codeType, codeValue);
  const qrDataUrl = qrResult.value === codeValue ? qrResult.dataUrl : '';
  const codeReady = codeType === 'none'
    || (!codeError && (codeType === 'barcode' || Boolean(qrDataUrl)));
  const analyzedBatchRows = batchRows.map((row) => ({
    ...row,
    errors: getImportedRowErrors(row.form, row.typeError),
  }));
  const includedBatchRows = analyzedBatchRows.filter((row) => row.included && row.errors.length === 0);
  const invalidBatchCount = analyzedBatchRows.filter((row) => row.errors.length > 0).length;
  const batchPreviewRow = includedBatchRows[0]
    ?? analyzedBatchRows.find((row) => row.errors.length === 0)
    ?? analyzedBatchRows[0]
    ?? null;
  const batchPreviewKey = batchPreviewRow
    ? `${batchPreviewRow.id}\u001f${batchPreviewRow.form.codeType}\u001f${batchPreviewRow.form.codeValue}`
    : '';
  const batchPreviewQrDataUrl = batchPreviewQrResult.key === batchPreviewKey
    ? batchPreviewQrResult.dataUrl
    : '';

  useEffect(() => {
    if (entryMode === 'batch') import('xlsx').catch(() => {});
  }, [entryMode]);

  useEffect(() => {
    let cancelled = false;
    listHistoryRecords()
      .then((records) => {
        if (!cancelled) {
          setHistoryRecords(records);
          setHistoryError('');
        }
      })
      .catch(() => {
        if (!cancelled) setHistoryError('เปิดประวัติไม่ได้ เบราว์เซอร์นี้อาจปิดการเก็บข้อมูลไว้');
      })
      .finally(() => {
        if (!cancelled) setHistoryLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    function handleAfterPrint() {
      setHistoryPrintJob(null);
      setPrintBatch([]);
    }

    window.addEventListener('afterprint', handleAfterPrint);
    return () => window.removeEventListener('afterprint', handleAfterPrint);
  }, []);

  useEffect(() => {
    if (codeType !== 'qr' || codeError) {
      setQrResult({ value: '', dataUrl: '' });
      return undefined;
    }

    let cancelled = false;
    setQrResult({ value: codeValue, dataUrl: '' });
    generateQrDataUrl(codeValue)
      .then((dataUrl) => {
        if (!cancelled) setQrResult({ value: codeValue, dataUrl });
      })
      .catch(() => {
        if (!cancelled) setQrResult({ value: codeValue, dataUrl: '' });
      });

    return () => { cancelled = true; };
  }, [codeType, codeValue, codeError]);

  useEffect(() => {
    if (entryMode !== 'batch' || !batchPreviewRow || batchPreviewRow.form.codeType !== 'qr'
      || getCodeError(batchPreviewRow.form.codeType, batchPreviewRow.form.codeValue)) {
      setBatchPreviewQrResult({ key: '', dataUrl: '' });
      return undefined;
    }

    let cancelled = false;
    const { codeValue: previewCodeValue } = batchPreviewRow.form;
    setBatchPreviewQrResult({ key: batchPreviewKey, dataUrl: '' });
    generateQrDataUrl(previewCodeValue)
      .then((dataUrl) => {
        if (!cancelled) setBatchPreviewQrResult({ key: batchPreviewKey, dataUrl });
      })
      .catch(() => {
        if (!cancelled) setBatchPreviewQrResult({ key: batchPreviewKey, dataUrl: '' });
      });

    return () => { cancelled = true; };
  }, [entryMode, batchPreviewKey]);

  useLayoutEffect(() => {
    if (!printBatchReady) return;
    setPrintBatchReady(false);
    window.print();
  }, [printBatchReady]);

  async function handleFileChange(event) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;

    setBatchRows([]);
    setBatchFileName(file.name);
    setBatchError('');
    setBatchNotice('');
    setIsImporting(true);
    try {
      const importedRows = await parseLabelFile(file);
      setBatchRows(importedRows);
      const validCount = importedRows.filter((row) => getImportedRowErrors(row.form, row.typeError).length === 0).length;
      const invalidCount = importedRows.length - validCount;
      setBatchNotice(invalidCount
        ? `อ่าน ${importedRows.length} แถวแล้ว · มี ${invalidCount} แถวที่ต้องแก้ก่อนเลือกพิมพ์`
        : `อ่าน ${importedRows.length} แถวแล้ว พร้อมตรวจและเลือกพิมพ์`);
    } catch (error) {
      setBatchFileName('');
      setBatchError(error instanceof Error ? error.message : 'อ่านไฟล์ไม่ได้ กรุณาตรวจไฟล์แล้วลองอีกครั้ง');
    } finally {
      setIsImporting(false);
    }
  }

  function handleBatchFieldChange(id, field, value) {
    setBatchRows((current) => current.map((row) => (
      row.id === id
        ? {
            ...row,
            form: { ...row.form, [field]: value },
            typeError: field === 'codeType'
              || (field === 'codeValue' && !value.trim() && [
                'ระบุประเภทโค้ดเมื่อมีข้อมูลโค้ด',
                'ลบข้อมูลโค้ดหรือเลือก QR Code หรือ Barcode',
              ].includes(row.typeError))
              ? ''
              : row.typeError,
          }
        : row
    )));
    setBatchNotice('');
  }

  function toggleBatchEdit(id) {
    setBatchRows((current) => current.map((row) => (
      row.id === id ? { ...row, editing: !row.editing } : row
    )));
  }

  function toggleBatchIncluded(id) {
    setBatchRows((current) => current.map((row) => (
      row.id === id ? { ...row, included: !row.included } : row
    )));
    setBatchNotice('');
  }

  function clearBatch() {
    setBatchRows([]);
    setBatchFileName('');
    setBatchError('');
    setBatchNotice('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleTemplateDownload(format) {
    try {
      await downloadImportTemplate(format);
      const formatName = { xlsx: 'Excel', csv: 'CSV', txt: 'Text' }[format] ?? 'ไฟล์';
      setBatchNotice(`ดาวน์โหลดเทมเพลต ${formatName} แล้ว`);
    } catch {
      setBatchNotice('สร้างเทมเพลตไม่สำเร็จ กรุณาลองอีกครั้ง');
    }
  }

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function handleLabelPresetChange(event) {
    const nextPresetId = event.target.value;
    if (nextPresetId === CUSTOM_LABEL_PRESET_ID
      && labelPresetId !== CUSTOM_LABEL_PRESET_ID
      && !hasEditedCustomSize) {
      const preset = LABEL_PRESETS.find((item) => item.id === labelPresetId) ?? LABEL_PRESETS[0];
      setCustomDimensionsMm({ widthMm: preset.widthMm, heightMm: preset.heightMm });
      setCustomLabelWidth(fromMillimeters(preset.widthMm, customLabelUnit));
      setCustomLabelHeight(fromMillimeters(preset.heightMm, customLabelUnit));
    }
    setLabelPresetId(nextPresetId);
  }

  function handleCustomDimensionChange(field, value) {
    const nextWidth = field === 'width' ? value : customLabelWidth;
    const nextHeight = field === 'height' ? value : customLabelHeight;
    const nextDimensions = validateCustomLabelSize(nextWidth, nextHeight, customLabelUnit);
    setHasEditedCustomSize(true);
    if (field === 'width') setCustomLabelWidth(value);
    if (field === 'height') setCustomLabelHeight(value);
    if (field === 'width' && nextDimensions.widthValid) {
      setCustomDimensionsMm((current) => ({ ...current, widthMm: nextDimensions.widthMm }));
    }
    if (field === 'height' && nextDimensions.heightValid) {
      setCustomDimensionsMm((current) => ({ ...current, heightMm: nextDimensions.heightMm }));
    }
  }

  function handleCustomUnitChange(event) {
    const nextUnit = event.target.value;
    if (!customSizeValidation.valid) return;
    setCustomLabelWidth(fromMillimeters(customDimensionsMm.widthMm, nextUnit));
    setCustomLabelHeight(fromMillimeters(customDimensionsMm.heightMm, nextUnit));
    setCustomLabelUnit(nextUnit);
  }

  async function persistPrintRequest(labels, source, size = {}, brandName = labelBrandName) {
    try {
      const widthMm = size.widthMm ?? labelWidthMm;
      const heightMm = size.heightMm ?? labelHeightMm;
      const unit = size.unit ?? (labelPresetId === CUSTOM_LABEL_PRESET_ID ? customLabelUnit : 'cm');
      const record = createHistoryRecord({
        labels,
        brandName,
        widthMm,
        heightMm,
        unit,
        sizeText: size.sizeText ?? formatLabelSize(widthMm, heightMm, unit),
        source,
      });
      await saveHistoryRecord(record);
      setHistoryRecords((current) => [record, ...current].sort((first, second) => (
        second.createdAt.localeCompare(first.createdAt)
      )));
      setHistoryError('');
      setHistoryMessage('บันทึกคำขอพิมพ์ไว้ในประวัติแล้ว');
    } catch {
      setHistoryError('บันทึกประวัติไม่สำเร็จ ตรวจการตั้งค่าพื้นที่จัดเก็บของเบราว์เซอร์');
      setHistoryMessage('');
    }
  }

  async function handleHistoryReprint(record) {
    setReprintingId(record.id);
    setHistoryError('');
    setHistoryMessage('กำลังเตรียมฉลากจากประวัติ…');
    try {
      const labels = await Promise.all(record.labels.map(async (label) => {
        const codeType = label.codeType ?? 'none';
        const codeValue = label.codeValue ?? '';
        const codeError = getCodeError(codeType, codeValue);
        if (codeError) throw new Error(codeError);

        return {
          ...label,
          codeType,
          codeValue,
          qrDataUrl: codeType === 'qr' ? await generateQrDataUrl(codeValue) : '',
        };
      }));
      const size = {
        widthMm: record.widthMm,
        heightMm: record.heightMm,
        unit: record.unit,
        sizeText: record.sizeText,
      };
      const brandName = record.brandName ?? labelBrandName;
      setHistoryPrintJob({ ...size, labels, brandName });
      setPrintBatchReady(true);
      void persistPrintRequest(labels, 'reprint', size, brandName);
    } catch {
      setHistoryMessage('เตรียมฉลากสำหรับพิมพ์ซ้ำไม่สำเร็จ ตรวจข้อมูลในรายการนี้');
    } finally {
      setReprintingId('');
    }
  }

  async function handleHistoryDelete(recordId) {
    if (pendingDeleteId !== recordId) {
      setPendingDeleteId(recordId);
      return;
    }

    try {
      await deleteHistoryRecord(recordId);
      setHistoryRecords((current) => current.filter((record) => record.id !== recordId));
      setPendingDeleteId('');
      setHistoryError('');
      setHistoryMessage('ลบรายการออกจากประวัติแล้ว');
    } catch {
      setHistoryError('ลบรายการไม่สำเร็จ กรุณาลองอีกครั้ง');
    }
  }

  async function handlePrint(event) {
    event.preventDefault();
    if (!labelSizeValid) {
      document.getElementById(customSizeValidation.widthValid ? 'custom-label-height' : 'custom-label-width')?.focus();
      return;
    }
    if (entryMode === 'single') {
      if (codeError || (codeType === 'qr' && !qrDataUrl)) {
        document.getElementById('code-value')?.focus();
        return;
      }
      setHistoryMessage('');
      void persistPrintRequest([{ form, codeType, codeValue }], 'single');
      window.print();
      return;
    }

    if (includedBatchRows.length === 0) {
      setBatchNotice(batchRows.length
        ? 'แก้ข้อมูลที่มีปัญหา แล้วเลือกอย่างน้อยหนึ่งแถวสำหรับพิมพ์'
        : 'นำเข้าไฟล์ก่อน แล้วเลือกแถวที่ต้องการพิมพ์');
      return;
    }

    setBatchNotice('');
    setIsPreparingPrint(true);
    try {
      const labels = await Promise.all(includedBatchRows.map(async (row) => ({
        form: row.form,
        codeType: row.form.codeType,
        codeValue: row.form.codeValue,
        qrDataUrl: row.form.codeType === 'qr'
          ? await generateQrDataUrl(row.form.codeValue)
          : '',
      })));
      setPrintBatch(labels);
      setHistoryMessage('');
      void persistPrintRequest(labels, 'batch');
      setPrintBatchReady(true);
    } catch {
      setBatchNotice('สร้าง QR Code บางรายการไม่สำเร็จ กรุณาตรวจข้อมูลโค้ดแล้วลองอีกครั้ง');
    } finally {
      setIsPreparingPrint(false);
    }
  }

  const previewForm = entryMode === 'single' ? form : (batchPreviewRow?.form ?? initialForm);
  const previewCodeType = entryMode === 'single' ? codeType : (previewForm.codeType ?? 'none');
  const previewCodeValue = entryMode === 'single' ? codeValue : (previewForm.codeValue ?? '');
  const previewQrDataUrl = entryMode === 'single' ? qrDataUrl : batchPreviewQrDataUrl;

  return (
    <>
      <style>{`
        @page {
          size: ${labelWidthCss}mm ${labelHeightCss}mm;
          margin: 0;
        }

        @media print {
          html, body, #root, .print-sheet {
            width: ${labelWidthCss}mm;
            min-width: ${labelWidthCss}mm;
            min-height: ${labelHeightCss}mm;
          }
        }
      `}</style>
      <div className="screen-ui">
        <header className="topbar">
          <a className="brand" href="#main" aria-label="PimSaduak หน้าหลัก">
            <span className="brand__icon" aria-hidden="true">
              <svg viewBox="0 0 32 32" fill="none">
                <path d="M5 10 16 4l11 6v12l-11 6L5 22V10Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                <path d="m5.5 10.3 10.5 5.5 10.5-5.5M16 16v11.3" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="brand__text">
              <strong>PimSaduak</strong>
              <span>Easy Print Label</span>
            </span>
          </a>
          <div className="local-note">
            <span className="local-note__dot" aria-hidden="true" />
            <span className="local-note__text">เก็บข้อมูลในเครื่องนี้</span>
          </div>
        </header>

        <main className="workspace" id="main">
          <div className="page-heading">
            <div>
              <p className="page-heading__kicker">เริ่มต้นได้ในไม่กี่ขั้นตอน</p>
              <h1>ทำใบแปะหน้าพัสดุ</h1>
              <p className="page-heading__description">กรอกข้อมูลเองหรือเลือกไฟล์รายการ แล้วตรวจฉลากก่อนพิมพ์</p>
            </div>
            <div className="page-actions">
              <div className="page-meta" aria-label="ขนาดฉลากปัจจุบัน">
                <span className="page-meta__icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none">
                    <path d="M5 4.75h14v14.5H5z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
                    <path d="M8 8h8M8 11h8M8 14h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </span>
                <span><strong>{entryMode === 'single' ? 1 : includedBatchRows.length} ใบ</strong><small>{labelSizeText}</small></span>
              </div>
              <button
                className="history-toggle"
                type="button"
                aria-expanded={isHistoryOpen}
                aria-controls="print-history"
                onClick={() => setIsHistoryOpen((open) => !open)}
              >
                <span aria-hidden="true">◷</span>
                ประวัติ{historyRecords.length > 0 ? ` (${historyRecords.length})` : ''}
              </button>
            </div>
          </div>

          <section
            className="history-panel"
            id="print-history"
            aria-labelledby="print-history-heading"
            hidden={!isHistoryOpen}
          >
            <div className="history-panel__heading">
              <div>
                <h2 id="print-history-heading">ประวัติคำขอพิมพ์</h2>
                <p>ข้อมูลเก็บไว้ในเบราว์เซอร์นี้ ค้นหา พิมพ์ซ้ำ หรือลบรายการได้</p>
              </div>
              <label className="history-search" htmlFor="history-search">
                <span>ค้นหา</span>
                <input
                  id="history-search"
                  type="search"
                  value={historyQuery}
                  onChange={(event) => setHistoryQuery(event.target.value)}
                  placeholder="ชื่อผู้รับ เบอร์โทร หรือโค้ด"
                />
              </label>
            </div>

            {historyLoading ? (
              <p className="history-state" role="status">กำลังโหลดประวัติ…</p>
            ) : historyError ? (
              <p className="history-state history-state--error" role="alert">{historyError}</p>
            ) : filteredHistoryRecords.length > 0 ? (
              <ul className="history-list">
                {filteredHistoryRecords.map((record) => (
                  <HistoryEntry
                    key={record.id}
                    record={record}
                    pendingDelete={pendingDeleteId === record.id}
                    isReprinting={reprintingId === record.id}
                    onReprint={handleHistoryReprint}
                    onDelete={handleHistoryDelete}
                    onCancelDelete={() => setPendingDeleteId('')}
                  />
                ))}
              </ul>
            ) : (
              <div className="history-empty-state">
                <strong>{historyQuery ? 'ไม่พบรายการที่ค้นหา' : 'ยังไม่มีประวัติการพิมพ์'}</strong>
                <span>{historyQuery ? 'ลองใช้ชื่อ เบอร์โทร หรือข้อมูลโค้ดคำอื่น' : 'เมื่อกดพิมพ์ รายการจะปรากฏที่นี่'}</span>
              </div>
            )}

            {historyError && historyRecords.length > 0 && (
              <p className="history-state history-state--error" role="alert">{historyError}</p>
            )}
            {historyMessage && <p className="history-state history-state--success" role="status">{historyMessage}</p>}
            <p className="history-panel__note">ประวัตินี้บันทึกเมื่อเปิดหน้าต่างพิมพ์ เบราว์เซอร์ไม่สามารถยืนยันได้ว่าพิมพ์ออกกระดาษสำเร็จ</p>
          </section>

          <div className="work-grid">
            <form className="form-panel" id="label-form" onSubmit={handlePrint}>
              <div className="entry-mode-toggle" role="group" aria-label="เลือกรูปแบบการทำฉลาก">
                <button
                  className={entryMode === 'single' ? 'entry-mode-toggle__option entry-mode-toggle__option--selected' : 'entry-mode-toggle__option'}
                  type="button"
                  aria-pressed={entryMode === 'single'}
                  onClick={() => { setEntryMode('single'); setBatchNotice(''); }}
                >
                  พิมพ์ทีละใบ
                </button>
                <button
                  className={entryMode === 'batch' ? 'entry-mode-toggle__option entry-mode-toggle__option--selected' : 'entry-mode-toggle__option'}
                  type="button"
                  aria-pressed={entryMode === 'batch'}
                  onClick={() => { setEntryMode('batch'); setBatchNotice(''); }}
                >
                  นำเข้าหลายรายการ
                </button>
              </div>

              <LabelSizeControls
                presetId={labelPresetId}
                unit={customLabelUnit}
                customWidth={customLabelWidth}
                customHeight={customLabelHeight}
                sizeError={customSizeValidation}
                onPresetChange={handleLabelPresetChange}
                onUnitChange={handleCustomUnitChange}
                onDimensionChange={handleCustomDimensionChange}
              />
              <LabelBrandControl
                value={labelBrandName}
                onChange={(event) => setLabelBrandName(event.target.value)}
              />

              {entryMode === 'single' ? (
              <>
              <section className="form-section form-section--recipient">
                <SectionHeading
                  number="02"
                  title="ผู้รับพัสดุ"
                  description="ข้อมูลนี้จะแสดงเด่นบนฉลาก"
                />
                <div className="field-stack">
                  <Field
                    label="ชื่อ–นามสกุล"
                    name="recipientName"
                    value={form.recipientName}
                    onChange={handleChange}
                    placeholder="เช่น คุณสายใจ ใจดี"
                    required
                  />
                  <Field
                    label="เบอร์โทรศัพท์"
                    name="recipientPhone"
                    value={form.recipientPhone}
                    onChange={handleChange}
                    placeholder="08X-XXX-XXXX"
                    type="tel"
                  />
                  <AddressField
                    label="ที่อยู่จัดส่ง"
                    name="recipientAddress"
                    value={form.recipientAddress}
                    onChange={handleChange}
                    placeholder="บ้านเลขที่ ถนน แขวง/ตำบล เขต/อำเภอ จังหวัด รหัสไปรษณีย์"
                    required
                  />
                </div>
              </section>

              <section className="form-section form-section--sender">
                <SectionHeading
                  number="03"
                  title="ผู้ส่ง"
                  description="เพิ่มข้อมูลเพื่อให้ส่งคืนได้หากจัดส่งไม่สำเร็จ"
                />
                <div className="field-stack">
                  <Field
                    label="ชื่อ–นามสกุล"
                    name="senderName"
                    value={form.senderName}
                    onChange={handleChange}
                    placeholder="ชื่อร้านหรือชื่อผู้ส่ง"
                  />
                  <Field
                    label="เบอร์โทรศัพท์"
                    name="senderPhone"
                    value={form.senderPhone}
                    onChange={handleChange}
                    placeholder="08X-XXX-XXXX"
                    type="tel"
                  />
                  <AddressField
                    label="ที่อยู่ผู้ส่ง"
                    name="senderAddress"
                    value={form.senderAddress}
                    onChange={handleChange}
                    placeholder="บ้านเลขที่ ถนน แขวง/ตำบล เขต/อำเภอ จังหวัด รหัสไปรษณีย์"
                  />
                </div>
              </section>

              <section className="form-section form-section--code">
                <SectionHeading
                  number="04"
                  title="QR Code หรือ Barcode"
                  description="เพิ่มรหัสติดตามหรือข้อมูลที่ต้องการลงบนฉลาก"
                />
                <div className="code-options" role="radiogroup" aria-label="เลือกรูปแบบรหัสบนฉลาก">
                  {[
                    { value: 'none', label: 'ไม่ใส่' },
                    { value: 'qr', label: 'QR Code' },
                    { value: 'barcode', label: 'Barcode' },
                  ].map((option) => (
                    <label className={`code-option${codeType === option.value ? ' code-option--selected' : ''}`} key={option.value}>
                      <input
                        type="radio"
                        name="codeType"
                        value={option.value}
                        checked={codeType === option.value}
                        onChange={() => setCodeType(option.value)}
                      />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>

                {codeType === 'none' ? (
                  <p className="code-empty-state">ฉลากนี้จะไม่แสดง QR Code หรือ Barcode</p>
                ) : (
                  <div className="code-entry">
                    <label className="field" htmlFor="code-value">
                      <span className="field__label">ข้อมูลสำหรับ {codeType === 'qr' ? 'QR Code' : 'Barcode'}<span className="field__required">จำเป็น</span></span>
                      <input
                        id="code-value"
                        name="codeValue"
                        type="text"
                        value={codeValue}
                        onChange={(event) => setCodeValue(event.target.value)}
                        placeholder={codeType === 'qr' ? 'เช่น https://tracking.example/12345' : 'เช่น TH123456789'}
                        maxLength={codeType === 'qr' ? 180 : 30}
                        pattern={codeType === 'barcode' ? '[ -~]{1,30}' : undefined}
                        title={codeType === 'barcode' ? 'ใช้ตัวอักษรอังกฤษ ตัวเลข และสัญลักษณ์ ASCII ไม่เกิน 30 ตัว' : undefined}
                        autoComplete="off"
                        spellCheck="false"
                        required
                        aria-invalid={Boolean(codeError)}
                        aria-describedby="code-value-hint code-value-error"
                      />
                    </label>
                    <p className="code-field__hint" id="code-value-hint">
                      {codeType === 'qr'
                        ? 'ใส่ข้อความหรือลิงก์ได้ไม่เกิน 180 ตัวอักษร'
                        : 'ใช้ภาษาอังกฤษ ตัวเลข และสัญลักษณ์มาตรฐาน ไม่เกิน 30 ตัวอักษร'}
                    </p>
                    <p className="code-field__error" id="code-value-error" role="alert" hidden={!codeError}>{codeError}</p>
                  </div>
                )}
              </section>

              <div className="form-footnote">
                <span className="form-footnote__sparkle" aria-hidden="true">✳</span>
                <span>กรอกข้อมูลผู้รับให้ครบก่อนพิมพ์</span>
              </div>
              </>
              ) : (
                <BatchImportSection
                  rows={analyzedBatchRows}
                  fileName={batchFileName}
                  errorMessage={batchError}
                  notice={batchNotice}
                  importing={isImporting}
                  includedCount={includedBatchRows.length}
                  invalidCount={invalidBatchCount}
                  fileInputRef={fileInputRef}
                  onFileChange={handleFileChange}
                  onDownloadTemplate={handleTemplateDownload}
                  onClear={clearBatch}
                  onToggleEdit={toggleBatchEdit}
                  onToggleIncluded={toggleBatchIncluded}
                  onFieldChange={handleBatchFieldChange}
                />
              )}
            </form>

            <aside className="preview-panel" aria-label="ตัวอย่างและคำสั่งพิมพ์">
              <div className="preview-panel__heading">
                <div>
                  <h2>{entryMode === 'single' ? 'ตัวอย่างฉลาก' : 'ตัวอย่างรายการ'}</h2>
                  <p>
                    {entryMode === 'single'
                      ? 'ปรับตามข้อมูลที่กรอกทันที'
                      : batchPreviewRow
                        ? `แสดงแถว ${batchPreviewRow.rowNumber} จาก ${batchRows.length} รายการ`
                        : 'นำเข้าไฟล์เพื่อดูตัวอย่างฉลาก'}
                  </p>
                </div>
                <span className="live-pill"><span />LIVE</span>
              </div>

              <div className="preview-stage">
                <div className="preview-stage__tape" aria-hidden="true" />
                <ShippingLabel
                  form={previewForm}
                  brandName={labelBrandName}
                  className="shipping-label--preview"
                  codeType={previewCodeType}
                  codeValue={previewCodeValue}
                  qrDataUrl={previewQrDataUrl}
                  idPrefix="preview-label"
                  widthMm={labelWidthMm}
                  heightMm={labelHeightMm}
                  labelScale={labelScale}
                />
              </div>

              <div className="preview-spec">
                <span>ขนาดกระดาษ</span>
                <strong>{labelSizeText}</strong>
              </div>

              <div className="print-action">
                <button className="print-button" type="submit" form="label-form" disabled={!labelSizeValid || (entryMode === 'batch' && isPreparingPrint)}>
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M7 8V3h10v5M7 17H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2M7 14h10v7H7v-7Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M17 11.5h.01" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
                  </svg>
                  {entryMode === 'single'
                    ? 'พิมพ์ใบแปะหน้าพัสดุ'
                    : isPreparingPrint
                      ? 'กำลังเตรียมฉลาก…'
                      : `พิมพ์ ${includedBatchRows.length} ใบ`}
                  <span className="print-button__arrow" aria-hidden="true">↗</span>
                </button>
              </div>
              <p className="print-hint">
                {entryMode === 'single'
                  ? `ตั้งค่ากระดาษเป็น ${labelSizeText} ในหน้าต่างพิมพ์`
                  : `พิมพ์เฉพาะแถวที่เลือก · ตั้งค่ากระดาษ ${labelSizeText}`}
              </p>
              <div className={`ready-note${(entryMode === 'single' ? hasRecipient && codeReady : includedBatchRows.length > 0) ? ' ready-note--complete' : ''}`} aria-live="polite">
                <span className="ready-note__icon" aria-hidden="true">
                  {(entryMode === 'single' ? hasRecipient && codeReady : includedBatchRows.length > 0) ? '✓' : 'i'}
                </span>
                {entryMode === 'single'
                  ? !hasRecipient
                    ? 'กรอกชื่อและที่อยู่ผู้รับเพื่อเริ่มพิมพ์'
                    : codeError
                      ? 'ตรวจข้อมูลรหัสก่อนพิมพ์'
                      : !codeReady
                        ? 'กำลังสร้าง QR Code…'
                        : 'ข้อมูลพร้อมพิมพ์'
                  : batchRows.length === 0
                    ? 'นำเข้าไฟล์เพื่อเริ่มจัดรายการพิมพ์'
                    : isPreparingPrint
                      ? 'กำลังเตรียมฉลากสำหรับพิมพ์…'
                    : includedBatchRows.length > 0
                      ? invalidBatchCount > 0
                        ? `พร้อมพิมพ์ ${includedBatchRows.length} ใบ · ข้าม ${invalidBatchCount} แถวที่มีปัญหา`
                        : `ข้อมูลพร้อมพิมพ์ ${includedBatchRows.length} ใบ`
                      : 'แก้แถวที่มีปัญหา แล้วเลือกอย่างน้อยหนึ่งแถว'}
              </div>
            </aside>
          </div>
        </main>

        <footer className="app-footer">
          <span>ทำฉลากง่าย ๆ แล้วไปส่งพัสดุกัน</span>
          <span>PimSaduak · {entryMode === 'single' ? '01 / 01' : 'นำเข้าหลายรายการ'}</span>
        </footer>
      </div>

      <main className="print-sheet" aria-label="ฉลากสำหรับพิมพ์">
        {historyPrintJob ? historyPrintJob.labels.map((label, index) => (
          <ShippingLabel
            key={`history-print-label-${index}`}
            form={label.form}
            brandName={historyPrintJob.brandName ?? labelBrandName}
            className="shipping-label--print"
            codeType={label.codeType}
            codeValue={label.codeValue}
            qrDataUrl={label.qrDataUrl}
            idPrefix={`history-print-label-${index + 1}`}
            widthMm={historyPrintJob.widthMm}
            heightMm={historyPrintJob.heightMm}
            labelScale={printLabelScale}
          />
        )) : entryMode === 'single' ? (
          <ShippingLabel
            form={form}
            brandName={labelBrandName}
            className="shipping-label--print"
            codeType={codeType}
            codeValue={codeValue}
            qrDataUrl={qrDataUrl}
            idPrefix="print-label"
            widthMm={printWidthMm}
            heightMm={printHeightMm}
            labelScale={printLabelScale}
          />
        ) : printBatch.map((label, index) => (
          <ShippingLabel
            key={`print-label-${index}`}
            form={label.form}
            brandName={labelBrandName}
            className="shipping-label--print"
            codeType={label.codeType}
            codeValue={label.codeValue}
            qrDataUrl={label.qrDataUrl}
            idPrefix={`print-label-${index + 1}`}
            widthMm={printWidthMm}
            heightMm={printHeightMm}
            labelScale={printLabelScale}
          />
        ))}
      </main>
    </>
  );
}

export default App;
