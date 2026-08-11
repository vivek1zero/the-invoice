const fs = require('fs');
const readline = require('readline');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const STATE_CODES = {
  '01': 'Jammu & Kashmir',
  '02': 'Himachal Pradesh',
  '03': 'Punjab',
  '04': 'Chandigarh',
  '05': 'Uttarakhand',
  '06': 'Haryana',
  '07': 'Delhi',
  '08': 'Rajasthan',
  '09': 'Uttar Pradesh',
  '10': 'Bihar',
  '11': 'Sikkim',
  '12': 'Arunachal Pradesh',
  '13': 'Nagaland',
  '14': 'Manipur',
  '15': 'Mizoram',
  '16': 'Tripura',
  '17': 'Meghalaya',
  '18': 'Assam',
  '19': 'West Bengal',
  '20': 'Jharkhand',
  '21': 'Odisha',
  '22': 'Chhattisgarh',
  '23': 'Madhya Pradesh',
  '24': 'Gujarat',
  '25': 'Daman & Diu',
  '26': 'Dadra & Nagar Haveli',
  '27': 'Maharashtra',
  '29': 'Karnataka',
  '30': 'Goa',
  '31': 'Lakshadweep',
  '32': 'Kerala',
  '33': 'Tamil Nadu',
  '34': 'Puducherry',
  '35': 'Andaman & Nicobar',
  '36': 'Telangana',
  '37': 'Andhra Pradesh',
  '38': 'Ladakh'
};

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function generateOrderNumber(createdAtDate) {
  const century = String(createdAtDate.getFullYear()).slice(0, 2); // "20"
  const month = String(createdAtDate.getMonth() + 1).padStart(2, '0'); // "07"
  const date = String(createdAtDate.getDate()).padStart(2, '0'); // "22"
  
  const fiscalMonth = createdAtDate.getMonth();
  const startYear = fiscalMonth >= 3 ? createdAtDate.getFullYear() : createdAtDate.getFullYear() - 1;
  const endYear = startYear + 1;
  const startYearShort = String(startYear).slice(-2);
  const endYearShort = String(endYear).slice(-2);
  const fy = `${startYearShort}${endYearShort}`; // "2627"
  
  return `D${century}${fy}${month}${date}`;
}

