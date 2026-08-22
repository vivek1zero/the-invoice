import prisma from '@/lib/prisma';
import { notFound } from 'next/navigation';
import TriggerPrint from './TriggerPrint';
import PrintToolbar from './PrintToolbar';

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
  const themeBgHex = isProforma ? '#3B82F6' : (isExport ? '#059669' : '#E94444');
  const themeTextHex = isProforma ? '#3B82F6' : (isExport ? '#059669' : '#E94444');

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
            padding: 12mm 12mm 12mm 12mm !important;
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
          padding: '0mm 8mm 10mm 14mm',
          boxSizing: 'border-box'
        }}
        className="bg-[#ffffff] text-[#1e293b] mx-auto relative overflow-hidden flex flex-col justify-between"
      >
        <TriggerPrint />

        {/* Central Background Watermark (zero-symbol) - ONLY shown on Full Digital PDF */}
        {!isStationery && (
          <div 
            className="absolute inset-0 pointer-events-none flex items-center justify-center z-0"
            style={{ opacity: 0.06 }}
          >
            <svg 
              viewBox="0 0 649.88 649.88" 
              style={{ width: '460px', height: '460px' }}
              xmlns="http://www.w3.org/2000/svg"
            >
              <path fill="#2d424d" d="M636.11,1185.92a323.79,323.79,0,0,0-108.64,51.78,203.38,203.38,0,0,1,34-12.37c108.36-28.63,219.41,36,248,144.36s-36,219.41-144.35,248-219.41-36-248.05-144.35a202.28,202.28,0,0,1-4.75-80.5A323.31,323.31,0,0,0,405,1583c45.83,173.46,223.61,276.92,397.07,231.08S1079,1590.47,1033.18,1417,809.57,1140.08,636.11,1185.92Z" transform="translate(-394.17 -1175.06)"/>
              <path fill="#2d424d" d="M561.17,1458.39a81.14,81.14,0,0,1,160.28-17.82,121.82,121.82,0,1,0-97.37,97A81.14,81.14,0,0,1,561.17,1458.39Z" transform="translate(-394.17 -1175.06)"/>
            </svg>
          </div>
        )}

        {/* PDF Header -> top-right, badge flush to top edge */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0', position: 'relative', zIndex: 20 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {!isStationery ? (
              <div style={{
                backgroundColor: '#E94444',
                color: '#ffffff',
                padding: '7px 18px',
                fontSize: '13.33px',
                fontWeight: 'bold',
                display: 'inline-block',
                lineHeight: '1.2'
              }}>
                www.zerodesigns.in
              </div>
            ) : (
              <div style={{ height: '30px' }} />
            )}
            <div style={{
              fontSize: '11px',
              color: '#777777',
              textTransform: 'uppercase',
              textAlign: 'center',
              marginTop: '6px',
              letterSpacing: '0.5px'
            }}>
              ORIGINAL FOR RECIPIENT
            </div>
          </div>
        </div>

        {/* Large gap between header and title — exactly as in reference */}
        <div style={{ height: '48px' }} />

        {/* Invoice Title */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px', position: 'relative', zIndex: 10 }}>
          <div style={{ width: '50%' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0, color: themeTextHex, letterSpacing: '-0.3px' }}>
              {isProforma ? 'Proforma Invoice' : (isExport ? 'Export Invoice' : 'Tax Invoice')} | {invoice.orderNumber || invoice.invoiceNumber}
            </h2>
          </div>
          <div style={{ width: '50%', textAlign: 'right', color: '#777777' }}>
            {isExport && (
              <>
                <div style={{ fontWeight: 'bold', fontSize: '12px', textTransform: 'uppercase', color: '#334155' }}>LUT ARN No.: {invoice.lutArn || settings.business_lut_arn}</div>
                <div style={{ fontSize: '11px', lineHeight: 1.4, marginTop: '2px' }}>
                  Supply Meant for Export Under Bond of Letter of Understanding<br/>
                  without Payment of Integrated Tax (IGST)
                </div>
              </>
            )}
          </div>
        </div>

        {/* INVOICE TO + Address — tight stacking, no extra gaps */}
        <div style={{ marginBottom: '20px', color: '#777777', position: 'relative', zIndex: 10 }}>
          <div style={{ fontWeight: 'bold', fontSize: '13.33px', textTransform: 'uppercase', marginBottom: '2px', color: '#777777' }}>INVOICE TO</div>
          {(() => {
            const first = client?.firstName ? client.firstName.trim() : '';
            const last = client?.lastName ? client.lastName.trim() : '';
            const fullName = [first, last].filter(Boolean).join(' ').trim();
            const contactName = fullName || client?.contactPerson || '';

            return (
              <div style={{ fontSize: '13.33px', lineHeight: '1.55' }}>
                {contactName && (
                  <div style={{ color: '#777777', fontWeight: 'normal' }}>{contactName}</div>
                )}
                <div style={{ fontWeight: 'bold', color: '#777777', textTransform: 'uppercase' }}>{client?.name || 'Client Name'}</div>
                <div style={{ color: '#777777', fontWeight: 'normal', whiteSpace: 'pre-line' }}>
                  {client?.address || 'Address not specified'}
                </div>
                <div style={{ color: '#777777', fontWeight: 'normal' }}>
                  State Code: {client?.stateCode || '24'} | GSTIN: {client?.gstin || 'N/A'}
                </div>
              </div>
            );
          })()}
        </div>

        {/* Place of Supply & 3-Block Payment Grid - Aligned with the top of the 3 boxes */}
        <div className="flex justify-between items-start mb-0 relative z-10">
          <div className="w-[38%] text-[#777777] pt-2">
            <span className="font-bold text-[13.33px] uppercase block mb-0.5">PLACE OF SUPPLY</span>
            <span className="font-normal text-[13.33px] uppercase block">{client.state || 'GUJARAT'}</span>
          </div>
          <div className="w-[60%] flex justify-end">
            <table className="w-full border-collapse">
              <tbody>
                <tr>
                  <td className="text-left w-1/3 align-middle" style={{ backgroundColor: '#2d424d', color: '#fff', height: '76px', padding: '12px 14px' }}>
                    <div className="text-[12px] font-bold uppercase tracking-wide">DATE</div>
                    <div className="text-[14px] font-normal mt-1">{formatDate(invoice.createdAt)}</div>
                  </td>
                  <td className="text-left w-1/3 align-middle" style={{ backgroundColor: themeBgHex, color: '#fff', height: '76px', padding: '12px 14px' }}>
                    <div className="text-[12px] font-bold uppercase tracking-wide">PLEASE PAY</div>
                    <div className="text-[14px] font-bold mt-1">
                      {currSym === '₹' ? 'INR' : currSym} {invoice.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                  </td>
                  <td className="text-left w-1/3 align-middle" style={{ backgroundColor: '#2d424d', color: '#fff', height: '76px', padding: '12px 14px' }}>
                    <div className="text-[12px] font-bold uppercase tracking-wide">DUE DATE</div>
                    <div className="text-[14px] font-normal mt-1">{formatDate(invoice.dueDate || invoice.createdAt)}</div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="flex-1 flex flex-col mb-4 relative z-10" style={{ minHeight: '340px' }}>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-[#777777]">
                <th className="py-2 px-2 text-left font-bold text-[12px] w-8 border-y border-[#2d424d]">NO</th>
                <th className="py-2 px-2 text-left font-bold text-[12px] w-16 border-y border-[#2d424d]">HSN/SAC</th>
                <th className="py-2 px-2 text-left font-bold text-[12px] border-y border-[#2d424d]">DESCRIPTION</th>
                <th className="py-2 px-2 text-center font-bold text-[12px] w-12 border-y border-[#2d424d]">UNIT</th>
                <th className="py-2 px-2 text-center font-bold text-[12px] w-16 border-y border-[#2d424d]">HRS/QTY</th>
                <th className="py-2 px-2 text-right font-bold text-[12px] w-20 border-y border-[#2d424d]">RATE</th>
                <th className="py-2 px-2 text-center font-bold text-[12px] w-12 border-y border-[#2d424d]">TAX</th>
                <th className="py-2 px-2 text-right font-bold text-[12px] w-24 border-y border-[#2d424d]">AMOUNT</th>
              </tr>
            </thead>
            <tbody className="text-[#777777] text-[13.33px]">
              {lineItems.map((item, idx) => (
                <tr key={item.id} className="align-top border-b border-transparent">
                  <td className="pt-3 px-2 text-left font-normal">{idx + 1}</td>
                  <td className="pt-3 px-2 text-left font-normal">{item.hsnSac || '998314'}</td>
                  <td className="pt-3 px-2">
                    <div className="whitespace-pre-line leading-relaxed font-normal">{decodeHtmlEntities(item.description || item.title || 'Services')}</div>
                  </td>
                  <td className="pt-3 px-2 text-center font-normal">{item.unit || ''}</td>
                  <td className="pt-3 px-2 text-center font-normal">{item.quantity}</td>
                  <td className="pt-3 px-2 text-right font-normal">
                    {item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="pt-3 px-2 text-center whitespace-nowrap font-normal">
                    NA
                  </td>
                  <td className="pt-3 px-2 text-right font-normal">
                    {(item.quantity * item.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="border-b border-[#2d424d] w-full mt-auto pt-4" />
        </div>

        {/* Totals & Bank Details Grid */}
        <div className="flex justify-between items-start pt-3 relative z-10 text-[13.33px] text-[#777777]">
          {/* Bank Details (Left) */}
          <div className="w-1/2 pr-6">
            <div className="mb-4">
              <div className="font-bold mb-0.5 text-[#777777]">Bank Details:</div>
              <div className="whitespace-pre-line leading-snug font-normal">
                {cleanBankDetail}
              </div>
            </div>

            <div>
              <div className="font-bold mb-0.5 text-[#777777]">For, US Dollar Remittances - USD</div>
              <div className="whitespace-pre-line leading-snug font-normal">
                Correspondent Bank Details<br />
                J P MORGAN CHASE BANK,NEW YORK.<br />
                US SWIFT Code: CHASUS33XXX
              </div>
            </div>
          </div>

          {/* Totals & Signature (Right) */}
          <div className="w-1/2 flex flex-col items-end text-right">
            <div className="w-full max-w-[340px] mb-4">
              <div className="flex justify-between py-1">
                <span className="font-bold">SUB TOTAL</span>
                <span className="font-normal">{invoice.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              {invoice.cgst > 0 && (
                <div className="flex justify-between py-1">
                  <span className="font-bold">CGST @ 9% on {invoice.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  <span className="font-normal">{invoice.cgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              {invoice.sgst > 0 && (
                <div className="flex justify-between py-1">
                  <span className="font-bold">SGST @ 9% on {invoice.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  <span className="font-normal">{invoice.sgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              {invoice.igst > 0 && (
                <div className="flex justify-between py-1">
                  <span className="font-bold">IGST @ 18% on {invoice.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  <span className="font-normal">{invoice.igst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              {invoice.discount > 0 && (
                <div className="flex justify-between py-1">
                  <span className="font-bold">Discount</span>
                  <span className="text-[#dc2626] font-normal">- {invoice.discount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              
              <div className="mt-2 bg-[#2C3E50] text-[#ffffff] flex justify-between px-3.5 py-2.5 min-h-[44px] font-bold items-center">
                <span style={{ fontSize: '15px', lineHeight: 1 }}>Total Due</span>
                <span style={{ fontSize: '18px', lineHeight: 1 }}>
                  {currSym === '₹' ? 'INR' : currSym} {invoice.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Authorised Signatory */}
            <div className="text-right mt-2 text-[13.33px] text-[#777777] font-medium leading-relaxed w-full max-w-[340px]">
              THANKYOU.<br />
              For Zero Designs Private Limited<br />
              
              <div className="h-[60px] my-1 flex justify-end items-center">
                {!isStationery ? (
                  <img src="/signature.svg" alt="Signature" className="h-10 object-contain" />
                ) : null}
              </div>
              
              Authorised Signatory
            </div>
          </div>
        </div>

        {/* Footer Info (Only for non-stationery) */}
        {!isStationery && (
          <footer className="mt-8 flex justify-end items-start text-[10.5px] text-[#777777] relative z-10">
            <div className="flex items-start gap-4 text-right">
              <div className="space-y-0.5 leading-snug">
                <div className="font-bold text-[#1e293b] uppercase text-[11.5px]">{settings.business_name}</div>
                <div className="whitespace-pre-line">{cleanAddress}</div>
                {cleanExtraInfo && (
                  <div className="font-semibold">{cleanExtraInfo}</div>
                )}
                <div className="text-[#94a3b8] font-semibold uppercase mt-0.5">SUBJECT TO AHMEDABAD JURISDICATION</div>
              </div>
              <img src="/zero-logo.svg" alt="Zero Designs" className="h-10 w-auto" />
            </div>
          </footer>
        )}
      </div>
    </>
  );
}
