import {
  Chip,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import NotesIcon from '@mui/icons-material/StickyNote2Outlined';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import { whatsappUrl } from '../../../utils/whatsapp';

// Hacer clic en una fila abre el cliente para editarlo (o darlo de baja).
export default function CustomersTable({ items, total, page, pageSize, onPageChange, onEdit }) {
  return (
    <Paper>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Nombre</TableCell>
              <TableCell>Teléfono</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Dirección</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  <Typography color="text.secondary" sx={{ py: 3 }}>
                    No hay clientes para mostrar
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            {items.map((customer) => (
              <TableRow key={customer.id} hover onClick={() => onEdit(customer)} sx={{ cursor: 'pointer' }}>
                <TableCell>
                  {customer.name}
                  {!customer.active && <Chip size="small" label="De baja" sx={{ ml: 1 }} />}
                  {customer.notes && (
                    <Tooltip title={customer.notes}>
                      <NotesIcon fontSize="inherit" sx={{ ml: 1, verticalAlign: 'middle', color: 'text.secondary' }} />
                    </Tooltip>
                  )}
                </TableCell>
                <TableCell>
                  {customer.phone ?? '—'}
                  {whatsappUrl(customer.phone) && (
                    <Tooltip title="Abrir WhatsApp">
                      <IconButton
                        size="small"
                        color="success"
                        component="a"
                        href={whatsappUrl(customer.phone)}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Abrir WhatsApp de ${customer.name}`}
                        onClick={(event) => event.stopPropagation()} // no abrir la edición del cliente
                        sx={{ ml: 0.5 }}
                      >
                        <WhatsAppIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </TableCell>
                <TableCell>{customer.email ?? '—'}</TableCell>
                <TableCell>{customer.address ?? '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        component="div"
        count={total}
        page={page - 1}
        rowsPerPage={pageSize}
        rowsPerPageOptions={[]}
        onPageChange={(event, newPage) => onPageChange(newPage + 1)}
        labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`}
      />
    </Paper>
  );
}
