// O catálogo de PRODUTOS: a fonte única do que existe para entregar.
//
// Divisão de responsabilidade com o motor de compras:
//   • a tabela `products` guarda o que a Cakto precisa casar (name, cakto_product_id);
//   • este arquivo guarda o que a PESSOA vê na prateleira da Início.
//
// Produto único hoje. Os 5 materiais complementares entram como itens dentro
// dele (lib/config/materiais.ts) — não são produto no banco nem entitlement
// próprio.

export interface Oferta {
  /**
   * ⚠️ IDÊNTICO a products.slug. É a chave que liga o entitlement a este card.
   * Divergiu, a pessoa paga e vê tela vazia. Trave isso num teste.
   */
  slug: string;
  nome: string;
  /** Uma linha. Aparece no card, antes de qualquer descrição. */
  chamada: string;
  /** Para onde a capa leva. */
  href: string;
}

export const SLUG_CARTINHAS = "kit-outubro-rosa";

export const OFERTAS: Oferta[] = [
  {
    slug: SLUG_CARTINHAS,
    nome: "Kit Ação Outubro Rosa — 100 Cartinhas de Força e Acolhimento",
    chamada: "Cartinhas prontas para imprimir, recortar e compartilhar — encontre pelo tema ou pela frase.",
    href: "/cartinhas",
  },
];

export const ofertaPorSlug = (slug: string) => OFERTAS.find((o) => o.slug === slug);

/**
 * Contato de suporte. VAZIO de propósito: não invente e-mail nem WhatsApp — as
 * telas escondem o bloco enquanto estiver em branco. Preencha com o MESMO
 * endereço cadastrado no produto da Cakto.
 */
export const SUPORTE = {
  email: "",
  whatsapp: "",
};
