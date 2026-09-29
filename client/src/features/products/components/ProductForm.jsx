import { useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  InputAdornment,
  TextField,
  Typography,
  createFilterOptions,
} from '@mui/material';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import ActiveToggleButton from '../../../components/ActiveToggleButton';
import { getErrorMessage } from '../../../services/api';

const emptyValues = { code: '', name: '', costPrice: '', salePrice: '', minStock: '0', initialStock: '' };
const filter = createFilterOptions();
const moneyAdornment = { startAdornment: <InputAdornment position="start">$</InputAdornment> };

function toFormValues(product) {
  if (!product) return emptyValues;
  return {
    code: product.code,
    name: product.name,
    costPrice: String(product.costPrice),
    salePrice: String(product.salePrice),
    minStock: String(product.minStock),
    initialStock: '',
  };
}

// Validación para dar feedback rápido; el backend vuelve a validar todo.
function validate(values, isEditing) {
  const errors = {};
  // Al crear, el código es opcional (se genera uno automático); al editar es obligatorio.
  if (isEditing && !values.code.trim()) errors.code = 'Obligatorio';
  if (!values.name.trim()) errors.name = 'Obligatorio';
  if (values.costPrice === '' || Number(values.costPrice) < 0) errors.costPrice = 'Debe ser 0 o más';
  if (values.salePrice === '' || Number(values.salePrice) < 0) errors.salePrice = 'Debe ser 0 o más';
  if (!Number.isInteger(Number(values.minStock)) || Number(values.minStock) < 0) errors.minStock = 'Entero de 0 o más';
  if (values.initialStock !== '' && (!Number.isInteger(Number(values.initialStock)) || Number(values.initialStock) < 0)) {
    errors.initialStock = 'Entero de 0 o más';
  }
  return errors;
}

// Se monta solo cuando el diálogo está abierto, así el estado arranca limpio cada vez.
export default function ProductForm({ product, categories, onCreateCategory, onClose, onSubmit, onToggleActive }) {
  const [values, setValues] = useState(() => toFormValues(product));
  const [category, setCategory] = useState(product?.category ?? null);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [saving, setSaving] = useState(false);

  // El lector de códigos de barras "escribe" el código y termina con Enter: en vez de enviar el formulario a medio
  // llenar, el Enter pasa al campo siguiente (el nombre).
  const handleCodeKeyDown = (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    event.target.form?.elements.namedItem('name')?.focus(); // event.target = el input (currentTarget es el contenedor)
  };

  const handleChange = (field) => (event) => setValues((prev) => ({ ...prev, [field]: event.target.value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    const found = validate(values, Boolean(product));
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
        // El stock inicial solo se pide al crear; después se cambia con movimientos.
        ...(product ? {} : { initialStock: Number(values.initialStock || 0) }),
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
          <Grid size={{ xs: 12, sm: 4 }}>{field('code', 'Código', {
              autoFocus: true,
              placeholder: product ? undefined : 'Escaneá o escribí',
              onKeyDown: handleCodeKeyDown,
              onFocus: product ? undefined : (event) => event.target.select(), // al crear, escanear reemplaza lo escrito (al editar no se resalta)
              helperText: errors.code ?? (product ? undefined : 'Vacío = automático (P00001…)'),
              slotProps: {
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <QrCodeScannerIcon fontSize="small" />
                    </InputAdornment>
                  ),
                },
              },
            })}</Grid>
          <Grid size={{ xs: 12, sm: 8 }}>{field('name', 'Nombre', { name: 'name' })}</Grid>
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
            {field('costPrice', 'Precio de costo', { type: 'number', slotProps: { htmlInput: { min: 0, step: '0.01' }, input: moneyAdornment } })}
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            {field('salePrice', 'Precio de venta', { type: 'number', slotProps: { htmlInput: { min: 0, step: '0.01' }, input: moneyAdornment } })}
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            {field('minStock', 'Stock mínimo', { type: 'number', slotProps: { htmlInput: { min: 0, step: 1 } } })}
          </Grid>
          <Grid size={12}>
            {product ? (
              <Typography variant="body2" color="text.secondary">
                Stock actual: <strong>{product.stock}</strong>. Para cambiarlo, usá <em>Stock → Nuevo movimiento</em>.
              </Typography>
            ) : (
              field('initialStock', 'Stock inicial (opcional)', {
                type: 'number',
                helperText: errors.initialStock ?? 'Se registra como una entrada de stock',
                slotProps: { htmlInput: { min: 0, step: 1 } },
              })
            )}
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        {product && (
          <>
            <ActiveToggleButton
              active={product.active}
              description={`el producto "${product.name}"`}
              onToggle={onToggleActive}
              disabled={saving}
            />
            <Box sx={{ flexGrow: 1 }} />
          </>
        )}
        <Button color="inherit" onClick={onClose} disabled={saving}>
          Cancelar
        </Button>
        <Button type="submit" variant="contained" disabled={saving}>
          Guardar
        </Button>
      </DialogActions>
    </Dialog>
  );
}
