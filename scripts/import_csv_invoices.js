const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Simple CSV parser supporting multiline quoted fields
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
  const filePath = `C:\\Users\\Admin'\\Desktop\\zero\\invoices_export_oldest (1).csv`;
  console.log(`Reading CSV from ${filePath}...`);
  const rawText = fs.readFileSync(filePath, 'utf-8');
  
  // Remove BOM if present
  const cleanText = rawText.startsWith('\uFEFF') ? rawText.slice(1) : rawText;
  const allRows = parseCSV(cleanText);

  if (allRows.length < 2) {
    console.log('No data rows found in CSV');
    return;
  }

  const headers = allRows[0].map(h => h.trim().replace(/^"|"$/g, ''));
  console.log('Headers:', headers);

  const dataRows = allRows.slice(1);
  console.log(`Parsed ${dataRows.length} data rows.`);

  // Get existing clients for fast matching
  const clients = await prisma.client.findMany();
  const clientMap = new Map();
  clients.forEach(c => {
    clientMap.set(c.name.toUpperCase().trim(), c.id);
    if (c.email) clientMap.set(c.email.toLowerCase().trim(), c.id);
  });

  let importedCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;

  for (const rowArr of dataRows) {
    if (rowArr.length < 5) continue; // empty line

    const row = {};
    headers.forEach((h, idx) => {
      row[h] = rowArr[idx] || '';
    });

    const invoiceNumber = String(row['Invoice No'] || '').trim();
    if (!invoiceNumber) { skippedCount++; continue; }

    const orderNumber = String(row['Order No'] || '').trim();
    const clientName = String(row['Client Name'] || 'Unknown Client').trim();
    const clientEmail = String(row['Client Email'] || '').trim().toLowerCase();
    const statusRaw = String(row['Status'] || 'DRAFT').trim().toUpperCase();
    const status = ['PAID', 'UNPAID', 'DRAFT', 'PROFORMA'].includes(statusRaw) ? statusRaw : 'DRAFT';
    const regionRaw = String(row['Region'] || 'Domestic').trim();
    const isExport = regionRaw === 'Export';
    const domesticExport = isExport ? 'Export' : 'Domestic';

    const createdAt = parseDate(row['Date']);
    const dueDate = row['Due Date'] ? parseDate(row['Due Date']) : new Date(createdAt.getTime() + 30 * 86400000);

    const taxAmount = parseAmount(row['Tax']);
    let totalAmount = parseAmount(row['Total Amount']);
    let subtotal = parseAmount(row['Sub Total']);

    if (!subtotal && totalAmount) {
      if (!isExport && taxAmount > 0) {
        subtotal = Math.round((totalAmount - (totalAmount * (taxAmount / 100))) * 100) / 100;
      } else {
        subtotal = totalAmount;
      }
    }
    if (!totalAmount) {
      totalAmount = subtotal + (subtotal * (taxAmount / 100));
    }

    const currency = isExport ? 'USD' : 'INR';
    const currencySymbol = isExport ? '$' : '₹';

    let cgst = 0, sgst = 0, igst = 0;
    if (!isExport && taxAmount > 0) {
      // Default Gujarat 9%+9%
      cgst = Math.round((subtotal * 0.09) * 100) / 100;
      sgst = Math.round((subtotal * 0.09) * 100) / 100;
    }

    // Match or create Client
    let clientId = clientMap.get(clientName.toUpperCase()) || (clientEmail ? clientMap.get(clientEmail) : null);

    if (!clientId) {
      const newClient = await prisma.client.create({
        data: {
          name: clientName,
          email: clientEmail || `${clientName.toLowerCase().replace(/[^a-z0-9]/g, '')}@client.com`,
          state: isExport ? 'Export' : 'Gujarat',
          stateCode: isExport ? '00' : '24',
        }
      });
      clientId = newClient.id;
      clientMap.set(clientName.toUpperCase(), clientId);
      if (clientEmail) clientMap.set(clientEmail, clientId);
    }

    const hsnSacRaw = String(row['HSN/SAC'] || '').trim();
    const hsnMatch = hsnSacRaw.match(/^(\d{4,8})/);
    const hsnSac = hsnMatch ? hsnMatch[1] : '998314';
    const title = hsnSacRaw || 'Services';
    const descriptionText = String(row['Description'] || '').trim();

    // Check if invoice exists
    const existing = await prisma.invoice.findFirst({
      where: { invoiceNumber }
    });

    if (existing) {
      // Update existing invoice
      await prisma.invoice.update({
        where: { id: existing.id },
        data: {
          orderNumber: orderNumber || existing.orderNumber,
          clientId,
          status,
          domesticExport,
          subtotal,
          cgst,
          sgst,
          igst,
          totalAmount,
          currency,
          currencySymbol,
          createdAt,
          dueDate,
        }
      });
      // Update line item description if present
      const firstLineItem = await prisma.lineItem.findFirst({
        where: { invoiceId: existing.id }
      });
      if (firstLineItem) {
        await prisma.lineItem.update({
          where: { id: firstLineItem.id },
          data: {
            hsnSac,
            title,
            description: descriptionText || firstLineItem.description,
            amount: subtotal,
          }
        });
      }
      updatedCount++;
    } else {
      // Create new invoice
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
          createdAt,
          dueDate,
          lineItems: {
            create: [{
              hsnSac,
              title,
              description: descriptionText,
              unit: '1',
              quantity: 1,
              amount: subtotal,
              adjustPercent: 0,
              taxable: !isExport && taxAmount > 0,
              taxRate: !isExport && taxAmount > 0 ? 18.0 : 0.0,
            }]
          }
        }
      });
      importedCount++;
    }
  }

  console.log(`\n🎉 IMPORT COMPLETED!`);
  console.log(`- New Invoices Created: ${importedCount}`);
  console.log(`- Existing Invoices Updated: ${updatedCount}`);
  console.log(`- Skipped/Blank: ${skippedCount}`);
}

main()
  .catch(e => console.error('Error importing:', e))
  .finally(async () => await prisma.$disconnect());
