import { useState } from 'react';
import { Alert, Box } from '@mui/material';
import PageHeader from '../../../components/PageHeader';
import PeriodFilter from '../../../components/PeriodFilter';
import usePeriod from '../../../hooks/usePeriod';
import LowStockTable from '../components/LowStockTable';
import SummaryTiles from '../components/SummaryTiles';
import TopProductsChart from '../components/TopProductsChart';
import useLowStock from '../hooks/useLowStock';
import useSalesReport from '../hooks/useSalesReport';

export default function ReportsPage() {
  const { period, setPreset, setDate } = usePeriod('month');
  const [sort, setSort] = useState('quantity');
  const report = useSalesReport(period, sort);
  const lowStock = useLowStock();

  return (
    <>
      <PageHeader sectionKey="reports" title="Reportes" />

      {/* Un solo filtro arriba: todo lo de ventas se recalcula con el mismo período */}
      <Box sx={{ mb: 3 }}>
        <PeriodFilter period={period} onPreset={setPreset} onDate={setDate} />
      </Box>

      {report.error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {report.error}
        </Alert>
      )}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <SummaryTiles summary={report.summary} loading={report.loading} />
        <TopProductsChart rows={report.topProducts} sort={sort} onSortChange={setSort} loading={report.loading} />

        {lowStock.error && <Alert severity="error">{lowStock.error}</Alert>}
        <LowStockTable
          items={lowStock.items}
          total={lowStock.total}
          page={lowStock.page}
          pageSize={lowStock.pageSize}
          onPageChange={lowStock.setPage}
          loading={lowStock.loading}
        />
      </Box>
    </>
  );
}
