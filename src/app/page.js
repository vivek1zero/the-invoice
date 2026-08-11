import prisma from "@/lib/prisma";
import Dashboard from "@/components/Dashboard";

// Force dynamic rendering to always query fresh database values
export const dynamic = "force-dynamic";

export default async function Home() {
  const invoices = await prisma.invoice.findMany({
    include: {
      lineItems: true
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  const certificates = await prisma.certificate.findMany({
    orderBy: {
      createdAt: 'desc'
    }
  });

  return (
    <Dashboard 
      initialInvoices={invoices} 
      initialCertificates={certificates} 
    />
  );
}
