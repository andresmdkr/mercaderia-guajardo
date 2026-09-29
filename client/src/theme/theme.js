import { createTheme } from '@mui/material';

const SANS = '"Inter Variable", system-ui, "Segoe UI", Roboto, Arial, sans-serif';
const SERIF = 'ui-serif, Georgia, Cambria, "Times New Roman", serif';

// Un color por sección de la app. Se usan en el menú, los títulos y la portada.
const sectionColors = {
  light: {
    home: '#7A7568',
    products: '#C15F3C',
    categories: '#9563A3',
    customers: '#4F7CA8',
    stock: '#B8862E',
    prices: '#B8862E',
    sales: '#4E8B5F',
    summaries: '#4E8B5F',
    reports: '#3E8E8E',
    settings: '#7A7568',
  },
  dark: {
    home: '#A6A196',
    products: '#E08A6A',
    categories: '#BE92CC',
    customers: '#7FA6CF',
    stock: '#DDB25C',
    prices: '#DDB25C',
    sales: '#7FBF92',
    summaries: '#7FBF92',
    reports: '#6FC0C0',
    settings: '#A6A196',
  },
};

const palettes = {
  light: {
    primary: { main: '#B5532F', contrastText: '#FFFFFF' }, // terracota apenas más oscuro que #C15F3C: contraste 4,95:1 con letra blanca (antes 4,2:1)
    // El naranja por defecto de MUI tiene poco contraste con texto blanco: se oscurece.
    warning: { main: '#B45309', contrastText: '#FFFFFF' },
    background: { default: '#FAF9F5', paper: '#FFFFFF' },
    text: { primary: '#29261B', secondary: '#6B6558' },
    divider: '#E6E3D8',
    sidebar: '#F3F1EA',
  },
  dark: {
    primary: { main: '#D97757', contrastText: '#1F1E1D' },
    warning: { main: '#F0A93A', contrastText: '#1F1E1D' },
    background: { default: '#262624', paper: '#30302E' },
    text: { primary: '#FAF9F5', secondary: '#A6A39A' },
    divider: '#403F3B',
    sidebar: '#1F1E1D',
  },
};

export function buildTheme(mode) {
  return createTheme({
    palette: { mode, ...palettes[mode], sections: sectionColors[mode] },
    shape: { borderRadius: 12 },
    typography: {
      fontFamily: SANS,
      h1: { fontFamily: SERIF },
      h2: { fontFamily: SERIF },
      h3: { fontFamily: SERIF },
      h4: { fontFamily: SERIF, fontWeight: 500, letterSpacing: '-0.01em' },
      h5: { fontFamily: SERIF, fontWeight: 500, letterSpacing: '-0.01em' },
      h6: { fontFamily: SERIF, fontWeight: 500 },
      button: { textTransform: 'none', fontWeight: 600 },
    },
    components: {
      MuiCssBaseline: {
        defaultProps: { enableColorScheme: true },
        styleOverrides: (theme) => ({
          // Foco visible al navegar con el teclado (Tab): un contorno claro. Con el mouse no aparece (:focus-visible).
          'a:focus-visible, [tabindex]:focus-visible': { outline: `2px solid ${theme.palette.primary.main}`, outlineOffset: 2 },
          // Las filas de las tablas se recorren con Tab y se abren con Enter: el contorno va por dentro de la fila.
          'tr[tabindex]:focus-visible': { outlineOffset: -2 },
          '.MuiTableRow-hover': { transition: 'background-color 120ms ease' },
          // Quien tiene activado "reducir movimiento" en Windows no ve animaciones.
          '@media (prefers-reduced-motion: reduce)': {
            '*, *::before, *::after': { animationDuration: '0.01ms !important', transitionDuration: '0.01ms !important' },
          },
        }),
      },
      // Botones, íconos, chips, ítems del menú y encabezados ordenables: mismo contorno de foco por teclado.
      MuiButtonBase: {
        styleOverrides: {
          root: ({ theme }) => ({
            '&.Mui-focusVisible': { outline: `2px solid ${theme.palette.primary.main}`, outlineOffset: 2 },
          }),
        },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: { root: { borderRadius: 10 } },
      },
      // Sin sombras: las superficies se separan con un borde fino.
      MuiPaper: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: ({ theme }) => ({ backgroundImage: 'none', border: `1px solid ${theme.palette.divider}` }),
        },
      },
      MuiTableCell: {
        styleOverrides: {
          // Cifras tabulares: todos los dígitos ocupan el mismo ancho, así los importes quedan alineados por decimales.
          root: ({ theme }) => ({ borderColor: theme.palette.divider, fontVariantNumeric: 'tabular-nums' }),
          head: ({ theme }) => ({
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            color: theme.palette.text.secondary,
          }),
        },
      },
      MuiChip: { styleOverrides: { root: { fontWeight: 600 } } },
      MuiToggleButton: {
        styleOverrides: { root: { textTransform: 'none', fontWeight: 600, paddingInline: 16, borderRadius: 10 } },
      },
      MuiOutlinedInput: { styleOverrides: { root: { borderRadius: 10 } } },
      MuiDialog: { styleOverrides: { paper: { borderRadius: 16 } } },
      MuiDrawer: { styleOverrides: { paper: { borderRadius: 0 } } },
    },
  });
}
