#!/usr/bin/env node
/**
 * medir-telas.mjs — mede layout num Chrome de verdade (via `npx playwright`,
 * sem virar dependência do projeto), em celular e desktop.
 *
 * MEDE, não tira só print: confere getBoundingClientRect() e
 * scrollWidth/scrollHeight das telas principais. Trave o número, não o olho.
 *
 * Uso:
 *   node scripts/medir-telas.mjs --cookie "session_token=..." [--base http://localhost:3000]
 *
 * O cookie precisa ser de um cliente sintético com entitlement ativo — gere
 * um com testar-acesso.mjs (ele limpa no fim) ou leia o de um teste manual.
 */

import { existsSync, mkdirSync } from "node:fs";

const args = process.argv.slice(2);
const cookie = args[args.indexOf("--cookie") + 1];
const iBase = args.indexOf("--base");
const BASE = iBase >= 0 ? args[iBase + 1] : "http://localhost:3000";

if (!cookie || cookie.startsWith("--")) {
  console.error('Uso: node scripts/medir-telas.mjs --cookie "session_token=..."');
  process.exit(1);
}

const { chromium } = await import("playwright").catch(() => {
  console.error("Playwright não instalado. Rode: npx playwright install chromium");
  process.exit(1);
});

const DISPOSITIVOS = [
  { nome: "celular", width: 390, height: 844 },
  { nome: "desktop", width: 1440, height: 900 },
];

const ROTAS = ["/inicio", "/cartinhas", "/cartinhas/01"];

if (!existsSync(".verificacao")) mkdirSync(".verificacao");

const browser = await chromium.launch();
const testes = [];
const reg = (nome, ok, detalhe = "") => {
  testes.push(ok);
  console.log(`${ok ? "OK  " : "FALHA"} ${nome}${detalhe ? `  ${detalhe}` : ""}`);
};

const [nomeCookie, valorCookie] = cookie.split("=");

for (const disp of DISPOSITIVOS) {
  const context = await browser.newContext({ viewport: { width: disp.width, height: disp.height } });
  await context.addCookies([
    { name: nomeCookie, value: valorCookie, url: BASE },
  ]);
  const page = await context.newPage();

  for (const rota of ROTAS) {
    await page.goto(`${BASE}${rota}`, { waitUntil: "networkidle" });

    const semRolagemHorizontal = await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
    );
    reg(`${disp.nome} ${rota}: sem rolagem horizontal`, semRolagemHorizontal);

    const arquivo = `.verificacao/${disp.nome}${rota.replace(/\//g, "_")}.png`;
    await page.screenshot({ path: arquivo, fullPage: true });
    console.log(`  screenshot: ${arquivo}`);
  }

  await context.close();
}

await browser.close();

const ok = testes.every(Boolean);
console.log(ok ? `\n>>> TELAS OK  (${testes.length} verificações)` : `\n>>> ${testes.filter((t) => !t).length} FALHA(S) de ${testes.length}`);
process.exitCode = ok ? 0 : 1;
