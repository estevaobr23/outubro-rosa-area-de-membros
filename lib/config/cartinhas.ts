/**
 * O CATÁLOGO DE CARTINHAS — junta as duas fontes num tipo só.
 *
 *   cartinhas-dados.json  → frase, complemento, ilustração. FONTE DA VERDADE
 *                           do texto (vem de producao/lote-01/dados-cartas.json
 *                           do projeto de criação). Nada é digitado aqui.
 *   arquivos.json         → quais imagens EXISTEM no bucket, com a dimensão
 *                           real. Gerado por `npm run sincronizar`, nunca à mão.
 *   temas.ts              → a etiqueta editorial "que tipo de mensagem".
 *
 * Cartinha com dado e SEM imagem no bucket não aparece: card sem imagem é
 * promessa vazia. É assim que "faltam N" fica verdade — nunca cravamos 100
 * enquanto só existem 50.
 */

import dados from "./cartinhas-dados.json";
import arquivos from "./arquivos.json";
import { TEMA_POR_CARTINHA, type Tema } from "./temas";

interface CartinhaBruta {
  numero: number;
  headline: string;
  complemento?: string;
  ilustracao?: string;
}

export interface Imagem {
  caminho: string;
  largura: number;
  altura: number;
}

export interface Cartinha {
  id: string;
  numero: number;
  /** "01", "13" — como aparece na tela e no suporte */
  numeroRotulo: string;
  frase: string;
  complemento: string | null;
  tema: Tema;
  imagem: Imagem;
}

type MapaArquivos = Record<string, { imagem?: Imagem }>;

function montar(c: CartinhaBruta, mapa: MapaArquivos): Cartinha | null {
  const id = String(c.numero).padStart(2, "0");
  const imagem = mapa[id]?.imagem;
  if (!imagem) return null;

  return {
    id,
    numero: c.numero,
    numeroRotulo: id,
    frase: c.headline,
    complemento: c.complemento?.trim() || null,
    tema: TEMA_POR_CARTINHA[c.numero] ?? "acolhimento",
    imagem,
  };
}

const DADOS = dados as CartinhaBruta[];

/** As cartinhas que a pessoa vê, na ordem do número. */
export const CARTINHAS: Cartinha[] = DADOS.map((c) => montar(c, arquivos as MapaArquivos))
  .filter((c): c is Cartinha => c !== null)
  .sort((a, b) => a.numero - b.numero);

/** Dados que existem e ainda não têm imagem no bucket — só teste/relatório. */
export const CARTINHAS_SEM_IMAGEM = DADOS.filter(
  (c) => !(arquivos as MapaArquivos)[String(c.numero).padStart(2, "0")]?.imagem,
).map((c) => c.numero);

const POR_ID = new Map(CARTINHAS.map((c) => [c.id, c]));

/** A LISTA REAL: id fora dela é 404, nunca imagem quebrada. */
export const cartinhaPorId = (id: string) => POR_ID.get(id);

/** Total que aparece na tela — vem da lista, nunca digitado em JSX. */
export const TOTAL_CARTINHAS = CARTINHAS.length;

/** O total prometido na oferta. Usado só para dizer quantas ainda faltam chegar. */
export const TOTAL_PROMETIDO = 100;
