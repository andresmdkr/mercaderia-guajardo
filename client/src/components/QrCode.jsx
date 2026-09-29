import { useMemo } from 'react';
import { Box } from '@mui/material';
import qrcode from 'qrcode-generator';

const QUIET_ZONE = 4; // el borde blanco que exige el estándar para que la cámara lo lea

// Código QR con el texto dado. Siempre negro sobre blanco (también en modo oscuro: si no, el celular no lo lee).
export default function QrCode({ value, size = 220, label }) {
  const { count, path } = useMemo(() => {
    const qr = qrcode(0, 'M'); // tamaño automático, corrección de errores media
    qr.addData(value);
    qr.make();
    const modules = qr.getModuleCount();
    let d = '';
    for (let row = 0; row < modules; row += 1) {
      for (let col = 0; col < modules; col += 1) {
        if (qr.isDark(row, col)) d += `M${col + QUIET_ZONE} ${row + QUIET_ZONE}h1v1h-1z`;
      }
    }
    return { count: modules + QUIET_ZONE * 2, path: d };
  }, [value]);

  return (
    <Box sx={{ width: size, height: size, bgcolor: '#fff', borderRadius: 1, lineHeight: 0 }}>
      <svg viewBox={`0 0 ${count} ${count}`} width={size} height={size} role="img" aria-label={label} shapeRendering="crispEdges">
        <path d={path} fill="#000" />
      </svg>
    </Box>
  );
}
