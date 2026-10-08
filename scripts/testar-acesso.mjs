#!/usr/bin/env node
/**
 * testar-acesso.mjs — quem comprou entra, quem não comprou toma 404 em tudo.
 *
 * Cria DOIS clientes sintéticos (@exemplo.invalid, nunca existe de verdade):
 *   - "com acesso": entitlement ativo no produto
 *   - "sem acesso": existe como customer, mas SEM entitlement
 * Monta sessão gravando o hash direto na tabela (não passa pelo login/e-mail).
 * Bate nas rotas com o cookie de cada um e confere quem abre o quê.
 * LIMPA tudo no fim, sempre.
 *
 * Uso:
 *   node scripts/testar-acesso.mjs [--base http://localhost:3000]
 *
 * Requer: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SESSION_SECRET
 * e o servidor de dev rodando (`npm run dev`).
 */

import { readFileSync, existsSync } from "node:fs";
import { createHmac, randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

if (existsSync(".env.local")) {
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SESSION_SECRET = process.env.SESSION_SECRET;

const args = process.argv.slice(2);
const iBase = args.indexOf("--base");
const BASE = iBase >= 0 ? args[iBase + 1] : "http://localhost:3000";

for (const [nome, v] of [
  ["NEXT_PUBLIC_SUPABASE_URL", SUPABASE_URL],
  ["SUPABASE_SERVICE_ROLE_KEY", SERVICE_KEY],
  ["SESSION_SECRET", SESSION_SECRET],
]) {
  if (!v) {
    console.error(`Faltando variável de ambiente: ${nome}`);
    process.exit(1);
  }
}

const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const testes = [];
const reg = (nome, ok, detalhe = "") => {
  testes.push(ok);
  console.log(`${ok ? "OK  " : "FALHA"} ${nome}${detalhe ? `  ${detalhe}` : ""}`);
};

function tokenAleatorio() {
  return randomBytes(32).toString("hex");
}
function hashToken(t) {
  return createHmac("sha256", SESSION_SECRET).update(t).digest("hex");
}

async function criarClienteComSessao(email) {
  const { data: c, error } = await db
    .from("customers")
    .upsert({ email }, { onConflict: "email" })
    .select("id")
    .single();
  if (error) throw new Error(`criar cliente ${email}: ${error.message}`);

  const token = tokenAleatorio();
  const { error: sErr } = await db.from("sessions").insert({
    customer_id: c.id,
    token_hash: hashToken(token),
    expires_at: new Date(Date.now() + 864e5).toISOString(),
  });
  if (sErr) throw new Error(`criar sessao ${email}: ${sErr.message}`);

  return { id: c.id, cookie: `session_token=${token}` };
}

async function limparCliente(id) {
  await db.from("sessions").delete().eq("customer_id", id);
  await db.from("entitlements").delete().eq("customer_id", id);
  const { data: compras } = await db.from("purchases").select("id").eq("customer_id", id);
  for (const c of compras ?? []) await db.from("purchase_items").delete().eq("purchase_id", c.id);
  await db.from("purchases").delete().eq("customer_id", id);
  await db.from("customers").delete().eq("id", id);
}

async function get(path, cookie) {
  return fetch(`${BASE}${path}`, { headers: { Cookie: cookie }, redirect: "manual" });
}

// ── Produto ──────────────────────────────────────────────────────────────
const { data: produto } = await db
  .from("products")
  .select("id, slug")
  .eq("slug", "kit-outubro-rosa")
  .maybeSingle();

if (!produto) {
  console.error('✗ Produto "kit-outubro-rosa" não encontrado em products.');
  process.exit(1);
}

const comAcesso = await criarClienteComSessao("e2e-test-com-acesso@exemplo.invalid");
const semAcesso = await criarClienteComSessao("e2e-test-sem-acesso@exemplo.invalid");

await db.from("entitlements").upsert(
  { customer_id: comAcesso.id, product_id: produto.id, status: "active" },
  { onConflict: "customer_id,product_id" },
);

try {
  // ── quem comprou entra ────────────────────────────────────────────────
  const rInicio = await get("/inicio", comAcesso.cookie);
  reg("com acesso: /inicio responde 200", rInicio.status === 200, `HTTP ${rInicio.status}`);

  const rCartinhas = await get("/cartinhas", comAcesso.cookie);
  reg("com acesso: /cartinhas responde 200", rCartinhas.status === 200, `HTTP ${rCartinhas.status}`);

  const rCartinha01 = await get("/cartinhas/01", comAcesso.cookie);
  reg("com acesso: /cartinhas/01 responde 200", rCartinha01.status === 200, `HTTP ${rCartinha01.status}`);

  const rImagem = await get("/api/cartinha/01", comAcesso.cookie);
  reg("com acesso: /api/cartinha/01 redireciona (302) para URL assinada", rImagem.status === 302, `HTTP ${rImagem.status}`);

  // ── quem não comprou toma 404, nunca 403 ──────────────────────────────
  const rInicioSem = await get("/inicio", semAcesso.cookie);
  reg("sem acesso: /inicio responde 404 (nunca 403)", rInicioSem.status === 404, `HTTP ${rInicioSem.status}`);

  const rCartinhasSem = await get("/cartinhas", semAcesso.cookie);
  reg("sem acesso: /cartinhas responde 404", rCartinhasSem.status === 404, `HTTP ${rCartinhasSem.status}`);

  const rImagemSem = await get("/api/cartinha/01", semAcesso.cookie);
  reg("sem acesso: /api/cartinha/01 responde 404 (não entrega imagem)", rImagemSem.status === 404, `HTTP ${rImagemSem.status}`);

  // ── id fora da lista real é 404, não imagem quebrada ──────────────────
  const rForaLista = await get("/cartinhas/99", comAcesso.cookie);
  reg("id fora da lista real (/cartinhas/99) responde 404", rForaLista.status === 404, `HTTP ${rForaLista.status}`);

  // ── sem cookie nenhum: redireciona para /login ─────────────────────────
  const rSemCookie = await fetch(`${BASE}/inicio`, { redirect: "manual" });
  reg(
    "sem cookie: /inicio redireciona para /login",
    rSemCookie.status === 307 || rSemCookie.status === 308 || (rSemCookie.status >= 300 && rSemCookie.status < 400),
    `HTTP ${rSemCookie.status}`,
  );
} finally {
  console.log("\nLimpando dados de teste...");
  await limparCliente(comAcesso.id);
  await limparCliente(semAcesso.id);
  console.log("Limpeza concluída.");
}

const ok = testes.every(Boolean);
console.log(ok ? `\n>>> ACESSO OK  (${testes.length} verificações)` : `\n>>> ${testes.filter((t) => !t).length} FALHA(S) de ${testes.length}`);
process.exitCode = ok ? 0 : 1;
