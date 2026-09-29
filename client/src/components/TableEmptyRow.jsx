import { CircularProgress, TableCell, TableRow } from '@mui/material';

// Fila de una tabla sin datos: mientras carga por primera vez muestra un indicador, y después el estado vacío.
export default function TableEmptyRow({ colSpan, loading, children }) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} align="center" sx={{ borderBottom: 0 }}>
        {loading ? <CircularProgress size={28} sx={{ my: 5 }} /> : children}
      </TableCell>
    </TableRow>
  );
}
