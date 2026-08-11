'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function PrintLogic() {
  const searchParams = useSearchParams();
  const autoPrint = searchParams.get('print') === 'true';

  useEffect(() => {
    if (autoPrint) {
      const timer = setTimeout(() => {
        window.print();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [autoPrint]);

  return null;
}

export default function TriggerPrint() {
  return (
    <Suspense fallback={null}>
      <PrintLogic />
    </Suspense>
  );
}
