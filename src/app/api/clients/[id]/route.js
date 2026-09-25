import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';


export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, email, state, stateCode, gstin, address, firstName, lastName } = body;

    if (!name) {
      return NextResponse.json({ error: 'Client name is required' }, { status: 400 });
    }

    const contactPerson = body.contactPerson || [firstName, lastName].filter(Boolean).join(' ').trim() || null;

    const updatedClient = await prisma.client.update({
      where: { id },
      data: {
        name,
        email,
        firstName: firstName || null,
        lastName: lastName || null,
        contactPerson: contactPerson,
        state: state || 'Export/Foreign',
        stateCode: stateCode || null,
        gstin: gstin || null,
        address: address || null
      }
    });

    return NextResponse.json(updatedClient);
  } catch (error) {
    console.error('Failed to update client:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;

    // Check if the client has associated invoices
    const invoiceCount = await prisma.invoice.count({
      where: { clientId: id }
    });

    if (invoiceCount > 0) {
      return NextResponse.json({
        error: `Cannot delete client because they have ${invoiceCount} associated invoices. Delete the invoices first.`
      }, { status: 400 });
    }

    await prisma.client.delete({
      where: { id }
    });

    return NextResponse.json({ message: 'Client deleted successfully' });
  } catch (error) {
    console.error('Failed to delete client:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
