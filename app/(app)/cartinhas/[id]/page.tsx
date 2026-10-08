import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CARTINHAS, cartinhaPorId } from "@/lib/config/cartinhas";
import { NavegadorCartinhas } from "./navegador";

// O título da aba NÃO depende de acesso: o layout (app) já exige entitlement, e
// generateMetadata não pode ser a diferença entre quem tem e quem não tem.
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const c = cartinhaPorId(id);
  return { title: c ? `Cartinha ${c.numeroRotulo}` : "Cartinha" };
}

export default async function PaginaCartinha({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Id fora da LISTA REAL é 404 — nunca uma página com imagem quebrada.
  if (!cartinhaPorId(id)) notFound();

  // A lista inteira vai para o navegador: é ela que as setas, o carrossel e o
  // feed vertical percorrem sem recarregar a página. Só dados, as imagens
  // continuam saindo pela rota protegida.
  return <NavegadorCartinhas todas={CARTINHAS} idInicial={id} />;
}
