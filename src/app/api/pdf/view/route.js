import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const filename = searchParams.get('filename') || 'Invoice.pdf';
    
    if (!id) {
      return new NextResponse('Missing ID', { status: 400 });
    }

    const filePath = path.join(os.tmpdir(), 'invoice-pdfs', `${id}.pdf`);
    if (!fs.existsSync(filePath)) {
      return new NextResponse('PDF not found or expired', { status: 404 });
    }

    const fileBuffer = fs.readFileSync(filePath);
    
    // Clean up the file so it doesn't waste disk space
    setTimeout(() => {
      try {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      } catch (e) {}
    }, 60000); // 1 minute is plenty of time for the browser to download it

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`
      }
    });
  } catch (error) {
    console.error('Error viewing PDF:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
