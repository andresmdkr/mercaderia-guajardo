import { useState } from 'react';
import { Alert, Box, Button, CircularProgress, InputAdornment, Snackbar, TextField } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import ClearFiltersButton from '../../../components/ClearFiltersButton';
import PageHeader from '../../../components/PageHeader';
import StatusFilter from '../../../components/StatusFilter';
import { getErrorMessage } from '../../../services/api';
import { createCustomer, setCustomerActive, updateCustomer } from '../api/customersApi';
import CustomerForm from '../components/CustomerForm';
import CustomersTable from '../components/CustomersTable';
import useCustomers from '../hooks/useCustomers';

export default function CustomersPage() {
  const customers = useCustomers();
  // undefined = diálogo cerrado, null = alta, objeto = edición
  const [editing, setEditing] = useState(undefined);
  const [message, setMessage] = useState(null);

  const handleSubmit = async (values) => {
    if (editing) {
      await updateCustomer(editing.id, values);
      setMessage({ severity: 'success', text: 'Cliente actualizado' });
    } else {
      await createCustomer(values);
      setMessage({ severity: 'success', text: 'Cliente creado' });
    }
    setEditing(undefined);
    customers.reload();
  };

  // Se dispara desde el formulario de edición (botón "Dar de baja" / "Reactivar").
  const handleToggleActive = async () => {
    const customer = editing;
    try {
      await setCustomerActive(customer.id, !customer.active);
      setMessage({ severity: 'success', text: customer.active ? 'Cliente dado de baja' : 'Cliente reactivado' });
      setEditing(undefined);
      customers.reload();
    } catch (error) {
      setMessage({ severity: 'error', text: getErrorMessage(error) });
    }
  };

  return (
    <>
      <PageHeader
        sectionKey="customers"
        title="Clientes"
        actions={
          <>
            {customers.loading && <CircularProgress size={22} />}
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setEditing(null)}>
              Nuevo cliente
            </Button>
          </>
        }
      />

      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2, mb: 2 }}>
        <TextField
          size="small"
          placeholder="Buscar por nombre, teléfono o email"
          value={customers.search}
          onChange={(event) => customers.setSearch(event.target.value)}
          sx={{ minWidth: 300, bgcolor: 'background.paper' }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
        />
        <StatusFilter showInactive={customers.showInactive} onChange={customers.setShowInactive} />
        <ClearFiltersButton visible={customers.hasActiveFilters} onClick={customers.clearFilters} />
      </Box>

      {customers.error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {customers.error}
        </Alert>
      )}

      <CustomersTable
        items={customers.items}
        total={customers.total}
        page={customers.page}
        pageSize={customers.pageSize}
        onPageChange={customers.setPage}
        onEdit={setEditing}
      />

      {editing !== undefined && (
        <CustomerForm
          customer={editing}
          onClose={() => setEditing(undefined)}
          onSubmit={handleSubmit}
          onToggleActive={handleToggleActive}
        />
      )}

      <Snackbar open={Boolean(message)} autoHideDuration={3000} onClose={() => setMessage(null)}>
        {message ? <Alert severity={message.severity}>{message.text}</Alert> : undefined}
      </Snackbar>
    </>
  );
}
