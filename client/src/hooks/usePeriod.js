import { useState } from 'react';
import { presetRange } from '../utils/dateRange';

// Período elegido (preset o fechas a mano): { preset, from, to }.
export default function usePeriod(initialPreset = 'month') {
  const [period, setPeriod] = useState(() => ({ preset: initialPreset, ...presetRange(initialPreset) }));

  const setPreset = (preset) => setPeriod({ preset, ...presetRange(preset) });

  // Al tocar una fecha a mano, el período pasa a ser "personalizado".
  const setDate = (name, value) => setPeriod((prev) => ({ ...prev, preset: 'custom', [name]: value }));

  return { period, setPreset, setDate };
}
