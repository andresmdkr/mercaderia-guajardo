import { useState } from 'react';
import { getErrorMessage } from '../../../services/api';
import { fetchProductByCode } from '../../products/api/productsApi';
import { createSale } from '../api/salesApi';
import { computeTotals } from '../cartMath';
import useCart from './useCart';

const emptyDiscount = { type: 'amount', value: '' };

// Todo el estado y las acciones de la pantalla "Nueva venta".
export default function useNewSale() {
  const cart = useCart();
  const [discount, setDiscount] = useState(emptyDiscount);
  const [customer, setCustomer] = useState(null); // null = consumidor final
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [notes, setNotes] = useState('');

  const [entryError, setEntryError] = useState(null);
  const [submitError, setSubmitError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [lastSale, setLastSale] = useState(null);

  const totals = computeTotals(cart.lines, discount);
  const canConfirm = cart.lines.length > 0 && !totals.discountError && !submitting;

  const addProduct = (product) => {
    setEntryError(cart.add(product));
    setSubmitError(null);
  };

  // Enter en el campo de código (o lector de código de barras).
  const addByCode = async (code) => {
    const trimmed = code.trim();
    if (!trimmed) return;
    try {
      addProduct(await fetchProductByCode(trimmed));
    } catch (error) {
      setEntryError(getErrorMessage(error));
    }
  };

  // Deja todo como al empezar una venta nueva (el medio de pago se conserva).
  const reset = () => {
    cart.clear();
    setDiscount(emptyDiscount);
    setCustomer(null);
    setNotes('');
    setEntryError(null);
    setSubmitError(null);
  };

  const confirm = async () => {
    if (!canConfirm) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const sale = await createSale({
        items: cart.lines.map((line) => ({ productId: line.product.id, quantity: line.quantity })),
        customerId: customer?.id ?? null,
        paymentMethod,
        discount: totals.discountCents > 0 ? { type: discount.type, value: Number(discount.value) } : undefined,
        notes: notes.trim() || undefined,
      });
      setLastSale(sale);
      // Listo para la próxima venta (el medio de pago se conserva).
      reset();
    } catch (error) {
      setSubmitError(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  return {
    cart,
    totals,
    discount,
    setDiscount,
    customer,
    setCustomer,
    paymentMethod,
    setPaymentMethod,
    notes,
    setNotes,
    entryError,
    submitError,
    submitting,
    canConfirm,
    lastSale,
    dismissLastSale: () => setLastSale(null),
    addProduct,
    addByCode,
    confirm,
    reset,
  };
}
