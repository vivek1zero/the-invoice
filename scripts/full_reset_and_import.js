const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const STATE_CODES = {
  '01': 'Jammu & Kashmir', '02': 'Himachal Pradesh', '03': 'Punjab',
  '04': 'Chandigarh', '05': 'Uttarakhand', '06': 'Haryana', '07': 'Delhi', '7': 'Delhi',
  '08': 'Rajasthan', '09': 'Uttar Pradesh', '10': 'Bihar', '11': 'Sikkim',
  '12': 'Arunachal Pradesh', '13': 'Nagaland', '14': 'Manipur', '15': 'Mizoram',
  '16': 'Tripura', '17': 'Meghalaya', '18': 'Assam', '19': 'West Bengal',
  '20': 'Jharkhand', '21': 'Odisha', '22': 'Chhattisgarh', '23': 'Madhya Pradesh',
  '24': 'Gujarat', '25': 'Daman & Diu', '26': 'Dadra & Nagar Haveli',
  '27': 'Maharashtra', '29': 'Karnataka', '30': 'Goa', '31': 'Lakshadweep',
  '32': 'Kerala', '33': 'Tamil Nadu', '34': 'Puducherry', '35': 'Andaman & Nicobar',
  '36': 'Telangana', '37': 'Andhra Pradesh', '38': 'Ladakh', '00': 'Export', '0': 'Export'
};

// Robust CSV parser handling multiline values inside quotes
function parseCSV(text) {
  const lines = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        row.push(field);
        field = '';
      } else if (char === '\r') {
        // Ignore CR
      } else if (char === '\n') {
        row.push(field);
        lines.push(row);
        row = [];
        field = '';
      } else {
        field += char;
      }
    }
  }
  if (field || row.length > 0) {
    row.push(field);
    lines.push(row);
  }
  return lines;
}

function parseAmount(val) {
  if (!val) return 0;
  return parseFloat(String(val).replace(/,/g, '').replace(/[₹$]/g, '').trim()) || 0;
}

function parseDate(val) {
  if (!val) return new Date();
  const str = String(val).trim();
  const d = new Date(str);
  if (!isNaN(d.getTime())) return d;
  return new Date();
}