async function reimport() {
  const csvPath = "C:\\Users\\Admin'\\Desktop\\zero\\invoice-export-2026-07-21.csv";
  console.log("Starting full reimport of invoices from:", csvPath);

  if (!fs.existsSync(csvPath)) {
    console.error("Error: CSV file not found at " + csvPath);
    return;
  }

  // 1. Clear existing Invoices & Line Items
  console.log("Clearing all existing invoices & line items...");
  await prisma.lineItem.deleteMany({});
  await prisma.invoice.deleteMany({});
  console.log("Database cleared successfully!");

  // Get active LUT ARN setting
  const dbSetting = await prisma.setting.findUnique({ where: { key: 'business_lut_arn' } });
  const defaultLutArn = dbSetting?.value || 'AD241225020914E';

  const fileStream = fs.createReadStream(csvPath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let lineCount = 0;
  let headers = [];
  let importCount = 0;

  for await (const line of rl) {
    lineCount++;
    if (lineCount === 1) {
      headers = parseCSVLine(line);
      continue;
    }

    if (!line.trim()) continue;

    const values = parseCSVLine(line);
    const row = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx] || '';
    });

    const invoiceNumber = row['Number'] ? row['Number'].trim().replace(/^"|"$/g, '') : '';
    const title = row['Title'] ? row['Title'].trim().replace(/^"|"$/g, '') : 'Services';
    const clientName = row['Client'] ? row['Client'].trim().replace(/^"|"$/g, '') : 'Default Client';
    const clientEmail = row['Client Email'] ? row['Client Email'].trim().replace(/^"|"$/g, '') : '';
    const clientAddress = row['Client Address'] ? row['Client Address'].trim().replace(/^"|"$/g, '') : '';
    const gstin = row['Client Extra Info'] ? row['Client Extra Info'].trim().replace(/^"|"$/g, '') : '';
    const statusValRaw = row['Status'] ? row['Status'].trim().replace(/^"|"$/g, '') : 'Draft';
    const createdStr = row['Created'] ? row['Created'].trim().replace(/^"|"$/g, '') : '';
    const subTotalStr = row['Sub Total'] || '0';
    const taxStr = row['Tax'] || '0';
    const totalStr = row['Total'] || '0';

    if (!invoiceNumber) continue;

    // Parse status
    let status = 'DRAFT';
    const statusLower = statusValRaw.toLowerCase().trim();
    if (statusLower === 'paid') status = 'PAID';
    else if (statusLower === 'unpaid') status = 'UNPAID';
    else if (statusLower === 'proforma') status = 'PROFORMA';
    else if (statusLower === 'draft') status = 'DRAFT';
    else status = 'UNPAID';

    // Parse numbers
    const subtotal = parseFloat(subTotalStr.replace(/,/g, '')) || 0;
    const tax = parseFloat(taxStr.replace(/,/g, '')) || 0;
    const totalAmount = parseFloat(totalStr.replace(/,/g, '')) || 0;

    // Parse date
    const createdAt = createdStr ? new Date(createdStr) : new Date();

    // Determine state and state code
    let stateCode = '24';
    let state = 'Gujarat';
    const gstinClean = gstin.trim();
    if (gstinClean.length >= 2 && /^\d+$/.test(gstinClean.slice(0, 2))) {
      stateCode = gstinClean.slice(0, 2);
      state = STATE_CODES[stateCode] || 'Gujarat';
    } else {
      const addrLower = clientAddress.toLowerCase();
      if (addrLower.includes('delhi')) {
        stateCode = '07';
        state = 'Delhi';
      } else if (addrLower.includes('maharashtra') || addrLower.includes('pune') || addrLower.includes('mumbai')) {
        stateCode = '27';
        state = 'Maharashtra';
      } else if (addrLower.includes('karnataka') || addrLower.includes('bangalore')) {
        stateCode = '29';
        state = 'Karnataka';
      } else if (addrLower.includes('rajasthan') || addrLower.includes('udaipur')) {
        stateCode = '08';
        state = 'Rajasthan';
      }
    }

    // Determine if it is export
    const isExport = stateCode === '00' || 
                    state.toLowerCase().includes('export') || 
                    state.toLowerCase().includes('foreign') || 
                    clientName.toLowerCase().includes('hospitality llc');

    const domesticExport = isExport ? 'Export' : 'Domestic';
    const currency = isExport ? 'USD' : 'INR';
    const currencySymbol = isExport ? '$' : '₹';
    const lutArn = isExport ? defaultLutArn : null;

    // Split taxes
    let cgst = 0;
    let sgst = 0;
    let igst = 0;

    if (!isExport) {
      if (stateCode === '24') {
        cgst = tax / 2;
        sgst = tax / 2;
        igst = 0;
      } else {
        cgst = 0;
        sgst = 0;
        igst = tax;
      }
    }

    try {
      // Find or create client
      let client = await prisma.client.findFirst({
        where: { name: clientName }
      });

      if (!client) {
        client = await prisma.client.create({
          data: {
            name: clientName,
            email: clientEmail || 'info@unisonglobus.com',
            state: isExport ? 'Export' : state,
            stateCode: isExport ? '00' : stateCode,
            gstin: gstinClean || null,
            address: clientAddress || null
          }
        });
      }

      // Generate dynamic orderNumber matching start/end FY year + dates
      const orderNumber = generateOrderNumber(createdAt);

      // Create Invoice & LineItem
      await prisma.invoice.create({
        data: {
          invoiceNumber,
          orderNumber,
          clientId: client.id,
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
          lutArn,
          createdAt,
          dueDate: new Date(createdAt.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 days due date default
          lineItems: {
            create: [
              {
                hsnSac: '998314',
                title,
                description: '',
                unit: '1',
                quantity: 1,
                amount: subtotal,
                adjustPercent: 0,
                taxable: !isExport && tax > 0,
                taxRate: (!isExport && tax > 0) ? 18.0 : 0.0
              }
            ]
          }
        }
      });

      importCount++;
      if (importCount % 100 === 0) {
        console.log(`Successfully imported ${importCount} invoices...`);
      }
    } catch (err) {
      console.error(`Error importing row ${lineCount} (${invoiceNumber}):`, err.message);
    }
  }

  console.log(`Reimport completed successfully! Total imported: ${importCount} invoices.`);
}

reimport()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
