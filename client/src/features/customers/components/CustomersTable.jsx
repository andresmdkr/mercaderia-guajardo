import { useState } from 'react';
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
} from '@mui/material';
import NotesIcon from '@mui/icons-material/StickyNote2Outlined';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import TableEmptyRow from '../../../components/TableEmptyRow';
import SortableHeaderCell from '../../../components/SortableHeaderCell';
import { onEnter } from '../../../utils/keyboard';
import { whatsappUrl } from '../../../utils/whatsapp';
import WhatsAppDialog from './WhatsAppDialog';

// Hacer clic en una fila abre el cliente para editarlo (o darlo de baja).
export default function CustomersTable({ items, total, page, pageSize, onPageChange, onEdit, sort, onSort, loading, emptyState }) {
  const [whatsappCustomer, setWhatsappCustomer] = useState(null);

  return (
    <Paper>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <SortableHeaderCell field="name" sort={sort} onSort={onSort}>
                Nombre
              </SortableHeaderCell>
              <SortableHeaderCell field="phone" sort={sort} onSort={onSort}>
                Teléfono
              </SortableHeaderCell>
              <SortableHeaderCell field="email" sort={sort} onSort={onSort}>
                Email
              </SortableHeaderCell>
              <TableCell>Dirección</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.length === 0 && (
              <TableEmptyRow colSpan={4} loading={loading}>
                {emptyState}
              </TableEmptyRow>
            )}
            {items.map((customer) => (
              <TableRow
                key={customer.id}
                hover
                tabIndex={0}
                onClick={() => onEdit(customer)}
                onKeyDown={onEnter(() => onEdit(customer))}
                sx={{ cursor: 'pointer' }}
              >
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
                    <Tooltip title="WhatsApp">
                      <IconButton
                        size="small"
                        color="success"
                        aria-label={`WhatsApp de ${customer.name}`}
                        onClick={(event) => {
                          event.stopPropagation(); // no abrir la edición del cliente
                          setWhatsappCustomer(customer);
                        }}
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
      {whatsappCustomer && <WhatsAppDialog customer={whatsappCustomer} onClose={() => setWhatsappCustomer(null)} />}
    </Paper>
  );
}
