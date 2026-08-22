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
        style={{ fontFamily: "Arial, Helvetica, sans-serif", letterSpacing: 'normal' }}
        className="bg-white text-slate-800 pb-6 px-10 max-w-[850px] mx-auto relative overflow-hidden flex flex-col min-h-[1050px]"
      >
        <TriggerPrint />

        {/* Central Background Watermark (zero-symbol) - ONLY shown on Full Digital PDF */}
        {!isStationery && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-0 opacity-[0.04]">
            <img src="/zero-symbol-1.svg" alt="Watermark" className="w-[480px] h-[480px] object-contain" />
          </div>
        )}

        {/* PDF Header -> ORIGINAL FOR RECIPIENT */}
        <div className="flex justify-end mb-8 relative z-20 pt-8">
          {!isStationery ? (
            <div className="flex flex-col items-center">
              <div className="bg-[#E94444] text-white px-3 py-1 text-[13.33px] font-bold text-center">
                www.zerodesigns.in
              </div>
              <div className="text-[12px] text-[#777777] font-normal uppercase text-center mt-1">
                ORIGINAL FOR RECIPIENT
              </div>
            </div>
          ) : (
            <div className="text-[12px] text-[#777777] font-normal uppercase text-center mt-1">
              ORIGINAL FOR RECIPIENT
            </div>
          )}
        </div>

        {/* Invoice Title & Export Details */}
        <div className="flex justify-between items-start mb-6 relative z-10">
          <div className="w-1/2">
            <h2 className="text-[20px] font-bold tracking-tight" style={{ color: themeTextHex }}>
              {isProforma ? 'Proforma Invoice' : (isExport ? 'Export Invoice' : 'Tax Invoice')} | {invoice.orderNumber || invoice.invoiceNumber}
            </h2>
          </div>
          <div className="w-1/2 text-right text-[#777777]">
            {isExport && (
              <>
                <div className="font-bold text-[12px] uppercase text-slate-700">LUT ARN No.: {invoice.lutArn || settings.business_lut_arn}</div>
                <div className="text-[11px] leading-snug mt-0.5">
                  Supply Meant for Export Under Bond of Letter of Understanding<br/>
                  without Payment of Integrated Tax (IGST)
                </div>
              </>
            )}
          </div>
        </div>

        {/* Sliced Address (INVOICE TO) */}
        <div className="mb-6 text-[#777777] relative z-10 leading-snug">
          <div className="font-bold text-[13.33px] uppercase mb-1">INVOICE TO</div>
          {(() => {
            const first = client?.firstName ? client.firstName.trim() : '';
            const last = client?.lastName ? client.lastName.trim() : '';
            const fullName = [first, last].filter(Boolean).join(' ').trim();
            const contactName = fullName || client?.contactPerson || '';

            return (
              <div className="sliced-address text-[13.33px]">
                {contactName && (
                  <div className="text-[#777777] font-medium">{contactName}</div>
                )}
                <div className="font-bold text-[#777777] uppercase">{client?.name || 'Client Name'}</div>
                <div className="text-[#777777] mt-0.5 whitespace-pre-line">
                  {client?.address || 'Address not specified'}
                </div>
                <div className="text-[#777777] mt-0.5">
                  State Code: {client?.stateCode || '24'} | GSTIN: {client?.gstin || 'N/A'}
                </div>
              </div>
            );
          })()}
        </div>

        {/* Place of Supply & 3-Block Payment Grid */}
        <div className="flex justify-between items-end relative z-10">
          <div className="w-[41%] text-[#777777] pb-3">
            <span className="font-bold text-[13.33px] uppercase block mb-0.5">PLACE OF SUPPLY</span>
            <span className="font-normal text-[13.33px] uppercase block">{client.state || 'GUJARAT'}</span>
          </div>
          <div className="w-[58%] text-right">
            <table className="w-full border-collapse">
              <tbody>
                <tr>
                  <td className="text-center w-1/3 align-middle" style={{ backgroundColor: '#2d424d', color: '#fff', height: '80px', padding: '15px 12px' }}>
                    <div className="text-[12px] font-bold uppercase tracking-wide">DATE</div>
                    <div className="text-[15px] font-normal mt-1">{formatDate(invoice.createdAt)}</div>
                  </td>
                  <td className="text-center w-1/3 align-middle" style={{ backgroundColor: themeBgHex, color: '#fff', height: '80px', padding: '15px 12px' }}>
                    <div className="text-[12px] font-bold uppercase tracking-wide">PLEASE PAY</div>
                    <div className="text-[15px] font-bold mt-1">
                      {currSym === '₹' ? 'INR' : currSym} {invoice.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                  </td>
                  <td className="text-center w-1/3 align-middle" style={{ backgroundColor: '#2d424d', color: '#fff', height: '80px', padding: '15px 12px' }}>
                    <div className="text-[12px] font-bold uppercase tracking-wide">DUE DATE</div>
                    <div className="text-[15px] font-normal mt-1">{formatDate(invoice.dueDate || invoice.createdAt)}</div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="flex-1 flex flex-col mb-4 relative z-10" style={{ minHeight: '320px' }}>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-t border-b border-[#2d424d] text-[#777777]">
                <th className="py-2 px-2 text-left font-bold text-[12px] w-8">NO</th>
                <th className="py-2 px-2 text-left font-bold text-[12px] w-16">HSN/SAC</th>
                <th className="py-2 px-2 text-left font-bold text-[12px]">DESCRIPTION</th>
                <th className="py-2 px-2 text-center font-bold text-[12px] w-12">UNIT</th>
                <th className="py-2 px-2 text-center font-bold text-[12px] w-16">HRS/QTY</th>
                <th className="py-2 px-2 text-right font-bold text-[12px] w-20">RATE</th>
                <th className="py-2 px-2 text-center font-bold text-[12px] w-12">TAX</th>
                <th className="py-2 px-2 text-right font-bold text-[12px] w-24">AMOUNT</th>
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
                  <span className="text-red-600 font-normal">- {invoice.discount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              
              <div className="mt-2 bg-[#2C3E50] text-white flex justify-between px-3 py-2 font-bold items-center">
                <span style={{ fontSize: '15px' }}>Total Due</span>
                <span style={{ fontSize: '18px' }}>
                  {currSym === '₹' ? 'INR' : currSym} {invoice.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Authorised Signatory */}
            <div className="text-right mt-2 text-[13.33px] text-[#777777] font-medium leading-relaxed">
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
                <div className="font-bold text-slate-800 uppercase text-[11.5px]">{settings.business_name}</div>
                <div className="whitespace-pre-line">{cleanAddress}</div>
                {cleanExtraInfo && (
                  <div className="font-semibold">{cleanExtraInfo}</div>
                )}
                <div className="text-slate-400 font-semibold uppercase mt-0.5">SUBJECT TO AHMEDABAD JURISDICATION</div>
              </div>
              <img src="/zero-logo.svg" alt="Zero Designs" className="h-10 w-auto" />
            </div>
          </footer>
        )}
      </div>
    </>
  );
}
