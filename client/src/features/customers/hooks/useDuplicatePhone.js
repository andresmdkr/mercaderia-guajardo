import { useState } from 'react';
import { checkCustomerPhone } from '../api/customersApi';

// Avisa si ya hay otro cliente con el mismo teléfono. Es solo informativo, no bloquea el guardado.
export default function useDuplicatePhone(customerId) {
  const [duplicate, setDuplicate] = useState(null);

  const check = async (phone) => {
    if (!phone.trim()) {
      setDuplicate(null);
      return;
    }
    try {
      const result = await checkCustomerPhone(phone, customerId);
      setDuplicate(result.duplicate);
    } catch {
      setDuplicate(null); // si falla el aviso, no molestamos al usuario
    }
  };

  return { duplicate, check };
}
