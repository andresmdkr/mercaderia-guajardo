import { useEffect, useState } from 'react';
import { Alert, Box, Button, IconButton, Tooltip, Typography } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopyOutlined';
import LanIcon from '@mui/icons-material/LanOutlined';
import ConfirmDialog from '../../../components/ConfirmDialog';
import { desktop } from '../../../services/desktop';
import SettingsCard from './SettingsCard';
import SwitchOption from './SwitchOption';

// Usar el programa desde dos computadoras del local. Solo en la app instalada.
//  · PC principal: guarda los datos y puede dejar entrar a otra PC por la red (opción apagada de fábrica).
//  · Segunda PC: está conectada a la principal y usa sus datos.
export default function NetworkCard({ onMessage }) {
  const [info, setInfo] = useState(null);
  const [confirming, setConfirming] = useState(null); // 'on' | 'off' | 'disconnect'
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    desktop?.getInfo().then((value) => !cancelled && setInfo(value));
    return () => {
      cancelled = true;
    };
  }, []);

  if (!desktop || !info) return null;

  const run = async (action) => {
    setConfirming(null);
    setBusy(true);
    setError(null);
    const result = await action();
    if (result?.ok === false) {
      setError(result.message ?? 'No se pudo hacer el cambio');
      setBusy(false);
    } // si salió bien, la aplicación se reinicia sola
  };

  const copy = async (url) => {
    try {
      await navigator.clipboard.writeText(url);
      onMessage('Dirección copiada');
    } catch {
      onMessage('No se pudo copiar: escribila a mano');
    }
  };

  if (info.role === 'client') {
    return (
      <SettingsCard icon={LanIcon} title="Conexión con la PC principal" description="Esta computadora usa los datos de la PC principal: no guarda nada propio.">
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Typography variant="body2" sx={{ mb: 2 }}>
          Conectada a <strong>{info.serverUrl}</strong>
        </Typography>
        <Button variant="outlined" color="inherit" onClick={() => setConfirming('disconnect')} disabled={busy}>
          Desconectar de la PC principal
        </Button>
        {confirming === 'disconnect' && (
          <ConfirmDialog
            title="Desconectar de la PC principal"
            message="El programa se reinicia y vuelve a preguntar cómo se usa esta computadora. Los datos de la PC principal no se tocan."
            confirmLabel="Desconectar"
            color="primary"
            onCancel={() => setConfirming(null)}
            onConfirm={() => run(() => desktop.disconnect())}
          />
        )}
      </SettingsCard>
    );
  }

  const { enabled, urls } = info.lan;
  return (
    <SettingsCard
      icon={LanIcon}
      title="Usar desde otra computadora"
      description="Para que otra persona trabaje con los mismos datos desde otra PC del local (conectada al mismo router)."
    >
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <SwitchOption
        checked={enabled}
        onChange={(value) => setConfirming(value ? 'on' : 'off')}
        disabled={busy}
        title="Permitir que otra computadora se conecte"
        description="Esta PC queda como la principal y tiene que estar prendida. El programa arranca solo con Windows y, al cerrar la ventana, sigue funcionando junto al reloj."
      />

      {enabled && (
        <Box sx={{ mt: 2.5 }}>
          {urls.length > 0 ? (
            <>
              <Typography sx={{ fontWeight: 600, mb: 0.5 }}>Dirección para escribir en la otra computadora</Typography>
              {urls.map((item) => (
                <Box key={item.url} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Typography sx={{ fontFamily: 'monospace', fontSize: 17 }}>{item.url.replace('http://', '').replace(`:${info.lan.port}`, '')}</Typography>
                  <Tooltip title="Copiar">
                    <IconButton size="small" aria-label={`Copiar ${item.url}`} onClick={() => copy(item.url)}>
                      <ContentCopyIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              ))}
            </>
          ) : (
            <Alert severity="warning">No encuentro la dirección de esta PC en la red. Revisá que esté conectada al router.</Alert>
          )}
          <Typography variant="body2" component="div" sx={{ mt: 2 }}>
            <strong>En la otra computadora:</strong>
            <ol style={{ margin: '4px 0 0', paddingLeft: 20 }}>
              <li>Instalá Mercadería Guajardo (el mismo instalador).</li>
              <li>Al abrirlo, elegí <em>“Es una segunda PC”</em> y escribí la dirección de arriba.</li>
              <li>En la pestaña <em>Usuarios</em> de esta pantalla, agregá a la persona que la va a usar.</li>
            </ol>
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
            La primera vez, Windows puede preguntar si permite el acceso de este programa a la red: aceptá en redes privadas.
            Conviene reservar la IP de esta PC en el router, para que la dirección no cambie.
          </Typography>
        </Box>
      )}

      {confirming && confirming !== 'disconnect' && (
        <ConfirmDialog
          title={confirming === 'on' ? 'Permitir que otra computadora se conecte' : 'Dejar de permitir otras computadoras'}
          message={
            confirming === 'on'
              ? 'El programa se reinicia. Desde ahora esta PC queda como la principal: tiene que estar prendida para que la otra funcione, y el programa arranca solo con Windows. Cada persona entra con su usuario y contraseña.'
              : 'El programa se reinicia. La otra computadora ya no va a poder conectarse. Los datos no se tocan.'
          }
          confirmLabel={confirming === 'on' ? 'Activar' : 'Desactivar'}
          color="primary"
          onCancel={() => setConfirming(null)}
          onConfirm={() => run(() => desktop.setLan(confirming === 'on'))}
        />
      )}
    </SettingsCard>
  );
}
