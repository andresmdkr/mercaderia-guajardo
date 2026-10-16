import { lazy, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Login from './pages/Login';
import { checkSession } from './redux/sessionSlice';

// Cada pantalla se descarga recién al entrar (la aplicación abre más rápido en una PC lenta). Inicio y el ingreso van en el arranque.
const CategoriesPage = lazy(() => import('./features/categories/pages/CategoriesPage'));
const CustomersPage = lazy(() => import('./features/customers/pages/CustomersPage'));
const PriceUpdatePage = lazy(() => import('./features/products/pages/PriceUpdatePage'));
const ProductsPage = lazy(() => import('./features/products/pages/ProductsPage'));
const NewSalePage = lazy(() => import('./features/sales/pages/NewSalePage'));
const SummariesPage = lazy(() => import('./features/sales/pages/SummariesPage'));
const ReportsPage = lazy(() => import('./features/reports/pages/ReportsPage'));
const SettingsPage = lazy(() => import('./features/settings/pages/SettingsPage'));
const SalesPage = lazy(() => import('./features/sales/pages/SalesPage'));
const StockPage = lazy(() => import('./features/stock/pages/StockPage'));

export default function App() {
  const dispatch = useDispatch();

  // Al abrir la app se consulta si ya hay una sesión (la cookie no se puede leer desde JS).
  useEffect(() => {
    dispatch(checkSession());
  }, [dispatch]);

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/sales" element={<SalesPage />} />
          <Route path="/sales/new" element={<NewSalePage />} />
          <Route path="/sales/summaries" element={<SummariesPage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/products/categories" element={<CategoriesPage />} />
          <Route path="/products/price-updates" element={<PriceUpdatePage />} />
          <Route path="/customers" element={<CustomersPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/settings/backups" element={<SettingsPage />} />
          <Route path="/settings/whatsapp" element={<SettingsPage />} />
          <Route path="/settings/app" element={<SettingsPage />} />
          <Route path="/products/stock" element={<StockPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
