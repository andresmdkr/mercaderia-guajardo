import { useState } from 'react';
import { TextField } from '@mui/material';

// Casillero del "Precio nuevo": muestra el precio calculado y deja escribir uno exacto (en pesos).
// Se confirma con Enter o al salir del casillero; si lo escrito no sirve, vuelve al valor anterior.
export default function PriceCell({ item, busy, onCommit }) {
  const [text, setText] = useState(String(item.newPrice));

  const commit = () => {
    const price = Number(text);
    if (text.trim() === '' || !Number.isFinite(price) || price <= 0 || price === item.newPrice) return setText(String(item.newPrice));
    return onCommit(price);
  };

  return (
    <TextField
      value={text}
      onChange={(event) => setText(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault(); // que el Enter no envíe ningún formulario
          event.target.blur();
        }
      }}
      type="number"
      size="small"
      disabled={busy}
      slotProps={{
        htmlInput: { step: 'any', min: 0, 'aria-label': `Precio nuevo de ${item.name}`, style: { textAlign: 'right', fontWeight: item.manual ? 700 : 600, width: 84 } },
        input: { startAdornment: '$ ' },
      }}
      color={item.manual ? 'warning' : 'primary'}
      focused={item.manual || undefined}
    />
  );
}
