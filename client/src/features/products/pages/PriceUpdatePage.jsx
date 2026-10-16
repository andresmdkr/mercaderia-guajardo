import { useState } from 'react';
import { useBlocker } from 'react-router-dom';
import { Alert, Box, Snackbar } from '@mui/material';
import ConfirmDialog from '../../../components/ConfirmDialog';
import PageHeader from '../../../components/PageHeader';
import useCategories from '../../categories/hooks/useCategories';
import PriceHistoryCard from '../components/PriceHistoryCard';
import PricePreviewTable from '../components/PricePreviewTable';
import PriceUpdateForm from '../components/PriceUpdateForm';
import usePriceUpdates from '../hooks/usePriceUpdates';

// Subir o bajar los precios de muchos productos de una vez, viendo antes cómo quedan, y poder deshacerlo.
export default function PriceUpdatePage() {
  const { categories } = useCategories();
  const updates = usePriceUpdates();
  const [confirming, setConfirming] = useState(false);
  const [undoing, setUndoing] = useState(null); // lote elegido para deshacer
  const [message, setMessage] = useState(null);

  const handleApply = async () => {
    setConfirming(false);
    const outcome = await updates.apply();
    if (outcome) setMessage(`Precios actualizados en ${outcome.count} ${outcome.count === 1 ? 'producto' : 'productos'}`);
  };

  const handleUndo = async () => {
    const batch = undoing;
    setUndoing(null);
    const outcome = await updates.undo(batch.id);
    if (outcome) {
      setMessage(
        outcome.skipped > 0
          ? `Se deshizo en ${outcome.restored} productos. ${outcome.skipped} no se tocaron porque se editaron después.`
          : `Se deshizo la actualización (${outcome.restored} productos)`
      );
    }
  };

  const count = updates.preview?.result.count ?? 0;

  // Si hay precios puestos a mano sin aplicar, avisa antes de irse a otra pantalla (se perderían).
  const hasUnsavedEdits = Object.keys(updates.preview?.body.overrides ?? {}).length > 0;
  const leaving = useBlocker(({ currentLocation, nextLocation }) => hasUnsavedEdits && currentLocation.pathname !== nextLocation.pathname);

  return (
    <>
      <PageHeader sectionKey="prices" title="Actualizar precios" />

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, maxWidth: 900 }}>
        {updates.error && <Alert severity="error">{updates.error}</Alert>}

        <PriceUpdateForm categories={categories} busy={updates.busy} onPreview={updates.showPreview} onChange={updates.clearPreview} />

        {updates.preview && (
          <PricePreviewTable
            preview={updates.preview.result}
            showCost={updates.preview.body.costPercent !== undefined}
            busy={updates.busy}
            onApply={() => setConfirming(true)}
            onOverride={updates.setOverride}
            onDiscardManual={updates.discardManual}
          />
        )}

        <PriceHistoryCard items={updates.history} busy={updates.busy} onUndo={setUndoing} />
      </Box>

      {leaving.state === 'blocked' && (
        <ConfirmDialog
          title="¿Salir sin aplicar?"
          message="Pusiste precios a mano que todavía no se aplicaron. Si salís ahora, se pierden."
          confirmLabel="Salir sin aplicar"
          onConfirm={() => leaving.proceed()}
          onCancel={() => leaving.reset()}
        />
      )}
      {confirming && (
        <ConfirmDialog
          title="Aplicar los cambios"
          message={`Se van a cambiar los precios de ${count} ${count === 1 ? 'producto' : 'productos'}. Las ventas ya hechas no se modifican, y podés deshacerlo desde el historial.`}
          confirmLabel="Aplicar"
          onConfirm={handleApply}
          onCancel={() => setConfirming(false)}
        />
      )}
      {undoing && (
        <ConfirmDialog
          title="Deshacer la actualización"
          message={`Los ${undoing.count} productos vuelven a los precios que tenían antes de esta actualización. Los que hayas editado a mano después no se tocan.`}
          confirmLabel="Deshacer"
          onConfirm={handleUndo}
          onCancel={() => setUndoing(null)}
        />
      )}

      <Snackbar open={Boolean(message)} autoHideDuration={6000} onClose={() => setMessage(null)}>
        <Alert severity="success">{message}</Alert>
      </Snackbar>
    </>
  );
}
