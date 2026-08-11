const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

function parseAmount(val) {
  if (!val) return 0;
  const cleaned = val.replace(/,/g, '').trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

async function fullResetAndImport() {
  console.log('--- STARTING COMPLETE RESET AND RE-IMPORT ---');

  // 1. Clear database completely
  await prisma.lineItem.deleteMany({});
  await prisma.invoice.deleteMany({});
  await prisma.client.deleteMany({});
  console.log('Cleared existing LineItems, Invoices, and Clients from database.');

  // 2. Parse user-export.csv
  const userCsvPath = 'C:\\Users\\Admin\'\\Desktop\\zero\\user-export.csv';
  const userFileContent = fs.readFileSync(userCsvPath, 'utf-8').replace(/^\uFEFF/, '');
  const userLines = userFileContent.split(/\r?\n/).filter(line => line.trim().length > 0);
  const userHeaders = parseCSVLine(userLines[0]);

  const emailIdx = userHeaders.indexOf('user_email');
  const firstNameIdx = userHeaders.indexOf('first_name');
  const lastNameIdx = userHeaders.indexOf('last_name');
  const businessIdx = userHeaders.indexOf('_sliced_client_business');
  const addressIdx = userHeaders.indexOf('_sliced_client_address');
  const stateIdx = userHeaders.indexOf('_sliced_client_state');
  const gstinIdx = userHeaders.indexOf('_sliced_client_extra_info');

  const clientMap = new Map(); // Key: businessName or email -> Client record

  let clientCount = 0;
  for (let i = 1; i < userLines.length; i++) {
    const cols = parseCSVLine(userLines[i]);
    if (cols.length < userHeaders.length) continue;

    const email = cols[emailIdx]?.trim() || '';
    const firstName = cols[firstNameIdx]?.trim() || '';
    const lastName = cols[lastNameIdx]?.trim() || '';
    const businessName = cols[businessIdx]?.trim() || '';
    const address = cols[addressIdx]?.trim() || '';
    const stateCode = cols[stateIdx]?.trim() || '24';
    const gstin = cols[gstinIdx]?.trim() || '';

    const contactPerson = [firstName, lastName].filter(Boolean).join(' ').trim();
    const finalName = businessName || contactPerson || email || `Client-${i}`;

    if (!finalName || finalName.startsWith('deleted-')) continue;

    try {
      const client = await prisma.client.create({
        data: {
          name: finalName,
          email: email || `${finalName.toLowerCase().replace(/[^a-z0-9]/g, '')}@client.com`,
          firstName: firstName || null,
          lastName: lastName || null,
          contactPerson: contactPerson || null,
          address: address || null,
          stateCode: stateCode || '24',
          gstin: gstin || null,
          state: stateCode === '24' ? 'GUJARAT' : 'OUTSIDE GUJARAT'
        }
      });

      clientMap.set(finalName.toLowerCase(), client);
      if (email) clientMap.set(email.toLowerCase(), client);
      clientCount++;
    } catch (err) {
      console.error(`Error creating client ${finalName}:`, err.message);
    }
  }
  console.log(`Successfully created ${clientCount} clients from user-export.csv`);

  // 3. Parse invoice-export-2026-07-22.csv
  const invCsvPath = 'C:\\Users\\Admin\'\\Desktop\\zero\\invoice-export-2026-07-22.csv';
  const invFileContent = fs.readFileSync(invCsvPath, 'utf-8').replace(/^\uFEFF/, '');
  const invLines = invFileContent.split(/\r?\n/).filter(line => line.trim().length > 0);
  const invHeaders = parseCSVLine(invLines[0]);

  const numIdx = invHeaders.indexOf('Number');
  const titleIdx = invHeaders.indexOf('Title');
  const invClientIdx = invHeaders.indexOf('Client');
  const invEmailIdx = invHeaders.indexOf('Client Email');
  const invAddrIdx = invHeaders.indexOf('Client Address');
  const invGstinIdx = invHeaders.indexOf('Client Extra Info');
  const statusIdx = invHeaders.indexOf('Status');
  const createdIdx = invHeaders.indexOf('Created');
  const subTotalIdx = invHeaders.indexOf('Sub Total');
  const taxIdx = invHeaders.indexOf('Tax');
  const totalIdx = invHeaders.indexOf('Total');

  let invoiceCount = 0;
  for (let i = 1; i < invLines.length; i++) {
    const cols = parseCSVLine(invLines[i]);
    if (cols.length < invHeaders.length) continue;

    const number = cols[numIdx]?.trim();
    if (!number) continue;

    const title = cols[titleIdx]?.trim() || '';
    const clientNameStr = cols[invClientIdx]?.trim() || '';
    const clientEmailStr = cols[invEmailIdx]?.trim() || '';
    const clientAddrStr = cols[invAddrIdx]?.trim() || '';
    const clientGstinStr = cols[invGstinIdx]?.trim() || '';
    const rawStatus = cols[statusIdx]?.trim() || 'Draft';
    const createdStr = cols[createdIdx]?.trim() || '';

    const subtotal = parseAmount(cols[subTotalIdx]);
    const tax = parseAmount(cols[taxIdx]);
    const totalAmount = parseAmount(cols[totalIdx]);

    // Map status
    let status = 'DRAFT';
    if (rawStatus.toLowerCase() === 'paid') status = 'PAID';
    else if (rawStatus.toLowerCase() === 'unpaid') status = 'UNPAID';
    else if (rawStatus.toLowerCase() === 'draft') status = 'DRAFT';

    // Find or create Client
    let client = clientMap.get(clientNameStr.toLowerCase()) || clientMap.get(clientEmailStr.toLowerCase());

    if (!client && clientNameStr) {
      const stateCode = clientGstinStr ? clientGstinStr.substring(0, 2) : '24';
      client = await prisma.client.create({
        data: {
          name: clientNameStr,
          email: clientEmailStr || `${clientNameStr.toLowerCase().replace(/[^a-z0-9]/g, '')}@client.com`,
          address: clientAddrStr || null,
          gstin: clientGstinStr || null,
          stateCode: stateCode,
          state: stateCode === '24' ? 'GUJARAT' : 'OUTSIDE GUJARAT'
        }
      });
      clientMap.set(clientNameStr.toLowerCase(), client);
      if (clientEmailStr) clientMap.set(clientEmailStr.toLowerCase(), client);
    }

    if (!client) continue;

    // Determine tax split
    const isLocal = client.stateCode === '24';
    const isExport = tax === 0 && !clientGstinStr && (clientAddrStr.includes('USA') || clientAddrStr.includes('UK') || clientAddrStr.includes('Australia') || clientAddrStr.includes('United States'));
    
    let cgst = 0;
    let sgst = 0;
    let igst = 0;

    if (!isExport && tax > 0) {
      if (isLocal) {
        cgst = tax / 2;
        sgst = tax / 2;
      } else {
        igst = tax;
      }
    }

    const createdDate = createdStr ? new Date(createdStr) : new Date();
    const validDate = isNaN(createdDate.getTime()) ? new Date() : createdDate;

    try {
      await prisma.invoice.create({
        data: {
          invoiceNumber: number,
          orderNumber: title || number,
          clientId: client.id,
          status: status,
          domesticExport: isExport ? 'Export' : 'Domestic',
          currency: isExport ? 'USD' : 'INR',
          currencySymbol: isExport ? '$' : '₹',
          subtotal: subtotal,
          cgst: cgst,
          sgst: sgst,
          igst: igst,
          discount: 0,
          totalAmount: totalAmount || (subtotal + tax),
          createdAt: validDate,
          dueDate: validDate,
          lineItems: {
            create: [
              {
                hsnSac: '998314',
                title: title || 'Professional Design Services',
                unit: '1',
                quantity: 1,
                amount: subtotal,
                adjustPercent: 0,
                taxable: tax > 0,
                taxRate: tax > 0 ? 18.0 : 0
              }
            ]
          }
        }
      });
      invoiceCount++;
    } catch (err) {
      console.error(`Error creating invoice ${number}:`, err.message);
    }
  }

  console.log(`Successfully imported ${invoiceCount} invoices from invoice-export-2026-07-22.csv`);
  console.log('--- RE-IMPORT COMPLETE ---');
}

fullResetAndImport()
  .then(() => prisma.$disconnect())
  .catch(err => {
    console.error(err);
    prisma.$disconnect();
  });
