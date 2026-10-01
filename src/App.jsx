import { useState } from 'react';
import './App.css';

const initialForm = {
  recipientName: '',
  recipientPhone: '',
  recipientAddress: '',
  senderName: '',
  senderPhone: '',
  senderAddress: '',
};

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

function SectionHeading({ number, title, description }) {
  return (
    <div className="section-heading">
      <span className="section-heading__number" aria-hidden="true">{number}</span>
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
    </div>
  );
}

function ShippingLabel({ form, className = '' }) {
  const isPreview = className.includes('--preview');
  const recipientName = form.recipientName.trim() || (isPreview ? 'ชื่อผู้รับ' : '');
  const recipientPhone = form.recipientPhone.trim();
  const recipientAddress = form.recipientAddress.trim() || (isPreview ? 'ที่อยู่ผู้รับ' : '');
  const senderName = form.senderName.trim() || (isPreview ? 'ชื่อผู้ส่ง' : '');
  const senderPhone = form.senderPhone.trim();
  const senderAddress = form.senderAddress.trim() || (isPreview ? 'ที่อยู่ผู้ส่ง' : '');
  const hasSender = Boolean(senderName || senderPhone || senderAddress);

  return (
    <article className={`shipping-label ${className}`} aria-label="ตัวอย่างใบแปะหน้าพัสดุ">
      <header className="shipping-label__header">
        <span className="shipping-label__mark" aria-hidden="true">
          <svg viewBox="0 0 28 28" fill="none">
            <path d="M4 8.2 14 3l10 5.2v11.6L14 25 4 19.8V8.2Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
            <path d="m4.5 8.5 9.5 5 9.5-5M14 14v10.2" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          </svg>
        </span>
        <span className="shipping-label__wordmark">PimSaduak</span>
        <span className="shipping-label__document">ใบแปะหน้าพัสดุ</span>
      </header>

      <section className="shipping-label__recipient" aria-labelledby={`${className || 'preview'}-recipient-title`}>
        <h3 id={`${className || 'preview'}-recipient-title`} className="shipping-label__eyebrow">ส่งถึง</h3>
        <p className="shipping-label__name">{recipientName}</p>
        {recipientPhone && <p className="shipping-label__phone">โทร. {recipientPhone}</p>}
        <p className="shipping-label__address">{recipientAddress}</p>
      </section>

      {(hasSender || isPreview) && (
        <>
          <div className="shipping-label__rule" aria-hidden="true" />
          <section className="shipping-label__sender" aria-labelledby={`${className || 'preview'}-sender-title`}>
            <h3 id={`${className || 'preview'}-sender-title`} className="shipping-label__eyebrow">ผู้ส่ง</h3>
            {senderName && <p className="shipping-label__sender-name">{senderName}</p>}
            {senderPhone && <p className="shipping-label__sender-phone">โทร. {senderPhone}</p>}
            {senderAddress && <p className="shipping-label__sender-address">{senderAddress}</p>}
          </section>
        </>
      )}

      <footer className="shipping-label__footer">
        <span>ขอบคุณที่อุดหนุน</span>
        <span className="shipping-label__footer-dot" aria-hidden="true" />
        <span>ส่งด้วยความใส่ใจ</span>
      </footer>
    </article>
  );
}

function App() {
  const [form, setForm] = useState(initialForm);
  const hasRecipient = Boolean(form.recipientName.trim() && form.recipientAddress.trim());

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function handlePrint(event) {
    event.preventDefault();
    window.print();
  }

  return (
    <>
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
            <span>ข้อมูลอยู่ในเบราว์เซอร์ของคุณ</span>
          </div>
        </header>

        <main className="workspace" id="main">
          <div className="page-heading">
            <div>
              <p className="page-heading__kicker">เริ่มต้นได้ในไม่กี่ขั้นตอน</p>
              <h1>ทำใบแปะหน้าพัสดุ</h1>
              <p className="page-heading__description">กรอกข้อมูลผู้รับและผู้ส่ง แล้วตรวจตัวอย่างก่อนพิมพ์</p>
            </div>
            <div className="page-meta" aria-label="ขนาดฉลากปัจจุบัน">
              <span className="page-meta__icon" aria-hidden="true">▱</span>
              <span><strong>1 ใบ</strong><small>10 × 15 ซม.</small></span>
            </div>
          </div>

          <div className="work-grid">
            <form className="form-panel" id="label-form" onSubmit={handlePrint}>
              <section className="form-section form-section--recipient">
                <SectionHeading
                  number="01"
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
                  number="02"
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

              <div className="form-footnote">
                <span className="form-footnote__sparkle" aria-hidden="true">✳</span>
                <span>กรอกข้อมูลผู้รับให้ครบก่อนพิมพ์</span>
              </div>
            </form>

            <aside className="preview-panel" aria-label="ตัวอย่างและคำสั่งพิมพ์">
              <div className="preview-panel__heading">
                <div>
                  <h2>ตัวอย่างฉลาก</h2>
                  <p>ปรับตามข้อมูลที่กรอกทันที</p>
                </div>
                <span className="live-pill"><span />LIVE</span>
              </div>

              <div className="preview-stage">
                <div className="preview-stage__tape" aria-hidden="true" />
                <ShippingLabel form={form} className="shipping-label--preview" />
              </div>

              <div className="preview-spec">
                <span>ขนาดกระดาษ</span>
                <strong>10 × 15 ซม.</strong>
              </div>

              <button className="print-button" type="submit" form="label-form">
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M7 8V3h10v5M7 17H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2M7 14h10v7H7v-7Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M17 11.5h.01" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
                </svg>
                พิมพ์ใบแปะหน้าพัสดุ
                <span className="print-button__arrow" aria-hidden="true">↗</span>
              </button>
              <p className="print-hint">ตั้งค่าขนาดกระดาษเป็น 10 × 15 ซม. ในหน้าต่างพิมพ์</p>
              <div className={`ready-note${hasRecipient ? ' ready-note--complete' : ''}`} aria-live="polite">
                <span className="ready-note__icon" aria-hidden="true">{hasRecipient ? '✓' : 'i'}</span>
                {hasRecipient ? 'ข้อมูลผู้รับพร้อมพิมพ์' : 'กรอกชื่อและที่อยู่ผู้รับเพื่อเริ่มพิมพ์'}
              </div>
            </aside>
          </div>
        </main>

        <footer className="app-footer">
          <span>ทำฉลากง่าย ๆ แล้วไปส่งพัสดุกัน</span>
          <span>PimSaduak · 01 / 01</span>
        </footer>
      </div>

      <main className="print-sheet" aria-label="ฉลากสำหรับพิมพ์">
        <ShippingLabel form={form} className="shipping-label--print" />
      </main>
    </>
  );
}

export default App;
