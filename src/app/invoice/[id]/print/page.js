import prisma from '@/lib/prisma';
import { notFound } from 'next/navigation';
import TriggerPrint from './TriggerPrint';
import PrintToolbar from './PrintToolbar';
import SignatureSvg from './SignatureSvg';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function formatPdfTitle(invoice) {
  const clientName = (invoice?.client?.name || 'CLIENT')
    .toUpperCase()
    .trim()
    .replace(/[^A-Z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  // Always generate the D/E date-based ID for the PDF filename
  const date = new Date(invoice?.createdAt || new Date());
  const century = String(date.getFullYear()).slice(0, 2);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  const fiscalMonth = date.getMonth();
  const startYear = fiscalMonth >= 3 ? date.getFullYear() : date.getFullYear() - 1;
  const endYear = startYear + 1;
  const startYearShort = String(startYear).slice(-2);
  const endYearShort = String(endYear).slice(-2);
  const fy = `${startYearShort}${endYearShort}`;

  let prefix = 'D';
  if (invoice?.status === 'PROFORMA') {
    prefix = invoice?.domesticExport === 'Export' ? 'PE' : 'PD';
  } else {
    prefix = invoice?.domesticExport === 'Export' ? 'E' : 'D';
  }
  const generatedId = `${prefix}${century}${fy}${month}${day}`;

  return `${generatedId}-${clientName}`;
}

export async function generateMetadata({ params }) {
  const { id } = await params;
  const invoice = await prisma.invoice.findFirst({
    where: {
      OR: [
        { id: id },
        { invoiceNumber: id }
      ]
    },
    include: { client: true }
  });

  if (!invoice) return { title: 'Invoice' };

  return {
    title: formatPdfTitle(invoice),
  };
}

export default async function PrintInvoicePage({ params, searchParams }) {
  const { id } = await params;
  const sParams = await searchParams;
  const isStationery = sParams?.stationery === 'true';

  const invoice = await prisma.invoice.findFirst({
    where: {
      OR: [
        { id: id },
        { invoiceNumber: id }
      ]
    },
    include: {
      client: true,
      lineItems: true
    }
  });

  if (!invoice) {
    notFound();
  }

  const dbSettings = await prisma.setting.findMany();
  const settings = {
    business_name: 'ZERO DESIGNS PVT. LTD.',
    business_address: '605/606, Satyamev Elite Near Vakil Saheb Bridge, Ambli-Bopal Cross Road, Bopal, Ahmedabad, Gujarat 380058, India.\nMobile: +91 987 935 7255, +91 990 996 2340, +91 982 422 0878 Email: sales@zerodesigns.in, Website: www.zerodesigns.in',
    business_extra_info: 'PAN No. : AAACZ4713E | CIN No. : U72900GJ2011PTC063931 | GST No. : 24AAACZ4713E1ZN',
    business_bank_detail: 'ICICI Bank Limited\nBranch : Bopal Road, Ahmedabad\nBeneficiary : ZERO DESIGNS PRIVATE LIMITED\nAddress : As Below\nAccount Number: 036105002622\nSwift code: ICICINBBNRI\nIFSC Code: ICIC0000361',
    business_lut_arn: 'AD241225020914E'
  };

  dbSettings.forEach(item => {
    settings[item.key] = item.value;
  });

  const { client, lineItems } = invoice;

  // Financial Year for LUT ARN
  const invoiceDate = new Date(invoice.createdAt);
  const invoiceMonth = invoiceDate.getMonth();
  const startYear = invoiceMonth >= 3 ? invoiceDate.getFullYear() : invoiceDate.getFullYear() - 1;
  const endYear = startYear + 1;
  const endYearShort = String(endYear).slice(-2);
  const lutValidity = `${startYear}-${endYearShort}`;

  const isProforma = invoice.status === 'PROFORMA';
  const isExport = invoice.domesticExport === 'Export';
  const themeBgHex = isProforma ? '#3B82F6' : (isExport ? '#00ae9f' : '#E94444');
  const themeTextHex = isProforma ? '#3B82F6' : (isExport ? '#00ae9f' : '#e94444');

  const formatDate = (dateObj) => {
    if (!dateObj) return '';
    const date = new Date(dateObj);
    if (isNaN(date.getTime())) return '';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const currSym = invoice.currencySymbol || (isExport ? '$' : '₹');

  // Clean Bank Details to ensure no duplicate "Bank Details:" header
  const rawBankDetail = settings.business_bank_detail || '';
  const cleanBankDetail = rawBankDetail.replace(/^(Bank Details:\s*)+/i, '').trim();

  // Robust jurisdiction cleaner function to remove duplicate SUBJECT TO AHMEDABAD JURISDICATION
  const cleanJurisdiction = (str) => {
    if (!str) return '';
    return str
      .split('\n')
      .filter(line => !/SUBJECT\s+TO\s+AHMEDABAD\s+JURIS/i.test(line.trim()))
      .join('\n')
      .replace(/SUBJECT\s+TO\s+AHMEDABAD\s+JURISDI?C?TION\.?/gi, '')
      .trim();
  };

  const decodeHtmlEntities = (str) => {
    if (!str || typeof str !== 'string') return '';
    return str
      .replace(/&amp;amp;/g, '&')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .trim();
  };

  const cleanAddress = cleanJurisdiction(settings.business_address);
  const cleanExtraInfo = cleanJurisdiction(settings.business_extra_info);

  const pdfTitle = formatPdfTitle(invoice);

  return (
    <>
      <script
        dangerouslySetInnerHTML={{
          __html: `document.title = ${JSON.stringify(pdfTitle)};`
        }}
      />
      {/* Google Font: Montserrat */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400&display=swap" rel="stylesheet" />

      {/* Print CSS: hide toolbar when printing, ensure clean A4 output without background watermarks */}
      <style>{`
        @media print {
          html, body {
            width: 210mm !important;
            height: 297mm !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            background-image: none !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          #invoice-print-toolbar, #invoice-screen-spacer {
            display: none !important;
          }
          @page {
            size: A4 portrait;
            margin: 0;
          }
          #invoice-pdf-container {
            width: 210mm !important;
            max-width: 210mm !important;
            min-height: 297mm !important;
            box-sizing: border-box !important;
            margin: 0 auto !important;
            padding: 12mm 12mm 12mm calc(12mm + 4px) !important;
            letter-spacing: normal !important;
            box-shadow: none !important;
            border: none !important;
            background: #ffffff !important;
            background-image: none !important;
            transform: none !important;
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
          }
          #invoice-pdf-container * {
            letter-spacing: normal !important;
            box-shadow: none !important;
          }
        }

        .text-\[12\.5px\] {
          font-size: 12.5px;
        }
        .text-white.py-2\.5.px-1.font-bold {
          padding: 15px 15px;
        }
        .max-w-\[370px\] {
          max-width: 400px;
        }
      `}</style>

      {/* Print Toolbar – Client Component (handles onClick) */}
      <PrintToolbar isStationery={isStationery} pdfTitle={pdfTitle} />

      {/* Screen-only spacer so the fixed toolbar doesn't overlap invoice – hidden when printing */}
      <div id="invoice-screen-spacer" style={{ height: '64px' }} />

      <div
        id="invoice-pdf-container"
        style={{
          fontFamily: "'Averta', sans-serif",
          letterSpacing: 'normal',
          width: '794px',
          minHeight: '1123px',
          padding: '0mm 7mm 10mm calc(14mm + 4px)',
          boxSizing: 'border-box'
        }}
        className="bg-[#ffffff] text-[#1e293b] mx-auto relative overflow-hidden flex flex-col justify-start"
      >
        <TriggerPrint />



        {/* PDF Header -> top-right, badge flush to top edge */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px', marginRight: '30px', position: 'relative', zIndex: 20, marginTop: '-2px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {!isStationery ? (
              <div style={{
                backgroundColor: '#E94444',
                color: '#ffffff',
                padding: '9px 11px 16px 11px',
                fontSize: '16px',
                textAlign: 'center',
                fontWeight: '600',
                display: 'inline-block',
                lineHeight: '1',
                letterSpacing: '0px'
              }}>
                www.zerodesigns.in
              </div>
            ) : (
              <div style={{ height: '40px' }} />
            )}
            <div style={{
              fontSize: '12.6666px',
              color: '#777777',
              textTransform: 'uppercase',
              textAlign: 'center',
              marginTop: '7.8px',
              fontWeight: 200,
              fontFamily: 'Arial, Helvetica, sans-serif',
              letterSpacing: '1.3',
              width: '100%'
            }}>
              ORIGINAL FOR RECIPIENT
            </div>
          </div>
        </div>

        {/* Large gap between header and title — exactly as in reference */}
        <div style={{ height: '0px' }} />

        {/* Title & INVOICE TO Section Container */}
        <div style={{ marginTop: '32px', marginBottom: '0px', padding: '0px', position: 'relative', zIndex: 10 }}>
          {/* Invoice Title */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '-8px' }}>
            <div style={{ width: '50%' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0, color: themeTextHex, letterSpacing: '0.2px', marginTop: '0px', marginBottom: '0px' }}>
                {isProforma ? 'Proforma Invoice' : (isExport ? 'Export Invoice' : 'Tax Invoice')} | {invoice.orderNumber || invoice.invoiceNumber}
              </h2>
            </div>
            <div style={{ width: '50%', textAlign: 'right', color: '#777777' }}>
              {isExport && (
                <>
                  <div style={{ fontWeight: 'bold', fontSize: '12px', textTransform: 'uppercase', color: '#334155' }}>LUT ARN No.: {invoice.lutArn || settings.business_lut_arn}</div>
                  <div style={{ fontSize: '11px', lineHeight: 1.4, marginTop: '2px' }}>
                    Supply Meant for Export Under Bond of Letter of Understanding<br />
                    without Payment of Integrated Tax (IGST)
                  </div>
                </>
              )}
            </div>
          </div>

          {/* INVOICE TO + Address — tight stacking, no extra gaps */}
          <div style={{ marginBottom: '0px', marginTop: '15px', color: '#777777' }}>
            <div style={{ fontWeight: 'bold', fontSize: '13px', textTransform: 'uppercase', marginBottom: '-2px', color: '#777777', letterSpacing: '0.2px' }}>INVOICE TO</div>
            {(() => {
              const first = client?.firstName ? client.firstName.trim() : '';
              const last = client?.lastName ? client.lastName.trim() : '';
              const fullName = [first, last].filter(Boolean).join(' ').trim();
              const contactName = fullName || client?.contactPerson || '';

              return (
                <div style={{ fontWeight: '200', fontSize: '13px', lineHeight: '1.55', marginTop: '0px', letterSpacing: '0.2px' }}>
                  {contactName && (
                    <div style={{ color: '#777777', fontWeight: 'normal', letterSpacing: '0.2px' }}>{contactName}</div>
                  )}
                  <div style={{ fontWeight: 'bold', color: '#777777', textTransform: 'uppercase', letterSpacing: '0.3px' }}>{client?.name || 'Client Name'}</div>
                  <div style={{ color: '#777777', fontWeight: 'normal', whiteSpace: 'pre-line', marginTop: '-2px', lineHeight: '20px', letterSpacing: '0.2px' }}>
                    {client?.address || 'Address not specified'}
                  </div>
                  <div style={{ color: '#777777', fontWeight: 'normal', marginTop: '-2px', letterSpacing: '0.2px' }}>
                    State Code: {client?.stateCode || '24'} | GSTIN: {client?.gstin || 'N/A'}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* SECTION 4: Place of Supply & 3-Block Payment Grid */}
        <div style={{ marginBottom: '5px', color: '#777777', position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
          <div className="flex justify-between items-start mb-0 relative z-10" style={{ marginTop: '52.5px', marginBottom: '-2px', justifyContent: "start" }}>
            <div style={{ color: '#777', width: "41.7%", marginTop: '-6px' }}>
              <span className="font-bold uppercase block" style={{ fontSize: '13px', letterSpacing: '0.4px', marginTop: '-6px' }}>PLACE OF SUPPLY</span>
              <span className="font-normal uppercase block" style={{ fontSize: '13px', marginTop: '-3px', letterSpacing: '0.4px' }}>{client.state || 'GUJARAT'}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "end", width: "58.3%", marginTop: '-6px' }}>
              <table className="border-collapse" style={{ tableLayout: 'fixed' }}>
                <tbody>
                  <tr style={{ justifyContent: "center", alignItems: "center" }}>
                    <td className="align-center" style={{ backgroundColor: '#2d424d', color: '#fff', height: '82px', padding: '0px', width: '140px', textAlign: 'center', fontSize: '17px' }}>
                      <div className="uppercase tracking-wide" style={{ letterSpacing: '0px', fontSize: '16px', marginRight: '45px', fontWeight: '600', marginTop: '-12px', marginLeft: '6px', letterSpacing: '0.2px' }}>DATE</div>
                      <div className="font-bold" style={{ marginTop: '-5px', paddingBottom: '6px', marginLeft: '9px', fontWeight: '600', letterSpacing: '0px', fontSize: '16px', marginRight: '5px' }}>{formatDate(invoice.createdAt)}</div>
                    </td>
                    <td className="align-center" style={{ backgroundColor: themeBgHex, color: '#fff', height: '82px', padding: '0px', width: '192px', textAlign: 'center', fontSize: '17px' }}>
                      <div className="uppercase tracking-wide" style={{ letterSpacing: '0px', fontSize: '16px', fontWeight: '600', marginTop: '-12px', marginRight: '20px', letterSpacing: '0.2px' }}>PLEASE PAY</div>
                      <div style={{ marginTop: '-6px', paddingBottom: '6px' }}>
                        <span style={{ fontWeight: 600 }}>{currSym === '₹' ? 'INR' : currSym}</span>{' '}
                        <span className='bold' style={{ fontWeight: 900 }}>
                          {invoice.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </td>
                    <td className="align-center" style={{ backgroundColor: '#2d424d', color: '#fff', height: '82px', padding: '0px', width: '140px', textAlign: 'center', fontSize: '17px' }}>
                      <div className="uppercase tracking-wide" style={{ letterSpacing: '0px', fontSize: '16px', fontWeight: '600', marginTop: '-12px', marginRight: '12px', marginLeft: '10px', letterSpacing: '0.2px' }}>DUE DATE</div>
                      <div className="font-bold" style={{ marginTop: '-5px', paddingBottom: '6px', marginLeft: '8px', fontWeight: '600', fontSize: '16px', marginRight: '5px' }}>{formatDate(invoice.dueDate || invoice.createdAt)}</div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Middle & Bottom Section Container (Table + Totals/Bank Details) with continuous Watermark */}
          <div className="relative">
            {!isStationery && (
              <div
                className="absolute inset-0 pointer-events-none flex items-center justify-center -z-10"
              >
                <svg
                  viewBox="153.68 225.73 156.99 156.99"
                  xmlns="http://www.w3.org/2000/svg"
                  style={{
                    width: '460px',
                    height: '460px',
                    display: 'block'
                  }}
                >
                  <path
                    fill="#f5f5f5"
                    d="M212.12,228.3358a78.2489,78.2489,0,0,0-26.2493,12.51,48.9709,48.9709,0,1,1-27.8046,37.4939A78.4956,78.4956,0,1,0,212.12,228.3358Z"
                  />
                  <path
                    fill="#f5f5f5"
                    d="M194.0127,294.1679a19.6062,19.6062,0,0,1,38.7271-4.3054,29.4363,29.4363,0,1,0-23.5269,23.44A19.6087,19.6087,0,0,1,194.0127,294.1679Z"
                  />
                </svg>
              </div>
            )}

            {/* SECTION 5: Line Items Table */}
            <div className="flex flex-col mb-0 relative z-10" style={{ height: '340px', marginTop: '0px' }}>
              <table className="w-full border-collapse" style={{ width: '100%', tableLayout: 'fixed' }}>
                <thead>
                  <tr style={{
                    color: '#777777',
                    borderTop: '1px solid #2F444E',
                    borderBottom: '1px solid #2F444E',
                    backgroundColor: '#fff',
                    fontSize: '13px',
                    fontWeight: '700',
                    letterSpacing: '0.4px',
                    height: '30px'
                  }}>
                    <th className="uppercase font-bold" style={{ width: '44px', textAlign: 'left', padding: '5px 0 8px 5px', verticalAlign: 'middle', paddingBottom: '18px' }}>NO</th>
                    <th className="uppercase font-bold" style={{ width: '82px', textAlign: 'left', padding: '5px 0 8px 0px', verticalAlign: 'middle', paddingBottom: '18px' }}>HSN/SAC</th>
                    <th className="uppercase font-bold" style={{ width: '170px', textAlign: 'left', padding: '5px 0 8px 0', verticalAlign: 'middle', paddingBottom: '18px' }}>DESCRIPTION</th>
                    <th className="uppercase font-bold" style={{ width: '50px', textAlign: 'center', padding: '5px 0 8px 0', verticalAlign: 'middle', paddingBottom: '18px' }}>UNIT</th>
                    <th className="uppercase font-bold" style={{ width: '72px', textAlign: 'center', padding: '5px 0 8px 8px', verticalAlign: 'middle', paddingBottom: '18px', }}>HRS/QTY</th>
                    <th className="uppercase font-bold" style={{ width: '96px', textAlign: 'left', padding: '5px 0 8px 0', verticalAlign: 'middle', paddingBottom: '18px', paddingLeft: '34px' }}>RATE</th>
                    <th className="uppercase font-bold" style={{ width: '82px', textAlign: 'left', padding: '5px 0 8px 14px', verticalAlign: 'middle', paddingBottom: '18px' }}>TAX</th>
                    <th className="uppercase font-bold" style={{ width: '110px', textAlign: 'right', padding: '5px 30px 8px 0', verticalAlign: 'middle', paddingBottom: '18px' }}>AMOUNT</th>
                  </tr>
                </thead>
                <tbody style={{ color: '#777777', fontSize: '13px' }}>
                  {lineItems.map((item, idx) => {
                    const taxLabel = invoice.igst > 0
                      ? '18% GST'
                      : ((invoice.cgst > 0 || invoice.sgst > 0) ? '18% GST' : 'NA');

                    return (
                      <tr key={item.id} className="border-b border-transparent" style={{ verticalAlign: 'top' }}>
                        <td style={{ textAlign: 'left', padding: '6px 0 12px 10px' }}>{idx + 1}</td>
                        <td style={{ textAlign: 'left', padding: '6px 0 12px 0' }}>{item.hsnSac || '998314'}</td>
                        <td style={{ textAlign: 'left', padding: '6px 0px 12px 0', width: '170px' }}>
                          <div className="whitespace-pre-line font-normal" style={{ lineHeight: '18px', maxWidth: '170px' }}>
                            {decodeHtmlEntities(item.description || item.title || 'Services')}
                          </div>
                        </td>
                        <td style={{ textAlign: 'center', padding: '6px 0 12px 0' }}>{item.unit || ''}</td>
                        <td style={{ textAlign: 'center', padding: '6px 0 12px 0' }}>{item.quantity}</td>
                        <td className="whitespace-nowrap" style={{ textAlign: 'right', padding: '6px 0 12px 0' }}>
                          {item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="whitespace-nowrap" style={{ textAlign: 'left', padding: '6px 0 12px 14px' }}>
                          {taxLabel}
                        </td>
                        <td className="whitespace-nowrap" style={{ textAlign: 'right', padding: '6px 30px 12px 0' }}>
                          {(item.quantity * item.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="w-full mt-auto" style={{ borderBottom: '1px solid #2F444E', paddingTop: '20px' }} />
            </div>

            {/* Totals & Bank Details Grid */}
            <div className="flex justify-between items-start relative z-10" style={{ fontSize: '13.3333px', color: '#777' }}>
              {/* Bank Details (Left) */}
              <div className="w-[45%]">
                <div style={{ marginTop: '12px', marginBottom: '8px' }}>
                  <div className="font-bold" style={{ color: '#777', fontSize: '13.3333px', marginBottom: '0px' }}>Bank Details:</div>
                  <div className="whitespace-pre-line font-normal" style={{ fontSize: '13.3333px', lineHeight: '1.45' }}>
                    {cleanBankDetail}
                  </div>
                </div>

                <div>
                  <div className="font-bold" style={{ color: '#777', fontSize: '13.3333px', marginBottom: '0px', marginTop: '18px' }}>For, US Dollar Remittances - USD</div>
                  <div className="whitespace-pre-line font-normal" style={{ fontSize: '13.3333px', lineHeight: '1.45' }}>
                    Correspondent Bank Details<br />
                    J P MORGAN CHASE BANK,NEW YORK.<br />
                    US SWIFT Code: CHASUS33XXX
                  </div>
                </div>
              </div>

              {/* Totals & Signature (Right) */}
              <div className="w-[55%] flex flex-col items-end text-right" style={{ justifyContent: 'space-between' }}>
                <div className="w-full max-w-[355px] mb-4" style={{ justifyContent: 'start', marginTop: '12px' }}>
                  <div style={{ marginBottom: '25px', marginLeft: '9px', marginRight: '8px' }}>
                    <div className="flex justify-between py-[2px]">
                      <span className="font-bold" style={{ fontSize: '12px', lineHeight: '1.25', marginBottom: '3px', letterSpacing: '0.6px', color: '#767676' }}>SUB TOTAL</span>
                      <span className="font-normal" style={{ fontSize: '12px', lineHeight: '1.25' }}>{invoice.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    {invoice.cgst > 0 && (
                      <div className="flex justify-between py-[2px]">
                        <span className="font-bold" style={{ fontSize: '12px', lineHeight: '1.25', marginBottom: '3px', letterSpacing: '0.6px', color: '#767676' }}>CGST @ 9% on {invoice.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        <span className="font-normal" style={{ fontSize: '12px', lineHeight: '1.25' }}>{invoice.cgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                    {invoice.sgst > 0 && (
                      <div className="flex justify-between py-[2px]">
                        <span className="font-bold" style={{ fontSize: '12px', lineHeight: '1.25', marginBottom: '3px', letterSpacing: '0.6px', color: '#767676' }}>SGST @ 9% on {invoice.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        <span className="font-normal" style={{ fontSize: '12px', lineHeight: '1.25' }}>{invoice.sgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                    {invoice.igst > 0 && (
                      <div className="flex justify-between py-[2px]">
                        <span className="font-bold" style={{ fontSize: '12px', lineHeight: '1.25', marginBottom: '3px', letterSpacing: '0.6px', color: '#767676' }}>IGST @ 18% on {invoice.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        <span className="font-normal" style={{ fontSize: '12px', lineHeight: '1.25' }}>{invoice.igst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                    {invoice.discount > 0 && (
                      <div className="flex justify-between py-[2px]">
                        <span className="font-bold" style={{ fontSize: '12px', lineHeight: '1.25', marginBottom: '3px', letterSpacing: '0.6px', color: '#767676' }}>Discount</span>
                        <span className="text-[#dc2626] font-normal" style={{ fontSize: '12px', lineHeight: '1.25' }}>- {invoice.discount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                  </div>

                  <div className="total-due-bar flex justify-between items-center" style={{ backgroundColor: '#2e4151', color: '#ffffff', marginBottom: "-5px", padding: '0px 10px 10px 10px', textAlign: "center" }}>
                    <span style={{ fontSize: '18px', display: 'flex', alignItems: 'center', marginTop: '-8px', justifyContent: 'center' }}>Total Due</span>
                    <span style={{ fontSize: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '-4px', fontWeight: 800 }}>
                      {currSym === '₹' ? 'INR' : currSym} {invoice.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* THANKYOU + For Zero Designs + Signature */}
                <div className="text-right text-[13.3333px] text-[#777] font-medium w-full max-w-[340px]" style={{ lineHeight: '1.6' }}>
                  THANKYOU.<br />
                  For Zero Designs Private Limited

                  {/* Signature — sits between "For Zero Designs" and "Authorised Signatory" */}
                  {!isStationery && (
                    <div style={{ width: '100%', height: '90px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', margin: '2px 0px 10px 20px' }}>
                      <SignatureSvg style={{ width: '145px', height: '80px', display: 'block' }} />
                    </div>
                  )}
                  {isStationery && <div style={{ height: '80px' }} />}
                </div>
              </div>
            </div>
          </div>

          {/* Footer: matches reference — ZERO DESIGNS PVT. LTD. aligned with Authorised Signatory */}
          {!isStationery && (
            <footer className="flex items-start text-[10px] text-[#777777] relative z-10" style={{ marginTop: '-23px' }}>

              {/* Left/center block: business name + address (text-right to align with totals above) */}
              <div className="flex-1 text-right pr-4 leading-tight">
                <div className="font-bold text-[#777777] uppercase text-[14px]">{settings.business_name}</div>
                <div className="whitespace-pre-line leading-tight" style={{ marginBottom: '0px', fontSize: '9px', letterSpacing: '0.2px' }}>{cleanAddress}</div>
                {cleanExtraInfo && (
                  <div className="font-normal leading-tight" style={{ marginTop: '0px', marginBottom: '0px', fontSize: '11px' }}>{cleanExtraInfo}</div>
                )}
                <div className="text-[#777777] font-normal uppercase" style={{ marginTop: '8px', fontSize: '11px', letterSpacing: `0.2px` }}>SUBJECT TO AHMEDABAD JURISDICATION</div>
              </div>

              {/* Right block: Authorised Signatory (same row as ZERO DESIGNS PVT. LTD.) + logo below */}
              <div className="flex flex-col items-end flex-shrink-0" style={{ width: '145px' }}>
                <div style={{ fontFamily: "'Averta', sans-serif", fontSize: '13.33px', color: '#777777', fontWeight: 400, textAlign: 'right', whiteSpace: 'nowrap', marginBottom: '8px' }}>
                  Authorised Signatory
                </div>
                <img src="/zero-logo.svg" alt="Zero Designs" style={{ width: '142px', height: 'auto', display: 'block' }} />
              </div>
            </footer>
          )}
        </div>
      </div >
    </>
  );
}