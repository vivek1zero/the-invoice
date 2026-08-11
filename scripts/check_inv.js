const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const invs = await prisma.invoice.findMany({
    where: { invoiceNumber: 'INV-0474' }
  });
  console.log('Invoices matching INV-0474:', invs);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
