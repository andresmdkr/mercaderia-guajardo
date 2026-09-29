import { useEffect, useRef } from 'react';

// Atajos de teclado de una pantalla: useHotkeys({ F2: () => ..., F9: () => ..., Escape: () => ... }).
// - Siempre usa las funciones más nuevas (no hace falta memorizarlas).
// - No actúa con Ctrl / Alt / Meta apretados, ni si otro componente ya usó la tecla (por ejemplo Esc para cerrar la
//   lista de un buscador), ni mientras hay un cuadro de diálogo abierto, ni al mantener la tecla apretada.
export default function useHotkeys(handlers) {
  const latest = useRef(handlers);
  useEffect(() => {
    latest.current = handlers;
  });

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.ctrlKey || event.altKey || event.metaKey || event.defaultPrevented) return;
      const handler = latest.current[event.key];
      if (!handler || document.querySelector('.MuiDialog-root')) return;
      event.preventDefault(); // F5, F3... el navegador les da otro uso; acá mandan los atajos de la pantalla
      if (!event.repeat) handler(event);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
