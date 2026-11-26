import { useEffect } from 'react';

/**
 * Hook para detectar lecturas de un escáner de código de barras USB/Bluetooth.
 * El escáner suele comportarse como un teclado que teclea muy rápido y termina con un "Enter".
 */
export function useBarcodeScanner(onScan) {
  useEffect(() => {
    let barcode = '';
    let lastKeyTime = Date.now();

    const handleKeyDown = (e) => {
      // Ignorar eventos si el usuario está escribiendo en un input, textarea, o select
      if (
        e.target.tagName === 'INPUT' ||
        e.target.tagName === 'TEXTAREA' ||
        e.target.tagName === 'SELECT'
      ) {
        return;
      }

      const currentTime = Date.now();
      
      // Si pasa más de 50ms entre teclas, asumimos que no es un escáner (escribiendo a mano)
      if (currentTime - lastKeyTime > 50) {
        barcode = '';
      }
      
      lastKeyTime = currentTime;

      if (e.key === 'Enter') {
        if (barcode.length > 0) {
          onScan(barcode);
          barcode = '';
        }
      } else if (e.key.length === 1) {
        // Solo añadir caracteres imprimibles (longitud 1)
        barcode += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onScan]);
}
