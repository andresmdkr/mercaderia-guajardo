import CategoryIcon from '@mui/icons-material/CategoryOutlined';
import HomeIcon from '@mui/icons-material/HomeOutlined';
import InventoryIcon from '@mui/icons-material/Inventory2Outlined';
import PeopleIcon from '@mui/icons-material/PeopleOutlined';
import ReceiptIcon from '@mui/icons-material/ReceiptLongOutlined';
import SwapVertIcon from '@mui/icons-material/SwapVertOutlined';

// Secciones de la app. El color de cada una vive en el tema (palette.sections[key]).
// Una sección puede tener `children` (subgrupo): se muestran como submenú.
// Al sumar una pantalla nueva, se agrega acá y aparece en el menú y en la portada.
export const sections = [
  { key: 'home', label: 'Inicio', path: '/', icon: HomeIcon },
  {
    key: 'sales',
    label: 'Ventas',
    path: '/sales/new', // cuando exista el listado de ventas pasa a '/sales'
    icon: ReceiptIcon,
    description: 'Registrá ventas y controlá el stock automáticamente',
  },
  {
    key: 'products',
    label: 'Productos',
    path: '/products',
    icon: InventoryIcon,
    description: 'Alta, edición y stock de tus productos',
    children: [
      {
        key: 'categories',
        label: 'Categorías',
        path: '/products/categories',
        icon: CategoryIcon,
        description: 'Organizá tus productos por rubro',
      },
      {
        key: 'stock',
        label: 'Stock',
        path: '/products/stock',
        icon: SwapVertIcon,
        description: 'Entradas, salidas y ajustes de mercadería',
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
];

// Lista plana (secciones + subsecciones), para buscar por key o armar la portada.
export const flatSections = sections.flatMap((section) => [section, ...(section.children ?? [])]);

export const getSection = (key) => flatSections.find((section) => section.key === key);
