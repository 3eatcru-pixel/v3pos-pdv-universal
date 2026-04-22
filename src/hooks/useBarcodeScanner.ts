import { useEffect, useRef } from 'react';

/**
 * Hook to detect hardware barcode scanners (which simulate keyboard typing).
 * Most scanners send a sequence of characters quickly and end with "Enter".
 */
export const useBarcodeScanner = (onScan: (barcode: string) => void) => {
  const buffer = useRef<string>('');
  const lastKeyTime = useRef<number>(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const now = Date.now();
      
      // Hardware scanners typically type very fast (diff < 50ms)
      const diff = now - lastKeyTime.current;
      lastKeyTime.current = now;

      // Reset buffer if delay is too long (human typing)
      if (diff > 100) {
        buffer.current = '';
      }

      if (e.key === 'Enter') {
        if (buffer.current.length > 2) {
          onScan(buffer.current);
        }
        buffer.current = '';
        return;
      }

      // Ignore modifiers and non-printable
      if (e.key.length === 1) {
        buffer.current += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onScan]);
};
