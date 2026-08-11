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

async function syncClients() {
  const csvPath = 'C:\\Users\\Admin\'\\Desktop\\zero\\user-export.csv';
  if (!fs.existsSync(csvPath)) {
    console.error('CSV file not found at:', csvPath);
    return;
  }

  const fileContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = fileContent.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length === 0) return;

  const headers = parseCSVLine(lines[0]);
  const emailIdx = headers.indexOf('user_email');
  const firstNameIdx = headers.indexOf('first_name');
  const lastNameIdx = headers.indexOf('last_name');
  const businessIdx = headers.indexOf('_sliced_client_business');
  const addressIdx = headers.indexOf('_sliced_client_address');
  const stateIdx = headers.indexOf('_sliced_client_state');
  const gstinIdx = headers.indexOf('_sliced_client_extra_info');

  console.log(`Indices -> Email: ${emailIdx}, First: ${firstNameIdx}, Last: ${lastNameIdx}, Business: ${businessIdx}, Address: ${addressIdx}, State: ${stateIdx}, GSTIN: ${gstinIdx}`);

  let count = 0;
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    if (cols.length < headers.length) continue;

    const email = cols[emailIdx]?.trim() || '';
    const firstName = cols[firstNameIdx]?.trim() || '';
    const lastName = cols[lastNameIdx]?.trim() || '';
    const businessName = cols[businessIdx]?.trim() || '';
    const address = cols[addressIdx]?.trim() || '';
    const stateCode = cols[stateIdx]?.trim() || '24';
    const gstin = cols[gstinIdx]?.trim() || '';

    const contactPerson = [firstName, lastName].filter(Boolean).join(' ').trim();
    const finalName = businessName || contactPerson || email || `Client-${i}`;

    if (!finalName) continue;

    try {
      const existing = await prisma.client.findFirst({
        where: {
          OR: [
            { name: finalName },
            ...(email ? [{ email }] : [])
          ]
        }
      });

      if (existing) {
        await prisma.client.update({
          where: { id: existing.id },
          data: {
            name: finalName,
            email: email || existing.email,
            firstName: firstName || existing.firstName,
            lastName: lastName || existing.lastName,
            contactPerson: contactPerson || existing.contactPerson,
            address: address || existing.address,
            stateCode: stateCode || existing.stateCode,
            gstin: gstin || existing.gstin,
            state: stateCode === '24' ? 'GUJARAT' : 'OUTSIDE GUJARAT'
          }
        });
      } else {
        await prisma.client.create({
          data: {
            name: finalName,
            email: email || `${finalName.toLowerCase().replace(/[^a-z0-9]/g, '')}@client.com`,
            firstName: firstName,
            lastName: lastName,
            contactPerson: contactPerson,
            address: address,
            stateCode: stateCode,
            gstin: gstin,
            state: stateCode === '24' ? 'GUJARAT' : 'OUTSIDE GUJARAT'
          }
        });
      }
      count++;
    } catch (err) {
      console.error(`Error syncing row ${i} (${finalName}):`, err.message);
    }
  }

  console.log(`Successfully synced ${count} clients from CSV!`);
}

syncClients()
  .then(() => prisma.$disconnect())
  .catch(err => {
    console.error(err);
    prisma.$disconnect();
  });
