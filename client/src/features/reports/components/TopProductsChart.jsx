import { useState } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatCompactMoney, formatInteger, formatMoney } from '../../../utils/format';

const ROW_HEIGHT = 40;
const MAX_LABEL_LENGTH = 34;

const truncate = (text) => (text.length > MAX_LABEL_LENGTH ? `${text.slice(0, MAX_LABEL_LENGTH - 1)}…` : text);

// Tooltip de una barra: el valor manda, el nombre acompaña.
function BarTooltip({ active, payload, isRevenue }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  const main = isRevenue ? formatMoney(row.revenue) : `${formatInteger(row.quantity)} unidades`;
  const other = isRevenue ? `${formatInteger(row.quantity)} unidades` : formatMoney(row.revenue);

  return (
    <Paper sx={{ p: 1.5, boxShadow: 3 }}>
      <Typography sx={{ fontWeight: 700, lineHeight: 1.2 }}>{main}</Typography>
      <Typography variant="body2">{row.name}</Typography>
      <Typography variant="caption" color="text.secondary">
        {row.code} · {other}
      </Typography>
    </Paper>
  );
}

function ChartView({ rows, isRevenue }) {
  const theme = useTheme();
  const color = theme.palette.sections.reports; // una sola serie → un solo color
  const data = rows.map((row) => ({ ...row, value: isRevenue ? row.revenue : row.quantity, label: truncate(row.name) }));
  const formatValue = isRevenue ? formatMoney : formatInteger;

  return (
    <Box
      role="img"
      aria-label={`Gráfico de barras de los ${rows.length} productos más vendidos por ${isRevenue ? 'facturación' : 'unidades'}. El detalle está en la vista de tabla.`}
    >
      <ResponsiveContainer width="100%" height={data.length * ROW_HEIGHT + 40}>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 96, bottom: 4, left: 4 }}>
          <CartesianGrid horizontal={false} stroke={theme.palette.divider} />
          <XAxis
            type="number"
            tickFormatter={isRevenue ? formatCompactMoney : formatInteger}
            tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="label"
            width={215}
            tick={{ fill: theme.palette.text.primary, fontSize: 13 }}
            axisLine={{ stroke: theme.palette.divider }}
            tickLine={false}
          />
          <Tooltip
            content={<BarTooltip isRevenue={isRevenue} />}
            cursor={{ fill: alpha(theme.palette.text.primary, 0.05) }}
            isAnimationActive={false}
          />
          {/* Barras finas, con el extremo redondeado y apoyadas en la línea base */}
          <Bar
            dataKey="value"
            fill={color}
            barSize={18}
            radius={[0, 4, 4, 0]}
            activeBar={{ fillOpacity: 0.8 }}
            isAnimationActive={false}
          >
            <LabelList
              dataKey="value"
              position="right"
              formatter={formatValue}
              fill={theme.palette.text.secondary}
              fontSize={12}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
}

function TableView({ rows }) {
  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>#</TableCell>
            <TableCell>Producto</TableCell>
            <TableCell align="right">Unidades</TableCell>
            <TableCell align="right">Facturación</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row, index) => (
            <TableRow key={row.productId} hover>
              <TableCell>{index + 1}</TableCell>
              <TableCell>
                {row.name}
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  {row.code}
                </Typography>
              </TableCell>
              <TableCell align="right">{formatInteger(row.quantity)}</TableCell>
              <TableCell align="right">{formatMoney(row.revenue)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

// Ranking de productos más vendidos: gráfico de barras o tabla, por unidades o por facturación.
export default function TopProductsChart({ rows, sort, onSortChange, loading }) {
  const [view, setView] = useState('chart');
  const isRevenue = sort === 'revenue';

  return (
    <Paper sx={{ p: 2.5 }}>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2, mb: 2 }}>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h6">Productos más vendidos</Typography>
          <Typography variant="body2" color="text.secondary">
            Los 10 primeros del período, por {isRevenue ? 'facturación (antes de descuentos)' : 'unidades vendidas'}
          </Typography>
        </Box>
        <ToggleButtonGroup exclusive size="small" value={sort} onChange={(event, value) => value && onSortChange(value)}>
          <ToggleButton value="quantity">Unidades</ToggleButton>
          <ToggleButton value="revenue">Facturación</ToggleButton>
        </ToggleButtonGroup>
        <ToggleButtonGroup exclusive size="small" value={view} onChange={(event, value) => value && setView(value)}>
          <ToggleButton value="chart">Gráfico</ToggleButton>
          <ToggleButton value="table">Tabla</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {rows.length === 0 ? (
        <Typography color="text.secondary" sx={{ py: 6, textAlign: 'center' }}>
          No hay ventas en este período
        </Typography>
      ) : (
        // Al recargar se conserva el gráfico anterior, atenuado (sin saltos de pantalla)
        <Box sx={{ opacity: loading ? 0.5 : 1, transition: 'opacity 0.15s' }}>
          {view === 'chart' ? <ChartView rows={rows} isRevenue={isRevenue} /> : <TableView rows={rows} />}
        </Box>
      )}
    </Paper>
  );
}
