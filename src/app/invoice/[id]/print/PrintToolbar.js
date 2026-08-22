'use client';

import { useState, useEffect, useRef } from 'react';

export default function PrintToolbar({ isStationery, pdfTitle }) {
  const [status, setStatus] = useState('Loading fonts...');
  const hasTriggeredRef = useRef(false);

  useEffect(() => {
    if (pdfTitle) {
      document.title = pdfTitle;
    }
  }, [pdfTitle]);

  useEffect(() => {
    if (hasTriggeredRef.current) return;
    hasTriggeredRef.current = true;

    const generateAndServeNativePDF = async () => {
      setStatus('Capturing layout...');
      const element = document.getElementById('invoice-pdf-container');
      if (!element) {
        window.print();
        return;
      }

      const prevTransform = element.style.transform;
      element.style.transform = 'none';

      try {
        const html2canvasModule = await import('html2canvas');
        const html2canvas = html2canvasModule.default || html2canvasModule;
        const jspdfModule = await import('jspdf');
        const jsPDF = jspdfModule.jsPDF || jspdfModule.default || jspdfModule;

        setStatus('Rendering image...');
        const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff'
        });

        setStatus('Building document...');
        const imgData = canvas.toDataURL('image/jpeg', 0.98);
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4'
        });

        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = (canvas.height * pageWidth) / canvas.width;

        pdf.addImage(imgData, 'JPEG', 0, 0, pageWidth, pageHeight);
        
        setStatus('Preparing native viewer...');
        const pdfBlob = pdf.output('blob');
        
        // Send to our Echo API to assign proper filename headers
        const formData = new FormData();
        formData.append('file', pdfBlob);
        
        const res = await fetch('/api/pdf/store', {
          method: 'POST',
          body: formData
        });
        
        if (!res.ok) throw new Error('API failed');
        
        const data = await res.json();
        
        // Redirect completely to the native viewer endpoint
        const properFilename = `${pdfTitle || 'Invoice'}.pdf`;
        window.location.replace(`/api/pdf/view?id=${data.id}&filename=${encodeURIComponent(properFilename)}`);

      } catch (err) {
        console.error('PDF generation error, falling back to browser print:', err);
        window.print();
      } finally {
        if (element) {
          element.style.transform = prevTransform;
        }
      }
    };

    // Wait 800ms for custom fonts to paint before generating
    setTimeout(() => {
      generateAndServeNativePDF();
    }, 800);

  }, [pdfTitle]);

  return (
    <div className="fixed inset-0 z-[99999] bg-zinc-900 flex flex-col items-center justify-center" style={{ fontFamily: "'Montserrat', sans-serif" }}>
      <div className="w-12 h-12 border-4 border-slate-700 border-t-[#E94444] rounded-full animate-spin mb-4"></div>
      <h2 className="text-white text-xl font-bold mb-2">Preparing PDF Document</h2>
      <p className="text-slate-400 text-sm font-semibold">{status}</p>
    </div>
  );
}
