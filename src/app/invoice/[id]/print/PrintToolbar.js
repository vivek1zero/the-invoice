'use client';

import { useState, useEffect } from 'react';

export default function PrintToolbar({ isStationery, pdfTitle }) {
  const [pdfBlobUrl, setPdfBlobUrl] = useState(null);
  const [error, setError] = useState(null);

  // Set the document title for PDF saving
  useEffect(() => {
    if (pdfTitle) {
      document.title = pdfTitle;
    }
  }, [pdfTitle]);

  useEffect(() => {
    let isMounted = true;
    const generatePdf = async () => {
      const element = document.getElementById('invoice-pdf-container');
      if (!element) return;
      
      // Ensure element renders at correct scale
      element.style.transform = 'none';

      try {
        const html2canvasModule = await import('html2canvas');
        const html2canvas = html2canvasModule.default || html2canvasModule;
        const jspdfModule = await import('jspdf');
        const jsPDF = jspdfModule.jsPDF || jspdfModule.default || jspdfModule;

        const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff'
        });

        const imgData = canvas.toDataURL('image/jpeg', 1.0);
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4'
        });

        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = (canvas.height * pageWidth) / canvas.width;

        pdf.addImage(imgData, 'JPEG', 0, 0, pageWidth, pageHeight);
        
        // Output as blob url
        const blob = pdf.output('blob');
        const blobUrl = URL.createObjectURL(blob);
        
        if (isMounted) {
          setPdfBlobUrl(blobUrl);
        }
      } catch (err) {
        console.error('PDF generation error:', err);
        if (isMounted) {
          setError(err.message);
        }
      }
    };
    
    // Give DOM 800ms to ensure custom fonts (Averta) are fully loaded
    const timer = setTimeout(() => generatePdf(), 800);
    
    return () => { 
      isMounted = false;
      clearTimeout(timer);
    };
  }, [pdfTitle]);

  // Once generated, display full screen iframe with a floating exact-filename download button
  if (pdfBlobUrl) {
    return (
      <div className="fixed inset-0 z-[9999] bg-zinc-900">
        <div className="absolute top-4 right-8 z-[10000] flex gap-2">
          <button 
            onClick={() => window.print()}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-lg shadow-xl border border-slate-700 transition-colors flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0a2.25 2.25 0 0 1-2.25 2.25H8.59A2.25 2.25 0 0 1 6.34 18m11.318-4.085c.675-.101 1.258-.456 1.635-1.045A5.633 5.633 0 0 0 19.5 9.75V9A6 6 0 0 0 7.5 9v.75c0 1.218-.386 2.372-1.045 3.42-.377.589-.96 1.044-1.635 1.045m14.496-4.085a12.044 12.044 0 0 1-14.496 0M9 7.5h6" />
            </svg>
            Print
          </button>
          <a 
            href={pdfBlobUrl} 
            download={`${pdfTitle || 'Invoice'}.pdf`}
            className="px-4 py-2 bg-[#E94444] hover:bg-red-600 text-white font-bold rounded-lg shadow-xl transition-colors flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Download PDF
          </a>
        </div>
        <iframe 
          src={pdfBlobUrl + '#toolbar=0'} 
          className="w-full h-full border-none"
          title="PDF Viewer"
        />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="fixed inset-0 z-[9999] bg-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Error generating PDF</h2>
        <p className="text-slate-500 mb-6">{error}</p>
        <button 
          onClick={() => window.print()} 
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-md transition-colors"
        >
          Print via Browser (Fallback)
        </button>
      </div>
    );
  }

  // Initial Loading state (covers the screen so HTML is completely hidden from user)
  return (
    <div className="fixed inset-0 z-[9999] bg-zinc-900 flex flex-col items-center justify-center">
      <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin mb-6"></div>
      <p className="text-white font-bold text-xl tracking-tight">Generating PDF Viewer...</p>
      <p className="text-zinc-400 text-sm mt-2 font-medium">Please wait while we render your document</p>
    </div>
  );
}
