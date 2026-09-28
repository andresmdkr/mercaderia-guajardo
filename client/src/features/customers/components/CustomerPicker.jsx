import { useState } from 'react';
import { Autocomplete, TextField } from '@mui/material';
import useCustomerSearch from '../hooks/useCustomerSearch';

// Selector de cliente con búsqueda. Sin selección = "Consumidor final".
export default function CustomerPicker({ value, onChange }) {
  const [inputValue, setInputValue] = useState('');
  const { options, loading } = useCustomerSearch(inputValue);

  return (
    <Autocomplete
      value={value}
      onChange={(event, customer) => onChange(customer)}
      inputValue={inputValue}
      onInputChange={(event, text) => setInputValue(text)}
      options={options}
      loading={loading}
      getOptionLabel={(customer) => (customer.phone ? `${customer.name} · ${customer.phone}` : customer.name)}
      isOptionEqualToValue={(option, selected) => option.id === selected.id}
      filterOptions={(items) => items} // ya vienen filtrados desde el backend
      noOptionsText="No se encontraron clientes"
      loadingText="Buscando…"
      size="small"
      renderInput={(params) => <TextField {...params} label="Cliente" placeholder="Consumidor final" />}
    />
  );
}
