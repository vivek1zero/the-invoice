import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

const STATE_CODES = {
  '01': 'Jammu & Kashmir', '02': 'Himachal Pradesh', '03': 'Punjab',
  '04': 'Chandigarh', '05': 'Uttarakhand', '06': 'Haryana', '07': 'Delhi',
  '08': 'Rajasthan', '09': 'Uttar Pradesh', '10': 'Bihar', '11': 'Sikkim',
  '12': 'Arunachal Pradesh', '13': 'Nagaland', '14': 'Manipur', '15': 'Mizoram',
  '16': 'Tripura', '17': 'Meghalaya', '18': 'Assam', '19': 'West Bengal',
  '20': 'Jharkhand', '21': 'Odisha', '22': 'Chhattisgarh', '23': 'Madhya Pradesh',
  '24': 'Gujarat', '25': 'Daman & Diu', '26': 'Dadra & Nagar Haveli',
  '27': 'Maharashtra', '29': 'Karnataka', '30': 'Goa', '31': 'Lakshadweep',
  '32': 'Kerala', '33': 'Tamil Nadu', '34': 'Puducherry', '35': 'Andaman & Nicobar',
  '36': 'Telangana', '37': 'Andhra Pradesh', '38': 'Ladakh', '00': 'Export'
};

function getStateFromGSTIN(gstin) {
  if (!gstin || gstin.length < 2) return { state: 'Gujarat', stateCode: '24' };
  const code = gstin.substring(0, 2);
  return {
    state: STATE_CODES[code] || 'Gujarat',
    stateCode: code
  };
}

function parseAmount(val) {
  if (!val) return 0;
  return parseFloat(String(val).replace(/,/g, '').replace(/[₹$]/g, '').trim()) || 0;
}

function parseDate(val) {
  if (!val) return new Date();
  // Excel serial date number
  if (typeof val === 'number') {
    // Excel dates are days since 1900-01-01 (with a leap year bug)
    const excelEpoch = new Date(1899, 11, 30);
    return new Date(excelEpoch.getTime() + val * 86400000);
  }
  // String date
  const formats = [
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, // DD/MM/YYYY or MM/DD/YYYY
    /^(\d{4})-(\d{2})-(\d{2})$/, // YYYY-MM-DD
  ];
  const str = String(val).trim();
  // Try native parse first
  const d = new Date(str);
  if (!isNaN(d.getTime())) return d;
  return new Date();
}

function generateOrderNumber(date) {
  const dt = date instanceof Date ? date : new Date(date);
  const century = String(dt.getFullYear()).slice(0, 2);
  const month = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  const fiscalMonth = dt.getMonth();
  const startYear = fiscalMonth >= 3 ? dt.getFullYear() : dt.getFullYear() - 1;
  const endYear = startYear + 1;
  const fy = `${String(startYear).slice(-2)}${String(endYear).slice(-2)}`;
  return `D${century}${fy}${month}${day}`;
}

