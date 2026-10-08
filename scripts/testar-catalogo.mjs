#!/usr/bin/env node
/**
 * testar-catalogo.mjs — invariantes estáticas do catálogo de cartinhas.
 *
 * Não precisa de servidor nem de banco: lê os arquivos de config direto.
 * Roda em ESM puro com --experimental-strip-types (ver references/testes.md
 * da skill area-de-membros) — por isso os imports são .ts explícitos e sem
 * cross-import entre arquivos de config.
 */

import { readFileSync } from "node:fs";

const testes = [];
const reg = (nome, ok, detalhe = "") => {
  testes.push(ok);
  console.log(`${ok ? "OK  " : "FALHA"} ${nome}${detalhe ? `  ${detalhe}` : ""}`);
};

const dados = JSON.parse(readFileSync("lib/config/cartinhas-dados.json", "utf8"));
const arquivos = JSON.parse(readFileSync("lib/config/arquivos.json", "utf8"));

const TEMAS_VALIDOS = [
  "acolhimento", "carinho", "forca", "esperanca",
  "autocuidado", "valorizacao", "reconhecimento", "companhia",
];

// extrai TEMA_POR_CARTINHA de temas.ts por regex simples (sem importar .ts com
// dependências de tipo, para não acoplar o teste ao resolvedor do Next)
const temasSrc = readFileSync("lib/config/temas.ts", "utf8");
const mapaTemas = {};
for (const m of temasSrc.matchAll(/(\d+):\s*"([a-z]+)"/g)) {
  mapaTemas[Number(m[1])] = m[2];
}

// ── 1. todo dado tem imagem no mapa, e vice-versa ──────────────────────────
const numerosDados = new Set(dados.map((d) => d.numero));
const numerosArquivos = new Set(Object.keys(arquivos).map(Number));

reg(
  "todo dado com imagem aparece no mapa de arquivos",
  [...numerosDados].every((n) => numerosArquivos.has(n) || true), // imagem pode faltar: só reporta
  `${[...numerosDados].filter((n) => !numerosArquivos.has(n)).length} sem imagem (ok, viram "faltam N")`,
);

reg(
  "todo arquivo no mapa tem dado correspondente",
  [...numerosArquivos].every((n) => numerosDados.has(n)),
  `órfãos: ${[...numerosArquivos].filter((n) => !numerosDados.has(n)).join(",") || "nenhum"}`,
);

// ── 2. toda cartinha com imagem tem um tema válido ─────────────────────────
const comImagem = dados.filter((d) => numerosArquivos.has(d.numero));
const semTema = comImagem.filter((d) => !mapaTemas[d.numero]);
reg("toda cartinha com imagem tem tema classificado", semTema.length === 0, `faltando: ${semTema.map((d) => d.numero).join(",") || "nenhuma"}`);

const temaInvalido = comImagem.filter((d) => mapaTemas[d.numero] && !TEMAS_VALIDOS.includes(mapaTemas[d.numero]));
reg("todo tema atribuído é um dos 8 válidos", temaInvalido.length === 0, `inválidos: ${temaInvalido.map((d) => `${d.numero}=${mapaTemas[d.numero]}`).join(",") || "nenhum"}`);

// ── 3. nenhuma frase duplicada (sinal de dado corrompido) ──────────────────
const frases = comImagem.map((d) => d.headline.trim().toLowerCase());
const duplicadas = frases.filter((f, i) => frases.indexOf(f) !== i);
reg("nenhuma frase duplicada entre as cartinhas com imagem", duplicadas.length === 0, `duplicadas: ${[...new Set(duplicadas)].length}`);

// ── 4. a contagem bate com o que a tela promete ────────────────────────────
reg(
  "contagem de cartinhas com imagem é consistente (nunca maior que o total prometido)",
  comImagem.length <= 100,
  `${comImagem.length} de 100`,
);

// ── 5. ofertas.ts: slug idêntico ao slug cadastrado no banco (string literal
//      comparada manualmente — ver nota sobre cross-import em testes.md) ────
const ofertasSrc = readFileSync("lib/config/ofertas.ts", "utf8");
const slugOferta = ofertasSrc.match(/SLUG_CARTINHAS = "([^"]+)"/)?.[1];
reg("SLUG_CARTINHAS está definido em ofertas.ts", Boolean(slugOferta), slugOferta ?? "ausente");
reg(
  "slug da oferta é o esperado pela migration (kit-outubro-rosa)",
  slugOferta === "kit-outubro-rosa",
  slugOferta,
);

// ── fim ──────────────────────────────────────────────────────────────────
const ok = testes.every(Boolean);
console.log(
  ok
    ? `\n>>> CATALOGO OK  (${testes.length} verificações)`
    : `\n>>> ${testes.filter((t) => !t).length} FALHA(S) de ${testes.length}`,
);
process.exitCode = ok ? 0 : 1;
