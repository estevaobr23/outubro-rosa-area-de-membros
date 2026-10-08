import { exigirCartinhas } from "@/lib/data/biblioteca";
import { Navegacao } from "./navegacao";

/**
 * Tudo dentro de (app) exige sessão + entitlement ativo. Sem acesso, 404 —
 * e quem tem cookie órfão vai para /api/sessao-encerrada (ver requireCustomer).
 */
export default async function LayoutApp({ children }: { children: React.ReactNode }) {
  await exigirCartinhas();
  return (
    <>
      <Navegacao />
      <main className="conteudo">{children}</main>
    </>
  );
}
