import { desktop } from '../../../services/desktop';

// Navegador (desarrollo): el documento se carga en un iframe oculto y se imprime solo ese.
function printInIframe(html) {
  return new Promise((resolve) => {
    const frame = document.createElement('iframe');
    frame.style.cssText = 'position:fixed;width:0;height:0;border:0;visibility:hidden';
    frame.srcdoc = html;
    frame.onload = () => {
      frame.contentWindow.focus();
      frame.contentWindow.print();
      setTimeout(() => frame.remove(), 1000);
      resolve({ ok: true });
    };
    document.body.appendChild(frame);
  });
}

// Imprime un documento HTML completo (comprobante, resumen de ventas...). En la app de escritorio abre el diálogo de
// impresión de Windows (elegís la impresora); en el navegador, el del navegador. Devuelve { ok, cancelled?, message? }.
export function printDocument(html) {
  return desktop ? desktop.printHtml(html) : printInIframe(html);
}
