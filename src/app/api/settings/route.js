import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';


const DEFAULT_SETTINGS = {
  business_name: 'ZERO DESIGNS PVT. LTD.',
  business_address: '605/606, Satyamev Elite Near Vakil Saheb Bridge, Ambli-Bopal Cross Road,\nBopal, Ahmedabad, Gujarat 380058, India.\nMobile: +91 987 935 7255, +91 990 996 2340, +91 982 422 0878 Email: sales@zerodesigns.in, Website: www.zerodesigns.in',
  business_extra_info: 'PAN No. : AAACZ4713E | CIN No. : U72900GJ2011PTC063931 | GST No. : 24AAACZ4713E1ZN',
  business_bank_detail: 'Bank Details:\nICICI Bank Limited\nBranch : Bopal Road, Ahmedabad\nBeneficiary : ZERO DESIGNS PRIVATE LIMITED\nAccount Number: 036105002622\nSwift code: ICICINBBNRI\nIFSC Code: ICIC0000361',
  business_lut_arn: 'AD241225020914E',
  invoice_prefix: 'INV-',
  invoice_next_number: '0966',
  invoice_due_days: '14',
  invoice_footer: 'Thanks for choosing Zero Designs. | Email: finance@zerodesigns.in'
};

export async function GET() {
  try {
    const dbSettings = await prisma.setting.findMany();
    const settings = { ...DEFAULT_SETTINGS };

    dbSettings.forEach(item => {
      settings[item.key] = item.value;
    });

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Failed to get settings:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();

    const updates = [];
    for (const [key, value] of Object.entries(body)) {
      updates.push(
        prisma.setting.upsert({
          where: { key },
          update: { value: String(value) },
          create: { key, value: String(value) }
        })
      );
    }

    await prisma.$transaction(updates);

    // Fetch and return the updated state
    const dbSettings = await prisma.setting.findMany();
    const settings = { ...DEFAULT_SETTINGS };

    dbSettings.forEach(item => {
      settings[item.key] = item.value;
    });

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Failed to update settings:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
