import { useState } from 'react';

// Carrito de la venta. Cada línea: { product, quantity }. La cantidad nunca supera el stock que
// tenía el producto al agregarlo. Las funciones que agregan devuelven un mensaje de error o null.
export default function useCart() {
  const [lines, setLines] = useState([]);

  const add = (product) => {
    if (product.stock <= 0) return `"${product.name}" no tiene stock`;

    const existing = lines.find((line) => line.product.id === product.id);
    if (!existing) {
      setLines([...lines, { product, quantity: 1 }]);
      return null;
    }
    if (existing.quantity >= product.stock) return `Solo hay ${product.stock} de "${product.name}"`;

    setLines(lines.map((line) => (line === existing ? { ...line, quantity: line.quantity + 1 } : line)));
    return null;
  };

  const setQuantity = (productId, quantity) => {
    setLines(
      lines.map((line) => {
        if (line.product.id !== productId) return line;
        const clamped = Math.min(Math.max(Math.trunc(quantity) || 1, 1), line.product.stock);
        return { ...line, quantity: clamped };
      })
    );
  };

  const remove = (productId) => setLines(lines.filter((line) => line.product.id !== productId));

  const clear = () => setLines([]);

  return { lines, add, setQuantity, remove, clear };
}
