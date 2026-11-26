import React, { forwardRef } from 'react';
import Barcode from 'react-barcode';

/**
 * Componente oculto que se utiliza únicamente para ser impreso.
 */
const TicketPrintLabel = forwardRef(({ ticket }, ref) => {
  if (!ticket) return null;

  const nombre = ticket.cliente_nombre || `Cliente #${ticket.cliente_id}`;
  const telefono = ticket.metadatos?.contacto || 'Sin teléfono';
  const barcodeValue = `TCK-${ticket.id}`;

  return (
    <div className="printable-label" ref={ref} style={{
      width: '60mm', // Menos larga
      height: '18mm', 
      padding: '0 4mm', // Ajuste del margen para compensar
      boxSizing: 'border-box',
      fontFamily: 'sans-serif',
      color: 'black',
      background: 'white',
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'stretch',
      justifyContent: 'space-between',
    }}>
      {/* Left Column: Info */}
      <div style={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column', 
        overflow: 'hidden',
        justifyContent: 'center',
        paddingRight: '2mm'
      }}>
        <h2 style={{ margin: '0 0 2px 0', fontSize: '13px', fontWeight: '900', letterSpacing: '-0.3px' }}>
          TICKET #{ticket.id}
        </h2>
        
        <div style={{ fontSize: '9px', lineHeight: '1.2' }}>
          <div style={{ display: 'flex', gap: '3px', whiteSpace: 'nowrap', overflow: 'hidden' }}>
            <span style={{ fontWeight: 'bold', textOverflow: 'ellipsis', overflow: 'hidden' }}>{nombre}</span>
            <span style={{ textOverflow: 'ellipsis', overflow: 'hidden' }}>{telefono}</span>
          </div>
          <div style={{ marginTop: '1px', fontSize: '8px', color: '#333', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {ticket.titulo}
          </div>
        </div>
      </div>

      {/* Right Column: Barcode */}
      <div style={{ 
        flexShrink: 0,
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center'
      }}>
        <Barcode 
          value={barcodeValue} 
          width={1.2} 
          height={30} 
          displayValue={false} 
          margin={0}
        />
        <div style={{ fontSize: '8px', marginTop: '1px', fontWeight: 'bold', letterSpacing: '0.2px' }}>
          {barcodeValue}
        </div>
      </div>
    </div>
  );
});

export default TicketPrintLabel;
