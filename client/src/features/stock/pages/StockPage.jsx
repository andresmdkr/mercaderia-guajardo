import { useState } from 'react';
import { Alert, Box, Button, CircularProgress, MenuItem, Snackbar, TextField } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ClearFiltersButton from '../../../components/ClearFiltersButton';
import PageHeader from '../../../components/PageHeader';
import ProductPicker from '../../products/components/ProductPicker';
import { createMovement } from '../api/stockApi';
import MovementForm from '../components/MovementForm';
import MovementsTable from '../components/MovementsTable';
import useMovements from '../hooks/useMovements';
import { MOVEMENT_TYPES } from '../movementTypes';

const dateFieldProps = { size: 'small', type: 'date', slotProps: { inputLabel: { shrink: true } }, sx: { bgcolor: 'background.paper' } };

export default function StockPage() {
  const movements = useMovements();
  const [formOpen, setFormOpen] = useState(false);
  const [message, setMessage] = useState(null);

  const handleSubmit = async (values) => {
    await createMovement(values);
    setMessage({ severity: 'success', text: 'Movimiento registrado' });
    setFormOpen(false);
    movements.reload();
  };

  return (
    <>
      <PageHeader
        sectionKey="stock"
        title="Movimientos de stock"
        actions={
          <>
            {movements.loading && <CircularProgress size={22} />}
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setFormOpen(true)}>
              Nuevo movimiento
            </Button>
          </>
        }
      />

      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2, mb: 2 }}>
        <ProductPicker
          label="Filtrar por producto"
          value={movements.filters.product}
          onChange={(product) => movements.setFilter('product', product)}
          includeInactive
          sx={{ width: 320, bgcolor: 'background.paper' }}
        />
        <TextField
          select
          size="small"
          label="Tipo"
          value={movements.filters.type}
          onChange={(event) => movements.setFilter('type', event.target.value)}
          sx={{ minWidth: 160, bgcolor: 'background.paper' }}
        >
          <MenuItem value="">Todos</MenuItem>
          {Object.entries(MOVEMENT_TYPES).map(([key, { label }]) => (
            <MenuItem key={key} value={key}>
              {label}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          label="Desde"
          value={movements.filters.from}
          onChange={(event) => movements.setFilter('from', event.target.value)}
          {...dateFieldProps}
        />
        <TextField
          label="Hasta"
          value={movements.filters.to}
          onChange={(event) => movements.setFilter('to', event.target.value)}
          {...dateFieldProps}
        />
        <ClearFiltersButton visible={movements.hasActiveFilters} onClick={movements.clearFilters} />
      </Box>

      {movements.error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {movements.error}
        </Alert>
      )}

      <MovementsTable
        items={movements.items}
        total={movements.total}
        page={movements.page}
        pageSize={movements.pageSize}
        onPageChange={movements.setPage}
      />

      {formOpen && <MovementForm onClose={() => setFormOpen(false)} onSubmit={handleSubmit} />}

      <Snackbar open={Boolean(message)} autoHideDuration={3000} onClose={() => setMessage(null)}>
        {message ? <Alert severity={message.severity}>{message.text}</Alert> : undefined}
      </Snackbar>
    </>
  );
}
