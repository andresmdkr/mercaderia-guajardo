import { NavLink, useLocation } from 'react-router-dom';
import { Tab, Tabs } from '@mui/material';
import { desktop } from '../services/desktop';
import { menuItems, settingsMenuItem } from '../theme/sections';

// Pestañas de una sección (arriba de la pantalla): Ventas → Historial | Resúmenes, Productos → Productos | Stock | ...
// Solo aparecen en las pantallas que son una pestaña (no en Nueva venta, que es una pantalla de trabajo).
export default function SectionTabs() {
  const { pathname } = useLocation();
  const group = [...menuItems, settingsMenuItem].find((item) => item.tabs?.some((tab) => tab.path === pathname));
  if (!group) return null;
  const tabs = group.tabs.filter((tab) => !tab.desktopOnly || desktop); // sin la app instalada no hay nada que mostrar en algunas

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
      {tabs.map((tab) => (
        <Tab key={tab.path} value={tab.path} label={tab.label} component={NavLink} to={tab.path} />
      ))}
    </Tabs>
  );
}
