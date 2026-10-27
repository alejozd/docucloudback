const { normalizarNit } = require("../nit");

describe("normalizarNit", () => {
  it.each([
    ["900.123.456-7", "900123456"],
    [" 900 123 456 ", "900123456"],
    ["900123456-7", "900123456"],
    ["900123456", "900123456"],
    ["abc", ""],
    ["", ""],
    [null, ""],
    [undefined, ""],
    [900123456, "900123456"],
  ])("normaliza %p -> %p", (entrada, esperado) => {
    expect(normalizarNit(entrada)).toBe(esperado);
  });
});
