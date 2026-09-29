import { useState } from 'react';
import { useSelector } from 'react-redux';
import { Alert, Box, Button, Chip, IconButton, TextField, Typography } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import PrintIcon from '@mui/icons-material/PrintOutlined';
import PageHeader from '../../../components/PageHeader';
import { toISODate } from '../../../utils/dateRange';
import { formatDayLong } from '../../../utils/format';
import useBusinessSettings from '../../settings/hooks/useBusinessSettings';
import CashCloseSummary from '../components/CashCloseSummary';
import useCashClose from '../hooks/useCashClose';
import { buildCashCloseHtml } from '../print/cashCloseHtml';
import { printDocument } from '../print/printDocument';

// Suma o resta días a una fecha AAAA-MM-DD (en hora local).
function shiftDay(isoDay, days) {
  const [year, month, day] = isoDay.split('-').map(Number);
  return toISODate(new Date(year, month - 1, day + days));
}

export default function CashClosePage() {
  const today = toISODate(new Date());
  const [date, setDate] = useState(today);
  const { data, loading, error } = useCashClose(date);
  const business = useBusinessSettings();
  const userName = useSelector((state) => state.session.user?.name);
  const [printError, setPrintError] = useState(null);

  const handlePrint = async () => {
    setPrintError(null);
    const result = await printDocument(buildCashCloseHtml(data, business.settings ?? { name: '' }, userName));
    if (!result.ok && !result.cancelled) setPrintError(result.message ?? 'No se pudo imprimir');
  };

  return (
    <>
      <PageHeader
        sectionKey="cashClose"
        title="Cierre de caja"
        actions={
          <Button variant="outlined" startIcon={<PrintIcon />} disabled={!data || loading} onClick={handlePrint}>
            Imprimir resumen
          </Button>
        }
      />

      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5, mb: 1 }}>
        <IconButton aria-label="Día anterior" onClick={() => setDate(shiftDay(date, -1))}>
          <ChevronLeftIcon />
        </IconButton>
        <TextField
          size="small"
          type="date"
          label="Día"
          value={date}
          onChange={(event) => event.target.value && setDate(event.target.value)}
          slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: today } }}
          sx={{ bgcolor: 'background.paper' }}
        />
        <IconButton aria-label="Día siguiente" disabled={date >= today} onClick={() => setDate(shiftDay(date, 1))}>
          <ChevronRightIcon />
        </IconButton>
        <Chip
          label="Hoy"
          clickable
          color={date === today ? 'primary' : 'default'}
          variant={date === today ? 'filled' : 'outlined'}
          onClick={() => setDate(today)}
        />
      </Box>
      <Typography color="text.secondary" sx={{ mb: 3, '&::first-letter': { textTransform: 'uppercase' } }}>
        {formatDayLong(date)}
      </Typography>

      {(error || printError) && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error ?? printError}
        </Alert>
      )}
      {data && <CashCloseSummary data={data} loading={loading} />}
    </>
  );
}
