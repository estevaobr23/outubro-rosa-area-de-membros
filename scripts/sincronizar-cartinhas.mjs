#!/usr/bin/env node
/**
 * sincronizar-cartinhas.mjs — leva as imagens finais das cartinhas para o bucket.
 *
 *   1. sobe cada cartinha-NN.png da pasta de origem para o bucket PRIVADO
 *      `cartinhas` (cartinha/<NN>.<ext>) — arquivo ORIGINAL, byte a byte, sem
 *      conversão nem compressão: a nitidez é o produto.
 *   2. grava lib/config/arquivos.json com o que realmente está no bucket e a
 *      dimensão real de cada imagem (lida do cabeçalho do PNG/JPEG)
 *
 * RETOMÁVEL: arquivo que já está no bucket com o mesmo tamanho é pulado.
 *
 * Uso:
 *   node scripts/sincronizar-cartinhas.mjs
 *   node scripts/sincronizar-cartinhas.mjs --fonte "C:/caminho/da/pasta"
 *   node scripts/sincronizar-cartinhas.mjs --somente-mapa   (não sobe nada: só
 *       gera o mapa a partir dos arquivos locais)
 *
 * Requer em .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import { readFileSync, existsSync, writeFileSync, statSync, readdirSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const BUCKET = "cartinhas";
const FONTE_PADRAO = path.resolve(
  "..",
  "CARTAS OUTTUBRO ROSA",
  "producao",
  "lote-01",
  "cartas-finais",
);

const args = process.argv.slice(2);
const iFonte = args.indexOf("--fonte");
const FONTE = iFonte >= 0 ? path.resolve(args[iFonte + 1]) : FONTE_PADRAO;
const SOMENTE_MAPA = args.includes("--somente-mapa");

if (existsSync(".env.local")) {
  for (const linha of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = linha.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const URL_SUPA = process.env.NEXT_PUBLIC_SUPABASE_URL;
const CHAVE = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SOMENTE_MAPA && (!URL_SUPA || !CHAVE)) {
  console.error("Faltando NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY em .env.local");
  process.exitCode = 1;
} else {
  await principal();
}

/** Formato REAL e dimensão, lidos dos bytes — não da extensão. */
function lerImagem(arquivo) {
  const b = readFileSync(arquivo);
  if (b.toString("ascii", 1, 4) === "PNG") {
    return { bytes: b, tipo: "image/png", ext: "png", largura: b.readUInt32BE(16), altura: b.readUInt32BE(20) };
  }
  if (b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i < b.length) {
      if (b[i] !== 0xff) { i++; continue; }
      const marca = b[i + 1];
      const tam = b.readUInt16BE(i + 2);
      if (marca >= 0xc0 && marca <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marca)) {
        return { bytes: b, tipo: "image/jpeg", ext: "jpg", altura: b.readUInt16BE(i + 5), largura: b.readUInt16BE(i + 7) };
      }
      i += 2 + tam;
    }
  }
  throw new Error(`formato de imagem não reconhecido: ${arquivo}`);
}

async function listarBucket(db, pasta) {
  const tamanhos = new Map();
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await db.storage.from(BUCKET).list(pasta, { limit: 1000, offset });
    if (error) throw new Error(`listar ${pasta}: ${error.message}`);
    for (const o of data ?? []) tamanhos.set(o.name, o.metadata?.size ?? -1);
    if (!data || data.length < 1000) break;
  }
  return tamanhos;
}

async function principal() {
  if (!existsSync(FONTE)) throw new Error(`pasta de origem não encontrada: ${FONTE}`);

  const arquivosLocais = readdirSync(FONTE).filter((f) => /^cartinha-\d+\.(png|jpg|jpeg)$/i.test(f));
  console.log(`${arquivosLocais.length} imagens encontradas em ${FONTE}`);

  const db = SOMENTE_MAPA ? null : createClient(URL_SUPA, CHAVE, { auth: { persistSession: false } });
  const noBucket = SOMENTE_MAPA ? null : await listarBucket(db, "cartinha");

  const mapa = {};
  let enviados = 0;
  let reaproveitados = 0;

  for (const nomeArquivo of arquivosLocais) {
    const numero = nomeArquivo.match(/^cartinha-(\d+)\./i)[1].padStart(2, "0");
    const local = path.join(FONTE, nomeArquivo);
    const img = lerImagem(local);
    const nomeNoBucket = `${numero}.${img.ext}`;
    const caminho = `cartinha/${nomeNoBucket}`;
    const tamanho = statSync(local).size;

    if (SOMENTE_MAPA) {
      // nada a enviar
    } else if (noBucket.get(nomeNoBucket) === tamanho) {
      reaproveitados++;
    } else {
      const { error } = await db.storage
        .from(BUCKET)
        .upload(caminho, img.bytes, { contentType: img.tipo, upsert: true, cacheControl: "31536000" });
      if (error) throw new Error(`upload ${caminho}: ${error.message}`);
      enviados++;
      process.stdout.write(".");
    }

    mapa[numero] = { imagem: { caminho, largura: img.largura, altura: img.altura } };
  }

  writeFileSync("lib/config/arquivos.json", JSON.stringify(mapa, null, 1) + "\n", "utf8");

  console.log(
    SOMENTE_MAPA ? "\n(somente mapa — nada enviado)" : `\nenviados: ${enviados} · reaproveitados: ${reaproveitados}`,
  );
  console.log(`cartinhas com imagem: ${Object.keys(mapa).length}`);
}
