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
    const { invoiceNumber, orderNumber, clientId, status, domesticExport, dueDate, lineItems, discount, currency, currencySymbol, lutArn, taxRule } = body;

    if (!invoiceNumber || !clientId || !lineItems || lineItems.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1. Fetch the client to determine the state for GST math
    const client = await prisma.client.findUnique({
      where: { id: clientId }
    });

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // 2. Perform financial calculations
    let subtotal = 0;
    lineItems.forEach(item => {
      const itemQty = parseFloat(item.quantity) || 0;
      const itemAmount = parseFloat(item.amount) || 0;
      const adjustPercent = parseFloat(item.adjustPercent) || 0;
      const itemSubtotal = itemQty * itemAmount;
      const itemDiscount = itemSubtotal * (adjustPercent / 100);
      subtotal += itemSubtotal - itemDiscount;
    });

    // Zero Designs is located in Gujarat, India (State Code: 24)
    const isLocalState = client.state.toLowerCase().trim() === 'gujarat';
    const isExport = domesticExport === 'Export' || client.state.toLowerCase().includes('export') || client.state.toLowerCase().includes('foreign');

    let cgst = 0;
    let sgst = 0;
    let igst = 0;

    if (taxRule === 'None') {
      cgst = 0;
      sgst = 0;
      igst = 0;
    } else if (taxRule === 'IGST') {
      cgst = 0;
      sgst = 0;
      igst = subtotal * 0.18;
    } else if (taxRule === 'CGST_SGST') {
      cgst = subtotal * 0.09;
      sgst = subtotal * 0.09;
      igst = 0;
    } else {
      // Auto logic
      if (!isExport) {
        if (isLocalState) {
          // Split into 9% CGST and 9% SGST (18% total tax)
          cgst = subtotal * 0.09;
          sgst = subtotal * 0.09;
          igst = 0;
        } else {
          // 18% IGST for interstate
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
