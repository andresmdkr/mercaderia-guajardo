// Arma el enlace de WhatsApp (https://wa.me/54911...) a partir de un teléfono argentino escrito como sea:
// "11 5555-1234", "011 15 5555-1234", "+54 9 351 555-9012", "(0351) 155-559012"...
// Devuelve null si no parece un celular argentino (ej. un teléfono fijo o un número incompleto).

const AREA_LENGTHS = [2, 3, 4]; // código de área: 11 (Buenos Aires), 351, 2966...

// Devuelve los 10 dígitos "área + número" o null.
function nationalNumber(digits) {
  let number = digits;
  if (number.startsWith('54')) number = number.slice(2).replace(/^9/, ''); // ya venía con el país (+54 9 ...)
  number = number.replace(/^0+/, ''); // el 0 de larga distancia
  if (number.length === 10) return number;
  if (number.length === 12) {
    // área + "15" + número: se saca el 15 (es lo que se marca desde un celular, no sirve para WhatsApp)
    for (const area of AREA_LENGTHS) {
      const withoutFifteen = number.slice(0, area) + number.slice(area + 2);
      if (number.slice(area, area + 2) === '15' && withoutFifteen.length === 10) return withoutFifteen;
    }
  }
  return null;
}

// Los códigos de área argentinos son 11 o empiezan con 2 o 3 ("15..." sin área no sirve).
const hasValidArea = (number) => number.startsWith('11') || /^[23]/.test(number);

export function whatsappUrl(phone) {
  if (!phone) return null;
  const national = nationalNumber(String(phone).replace(/\D/g, ''));
  return national && hasValidArea(national) ? `https://wa.me/549${national}` : null;
}
