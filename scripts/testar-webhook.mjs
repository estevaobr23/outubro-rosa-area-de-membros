#!/usr/bin/env node
/**
 * testar-webhook.mjs — valida a liberação de acesso ponta a ponta SEM tocar
 * em nenhum cliente real.
 *
 * ⚠️ ADAPTADO PARA CAKTO. A versão genérica da skill é da Wiapy e não serve
 * aqui: autenticação vai em `body.secret` (não header) · aprovação é
 * `event === "purchase_approved"` (não payment.status) · o produto vem como
 * objeto único `data.product` (não array `products[]`) · a coluna de
 * casamento é `cakto_product_id`.
 *
 * O que faz:
 *   1. envia um webhook sintético (e-mail e data.id falsos, título REAL)
 *   2. confere se o entitlement foi concedido
 *   3. LIMPA tudo: apaga o cliente/compra de teste e restaura o
 *      cakto_product_id do produto caso a autocorreção o tenha alterado
 *
 * Uso (a partir da raiz do projeto, que tem @supabase/supabase-js):
 *   node scripts/testar-webhook.mjs --titulo "Nome Exato do Produto"
 *   node scripts/testar-webhook.mjs --titulo "..." --id-falso   (força o
 *       caminho de fallback por título, testando a autocorreção)
 *
 * Requer no ambiente (ou em .env.local):
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, CAKTO_WEBHOOK_SECRET
 *
 * NUNCA rode com o e-mail de um cliente real.
 */

import { readFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

// ── Config ────────────────────────────────────────────────────────────────
const TEST_EMAIL = "e2e-test-webhook@exemplo.invalid";
const TEST_TRANSACTION_ID = `e2e-test-${Date.now()}`;

if (existsSync(".env.local")) {
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const WEBHOOK_SECRET = process.env.CAKTO_WEBHOOK_SECRET;

const args = process.argv.slice(2);
const titulo = args[args.indexOf("--titulo") + 1];
const usarIdFalso = args.includes("--id-falso");

if (!titulo || titulo.startsWith("--")) {
  console.error('Uso: node scripts/testar-webhook.mjs --titulo "Nome do Produto"');
  process.exit(1);
}
for (const [nome, v] of [
  ["NEXT_PUBLIC_SUPABASE_URL", SUPABASE_URL],
  ["SUPABASE_SERVICE_ROLE_KEY", SERVICE_KEY],
  ["CAKTO_WEBHOOK_SECRET", WEBHOOK_SECRET],
]) {
  if (!v) {
    console.error(`Faltando variável de ambiente: ${nome}`);
    process.exit(1);
  }
}

const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
const WEBHOOK_URL = `${SUPABASE_URL}/functions/v1/cakto-webhook`;

// ── 1. Estado inicial do produto ──────────────────────────────────────────
const { data: produto } = await db
  .from("products")
  .select("id, slug, name, cakto_product_id")
  .eq("name", titulo)
  .maybeSingle();

if (!produto) {
  console.error(`✗ Nenhum produto com name exatamente "${titulo}".`);
  console.error("  O casamento por título exige products.name idêntico ao da Cakto.");
  process.exit(1);
}

const idOriginal = produto.cakto_product_id;
const idEnviado = usarIdFalso ? `fake-id-${Date.now()}` : idOriginal;

console.log(`Produto: ${produto.name} (${produto.slug})`);
console.log(`cakto_product_id salvo: ${idOriginal}`);
console.log(`ID que será enviado:    ${idEnviado}${usarIdFalso ? "  (forçando fallback por título)" : ""}`);

// ── 2. Webhook sintético (formato Cakto: secret no body, produto único) ───
const payload = {
  secret: WEBHOOK_SECRET,
  event: "purchase_approved",
  data: {
    id: TEST_TRANSACTION_ID,
    status: "paid",
    customer: { name: "Teste E2E", email: TEST_EMAIL },
    product: { id: idEnviado, name: titulo },
    offer: null,
  },
};

console.log("\nEnviando webhook...");
const res = await fetch(WEBHOOK_URL, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
});
const body = await res.json();
console.log(`HTTP ${res.status}`);
console.log(JSON.stringify(body, null, 2));

// ── 3. Verificação ────────────────────────────────────────────────────────
let ok = false;
const { data: cliente } = await db
  .from("customers").select("id").eq("email", TEST_EMAIL).maybeSingle();

if (cliente) {
  const { data: ents } = await db
    .from("entitlements")
    .select("id, status, product_id")
    .eq("customer_id", cliente.id)
    .eq("product_id", produto.id);
  ok = Boolean(ents?.some((e) => e.status === "active"));
}

console.log(ok ? "\n✓ Acesso liberado corretamente." : "\n✗ Acesso NÃO foi liberado.");
if (body.id_healed) {
  console.log(`✓ Autocorreção do cakto_product_id funcionou: ${body.id_healed.de} → ${body.id_healed.para}`);
}
if (body.has_unmapped_products) {
  console.log("✗ Produto não mapeado — confira se products.name bate com o título na Cakto.");
}

// ── 4. LIMPEZA (sempre roda) ───────────────────────────────────────────────
console.log("\nLimpando dados de teste...");

if (cliente) {
  const { data: compras } = await db
    .from("purchases").select("id").eq("customer_id", cliente.id);

  await db.from("entitlements").delete().eq("customer_id", cliente.id);
  for (const c of compras ?? []) {
    await db.from("purchase_items").delete().eq("purchase_id", c.id);
  }
  await db.from("purchases").delete().eq("customer_id", cliente.id);
  await db.from("customers").delete().eq("id", cliente.id);
}

// Restaura o ID original caso a autocorreção o tenha trocado durante o teste.
const { data: depois } = await db
  .from("products").select("cakto_product_id").eq("id", produto.id).maybeSingle();

if (depois && depois.cakto_product_id !== idOriginal) {
  await db.from("products").update({ cakto_product_id: idOriginal }).eq("id", produto.id);
  console.log(`  cakto_product_id restaurado para ${idOriginal}`);
}

// Confirma que não sobrou nada.
const { count } = await db
  .from("customers").select("id", { count: "exact", head: true }).eq("email", TEST_EMAIL);

console.log(count === 0 ? "✓ Limpeza concluída." : "✗ ATENÇÃO: sobrou dado de teste no banco.");
process.exitCode = ok && count === 0 ? 0 : 1;
