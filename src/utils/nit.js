// Normaliza un NIT al formato canónico: solo dígitos, sin dígito de verificación.
// Ej: '900.123.456-7' -> '900123456'
const normalizarNit = (valor) => {
  if (valor === null || valor === undefined) return "";
  let s = String(valor).replace(/[^\d-]/g, "");
  const idx = s.lastIndexOf("-");
  if (idx !== -1) s = s.slice(0, idx);
  return s.replace(/\D/g, "");
};

module.exports = { normalizarNit };
