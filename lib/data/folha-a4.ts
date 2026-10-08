import "server-only";
import { PDFDocument, rgb } from "pdf-lib";
import { createServiceClient } from "@/lib/supabase/server";
import { CARTINHAS, type Cartinha } from "@/lib/config/cartinhas";

/**
 * FOLHA A4 "4 em 1" — quatro cartinhas lado a lado (grid 2×2), com linha de
 * corte tracejada entre elas. Mesmo princípio do `.folha` da página de
 * vendas: economiza papel e torna o corte mais previsível que imprimir cada
 * cartinha avulsa numa folha inteira.
 *
 * Seleção SEQUENCIAL por lote (não escolhida pela pessoa): lote 1 = cartinhas
 * 1-4, lote 2 = 5-8, etc. Cresce sozinho conforme mais cartinhas entram — sem
 * mudar código. A última folha completa com o que sobrar (1 a 4 cartinhas).
 *
 * Gerada SOB DEMANDA a cada pedido — nunca armazenada — para refletir sempre
 * o catálogo real, e porque o volume (poucos PDFs pequenos, baixados raras
 * vezes) não justifica a complexidade de pré-gerar e cachear no bucket.
 */

const CARTINHAS_POR_LOTE = 4;
const MM_PARA_PT = 2.8346456693; // 1mm = 1/25.4 polegada = 72/25.4 pt
const A4_LARGURA_PT = 210 * MM_PARA_PT;
const A4_ALTURA_PT = 297 * MM_PARA_PT;
const MARGEM_PT = 10 * MM_PARA_PT;
const GAP_PT = 6 * MM_PARA_PT;

export const TOTAL_LOTES = Math.ceil(CARTINHAS.length / CARTINHAS_POR_LOTE);

export function cartinhasDoLote(lote: number): Cartinha[] {
  const inicio = (lote - 1) * CARTINHAS_POR_LOTE;
  return CARTINHAS.slice(inicio, inicio + CARTINHAS_POR_LOTE);
}

async function baixarImagem(caminho: string): Promise<Uint8Array> {
  const { data, error } = await createServiceClient().storage.from("cartinhas").download(caminho);
  if (error || !data) throw new Error(`falha ao baixar ${caminho}: ${error?.message ?? "sem dados"}`);
  return new Uint8Array(await data.arrayBuffer());
}

/** Monta a folha A4 com até 4 cartinhas em grid 2×2 e linha de corte tracejada. */
export async function gerarFolhaA4(lote: number): Promise<Uint8Array | null> {
  const cartinhas = cartinhasDoLote(lote);
  if (cartinhas.length === 0) return null;

  const pdf = await PDFDocument.create();
  const pagina = pdf.addPage([A4_LARGURA_PT, A4_ALTURA_PT]);

  const larguraCelula = (A4_LARGURA_PT - 2 * MARGEM_PT - GAP_PT) / 2;
  const alturaCelula = (A4_ALTURA_PT - 2 * MARGEM_PT - GAP_PT) / 2;

  const posicoes = [
    { col: 0, row: 0 },
    { col: 1, row: 0 },
    { col: 0, row: 1 },
    { col: 1, row: 1 },
  ];

  for (let i = 0; i < cartinhas.length; i++) {
    const cartinha = cartinhas[i];
    const bytes = await baixarImagem(cartinha.imagem.caminho);
    const imagem = await pdf.embedPng(bytes);

    // encaixa a imagem (3:4) dentro da célula mantendo proporção, centralizada
    const escala = Math.min(larguraCelula / imagem.width, alturaCelula / imagem.height);
    const w = imagem.width * escala;
    const h = imagem.height * escala;

    const { col, row } = posicoes[i];
    const celulaX = MARGEM_PT + col * (larguraCelula + GAP_PT);
    const celulaYTopo = A4_ALTURA_PT - MARGEM_PT - row * (alturaCelula + GAP_PT);
    const x = celulaX + (larguraCelula - w) / 2;
    const y = celulaYTopo - alturaCelula + (alturaCelula - h) / 2;

    pagina.drawImage(imagem, { x, y, width: w, height: h });

    // moldura tracejada: marca onde cortar
    pagina.drawRectangle({
      x: celulaX,
      y: celulaYTopo - alturaCelula,
      width: larguraCelula,
      height: alturaCelula,
      borderColor: rgb(0.79, 0.23, 0.4),
      borderWidth: 0.75,
      borderDashArray: [4, 3],
    });
  }

  // linha de corte central (cruz), só até onde há conteúdo
  const temEmbaixo = cartinhas.length > 2;
  const meioX = A4_LARGURA_PT / 2;
  const meioYTopo = A4_ALTURA_PT - MARGEM_PT;
  const meioYBase = temEmbaixo ? MARGEM_PT : A4_ALTURA_PT - MARGEM_PT - alturaCelula;

  pagina.drawLine({
    start: { x: meioX, y: meioYTopo },
    end: { x: meioX, y: meioYBase },
    thickness: 0.5,
    color: rgb(0.85, 0.85, 0.85),
    dashArray: [3, 3],
  });

  if (cartinhas.length > 1) {
    const meioY = A4_ALTURA_PT - MARGEM_PT - alturaCelula - GAP_PT / 2;
    pagina.drawLine({
      start: { x: MARGEM_PT, y: meioY },
      end: { x: A4_LARGURA_PT - MARGEM_PT, y: meioY },
      thickness: 0.5,
      color: rgb(0.85, 0.85, 0.85),
      dashArray: [3, 3],
    });
  }

  return pdf.save();
}
