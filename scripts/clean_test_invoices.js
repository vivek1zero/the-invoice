const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
  const csvPath = "C:/Users/Admin'/Desktop/zero/invoice-export-2026-07-21.csv";
  const csvContent = fs.readFileSync(csvPath, 'utf8');
  const lines = csvContent.split('\n').map(line => line.trim()).filter(Boolean);
  
  const validInvoiceNumbers = new Set();
  for (let i = 1; i < lines.length; i++) {
    const row = lines[i];
    const cols = row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
    if (cols[0]) {
      validInvoiceNumbers.add(cols[0].trim().replace(/^"|"$/g, ''));
    }
  }

  console.log(`Loaded ${validInvoiceNumbers.size} valid invoice numbers from CSV.`);

  const dbInvoices = await prisma.invoice.findMany({
    select: { id: true, invoiceNumber: true }
  });

  let deletedCount = 0;
  for (const inv of dbInvoices) {
    if (!validInvoiceNumbers.has(inv.invoiceNumber)) {
      console.log(`Deleting test invoice: ${inv.invoiceNumber} (${inv.id})`);
      await prisma.lineItem.deleteMany({ where: { invoiceId: inv.id } });
      await prisma.invoice.delete({ where: { id: inv.id } });
      deletedCount++;
    }
  }

  console.log(`Cleaned up ${deletedCount} test invoices.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
