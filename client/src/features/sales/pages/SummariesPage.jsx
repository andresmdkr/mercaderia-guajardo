import { useState } from 'react';
import { useSelector } from 'react-redux';
import { Alert, Box, Button, Typography } from '@mui/material';
import PrintIcon from '@mui/icons-material/PrintOutlined';
import PageHeader from '../../../components/PageHeader';
import PeriodFilter from '../../../components/PeriodFilter';
import usePeriod from '../../../hooks/usePeriod';
import { formatPeriodLabel } from '../../../utils/format';
import useBusinessSettings from '../../settings/hooks/useBusinessSettings';
import PeriodSummary from '../components/PeriodSummary';
import usePeriodSummary from '../hooks/usePeriodSummary';
import { printDocument } from '../print/printDocument';
import { buildSummaryHtml } from '../print/summaryHtml';

// Resumen de lo vendido en un día, una semana, un mes o entre dos fechas, con la opción de imprimirlo.
export default function SummariesPage() {
  const { period, setPreset, setDate } = usePeriod('today');
  const { data, loading, error } = usePeriodSummary(period);
  const business = useBusinessSettings();
  const userName = useSelector((state) => state.session.user?.name);
  const [printError, setPrintError] = useState(null);

  const handlePrint = async () => {
    setPrintError(null);
    const result = await printDocument(buildSummaryHtml(data, business.settings ?? { name: '' }, userName));
    if (!result.ok && !result.cancelled) setPrintError(result.message ?? 'No se pudo imprimir');
  };

  return (
    <>
      <PageHeader
        sectionKey="summaries"
        title="Resúmenes"
        actions={
          <Button variant="outlined" startIcon={<PrintIcon />} disabled={!data || loading} onClick={handlePrint}>
            Imprimir resumen
          </Button>
        }
      />

      <Box sx={{ mb: 1 }}>
        <PeriodFilter period={period} onPreset={setPreset} onDate={setDate} />
      </Box>
      <Typography color="text.secondary" sx={{ mb: 3, '&::first-letter': { textTransform: 'uppercase' } }}>
        {formatPeriodLabel(period.from, period.to)}
      </Typography>

      {(error || printError) && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error ?? printError}
        </Alert>
      )}
      {data && <PeriodSummary data={data} loading={loading} />}
    </>
  );
}
