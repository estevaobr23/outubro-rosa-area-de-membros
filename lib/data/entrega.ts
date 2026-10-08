import "server-only";
import { NextResponse } from "next/server";
import { possuiCartinhas } from "@/lib/data/biblioteca";
import { cartinhaPorId } from "@/lib/config/cartinhas";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * Entrega das imagens das cartinhas e do PDF completo. TRÊS TRAVAS, nesta ordem:
 *
 *   1. sessão válida (requireCustomer, dentro de possuiCartinhas);
 *   2. entitlement ativo do produto — sem ele, 404 (nunca 403);
 *   3. o id pedido está na LISTA REAL de cartinhas com imagem — fora dela,
 *      404. Cartinha que ainda não existe dá 404, não imagem quebrada.
 *
 * Bucket PRIVADO + URL assinada + 302: os bytes não passam pela Vercel, e a
 * URL EXPIRA em 1h — um link colado num grupo morre sozinho.
 *
 * Duas entregas diferentes para a mesma cartinha:
 *   - visualização (`entregarCartinha`): o PNG como está, para ver na tela.
 *   - download avulso (`entregarDownloadCartinha`): o mesmo arquivo, mas com
 *     Content-Disposition: attachment — não é imagem quebrada nem link cru,
 *     é o navegador abrindo o diálogo de salvar.
 */

const VALIDADE_SEGUNDOS = 3600;
/** reaproveita a mesma assinatura antes de vencer, com 10 min de folga */
const REUSO_MS = (VALIDADE_SEGUNDOS - 600) * 1000;
const BUCKET = "cartinhas";

const naoEncontrado = () => new NextResponse("Nao encontrado", { status: 404 });

/**
 * Cache de URLs assinadas por instância. Uma URL ESTÁVEL é o que faz o
 * navegador reaproveitar a imagem do próprio cache; reassinando a cada pedido
 * a URL muda, o cache nunca acerta e a cartinha é baixada de novo toda vez.
 */
const assinadas = new Map<string, { url: string; expiraEm: number }>();

async function assinar(caminho: string, download?: string): Promise<string | null> {
  const chaveCache = download ? `${caminho}::${download}` : caminho;
  const guardada = assinadas.get(chaveCache);
  if (guardada && guardada.expiraEm > Date.now()) return guardada.url;

  const { data, error } = await createServiceClient()
    .storage.from(BUCKET)
    .createSignedUrl(caminho, VALIDADE_SEGUNDOS, download ? { download } : undefined);

  if (error || !data?.signedUrl) return null;

  assinadas.set(chaveCache, { url: data.signedUrl, expiraEm: Date.now() + REUSO_MS });
  return data.signedUrl;
}

export async function entregarCartinha(id: string): Promise<NextResponse> {
  if (!(await possuiCartinhas())) return naoEncontrado();

  const cartinha = cartinhaPorId(id);
  if (!cartinha) return naoEncontrado();

  const url = await assinar(cartinha.imagem.caminho);
  if (!url) return new NextResponse("Arquivo nao encontrado no storage", { status: 404 });

  const resposta = NextResponse.redirect(url, { status: 302 });
  resposta.headers.set("Cache-Control", "private, no-store");
  resposta.headers.set("X-Content-Type-Options", "nosniff");
  return resposta;
}

export async function entregarDownloadCartinha(id: string): Promise<NextResponse> {
  if (!(await possuiCartinhas())) return naoEncontrado();

  const cartinha = cartinhaPorId(id);
  if (!cartinha) return naoEncontrado();

  const nomeArquivo = `cartinha-${cartinha.numeroRotulo}.png`;
  const url = await assinar(cartinha.imagem.caminho, nomeArquivo);
  if (!url) return new NextResponse("Arquivo nao encontrado no storage", { status: 404 });

  const resposta = NextResponse.redirect(url, { status: 302 });
  resposta.headers.set("Cache-Control", "private, no-store");
  resposta.headers.set("X-Content-Type-Options", "nosniff");
  return resposta;
}

/**
 * O PDF único com todas as cartinhas. Arquivo grande → Vercel Blob privado
 * com Range (ver references/entrega-de-conteudo.md da skill), não este
 * bucket. PENDENTE: o PDF ainda não foi gerado/publicado — ver nota no
 * componente que chama esta rota.
 */
export async function entregarPdfCompleto(): Promise<NextResponse> {
  if (!(await possuiCartinhas())) return naoEncontrado();

  const blobUrl = process.env.PDF_COMPLETO_BLOB_URL;
  if (!blobUrl) {
    return new NextResponse("PDF ainda nao publicado", { status: 404 });
  }

  const resposta = NextResponse.redirect(blobUrl, { status: 302 });
  resposta.headers.set("Cache-Control", "private, no-store");
  resposta.headers.set("X-Content-Type-Options", "nosniff");
  return resposta;
}
