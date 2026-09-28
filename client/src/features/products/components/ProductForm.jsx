import { useState } from 'react';
import {
  Alert,
  Autocomplete,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  TextField,
  createFilterOptions,
} from '@mui/material';
import { getErrorMessage } from '../../../services/api';

const emptyValues = { code: '', name: '', costPrice: '', salePrice: '', minStock: '0' };
const filter = createFilterOptions();

function toFormValues(product) {
  if (!product) return emptyValues;
  return {
    code: product.code,
    name: product.name,
    costPrice: String(product.costPrice),
    salePrice: String(product.salePrice),
    minStock: String(product.minStock),
  };
}

// Validación para dar feedback rápido; el backend vuelve a validar todo.
function validate(values) {
  const errors = {};
  if (!values.code.trim()) errors.code = 'Obligatorio';
  if (!values.name.trim()) errors.name = 'Obligatorio';
  if (values.costPrice === '' || Number(values.costPrice) < 0) errors.costPrice = 'Debe ser 0 o más';
  if (values.salePrice === '' || Number(values.salePrice) < 0) errors.salePrice = 'Debe ser 0 o más';
  if (!Number.isInteger(Number(values.minStock)) || Number(values.minStock) < 0) errors.minStock = 'Entero de 0 o más';
  return errors;
}

// Se monta solo cuando el diálogo está abierto, así el estado arranca limpio cada vez.
export default function ProductForm({ product, categories, onCreateCategory, onClose, onSubmit }) {
  const [values, setValues] = useState(() => toFormValues(product));
  const [category, setCategory] = useState(product?.category ?? null);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleChange = (field) => (event) => setValues((prev) => ({ ...prev, [field]: event.target.value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    const found = validate(values);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSaving(true);
    setServerError(null);
    try {
      await onSubmit({
        code: values.code.trim(),
        name: values.name.trim(),
        categoryId: category?.id ?? null,
        costPrice: Number(values.costPrice),
        salePrice: Number(values.salePrice),
        minStock: Number(values.minStock),
      });
    } catch (error) {
      setServerError(getErrorMessage(error));
      setSaving(false);
    }
  };

  // Si el usuario elige la opción "Crear ...", se crea la categoría y queda seleccionada.
  const handleCategoryChange = async (event, option) => {
    if (!option?.inputValue) {
      setCategory(option);
      return;
    }
    try {
      setServerError(null);
      setCategory(await onCreateCategory(option.inputValue));
    } catch (error) {
      setServerError(getErrorMessage(error));
    }
  };

  const filterCategories = (options, params) => {
    const filtered = filter(options, params);
    const typed = params.inputValue.trim();
    if (typed && !options.some((option) => option.name.toLowerCase() === typed.toLowerCase())) {
      filtered.push({ inputValue: typed, name: `Crear "${typed}"` });
    }
    return filtered;
  };

  const field = (name, label, extra = {}) => (
    <TextField
      label={label}
      value={values[name]}
      onChange={handleChange(name)}
      error={Boolean(errors[name])}
      helperText={errors[name]}
      fullWidth
      size="small"
      {...extra}
    />
  );

  return (
    <Dialog open onClose={saving ? undefined : onClose} fullWidth maxWidth="sm" component="form" onSubmit={handleSubmit}>
      <DialogTitle>{product ? 'Editar producto' : 'Nuevo producto'}</DialogTitle>
      <DialogContent>
        {serverError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {serverError}
          </Alert>
        )}
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid size={{ xs: 12, sm: 4 }}>{field('code', 'Código', { autoFocus: true })}</Grid>
          <Grid size={{ xs: 12, sm: 8 }}>{field('name', 'Nombre')}</Grid>
          <Grid size={12}>
            <Autocomplete
              value={category}
              options={categories}
              getOptionLabel={(option) => option.name}
              isOptionEqualToValue={(option, selected) => option.id === selected.id}
              filterOptions={filterCategories}
              onChange={handleCategoryChange}
              noOptionsText="Escribí para crear una categoría"
              size="small"
              renderInput={(params) => <TextField {...params} label="Categoría (opcional)" />}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            {field('costPrice', 'Precio de costo', { type: 'number', slotProps: { htmlInput: { min: 0, step: '0.01' } } })}
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            {field('salePrice', 'Precio de venta', { type: 'number', slotProps: { htmlInput: { min: 0, step: '0.01' } } })}
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            {field('minStock', 'Stock mínimo', { type: 'number', slotProps: { htmlInput: { min: 0, step: 1 } } })}
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Cancelar
        </Button>
        <Button type="submit" variant="contained" disabled={saving}>
          Guardar
        </Button>
      </DialogActions>
    </Dialog>
  );
}
