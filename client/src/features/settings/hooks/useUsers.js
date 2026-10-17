import { useCallback, useEffect, useState } from 'react';
import { getErrorMessage } from '../../../services/api';
import { createUser, fetchUsers, resetUserPassword, setUserActive } from '../api/usersApi';

// Lista de usuarios y sus acciones. Cada acción vuelve a pedir la lista; los errores los maneja quien llama.
export default function useUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetchUsers()
      .then((items) => {
        if (cancelled) return;
        setUsers(items);
        setError(null);
      })
      .catch((err) => !cancelled && setError(getErrorMessage(err)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  const after =
    (action) =>
    async (...args) => {
      const result = await action(...args);
      reload();
      return result;
    };

  return {
    users,
    loading,
    error,
    add: after(createUser),
    setActive: after(setUserActive),
    resetPassword: resetUserPassword,
  };
}
