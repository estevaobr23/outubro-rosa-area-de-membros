#!/usr/bin/env node
/**
 * testar-tudo.mjs — roda todas as suítes e PROPAGA o exit code.
 *
 * `testar-catalogo` não precisa de servidor. `testar-acesso` e `testar-webhook`
 * precisam do servidor de dev rodando e de --titulo respectivamente — rode-os
 * separadamente quando for validar ponta a ponta (ver checklist-validacao.md
 * da skill area-de-membros).
 */

import { spawnSync } from "node:child_process";

const SUITES = ["scripts/testar-catalogo.mjs"];

let falhou = 0;
for (const suite of SUITES) {
  console.log(`\n${"=".repeat(70)}\n${suite}\n${"=".repeat(70)}`);
  const r = spawnSync("node", [suite], { stdio: "inherit" });
  if (r.status !== 0) falhou++;
}

console.log(`\n${"=".repeat(70)}`);
console.log(
  falhou === 0
    ? `TUDO PASSOU (${SUITES.length} suítes)`
    : `${falhou} de ${SUITES.length} suíte(s) com falha`,
);
console.log(
  "\nNão incluídas aqui (precisam de servidor/argumentos — rode à parte):\n" +
    "  node scripts/testar-webhook.mjs --titulo \"<nome exato na Cakto>\"\n" +
    "  node scripts/testar-acesso.mjs   (com `npm run dev` rodando)\n" +
    "  node scripts/medir-telas.mjs     (com `npm run dev` rodando)",
);

process.exitCode = falhou === 0 ? 0 : 1;
