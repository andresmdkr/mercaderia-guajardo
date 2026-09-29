// Para filas clicables de las tablas: Enter hace lo mismo que el clic.
// Se cancela el evento a propósito: si no, el mismo Enter le llega después al primer campo del diálogo que se acaba de abrir
// y envía el formulario (guardando sin querer). Solo actúa si la tecla se apretó en la fila y no en algo que tenga adentro
// (por ejemplo el botón de WhatsApp).
export const onEnter = (action) => (event) => {
  if (event.key !== 'Enter' || event.target !== event.currentTarget) return;
  event.preventDefault();
  action();
};
