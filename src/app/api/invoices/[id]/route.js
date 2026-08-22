import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;

    await prisma.invoice.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting invoice:', error);
    return NextResponse.json({ error: 'Failed to delete invoice' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { invoiceNumber, orderNumber, title, clientId, status, domesticExport, currency, currencySymbol, taxRule, lutArn, createdAt, dueDate, discount, lineItems } = body;

    if (!invoiceNumber || !clientId || !lineItems || lineItems.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1. Fetch client
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

    // 3. Update transaction: delete existing line items and recreate
    const updatedInvoice = await prisma.$transaction(async (tx) => {
      await tx.lineItem.deleteMany({
        where: { invoiceId: id }
      });

      return await tx.invoice.update({
        where: { id },
        data: {
          invoiceNumber,
          orderNumber: orderNumber || null,
          clientId,
          status,
          domesticExport,
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
    });

    return NextResponse.json(updatedInvoice);
  } catch (error) {
    console.error('Error updating invoice:', error);
    return NextResponse.json({ error: 'Failed to update invoice' }, { status: 500 });
  }
}
