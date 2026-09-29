import { NavLink, useLocation } from 'react-router-dom';
import { Tab, Tabs } from '@mui/material';
import { menuItems } from '../theme/sections';

// Pestañas de una sección (arriba de la pantalla): Ventas → Historial | Resúmenes, Productos → Productos | Stock | ...
// Solo aparecen en las pantallas que son una pestaña (no en Nueva venta, que es una pantalla de trabajo).
export default function SectionTabs() {
  const { pathname } = useLocation();
  const group = menuItems.find((item) => item.tabs?.some((tab) => tab.path === pathname));
  if (!group) return null;

  return (
    <Tabs
      value={pathname}
      variant="scrollable"
      scrollButtons="auto"
      aria-label={`Secciones de ${group.label}`}
      sx={{
        mb: 3,
        minHeight: 42,
        borderBottom: 1,
        borderColor: 'divider',
        '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, fontSize: 14.5, minHeight: 42, px: 2 },
      }}
    >
      {group.tabs.map((tab) => (
        <Tab key={tab.path} value={tab.path} label={tab.label} component={NavLink} to={tab.path} />
      ))}
    </Tabs>
  );
}
