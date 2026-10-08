/**
 * MATERIAIS COMPLEMENTARES do kit — itens avulsos, não cartinhas.
 *
 * ⚠️ Conteúdo DENTRO do produto, não produto no banco: um entitlement já
 * libera os 5. Nenhum tem `href` enquanto o arquivo não existir — ver a regra
 * de bônus em `references/inicio-e-vitrine.md` da skill area-de-membros:
 * "Preparando" (é seu, está sendo feito), nunca "Em breve" (que é linguagem
 * de venda). Sem link, o item não é <Link>, é <div> — nunca pareça clicável
 * sem abrir nada.
 */

export interface Material {
  slug: string;
  nome: string;
  descricao: string;
  /** null enquanto o arquivo não existe — a tela mostra "Preparando" */
  href: string | null;
}

export const MATERIAIS: Material[] = [
  {
    slug: "plaquinha-retire-mensagem",
    nome: "Plaquinha \"Retire uma mensagem\"",
    descricao: "Para apoiar ao lado da caixinha de cartinhas.",
    href: null,
  },
  {
    slug: "arte-caixa",
    nome: "Arte para personalizar a caixa",
    descricao: "Folha para recortar e colar na caixa que vai guardar as cartinhas.",
    href: null,
  },
  {
    slug: "cartaz-a4",
    nome: "Cartaz A4 Outubro Rosa",
    descricao: "Para imprimir e avisar sobre a ação no mural ou na entrada.",
    href: null,
  },
  {
    slug: "tags-etiquetas",
    nome: "Tags e etiquetas decorativas",
    descricao: "Para enfeitar a caixa ou amarrar nas cartinhas.",
    href: null,
  },
  {
    slug: "guia-montagem",
    nome: "Guia rápido de montagem",
    descricao: "O passo a passo para montar a ação do início ao fim.",
    href: null,
  },
];
