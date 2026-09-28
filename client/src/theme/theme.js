import { createTheme } from '@mui/material';

const SANS = 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
const SERIF = 'ui-serif, Georgia, Cambria, "Times New Roman", serif';

// Un color por sección de la app. Se usan en el menú, los títulos y la portada.
const sectionColors = {
  light: {
    home: '#7A7568',
    products: '#C15F3C',
    categories: '#C15F3C', // subgrupo de Productos: hereda su color
    customers: '#4F7CA8',
    stock: '#B8862E',
    sales: '#4E8B5F',
    reports: '#3E8E8E',
  },
  dark: {
    home: '#A6A196',
    products: '#E08A6A',
    categories: '#E08A6A',
    customers: '#7FA6CF',
    stock: '#DDB25C',
    sales: '#7FBF92',
    reports: '#6FC0C0',
  },
};

const palettes = {
  light: {
    primary: { main: '#C15F3C', contrastText: '#FFFFFF' },
    background: { default: '#FAF9F5', paper: '#FFFFFF' },
    text: { primary: '#29261B', secondary: '#6B6558' },
    divider: '#E6E3D8',
    sidebar: '#F3F1EA',
  },
  dark: {
    primary: { main: '#D97757', contrastText: '#1F1E1D' },
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
      MuiCssBaseline: { defaultProps: { enableColorScheme: true } },
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
          root: ({ theme }) => ({ borderColor: theme.palette.divider }),
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
