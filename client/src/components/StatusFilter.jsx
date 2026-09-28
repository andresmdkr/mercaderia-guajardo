import { ToggleButton, ToggleButtonGroup } from '@mui/material';

// Selector "Activos | De baja" para los listados.
export default function StatusFilter({ showInactive, onChange }) {
  return (
    <ToggleButtonGroup
      exclusive
      size="small"
      value={showInactive ? 'inactive' : 'active'}
      onChange={(event, value) => value && onChange(value === 'inactive')}
      sx={{ bgcolor: 'background.paper' }}
    >
      <ToggleButton value="active">Activos</ToggleButton>
      <ToggleButton value="inactive">De baja</ToggleButton>
    </ToggleButtonGroup>
  );
}
