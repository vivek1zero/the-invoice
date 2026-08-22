'use client';

import { useState, useEffect, useCallback } from 'react';

export default function PrintToolbar({ isStationery, pdfTitle }) {
  const [zoom, setZoom] = useState(100);
  const [collapsed, setCollapsed] = useState(false);

  // Set the document title for PDF saving
  useEffect(() => {
    if (pdfTitle) {
      document.title = pdfTitle;
    }
  }, [pdfTitle]);

  // Apply zoom to the invoice container
  useEffect(() => {
    const el = document.getElementById('invoice-pdf-container');
    if (el) {
      el.style.transform = `scale(${zoom / 100})`;
      el.style.transformOrigin = 'top center';
      // Adjust wrapper height so page doesn't collapse
      const spacer = document.getElementById('invoice-screen-spacer');
      if (spacer) {
        spacer.style.height = collapsed ? '0px' : '64px';
      }
    }
  }, [zoom, collapsed]);

  const zoomIn = useCallback(() => setZoom(z => Math.min(150, z + 10)), []);
  const zoomOut = useCallback(() => setZoom(z => Math.max(50, z - 10)), []);
  const resetZoom = useCallback(() => setZoom(100), []);

  const [isDownloading, setIsDownloading] = useState(false);

  // Direct 1-click PDF download to computer using bundled libraries
  const handleDownloadPdf = async () => {
    setIsDownloading(true);
    const element = document.getElementById('invoice-pdf-container');
    if (!element) {
      window.print();
      setIsDownloading(false);
      return;
    }

    // Save previous transform state so html2canvas renders exact full dimensions
    const prevTransform = element.style.transform;
    element.style.transform = 'none';

    try {
      let downloaded = false;

      // 1. Try bundled html2pdf.js
      try {
        const html2pdfModule = await import('html2pdf.js');
        const html2pdf = html2pdfModule.default || html2pdfModule;
        if (typeof html2pdf === 'function') {
          const opt = {
            margin: 0,
            filename: `${pdfTitle || 'invoice'}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff' },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
          };
          await html2pdf().set(opt).from(element).save();
          downloaded = true;
        }
      } catch (err1) {
        console.warn('html2pdf approach failed, trying html2canvas + jspdf:', err1);
      }

      // 2. Direct html2canvas + jsPDF fallback
      if (!downloaded) {
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

        const imgData = canvas.toDataURL('image/jpeg', 0.98);
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4'
        });

        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = (canvas.height * pageWidth) / canvas.width;

        pdf.addImage(imgData, 'JPEG', 0, 0, pageWidth, pageHeight);
        pdf.save(`${pdfTitle || 'invoice'}.pdf`);
      }
    } catch (err) {
      console.error('Direct PDF download error, falling back to browser print:', err);
      window.print();
    } finally {
      // Restore original zoom transform
      if (element) {
        element.style.transform = prevTransform;
      }
      setIsDownloading(false);
    }
  };

  if (collapsed) {
    return (
      <div
        id="invoice-print-toolbar"
        className="fixed top-4 right-4 z-50 flex items-center gap-2"
        style={{ fontFamily: "'Montserrat', sans-serif" }}
      >
        {/* Compact floating pill */}
        <div className="flex items-center gap-1 bg-slate-900/95 backdrop-blur-sm border border-slate-700 rounded-full px-3 py-1.5 shadow-xl">
          <button onClick={zoomOut} className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-white text-base font-bold transition-colors" title="Zoom Out">−</button>
          <button onClick={resetZoom} className="text-xs font-mono text-slate-300 hover:text-white px-1 transition-colors min-w-[36px] text-center" title="Reset Zoom">{zoom}%</button>
          <button onClick={zoomIn} className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-white text-base font-bold transition-colors" title="Zoom In">+</button>
          <div className="w-px h-4 bg-slate-700 mx-1" />
          <button
            onClick={handleDownloadPdf}
            disabled={isDownloading}
            className="text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors px-1 flex items-center gap-1"
            title="Download PDF directly"
          >
            {isDownloading ? 'Saving...' : 'Download'}
          </button>
          <div className="w-px h-4 bg-slate-700 mx-1" />
          <button
            onClick={() => setCollapsed(false)}
            className="text-slate-400 hover:text-white transition-colors"
            title="Expand Toolbar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      id="invoice-print-toolbar"
      style={{ fontFamily: "'Montserrat', sans-serif" }}
      className="fixed top-0 left-0 right-0 z-50 bg-slate-900/97 backdrop-blur-md border-b border-slate-700/80 px-5 py-2.5 flex items-center justify-between shadow-xl gap-4"
    >
      {/* Left: Doc info */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-7 h-7 rounded-md bg-[#E94444]/20 border border-[#E94444]/30 flex items-center justify-center flex-shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="#E94444" className="w-3.5 h-3.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
          </svg>
        </div>
        <div className="min-w-0">
          <p className="text-white text-xs font-bold leading-tight truncate">
            {isStationery ? 'Stationery PDF — No Header / Footer' : 'Full Invoice PDF — With Header & Footer'}
          </p>
          <p className="text-slate-500 text-[10px] leading-tight mt-0.5 hidden sm:block">
            1-Click Download or Print / Save to your local computer
          </p>
        </div>
      </div>

      {/* Center: Zoom Controls */}
      <div className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1">
        <button
          onClick={zoomOut}
          disabled={zoom <= 50}
          className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-white disabled:opacity-30 text-lg font-bold transition-colors rounded"
          title="Zoom Out (min 50%)"
        >
          −
        </button>
        <button
          onClick={resetZoom}
          className="text-xs font-mono font-bold text-slate-200 hover:text-white transition-colors min-w-[40px] text-center px-1 py-0.5 rounded hover:bg-slate-700"
          title="Reset to 100%"
        >
          {zoom}%
        </button>
        <button
          onClick={zoomIn}
          disabled={zoom >= 150}
          className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-white disabled:opacity-30 text-lg font-bold transition-colors rounded"
          title="Zoom In (max 150%)"
        >
          +
        </button>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Hide toolbar to full view */}
        <button
          onClick={() => setCollapsed(true)}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all border border-transparent hover:border-slate-700"
          title="Collapse toolbar for full view"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9 3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5 5.25 5.25" />
          </svg>
        </button>

        {/* Direct Download PDF Button */}
        <button
          onClick={handleDownloadPdf}
          disabled={isDownloading}
          className="px-4 py-1.5 bg-[#059669] hover:bg-[#047857] disabled:opacity-50 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors shadow-md cursor-pointer"
          title="Download PDF directly to your computer"
        >
          {isDownloading ? (
            <span className="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
          )}
          {isDownloading ? 'Downloading...' : 'Download PDF'}
        </button>

        {/* Print PDF */}
        <button
          onClick={() => window.print()}
          className="px-4 py-1.5 bg-[#E94444] hover:bg-[#d63a3a] text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors shadow-md"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0a2.25 2.25 0 0 1-2.25 2.25H8.59A2.25 2.25 0 0 1 6.34 18m11.318-4.085c.675-.101 1.258-.456 1.635-1.045A5.633 5.633 0 0 0 19.5 9.75V9A6 6 0 0 0 7.5 9v.75c0 1.218-.386 2.372-1.045 3.42-.377.589-.96 1.044-1.635 1.045m14.496-4.085a12.044 12.044 0 0 1-14.496 0M9 7.5h6" />
          </svg>
          Print PDF
        </button>

        {/* Close tab */}
        <button
          onClick={() => window.close()}
          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs font-semibold rounded-lg border border-slate-700 transition-colors"
        >
          ✕ Close
        </button>
      </div>
    </div>
  );
}
