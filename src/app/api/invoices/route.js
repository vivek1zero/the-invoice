import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const invoices = await prisma.invoice.findMany({
      include: {
        client: true,
        lineItems: true
      },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(invoices);
  } catch (error) {
    console.error('Error fetching invoices:', error);
    return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { invoiceNumber, orderNumber, title, clientId, status, domesticExport, currency, currencySymbol, taxRule, lutArn, createdAt, dueDate, discount, lineItems } = body;

    if (!clientId || !lineItems || lineItems.length === 0) {
      return NextResponse.json({ error: 'Client and at least one line item are required.' }, { status: 400 });
    }

    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) {
      return NextResponse.json({ error: 'Client not found.' }, { status: 404 });
    }

    // 1. Calculate Subtotals and Taxes
    let subtotal = 0;
    lineItems.forEach(item => {
      const itemQty = parseFloat(item.quantity) || 0;
      const itemAmount = parseFloat(item.amount) || 0;
      subtotal += itemQty * itemAmount;
    });

    const isExport = domesticExport === 'Export' || currency === 'USD';
    const clientStateCode = client.stateCode || '24';
    const isLocalState = clientStateCode === '24';

    let cgst = 0, sgst = 0, igst = 0;
    if (taxRule === 'IGST') {
      igst = isExport ? 0 : subtotal * 0.18;
    } else if (taxRule === 'CGST_SGST') {
      cgst = isExport ? 0 : subtotal * 0.09;
      sgst = isExport ? 0 : subtotal * 0.09;
    } else if (taxRule === 'None') {
      cgst = 0; sgst = 0; igst = 0;
    } else {
      // Auto
      if (!isExport) {
        if (isLocalState) {
          cgst = subtotal * 0.09;
          sgst = subtotal * 0.09;
          igst = 0;
        } else {
          cgst = 0;
          sgst = 0;
          igst = subtotal * 0.18;
        }
      }
    }

    const discountAmount = parseFloat(discount) || 0;
    const totalAmount = subtotal + cgst + sgst + igst - discountAmount;

    // Fetch LUT ARN if it's export
    let finalLutArn = lutArn || null;
    if (isExport && !finalLutArn) {
      const dbSetting = await prisma.setting.findUnique({ where: { key: 'business_lut_arn' } });
      finalLutArn = dbSetting?.value || 'AD241225020914E';
    }

    // 3. Create the Invoice and Line Items inside a Prisma transaction
    const newInvoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        orderNumber: orderNumber || null,
        clientId,
        status: status || 'DRAFT',
        domesticExport: domesticExport || 'Domestic',
        subtotal,
        cgst,
        sgst,
        igst,
        discount: discountAmount,
        totalAmount,
        currency: currency || 'INR',
        currencySymbol: currencySymbol || '₹',
        taxRule: taxRule || 'Auto',
        lutArn: finalLutArn,
        createdAt: createdAt ? new Date(createdAt) : undefined,
        dueDate: dueDate ? new Date(dueDate) : null,
        lineItems: {
          create: lineItems.map(item => ({
            hsnSac: item.hsnSac || null,
            title: item.title,
            description: item.description || '',
            unit: item.unit ? String(item.unit) : '1',
            quantity: parseFloat(item.quantity) || 0,
            amount: parseFloat(item.amount) || 0,
            adjustPercent: parseFloat(item.adjustPercent) || 0,
            taxable: !isExport && item.taxable !== false,
            taxRate: !isExport && item.taxable !== false ? (parseFloat(item.taxRate) || 18.0) : 0.0
          }))
        }
      },
      include: {
        lineItems: true,
        client: true
      }
    });

    return NextResponse.json(newInvoice, { status: 201 });
  } catch (error) {
    console.error('Error creating invoice:', error);
    if (error.code === 'P2002') {
      return NextResponse.json({ error: `Invoice number "${invoiceNumber}" already exists in database.` }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || 'Failed to create invoice' }, { status: 500 });
  }
}
