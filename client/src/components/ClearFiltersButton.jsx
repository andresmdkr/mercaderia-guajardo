import { Button } from '@mui/material';
import FilterAltOffIcon from '@mui/icons-material/FilterAltOffOutlined';

// Botón "Limpiar filtros" de los listados. Solo aparece cuando hay algún filtro puesto, y los devuelve a como se abre la pantalla.
export default function ClearFiltersButton({ visible, onClick }) {
  if (!visible) return null;
  return (
    <Button size="small" color="inherit" startIcon={<FilterAltOffIcon />} onClick={onClick} sx={{ color: 'text.secondary' }}>
      Limpiar filtros
    </Button>
  );
}
