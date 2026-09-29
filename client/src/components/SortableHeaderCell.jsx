import { TableCell, TableSortLabel } from '@mui/material';

// Encabezado de columna que se puede tocar para ordenar el listado.
//   sort = { field, direction } (field null = orden de siempre de la pantalla)
//   onSort(field) = pide ordenar por esa columna (ver useSort)
export default function SortableHeaderCell({ field, sort, onSort, align, children }) {
  const active = sort.field === field;
  return (
    <TableCell align={align} sortDirection={active ? sort.direction : false}>
      <TableSortLabel active={active} direction={active ? sort.direction : 'asc'} onClick={() => onSort(field)}>
        {children}
      </TableSortLabel>
    </TableCell>
  );
}
