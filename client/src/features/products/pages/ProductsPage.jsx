import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControlLabel,
  InputAdornment,
  MenuItem,
  Snackbar,
  Switch,
  TextField,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import ClearFiltersButton from '../../../components/ClearFiltersButton';
import PageHeader from '../../../components/PageHeader';
import StatusFilter from '../../../components/StatusFilter';
import { getErrorMessage } from '../../../services/api';
import { createCategory } from '../../categories/api/categoriesApi';
import useCategories from '../../categories/hooks/useCategories';
import { createProduct, setProductActive, updateProduct } from '../api/productsApi';
import useProducts from '../hooks/useProducts';
import ProductForm from '../components/ProductForm';
import ProductsTable from '../components/ProductsTable';

export default function ProductsPage() {
  const products = useProducts();
  const categories = useCategories();
  // undefined = diálogo cerrado, null = alta, objeto = edición
  const [editing, setEditing] = useState(undefined);
  const [message, setMessage] = useState(null);

  const handleSubmit = async (values) => {
    if (editing) {
      await updateProduct(editing.id, values);
      setMessage({ severity: 'success', text: 'Producto actualizado' });
    } else {
      await createProduct(values);
      setMessage({ severity: 'success', text: 'Producto creado' });
    }
    setEditing(undefined);
    products.reload();
  };

  // Crear una categoría desde el formulario de producto; devuelve la nueva para seleccionarla.
  const handleCreateCategory = async (name) => {
    const created = await createCategory(name);
    categories.reload();
    return created;
  };

  // Se dispara desde el formulario de edición (botón "Dar de baja" / "Reactivar").
  const handleToggleActive = async () => {
    const product = editing;
    try {
      await setProductActive(product.id, !product.active);
      setMessage({ severity: 'success', text: product.active ? 'Producto dado de baja' : 'Producto reactivado' });
      setEditing(undefined);
      products.reload();
    } catch (error) {
      setMessage({ severity: 'error', text: getErrorMessage(error) });
    }
  };

  return (
    <>
      <PageHeader
        sectionKey="products"
        title="Productos"
        actions={
          <>
            {products.loading && <CircularProgress size={22} />}
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setEditing(null)}>
              Nuevo producto
            </Button>
          </>
        }
      />

      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2, mb: 2 }}>
        <TextField
          size="small"
          placeholder="Buscar por código o nombre"
          value={products.search}
          onChange={(event) => products.setSearch(event.target.value)}
          sx={{ minWidth: 280, bgcolor: 'background.paper' }}
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
        <TextField
          select
          size="small"
          label="Categoría"
          value={products.categoryId}
          onChange={(event) => products.setCategoryId(event.target.value)}
          sx={{ minWidth: 200, bgcolor: 'background.paper' }}
        >
          <MenuItem value="">Todas</MenuItem>
          {categories.categories.map((category) => (
            <MenuItem key={category.id} value={category.id}>
              {category.name}
            </MenuItem>
          ))}
        </TextField>
        <FormControlLabel
          control={<Switch checked={products.lowStock} onChange={(event) => products.setLowStock(event.target.checked)} />}
          label="Solo stock bajo"
        />
        <StatusFilter showInactive={products.showInactive} onChange={products.setShowInactive} />
        <ClearFiltersButton visible={products.hasActiveFilters} onClick={products.clearFilters} />
      </Box>

      {products.error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {products.error}
        </Alert>
      )}

      <ProductsTable
        items={products.items}
        total={products.total}
        page={products.page}
        pageSize={products.pageSize}
        onPageChange={products.setPage}
        sort={products.sort}
        onSort={products.toggleSort}
        onEdit={setEditing}
      />

      {editing !== undefined && (
        <ProductForm
          product={editing}
          categories={categories.categories}
          onCreateCategory={handleCreateCategory}
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
