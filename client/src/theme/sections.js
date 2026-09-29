import AssessmentIcon from '@mui/icons-material/AssessmentOutlined';
import CategoryIcon from '@mui/icons-material/CategoryOutlined';
import HomeIcon from '@mui/icons-material/HomeOutlined';
import InventoryIcon from '@mui/icons-material/Inventory2Outlined';
import PeopleIcon from '@mui/icons-material/PeopleOutlined';
import PointOfSaleIcon from '@mui/icons-material/PointOfSaleOutlined';
import PriceChangeIcon from '@mui/icons-material/PriceChangeOutlined';
import ReceiptIcon from '@mui/icons-material/ReceiptLongOutlined';
import SettingsIcon from '@mui/icons-material/SettingsOutlined';
import SwapVertIcon from '@mui/icons-material/SwapVertOutlined';

// Secciones de la app. El color de cada una vive en el tema (palette.sections[key]).
// Una sección puede tener `children` (subgrupo): se muestran como submenú.
// Al sumar una pantalla nueva, se agrega acá y aparece en el menú y en la portada.
export const sections = [
  { key: 'home', label: 'Inicio', path: '/', icon: HomeIcon },
  {
    key: 'sales',
    label: 'Ventas',
    path: '/sales',
    icon: ReceiptIcon,
    description: 'Historial de ventas, detalle y anulaciones',
    children: [
      {
        key: 'summaries',
        label: 'Resúmenes',
        path: '/sales/summaries',
        icon: PointOfSaleIcon,
        description: 'Lo cobrado por día, semana, mes o entre fechas',
      },
    ],
  },
  {
    key: 'products',
    label: 'Productos',
    path: '/products',
    icon: InventoryIcon,
    description: 'Alta, edición y stock de tus productos',
    children: [
      {
        key: 'stock',
        label: 'Stock',
        path: '/products/stock',
        icon: SwapVertIcon,
        description: 'Entradas, salidas y ajustes de mercadería',
      },
      {
        key: 'categories',
        label: 'Categorías',
        path: '/products/categories',
        icon: CategoryIcon,
        description: 'Organizá tus productos por rubro',
      },
      {
        key: 'prices',
        label: 'Actualizar precios',
        path: '/products/price-updates',
        icon: PriceChangeIcon,
        description: 'Subí o bajá los precios de muchos productos a la vez',
      },
    ],
  },
  {
    key: 'customers',
    label: 'Clientes',
    path: '/customers',
    icon: PeopleIcon,
    description: 'Tus clientes y sus datos de contacto',
  },
  {
    key: 'reports',
    label: 'Reportes',
    path: '/reports',
    icon: AssessmentIcon,
    description: 'Lo más vendido, ganancias y productos por reponer',
  },
  {
    key: 'settings',
    label: 'Configuración',
    path: '/settings',
    icon: SettingsIcon,
    description: 'Datos de tu negocio para los comprobantes',
  },
];

// Menú lateral: pocos ítems, para no tener que pensar. Lo que va junto se agrupa en PESTAÑAS dentro de la pantalla
// (Ventas: Historial | Resúmenes; Productos: Productos | Stock | Categorías | Actualizar precios).
// `path` es la pantalla a la que lleva el ítem; `prefix` decide cuándo se lo marca como activo.
export const menuItems = [
  { key: 'home', label: 'Inicio', path: '/', prefix: null, icon: HomeIcon },
  {
    key: 'sales',
    label: 'Ventas',
    path: '/sales',
    prefix: '/sales',
    icon: ReceiptIcon,
    tabs: [
      { label: 'Historial', path: '/sales' },
      { label: 'Resúmenes', path: '/sales/summaries' },
    ],
  },
  {
    key: 'products',
    label: 'Productos',
    path: '/products',
    prefix: '/products',
    icon: InventoryIcon,
    tabs: [
      { label: 'Productos', path: '/products' },
      { label: 'Stock', path: '/products/stock' },
      { label: 'Categorías', path: '/products/categories' },
      { label: 'Actualizar precios', path: '/products/price-updates' },
    ],
  },
  { key: 'customers', label: 'Clientes', path: '/customers', prefix: '/customers', icon: PeopleIcon },
  { key: 'reports', label: 'Reportes', path: '/reports', prefix: '/reports', icon: AssessmentIcon },
];

// Configuración se divide en pestañas. Las marcadas desktopOnly solo tienen algo que mostrar en la app instalada.
export const settingsMenuItem = {
  key: 'settings',
  label: 'Configuración',
  path: '/settings',
  prefix: '/settings',
  icon: SettingsIcon,
  tabs: [
    { label: 'Negocio', path: '/settings' },
    { label: 'Copias de seguridad', path: '/settings/backups' },
    { label: 'WhatsApp', path: '/settings/whatsapp', desktopOnly: true },
    { label: 'Aplicación', path: '/settings/app' },
  ],
};

// Lista plana (secciones + subsecciones), para buscar por key o armar la portada.
export const flatSections = sections.flatMap((section) => [section, ...(section.children ?? [])]);

export const getSection = (key) => flatSections.find((section) => section.key === key);