async function main() {
  console.log('🚀 STARTING COMPLETE RE-IMPORT WORKFLOW...\n');

  // STEP 1: CLEAN RESET OF ALL DATA
  console.log('1. Cleaning database tables...');
  await prisma.lineItem.deleteMany({});
  await prisma.invoice.deleteMany({});
  await prisma.client.deleteMany({});
  console.log('✔ Database reset complete!\n');

  // STEP 2: IMPORT CLIENTS FROM user-export (2).csv
  const clientsFile = `C:\\Users\\Admin'\\Desktop\\zero\\user-export (2).csv`;
  console.log(`2. Reading Clients from ${clientsFile}...`);
  const rawClients = fs.readFileSync(clientsFile, 'utf-8');
  const cleanClientsText = rawClients.startsWith('\uFEFF') ? rawClients.slice(1) : rawClients;
  const clientRows = parseCSV(cleanClientsText);
  
  const clientHeaders = clientRows[0].map(h => h.trim().replace(/^"|"$/g, ''));
  const clientDataRows = clientRows.slice(1);

  const clientMap = new Map(); // Name -> id, Email -> id
  let importedClients = 0;

  for (const rArr of clientDataRows) {
    if (rArr.length < 3) continue;
    const r = {};
    clientHeaders.forEach((h, i) => r[h] = rArr[i] || '');

    const name = String(r['_sliced_client_business'] || r['display_name'] || r['user_login'] || '').trim();
    if (!name) continue;

    const email = String(r['user_email'] || '').trim().toLowerCase();
    const address = String(r['_sliced_client_address'] || '').trim();
    const stateCode = String(r['_sliced_client_state'] || '24').trim();
    const gstin = String(r['_sliced_client_extra_info'] || '').trim();

    const firstName = String(r['first_name'] || '').trim();
    const lastName = String(r['last_name'] || '').trim();
    const contactPerson = String(r['nickname'] || `${firstName} ${lastName}`).trim();

    const state = STATE_CODES[stateCode] || (stateCode === '0' ? 'Export' : 'Gujarat');

    // Skip duplicate client name if already created
    if (clientMap.has(name.toUpperCase())) continue;

    try {
      const createdClient = await prisma.client.create({
        data: {
          name,
          email: email || `${name.toLowerCase().replace(/[^a-z0-9]/g, '')}@client.com`,
          contactPerson: contactPerson || null,
          firstName: firstName || null,
          lastName: lastName || null,
          address: address || null,
          state,
          stateCode,
          gstin: gstin || null,
        }
      });
      clientMap.set(name.toUpperCase(), createdClient.id);
      if (email) clientMap.set(email, createdClient.id);
      importedClients++;
    } catch (err) {
      console.error(`Error creating client ${name}:`, err.message);
    }
  }

  console.log(`✔ Imported ${importedClients} Clients successfully!\n`);

  // STEP 3: READ INVOICE DATA FROM BOTH CSV FILES
  const invExportFile = `C:\\Users\\Admin'\\Desktop\\zero\\invoice-export-2026-08-20.csv`;
  const invOldestFile = `C:\\Users\\Admin'\\Desktop\\zero\\invoices_export_oldest.csv`;

  console.log(`3. Reading Invoice Statuses & Dates from ${invExportFile}...`);
  const invExportText = fs.readFileSync(invExportFile, 'utf-8');
  const cleanInvExport = invExportText.startsWith('\uFEFF') ? invExportText.slice(1) : invExportText;
  const invExportRows = parseCSV(cleanInvExport);
  const invExportHeaders = invExportRows[0].map(h => h.trim().replace(/^"|"$/g, ''));
  
  const invMap = new Map(); // Invoice No -> Merged Object

  for (const rArr of invExportRows.slice(1)) {
    if (rArr.length < 3) continue;
    const r = {};
    invExportHeaders.forEach((h, i) => r[h] = rArr[i] || '');

    const number = String(r['Number'] || '').trim();
    if (!number) continue;

    const statusRaw = String(r['Status'] || 'Draft').trim().toUpperCase();
    let status = 'DRAFT';
    if (statusRaw === 'PAID') status = 'PAID';
    else if (statusRaw === 'UNPAID' || statusRaw === 'OVERDUE') status = 'UNPAID';
    else if (statusRaw === 'PROFORMA') status = 'PROFORMA';
    else if (statusRaw === 'CANCELLED' || statusRaw === 'CANCEL') status = 'CANCELLED';
    else status = 'DRAFT';

    invMap.set(number, {
      invoiceNumber: number,
      title: String(r['Title'] || '').trim(),
      clientName: String(r['Client'] || '').trim(),
      clientEmail: String(r['Client Email'] || '').trim().toLowerCase(),
      clientAddress: String(r['Client Address'] || '').trim(),
      gstin: String(r['Client Extra Info'] || '').trim(),
      status,
      createdAt: parseDate(r['Created']),
      subtotal: parseAmount(r['Sub Total']),
      tax: parseAmount(r['Tax']),
      totalAmount: parseAmount(r['Total']),
    });
  }

  console.log(`4. Reading Line Items & Descriptions from ${invOldestFile}...`);
  const invOldestText = fs.readFileSync(invOldestFile, 'utf-8');
  const cleanInvOldest = invOldestText.startsWith('\uFEFF') ? invOldestText.slice(1) : invOldestText;
  const invOldestRows = parseCSV(cleanInvOldest);
  const invOldestHeaders = invOldestRows[0].map(h => h.trim().replace(/^"|"$/g, ''));

  for (const rArr of invOldestRows.slice(1)) {
    if (rArr.length < 3) continue;
    const r = {};
    invOldestHeaders.forEach((h, i) => r[h] = rArr[i] || '');

    const number = String(r['Invoice No'] || '').trim();
    if (!number) continue;

    let existing = invMap.get(number);
    if (!existing) {
      existing = {
        invoiceNumber: number,
        title: '',
        clientName: String(r['Client Name'] || '').trim(),
        clientEmail: String(r['Client Email'] || '').trim().toLowerCase(),
        clientAddress: '',
        gstin: '',
        status: String(r['Status'] || 'DRAFT').trim().toUpperCase(),
        createdAt: parseDate(r['Date']),
        subtotal: parseAmount(r['Sub Total']),
        tax: parseAmount(r['Tax']),
        totalAmount: parseAmount(r['Total Amount']),
      };
      invMap.set(number, existing);
    }

    existing.orderNumber = String(r['Order No'] || '').trim();
    existing.dueDate = r['Due Date'] ? parseDate(r['Due Date']) : null;
    existing.region = String(r['Region'] || 'Domestic').trim();
    existing.hsnSac = String(r['HSN/SAC'] || '').trim();
    existing.description = String(r['Description'] || '').trim();
  }

  console.log(`✔ Combined ${invMap.size} total Invoices to import!\n`);

  // STEP 4: CREATE ALL INVOICES & LINE ITEMS IN DATABASE
  console.log('5. Inserting Invoices into Database...');
  let importedInvoices = 0;
  let skippedInvoices = 0;

  for (const [invNum, invData] of invMap.entries()) {
    try {
      // Find or create Client
      let clientId = clientMap.get(invData.clientName.toUpperCase()) || (invData.clientEmail ? clientMap.get(invData.clientEmail) : null);

      if (!clientId && invData.clientName) {
        const newClient = await prisma.client.create({
          data: {
            name: invData.clientName,
            email: invData.clientEmail || `${invData.clientName.toLowerCase().replace(/[^a-z0-9]/g, '')}@client.com`,
            address: invData.clientAddress || null,
            state: invData.region === 'Export' ? 'Export' : 'Gujarat',
            stateCode: invData.region === 'Export' ? '00' : '24',
            gstin: invData.gstin || null,
          }
        });
        clientId = newClient.id;
        clientMap.set(invData.clientName.toUpperCase(), clientId);
        if (invData.clientEmail) clientMap.set(invData.clientEmail, clientId);
      }

      if (!clientId) {
        skippedInvoices++;
        continue;
      }

      const isExport = invData.region === 'Export' || invData.currency === 'USD';
      const domesticExport = isExport ? 'Export' : 'Domestic';
      const currency = isExport ? 'USD' : 'INR';
      const currencySymbol = isExport ? '$' : '₹';

      let subtotal = invData.subtotal;
      let totalAmount = invData.totalAmount;
      let tax = invData.tax;

      if (!subtotal && totalAmount) {
        if (!isExport && tax > 0) {
          subtotal = Math.round((totalAmount / 1.18) * 100) / 100;
        } else {
          subtotal = totalAmount;
        }
      }
      if (!totalAmount) {
        totalAmount = subtotal + tax;
      }

      // GST Calculation
      let cgst = 0, sgst = 0, igst = 0;
      if (!isExport && tax > 0) {
        const clientObj = await prisma.client.findUnique({ where: { id: clientId } });
        const stateCode = clientObj?.stateCode || '24';
        if (stateCode === '24') {
          cgst = Math.round((tax / 2) * 100) / 100;
          sgst = Math.round((tax / 2) * 100) / 100;
        } else {
          igst = tax;
        }
      }

      const dueDate = invData.dueDate || new Date(invData.createdAt.getTime() + 30 * 86400000);
      const hsnMatch = invData.hsnSac ? invData.hsnSac.match(/^(\d{4,8})/) : null;
      const hsnSac = hsnMatch ? hsnMatch[1] : '998314';
      const itemTitle = invData.hsnSac || invData.title || 'Services';

      await prisma.invoice.create({
        data: {
          invoiceNumber: invNum,
          orderNumber: invData.orderNumber || null,
          clientId,
          status: invData.status,
          domesticExport,
          subtotal,
          cgst,
          sgst,
          igst,
          discount: 0,
          totalAmount,
          currency,
          currencySymbol,
          createdAt: invData.createdAt,
          dueDate,
          lineItems: {
            create: [{
              hsnSac,
              title: itemTitle,
              description: invData.description || '',
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
      importedInvoices++;
    } catch (err) {
      console.error(`Error importing invoice ${invNum}:`, err.message);
      skippedInvoices++;
    }
  }

  console.log(`\n🎉 FULL RE-IMPORT SUCCESSFUL!`);
  console.log(`- Clients Created: ${importedClients}`);
  console.log(`- Invoices Created: ${importedInvoices}`);
  console.log(`- Skipped: ${skippedInvoices}`);
}

main()
  .catch(e => console.error('Import error:', e))
  .finally(async () => await prisma.$disconnect());
