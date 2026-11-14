// Controlador ERP: genera la clave de ingreso de Helisa contable (Helisa NIIF).
// Reimplementacion nativa (sin DLL) de GeneraClaveInstalacion de GwSysUtils.dll + el intercalado
// de sesiones/mora. Validado 100% contra la DLL original y el keygen Delphi.
// Documentacion del algoritmo: proyecto medios-magneticos-d12, docs/migracion/15 y 16.

// --- 10 tablas de sustitucion (dato interno; NO exponer en el frontend) ---
const TABLAS = [
  "S6B968PAG1MK23WI", "NS95L2PBTQP489KG", "AVC681KFPEJG9TE4", "QID86MPKD97WF5VR",
  "9LMDIREV7WKUMDFC", "RJAEGBVM2D3PC19S", "IUWV7LFP1DMGSTE2", "D8QUL2PBY97KVM2L",
  "A3DFRTY5U4F29KLU", "TY5784ML2UKF8IKA",
];
// posiciones (1-based) donde el "switch" coloca los 3 chars del grupo N3, segun idx (0..9)
const CASE = {
  0: [1, 7, 9], 1: [2, 6, 3], 2: [3, 5, 7], 3: [5, 2, 1], 4: [2, 5, 9],
  5: [3, 1, 5], 6: [6, 2, 1], 7: [4, 2, 8], 8: [4, 1, 6], 9: [5, 3, 1],
};
const HEX = "0123456789ABCDEF";

// Raiz digital estilo Helisa (UnDigito): suma de codigos ASCII reducida a un digito 1..9
function undigito(s) {
  let r = 0;
  for (let i = 0; i < s.length; i++) r += s.charCodeAt(i);
  while (r > 9) {
    r = String(r).split("").reduce((a, d) => a + Number(d), 0);
  }
  return r;
}

function hex3(n) {
  return (n & 0xfff).toString(16).toUpperCase().padStart(3, "0");
}

function substGroup(h3, T) {
  const d = [HEX.indexOf(h3[0]), HEX.indexOf(h3[1]), HEX.indexOf(h3[2])];
  if (d[0] === d[1]) d[1] = (d[1] + 1) % 16; // resolucion de colisiones
  if (d[2] === d[1]) d[2] = (d[2] + 1) % 16;
  if (d[2] === d[0]) d[2] = (d[2] + 1) % 16;
  return [T[d[0]], T[d[1]], T[d[2]]];
}

// Base de 9 caracteres (equivale a GeneraClaveInstalacion(serial, pista))
function generarBase(serial, pista) {
  const idx = undigito(serial);
  const T = TABLAS[idx];
  const cc = (i) => pista.charCodeAt(i);
  const N1 = cc(0) + cc(2) + cc(4) + cc(6); // pista posiciones impares 1,3,5,7
  const N2 = cc(1) + cc(3) + cc(5) + cc(7); // pista posiciones pares  2,4,6,8
  const h1 = hex3(N1), h2 = hex3(N2);
  const C = serial.slice(0, 6) + h1 + h2; // 12 chars
  let N3 = 0;
  for (let i = 0; i < 12; i++) N3 += C.charCodeAt(i);
  const h3 = hex3(N3);
  const g1 = substGroup(h1, T), g2 = substGroup(h2, T), g3 = substGroup(h3, T);
  const out = new Array(10).fill(null); // 1..9
  const [sA, sB, sC] = CASE[idx];
  out[sA] = g3[0]; out[sB] = g3[1]; out[sC] = g3[2];
  const fill = g1.concat(g2);
  let j = 0;
  for (let i = 1; i <= 9; i++) if (out[i] === null) { out[i] = fill[j]; j++; }
  return out.slice(1, 10).join("");
}

// Clave de 14 caracteres para la pantalla de registro del programa contable
function generarClave(licencia, nit, pista, sesiones = 99, mora = 0) {
  licencia = String(licencia).replace(/-/g, "").toUpperCase();
  pista = String(pista);
  if (pista.length === 9) pista = pista.slice(0, 8); // la pista que muestra el programa trae un '0'
  const base = generarBase(licencia, pista);
  const c = [
    undigito(licencia), undigito(nit), undigito(pista),
    undigito(pista + nit), undigito(pista + nit + licencia),
  ];
  const v = ((sesiones * 4096) + mora) ^ parseInt(licencia.slice(6, 12), 10);
  const h = (v >>> 0).toString(16).toUpperCase().padStart(5, "0").slice(-5);
  const s = base.split("");
  for (let k = 0; k < 5; k++) s.splice(c[k] - 1, 0, h[k]); // Insert 1-based en orden c1..c5
  return s.join("");
}

// POST /api/erp/generar-clave  { licencia, nit, pista, sesiones?, mora? }
exports.generarClaveErp = (req, res) => {
  try {
    const { licencia, nit, pista } = req.body;
    const sesiones = req.body.sesiones != null ? Number(req.body.sesiones) : 99;
    const mora = req.body.mora != null ? Number(req.body.mora) : 0;

    if (!licencia || !nit || !pista) {
      return res.status(400).json({ error: "Faltan datos: licencia, nit y pista son obligatorios." });
    }
    const lic = String(licencia).replace(/-/g, "").toUpperCase();
    if (lic.length !== 12) {
      return res.status(400).json({ error: "La licencia debe tener 12 caracteres (sin el guion)." });
    }
    if (!/^\d{6}$/.test(lic.slice(6, 12))) {
      return res.status(400).json({ error: "Los caracteres 7 a 12 de la licencia deben ser numericos." });
    }
    const pis = String(pista).trim();
    if (pis.length !== 8 && pis.length !== 9) {
      return res.status(400).json({ error: "La pista debe tener 8 caracteres (o 9 tal como la muestra el programa)." });
    }

    const clave = generarClave(lic, String(nit).trim(), pis, sesiones, mora);
    return res.status(200).json({ clave, sesiones, mora });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

// exportado por si se quiere reutilizar la logica
exports.generarClave = generarClave;
exports.generarBase = generarBase;
