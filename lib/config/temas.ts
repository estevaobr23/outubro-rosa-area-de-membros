/**
 * TEMA de cada cartinha — o filtro "que tipo de mensagem".
 *
 * Os 8 temas são os mesmos usados na seção "Categorias de Mensagens" da
 * página de vendas. Uma cartinha tem UM tema só (diferente de objetivos no
 * projeto de casas, que podia ter vários).
 *
 * ⚠️ Classificação editorial feita a partir do headline + complemento de cada
 * cartinha (o JSON de origem não traz esse campo). Lista literal por número,
 * de propósito: regra derivada de palavra no texto erra calada na primeira
 * frase fora do padrão.
 */

export const TEMAS = [
  { slug: "acolhimento", nome: "Acolhimento" },
  { slug: "carinho", nome: "Carinho" },
  { slug: "forca", nome: "Força" },
  { slug: "esperanca", nome: "Esperança" },
  { slug: "autocuidado", nome: "Autocuidado" },
  { slug: "valorizacao", nome: "Valorização" },
  { slug: "reconhecimento", nome: "Reconhecimento" },
  { slug: "companhia", nome: "Companhia" },
] as const;

export type Tema = (typeof TEMAS)[number]["slug"];

export const TEMA_POR_CARTINHA: Record<number, Tema> = {
  1: "acolhimento",
  2: "carinho",
  3: "companhia",
  4: "valorizacao",
  5: "forca",
  6: "autocuidado",
  7: "acolhimento",
  8: "autocuidado",
  9: "esperanca",
  10: "autocuidado",
  11: "autocuidado",
  12: "autocuidado",
  13: "esperanca",
  14: "valorizacao",
  15: "valorizacao",
  16: "carinho",
  17: "valorizacao",
  18: "autocuidado",
  19: "forca",
  20: "esperanca",
  21: "companhia",
  22: "esperanca",
  23: "esperanca",
  24: "carinho",
  25: "autocuidado",
  26: "companhia",
  27: "forca",
  28: "valorizacao",
  29: "autocuidado",
  30: "reconhecimento",
  31: "forca",
  32: "companhia",
  33: "esperanca",
  34: "autocuidado",
  35: "esperanca",
  36: "acolhimento",
  37: "forca",
  38: "esperanca",
  39: "reconhecimento",
  40: "esperanca",
  41: "carinho",
  42: "autocuidado",
  43: "autocuidado",
  44: "forca",
  45: "carinho",
  46: "valorizacao",
  47: "esperanca",
  48: "valorizacao",
  49: "companhia",
  50: "companhia",
};
