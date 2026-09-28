import { useSelector } from 'react-redux';
import { Navigate, Outlet } from 'react-router-dom';
import Loader from './Loader';

export default function ProtectedRoute() {
  const status = useSelector((state) => state.session.status);

  if (status === 'checking') return <Loader />;
  if (status === 'anonymous') return <Navigate to="/login" replace />;
  return <Outlet />;
}
