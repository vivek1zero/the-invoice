import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const clients = await prisma.client.findMany({
      orderBy: { name: 'asc' }
    });
    return NextResponse.json(clients);
  } catch (error) {
    console.error('Error fetching clients:', error);
    return NextResponse.json({ error: 'Failed to fetch clients' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { name, email, state, stateCode, gstin, address, firstName, lastName } = body;

    if (!name || !email || !state) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const contactPerson = body.contactPerson || [firstName, lastName].filter(Boolean).join(' ').trim() || null;

    const newClient = await prisma.client.create({
      data: {
        name,
        email,
        state,
        firstName: firstName || null,
        lastName: lastName || null,
        contactPerson: contactPerson,
        stateCode: stateCode || null,
        gstin: gstin || null,
        address: address || null
      }
    });

    return NextResponse.json(newClient, { status: 201 });
  } catch (error) {
    console.error('Error creating client:', error);
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'A client with this name already exists' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create client' }, { status: 500 });
  }
}
