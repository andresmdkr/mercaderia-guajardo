import { useState } from 'react';
import { InputAdornment, TextField } from '@mui/material';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';

// Campo para tipear o escanear un código: con Enter se agrega el producto y el campo queda listo.
export default function CodeEntry({ onSubmit, error, inputRef }) {
  const [code, setCode] = useState('');

  const handleKeyDown = (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    onSubmit(code);
    setCode('');
  };

  return (
    <TextField
      label="Código del producto"
      placeholder="Escribí o escaneá y apretá Enter"
      value={code}
      onChange={(event) => setCode(event.target.value)}
      onKeyDown={handleKeyDown}
      error={Boolean(error)}
      helperText={error}
      inputRef={inputRef}
      autoFocus
      fullWidth
      size="small"
      slotProps={{
        input: {
          startAdornment: (
            <InputAdornment position="start">
              <QrCodeScannerIcon fontSize="small" />
            </InputAdornment>
          ),
        },
      }}
    />
  );
}
