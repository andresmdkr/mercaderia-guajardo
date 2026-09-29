import { useState } from 'react';
import {
  Alert,
  Button,
  IconButton,
  Paper,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import ConfirmDialog from '../../../components/ConfirmDialog';
import PageHeader from '../../../components/PageHeader';
import { getErrorMessage } from '../../../services/api';
import { createCategory, deleteCategory, updateCategory } from '../api/categoriesApi';
import CategoryDialog from '../components/CategoryDialog';
import useCategories from '../hooks/useCategories';

export default function CategoriesPage() {
  const { categories, error, reload } = useCategories();
  // undefined = diálogo cerrado, null = alta, objeto = renombrar
  const [editing, setEditing] = useState(undefined);
  const [deleting, setDeleting] = useState(null);
  const [message, setMessage] = useState(null);

  const handleSubmit = async (name) => {
    if (editing) {
      await updateCategory(editing.id, name);
      setMessage({ severity: 'success', text: 'Categoría actualizada' });
    } else {
      await createCategory(name);
      setMessage({ severity: 'success', text: 'Categoría creada' });
    }
    setEditing(undefined);
    reload();
  };

  const handleDelete = async () => {
    try {
      await deleteCategory(deleting.id);
      setMessage({ severity: 'success', text: 'Categoría eliminada' });
      reload();
    } catch (err) {
      setMessage({ severity: 'error', text: getErrorMessage(err) });
    } finally {
      setDeleting(null);
    }
  };

  return (
    <>
      <PageHeader
        sectionKey="categories"
        title="Categorías"
        actions={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setEditing(null)}>
            Nueva categoría
          </Button>
        }
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper sx={{ maxWidth: 720 }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Nombre</TableCell>
                <TableCell align="right">Productos</TableCell>
                <TableCell align="right">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {categories.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} align="center">
                    <Typography color="text.secondary" sx={{ py: 3 }}>
                      Todavía no hay categorías
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
              {categories.map((category) => (
                <TableRow key={category.id} hover>
                  <TableCell>{category.name}</TableCell>
                  <TableCell align="right">{category.productCount}</TableCell>
                  <TableCell align="right">
                    <Tooltip title="Renombrar">
                      <IconButton size="small" onClick={() => setEditing(category)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={category.productCount > 0 ? 'Tiene productos, no se puede eliminar' : 'Eliminar'}>
                      <span>
                        <IconButton size="small" disabled={category.productCount > 0} onClick={() => setDeleting(category)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {editing !== undefined && <CategoryDialog category={editing} onClose={() => setEditing(undefined)} onSubmit={handleSubmit} />}

      {deleting && (
        <ConfirmDialog
          title="Eliminar categoría"
          message={`¿Eliminar la categoría "${deleting.name}"?`}
          confirmLabel="Eliminar"
          onConfirm={handleDelete}
          onCancel={() => setDeleting(null)}
        />
      )}

      <Snackbar open={Boolean(message)} autoHideDuration={3000} onClose={() => setMessage(null)}>
        {message ? <Alert severity={message.severity}>{message.text}</Alert> : undefined}
      </Snackbar>
    </>
  );
}
