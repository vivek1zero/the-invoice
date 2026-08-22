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
        style={{ fontFamily: "'Montserrat', sans-serif", letterSpacing: 'normal' }}
        className="bg-white text-slate-800 pt-14 pb-6 px-8 max-w-[850px] mx-auto relative text-sm overflow-hidden flex flex-col min-h-[1050px]"
      >
        {/* Dynamic Printing Script */}
        <TriggerPrint />

        {/* Central Background Watermark (zero-symbol) - ONLY shown on Full Digital PDF (isStationery = false) */}
        {!isStationery && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-0 opacity-[0.05]">
            <img src="/zero-symbol-1.svg" alt="Watermark" className="w-[480px] h-[480px] object-contain" />
          </div>
        )}

        {/* Top Header: Red www.zerodesigns.in box touching top right edge of PDF */}
        {!isStationery ? (
          <div className="absolute top-0 right-[24px] z-20 flex flex-col items-center">
            <div className="bg-[#E94444] text-white px-4 py-1.5 text-[13.5px] font-bold rounded-none whitespace-nowrap text-center">
              www.zerodesigns.in
            </div>
            <div className="text-[13px] text-[#777777] font-normal uppercase text-center pt-[5px] mt-0.5">
              ORIGINAL FOR RECIPIENT
            </div>
          </div>
        ) : (
          <div className="absolute top-4 right-[24px] z-20 text-[13px] text-[#777777] font-normal uppercase text-center pt-[5px]">
            ORIGINAL FOR RECIPIENT
          </div>
        )}

        {/* Main Content Area */}
        <div className="relative z-10 pt-2 flex-1 flex flex-col">

          {/* Red/Green Tax Invoice Title | Order Number */}
          <div className="mb-6 flex justify-between items-center pr-48">
            <h1 className="text-[20px] font-bold tracking-tight" style={{ color: themeTextHex }}>
              {isProforma ? 'Proforma Invoice' : 'Tax Invoice'} | {invoice.orderNumber || invoice.invoiceNumber}
            </h1>
            {isExport && (
              <div className="text-right">
                <span className="text-[12px] font-bold text-slate-700 uppercase block">
                  LUT ARN No.: {invoice.lutArn || settings.business_lut_arn} ({lutValidity})
                </span>
              </div>
            )}
          </div>

          {/* Invoice To */}
          {(() => {
            const first = client?.firstName ? client.firstName.trim() : '';
            const last = client?.lastName ? client.lastName.trim() : '';
            const fullName = [first, last].filter(Boolean).join(' ').trim();
            const contactName = fullName || client?.contactPerson || '';

            return (
              <div className="mb-6 font-medium text-[#777777]">
                <div className="text-[13.33px] uppercase font-bold mb-0.5" style={{ color: '#777777' }}>INVOICE TO</div>
                {contactName && (
                  <div className="text-slate-800 text-[13px] font-medium mb-1">{contactName}</div>
                )}
                <div className="font-bold text-[13.33px]" style={{ color: '#777777' }}>{client?.name || 'Client Name'}</div>
                <div className="text-[#777777] leading-normal text-[13px] mt-0.5 whitespace-pre-line max-w-[500px]">
                  {client?.address || 'Address not specified'}
                </div>
                <div className="text-[#777777] text-[13px] mt-0.5">
                  State Code: {client?.stateCode || '24'} | GSTIN: {client?.gstin || 'N/A'}
                </div>
              </div>
            );
          })()}

          {/* Place of Supply & 3-Block Payment Box */}
          <div className="flex justify-between items-start mb-2">
            <div className="font-medium pb-2">
              <div className="text-[#777777] uppercase font-bold text-[13px] mb-0.5">PLACE OF SUPPLY</div>
              <div className="font-medium text-[#777777] text-[13px] uppercase">{client.state || 'GUJARAT'}</div>
            </div>
            <div className="w-full max-w-[440px]">
              <div className="grid grid-cols-3 text-left overflow-hidden text-[12.5px]">
                {/* DATE Block */}
                <div className="bg-[#2C3E50] text-white py-2.5 px-1 font-bold text-left" style={{ padding: '15px 12px' }}>
                  DATE<br />
                  <span className="text-white text-[16px] font-medium inline-block mt-0.5" style={{ fontSize: '16px' }}>{formatDate(invoice.createdAt)}</span>
                </div>
                {/* PLEASE PAY Block */}
                <div className="text-white py-2.5 px-1 font-bold text-left flex flex-col justify-center" style={{ backgroundColor: themeBgHex, padding: '15px 12px' }}>
                  <span className="whitespace-nowrap">PLEASE PAY</span>
                  <span className="text-white text-[16px] font-bold inline-block mt-0.5 whitespace-nowrap" style={{ fontSize: '16px' }}>
                    {currSym} {invoice.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                {/* DUE DATE Block */}
                <div className="bg-[#2C3E50] text-white py-2.5 px-1 font-bold text-left" style={{ padding: '15px 12px' }}>
                  DUE DATE<br />
                  <span className="text-white text-[16px] font-medium inline-block mt-0.5" style={{ fontSize: '16px' }}>{formatDate(invoice.dueDate || invoice.createdAt)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="flex-1 flex flex-col mb-0">
            <div className="flex-1 flex flex-col min-h-[300px]">
              <table className="w-full text-left border-collapse text-[13px]">
                <thead>
                  <tr className="border-b border-t border-[#2d424d] text-[#777777] font-bold uppercase">
                    <th className="py-3 px-2 text-center w-8">NO</th>
                    <th className="py-3 px-2 w-20">HSN/SAC</th>
                    <th className="py-3 px-2">DESCRIPTION</th>
                    <th className="py-3 px-2 text-center w-12">UNIT</th>
                    <th className="py-3 px-2 text-center w-16">HRS/QTY</th>
                    <th className="py-3 px-2 text-right w-20">RATE</th>
                    <th className="py-3 px-2 text-right w-20 whitespace-nowrap">TAX</th>
                    <th className="py-3 px-2 text-right w-24">AMOUNT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-[#777777] font-medium">
                  {lineItems.map((item, idx) => (
                    <tr key={item.id} className="align-top">
                      <td className="py-3.5 px-2 text-center font-medium">{idx + 1}</td>
                      <td className="py-3.5 px-2 text-[#777777]">{item.hsnSac || '998314'}</td>
                      <td className="py-3.5 px-2">
                        <div className="text-[#777777] font-medium leading-relaxed text-[13px] whitespace-pre-line">
                          {decodeHtmlEntities(item.description || item.title || 'Services')}
                        </div>
                      </td>
                      <td className="py-3.5 px-2 text-center">{item.unit || '1'}</td>
                      <td className="py-3.5 px-2 text-center">{item.quantity}</td>
                      <td className="py-3.5 px-2 text-right">
                        {isExport ? '$ ' : ''}{item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-2 text-right whitespace-nowrap">
                        {item.taxable ? `${item.taxRate}% GST` : '0%'}
                      </td>
                      <td className="py-3.5 px-2 text-right font-medium text-[#777777]">
                        {isExport ? '$ ' : ''}{(item.quantity * item.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Bottom border line */}
            <div className="border-b border-[#2d424d] w-full" />
          </div>

          {/* Financial Summary & Bank Details Grid */}
          <div className="grid grid-cols-12 gap-6 pt-2">
            
            {/* Left Side: Bank Details */}
            <div className="col-span-7 space-y-3">
              <div>
                <div className="font-bold text-slate-700 text-[12px] mb-0.5">Bank Details:</div>
                <div className="text-[11.5px] text-slate-600 leading-normal whitespace-pre-line font-medium">
                  {cleanBankDetail}
                </div>
              </div>

              <div>
                <div className="font-bold text-slate-700 text-[12px] mb-0.5">For, US Dollar Remittances - USD</div>
                <div className="text-[11.5px] text-slate-600 leading-normal font-medium">
                  Correspondent Bank Details<br />
                  J P MORGAN CHASE BANK,NEW YORK.<br />
                  US SWIFT Code: CHASUS33XXX
                </div>
              </div>
            </div>

            {/* Right Side: Totals & Signature */}
            <div className="col-span-5 flex flex-col justify-between items-end text-right">
              {/* Subtotals */}
              <div className="w-full space-y-1 text-[13px] text-[#777777]">
                <div className="flex justify-between uppercase">
                  <span className="font-bold">SUB TOTAL</span>
                  <span className="font-medium text-[#777777]">
                    {invoice.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {invoice.cgst > 0 && (
                  <div className="flex justify-between uppercase">
                    <span className="font-bold">CGST @ 9% on {invoice.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    <span className="font-medium text-[#777777]">
                      {invoice.cgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}

                {invoice.sgst > 0 && (
                  <div className="flex justify-between uppercase">
                    <span className="font-bold">SGST @ 9% on {invoice.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    <span className="font-medium text-[#777777]">
                      {invoice.sgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}

                {invoice.igst > 0 && (
                  <div className="flex justify-between uppercase">
                    <span className="font-bold">IGST @ 18% on {invoice.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    <span className="font-medium text-[#777777]">
                      {invoice.igst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}

                {invoice.discount > 0 && (
                  <div className="flex justify-between uppercase">
                    <span className="font-bold">Discount</span>
                    <span className="font-medium text-red-600">
                      - {invoice.discount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}

                {/* Total Due Row */}
                <div className="bg-[#2C3E50] text-white flex justify-between items-center px-4 py-2.5 text-sm font-bold rounded-none mt-2">
                  <span>Total Due</span>
                  <span style={{ fontSize: '1.2rem' }}>
                    {currSym} {invoice.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Authorised Signatory Box */}
              <div className="mt-3 flex flex-col items-end text-right">
                <span className="text-[11px] text-slate-400 font-semibold uppercase mb-0.5">
                  THANKYOU.
                </span>
                <span className="text-[11.5px] text-slate-600 font-medium mb-0.5">
                  For Zero Designs Private Limited
                </span>
                
                {/* Scanned Signature (Hidden when isStationery is true) */}
                <div className="h-9 my-0.5 relative w-32 flex items-center justify-end">
                  {!isStationery ? (
                    <img src="/signature.svg" alt="Authorised Signature" className="h-9 w-auto object-contain" />
                  ) : (
                    <div className="h-9 w-full" />
                  )}
                </div>
                
                <span className="text-[11px] text-slate-500 pt-0.5 w-32 text-center font-medium">
                  Authorised Signatory
                </span>
              </div>

            </div>
          </div>

        </div>

        {/* Footer Info & Zero Designs Logo (Hidden when isStationery is true) */}
        {!isStationery ? (
          <footer className="mt-3 pt-2 flex justify-end items-start text-[10.5px] text-slate-500 relative z-10">
            <div className="flex items-start gap-3 text-right">
              <div className="space-y-0.5">
                <div className="font-bold text-slate-800 uppercase text-[11.5px]">{settings.business_name}</div>
                <div className="whitespace-pre-line leading-tight text-slate-500 text-[10.5px]">{cleanAddress}</div>
                {cleanExtraInfo && (
                  <div className="font-semibold text-slate-500 whitespace-pre-line text-[10.5px]">{cleanExtraInfo}</div>
                )}
                <div className="text-slate-400 font-semibold uppercase mt-0.5 text-[10.5px]">SUBJECT TO AHMEDABAD JURISDICATION</div>
              </div>
              <div className="flex-shrink-0 mt-0.5">
                <img src="/zero-logo.svg" alt="Zero Designs Logo" className="h-10 w-auto" />
              </div>
            </div>
          </footer>
        ) : (
          <div className="h-10 print:h-10 relative z-10" />
        )}

      </div>
    </>
  );
}
