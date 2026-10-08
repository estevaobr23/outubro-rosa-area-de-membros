import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import { requireCustomer } from "@/lib/auth/session";
import { createServiceClient } from "@/lib/supabase/server";
import { ofertaPorSlug, SLUG_CARTINHAS, type Oferta } from "@/lib/config/ofertas";

/**
 * Junta os entitlements do banco com o catálogo do código: o que é dela.
 *
 * Só entitlement com status 'active' conta — 'revoked' (reembolso/chargeback)
 * some daqui, e com ele o acesso às telas e às imagens.
 */

export interface MeuProduto {
  oferta: Oferta;
  liberadoEm: string;
}

export interface Biblioteca {
  minhas: MeuProduto[];
  /** slugs comprados que NÃO têm card no catálogo — ela paga e não vê nada */
  semCatalogo: string[];
}

/** Deduplicado por requisição: layout, página e rotas de arquivo chamam isto. */
export const getBiblioteca = cache(async (): Promise<Biblioteca> => {
  const customer = await requireCustomer();
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("entitlements")
    .select("created_at, products!inner(slug)")
    .eq("customer_id", customer.id)
    .eq("status", "active");

  if (error) throw new Error("Falha ao ler acessos: " + error.message);

  const minhas: MeuProduto[] = [];
  const semCatalogo: string[] = [];

  for (const linha of data ?? []) {
    const slug = (linha.products as unknown as { slug: string }).slug;
    const oferta = ofertaPorSlug(slug);
    if (!oferta) {
      // Comprou e não existe card para mostrar. Nunca deixe passar calado.
      console.error(`[biblioteca] entitlement sem card no catalogo | slug=${slug}`);
      semCatalogo.push(slug);
      continue;
    }
    minhas.push({ oferta, liberadoEm: linha.created_at as string });
  }

  return { minhas, semCatalogo };
});

/**
 * Porta de entrada de toda tela e rota de conteúdo: sessão E entitlement.
 * 404, nunca 403 — 403 confirma que o produto existe.
 */
export async function exigirOferta(slug: string): Promise<Oferta> {
  const { minhas } = await getBiblioteca();
  const meu = minhas.find((m) => m.oferta.slug === slug);
  if (!meu) notFound();
  return meu.oferta;
}

export const exigirCartinhas = () => exigirOferta(SLUG_CARTINHAS);

/** Versão sem notFound(), para rota de API que responde 404 por conta própria. */
export async function possuiCartinhas(): Promise<boolean> {
  const { minhas } = await getBiblioteca();
  return minhas.some((m) => m.oferta.slug === SLUG_CARTINHAS);
}
