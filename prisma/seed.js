const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  console.log("Seeding started...");

  // Clear existing data (in correct order of dependencies)
  await prisma.lineItem.deleteMany({});
  await prisma.invoice.deleteMany({});
  await prisma.client.deleteMany({});
  await prisma.certificate.deleteMany({});
  await prisma.user.deleteMany({});

  // 1. Seed Auth User (Admin)
  const hashedPassword = bcrypt.hashSync('ZeroAdmin#2026!', 10);
  await prisma.user.create({
    data: {
      username: 'admin',
      password: hashedPassword
    }
  });
  console.log("Seeded Admin user (admin / ZeroAdmin#2026!)");

  // 2. Seed Clients matching Sliced Invoices + PDF details
  // Client 1: UNISON DIRECT ACCOUNTING LLP (Gujarat - Local to Zero Designs Gujarat)
  const client1 = await prisma.client.create({
    data: {
      name: "UNISON DIRECT ACCOUNTING LLP",
      email: "kaizad.m@unisonglobus.com",
      address: "A 404, NAVRATNA CORPORATE PARK, AMBALI BOPAL ROAD, AHMEDABAD - 380058, GUJARAT, INIDA",
      state: "Gujarat",
      stateCode: "24",
      gstin: "24AAJFU0296R1ZG"
    }
  });

  // Client 2: INFINITE UPTIME INDIA PRIVATE LIMITED (Maharashtra - Interstate to Zero Designs Gujarat)
  const client2 = await prisma.client.create({
    data: {
      name: "INFINITE UPTIME INDIA PRIVATE LIMITED",
      email: "mohit.deshpande@infinite-uptime.com",
      address: "6th Floor, Pentagon Tower, Magarpatta City, Hadapsar, Pune - 411013, Maharashtra, India",
      state: "Maharashtra",
      stateCode: "27",
      gstin: "27AAACI9999P1Z9"
    }
  });

  console.log("Seeded 2 clients.");

  // 3. Seed Certificates
  await prisma.certificate.create({
    data: {
      certificateNumber: "CERT-2026-001",
      studentName: "Mohit Deshpande",
      courseName: "Industrial IoT Engineering",
      createdAt: new Date("2026-07-15T00:00:00Z"),
    }
  });

  await prisma.certificate.create({
    data: {
      certificateNumber: "CERT-2026-002",
      studentName: "Kaizad M",
      courseName: "Cloud Systems & DevOps",
      createdAt: new Date("2026-07-16T00:00:00Z"),
    }
  });

  console.log("Seeded 2 certificates.");

  // 4. Seed Invoices related to Clients
  // Invoice 1: TOTL July 26-001 (INV-0947) matching PDF screenshot
  // Client is Unison (Gujarat - Local), so we apply 9% CGST (2250) + 9% SGST (2250) on Subtotal of 25,000.00. Total = 29,500.00
  await prisma.invoice.create({
    data: {
      invoiceNumber: "INV-0947",
      orderNumber: "D2026270615",
      clientId: client1.id,
      status: "PAID",
      domesticExport: "Domestic",
      subtotal: 25000.00,
      cgst: 2250.00, // 9% CGST
      sgst: 2250.00, // 9% SGST
      igst: 0.00,
      totalAmount: 29500.00,
      createdAt: new Date("2026-06-22T00:00:00Z"),
      dueDate: new Date("2026-06-22T00:00:00Z"),
      lineItems: {
        create: [
          {
            hsnSac: "998314",
            title: "Website AMC for www.unisondirect.com (for 16th Jun to 15th Jul 2026)",
            description: "Annual Website Maintenance Services",
            unit: "1",
            quantity: 1,
            amount: 25000.00,
            taxRate: 18.0
          }
        ]
      }
    }
  });

  // Invoice 2: Infinite Uptime July 26-002 (INV-0964)
  // Client is Infinite Uptime (Maharashtra - Interstate), so we apply 18% IGST (47880) on Subtotal of 266,000.00. Total = 313,880.00
  await prisma.invoice.create({
    data: {
      invoiceNumber: "INV-0964",
      clientId: client2.id,
      status: "DRAFT",
      domesticExport: "Domestic",
      subtotal: 266000.00,
      cgst: 0.00,
      sgst: 0.00,
      igst: 47880.00, // 18% IGST
      totalAmount: 313880.00,
      createdAt: new Date("2026-07-18T11:09:00Z"),
      dueDate: new Date("2026-07-18T11:09:00Z"),
      lineItems: {
        create: [
          {
            hsnSac: "998314",
            title: "Infinite Uptime July 26-002",
            description: "Industrial monitoring software subscription and configuration",
            unit: "1",
            quantity: 1,
            amount: 266000.00,
            taxRate: 18.0
          }
        ]
      }
    }
  });

  console.log("Seeded 2 invoices.");
  console.log("Seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