// POST /api/invoices/import — receives parsed rows from client, imports them
export async function POST(request) {
  try {
    const body = await request.json();
    const { rows } = body;

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'No rows provided' }, { status: 400 });
    }

    // Fetch LUT ARN from settings
    const lutSetting = await prisma.setting.findUnique({ where: { key: 'business_lut_arn' } });
    const defaultLutArn = lutSetting?.value || 'AD241225020914E';

    // Fetch all existing clients for matching
    const existingClients = await prisma.client.findMany();
    const clientMap = new Map();
    existingClients.forEach(c => {
      clientMap.set(c.name.toUpperCase().trim(), c.id);
      if (c.email) clientMap.set(c.email.toLowerCase().trim(), c.id);
    });

    let imported = 0;
    let skipped = 0;
    const errors = [];

    for (const row of rows) {
      try {
        const invoiceNumber = String(row['Invoice No'] || row['Number'] || '').trim();
        if (!invoiceNumber) { skipped++; continue; }

        // Check duplicate
        const existing = await prisma.invoice.findFirst({ where: { invoiceNumber } });
        if (existing) { skipped++; continue; }

        const clientName = String(row['Client'] || row['Client Name'] || '').trim();
        const clientEmail = String(row['Client Email'] || row['Email'] || '').trim().toLowerCase();
        const clientAddress = String(row['Client Address'] || row['Address'] || '').trim();
        const gstin = String(row['GSTIN'] || row['GST'] || row['Client Extra Info'] || '').trim();
        const statusRaw = String(row['Status'] || 'DRAFT').trim().toUpperCase();
        const status = ['PAID', 'UNPAID', 'DRAFT', 'PROFORMA'].includes(statusRaw) ? statusRaw : 'DRAFT';

        const dateRaw = row['Date'] || row['Created'] || row['Invoice Date'] || '';
        const createdAt = parseDate(dateRaw);
        const dueDateRaw = row['Due Date'] || '';
        const dueDate = dueDateRaw ? parseDate(dueDateRaw) : new Date(createdAt.getTime() + 30 * 86400000);

        const subtotal = parseAmount(row['Sub Total'] || row['Subtotal'] || '0');
        const tax = parseAmount(row['Tax'] || '0');
        const totalAmount = parseAmount(row['Total'] || row['Total Amount'] || String(subtotal + tax));
        const orderNumber = String(row['Order No'] || row['Order Number'] || '').trim() || generateOrderNumber(createdAt);

        const regionRaw = String(row['Region'] || row['Domestic/Export'] || '').trim();
        const isExport = regionRaw === 'Export' ||
          !gstin || gstin === '' ||
          (gstin.length < 15) ||
          ['US', 'UK', 'United States', 'United Kingdom', 'Australia'].some(c =>
            clientAddress.toUpperCase().includes(c.toUpperCase())
          );

        const domesticExport = isExport ? 'Export' : 'Domestic';
        const currency = isExport ? 'USD' : 'INR';
        const currencySymbol = isExport ? '$' : '₹';
        const { state, stateCode } = getStateFromGSTIN(gstin);

        // CGST/SGST/IGST split
        let cgst = 0, sgst = 0, igst = 0;
        if (!isExport && tax > 0) {
          if (stateCode === '24') { cgst = tax / 2; sgst = tax / 2; }
          else { igst = tax; }
        }

        // Find or create client
        let clientId = clientMap.get(clientName.toUpperCase()) || clientMap.get(clientEmail);

        if (!clientId && clientName) {
          const newClient = await prisma.client.create({
            data: {
              name: clientName,
              email: clientEmail || null,
              address: clientAddress || null,
              state: isExport ? 'Export' : state,
              stateCode: isExport ? '00' : stateCode,
              gstin: gstin || null,
            }
          });
          clientId = newClient.id;
          clientMap.set(clientName.toUpperCase(), clientId);
          if (clientEmail) clientMap.set(clientEmail, clientId);
        }

        if (!clientId) { skipped++; errors.push(`No client for ${invoiceNumber}`); continue; }

        // Title for line item
        const title = String(row['Title'] || row['Description'] || row['Invoice No'] || 'Services').trim();

        await prisma.invoice.create({
          data: {
            invoiceNumber,
            orderNumber,
            clientId,
            status,
            domesticExport,
            subtotal,
            cgst,
            sgst,
            igst,
            discount: 0,
            totalAmount,
            currency,
            currencySymbol,
            lutArn: isExport ? defaultLutArn : null,
            createdAt,
            dueDate,
            lineItems: {
              create: [{
                hsnSac: '998314',
                title,
                description: '',
                unit: '1',
                quantity: 1,
                amount: subtotal,
                adjustPercent: 0,
                taxable: !isExport && tax > 0,
                taxRate: !isExport && tax > 0 ? 18.0 : 0.0,
              }]
            }
          }
        });

        imported++;
      } catch (err) {
        errors.push(`Row error: ${err.message}`);
        skipped++;
      }
    }

    return NextResponse.json({ imported, skipped, errors: errors.slice(0, 20) });
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json({ error: 'Import failed: ' + error.message }, { status: 500 });
  }
}
