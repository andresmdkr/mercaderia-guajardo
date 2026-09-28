import { useState } from 'react';
import { Autocomplete, Box, TextField, Typography } from '@mui/material';
import useProductSearch from '../hooks/useProductSearch';

// Selector de producto con búsqueda por código o nombre (consulta al backend mientras se escribe).
export default function ProductPicker({
  value,
  onChange,
  label = 'Producto',
  includeInactive = false,
  autoFocus = false,
  clearOnSelect = false, // para "agregar y seguir": limpia el campo después de elegir
  sx,
}) {
  const [inputValue, setInputValue] = useState('');
  const { options, loading } = useProductSearch(inputValue, { includeInactive });

  const handleChange = (event, product) => {
    onChange(product);
    if (clearOnSelect) setInputValue('');
  };

  return (
    <Autocomplete
      value={value}
      onChange={handleChange}
      inputValue={inputValue}
      onInputChange={(event, text) => setInputValue(text)}
      options={options}
      loading={loading}
      getOptionLabel={(product) => `${product.code} — ${product.name}`}
      isOptionEqualToValue={(option, selected) => option.id === selected.id}
      filterOptions={(items) => items} // ya vienen filtrados desde el backend
      noOptionsText="No se encontraron productos"
      loadingText="Buscando…"
      size="small"
      sx={sx}
      renderOption={({ key, ...props }, product) => (
        <Box component="li" key={key} {...props} sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
          <span>
            {product.code} — {product.name}
          </span>
          <Typography variant="caption" color="text.secondary">
            Stock: {product.stock}
          </Typography>
        </Box>
      )}
      renderInput={(params) => <TextField {...params} label={label} autoFocus={autoFocus} />}
    />
  );
}
