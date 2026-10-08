import type { Metadata } from "next";
import { Suspense } from "react";
import { CARTINHAS, TOTAL_CARTINHAS, TOTAL_PROMETIDO } from "@/lib/config/cartinhas";
import { TOTAL_LOTES } from "@/lib/data/folha-a4";
import { AvisoTecnico } from "@/app/_componentes/marca";
import { BotaoPdfCompleto } from "@/app/_componentes/botao-pdf-completo";
import { BotaoFolhaA4 } from "@/app/_componentes/botao-folha-a4";
import { Catalogo, type CartinhaResumo } from "./catalogo";

export const metadata: Metadata = { title: "Cartinhas" };

export default function PaginaCartinhas() {
  // Só o que o card e o filtro usam vai para o navegador.
  const resumos: CartinhaResumo[] = CARTINHAS.map((c) => ({
    id: c.id,
    numeroRotulo: c.numeroRotulo,
    frase: c.frase,
    tema: c.tema,
  }));

  const faltam = TOTAL_PROMETIDO - TOTAL_CARTINHAS;

  return (
    <>
      <header className="cabeca-catalogo">
        <span className="rotulo">Catálogo</span>
        <h1>Cartinhas de força e acolhimento</h1>
        <p>
          <span className="numero">{TOTAL_CARTINHAS}</span> cartinhas liberadas. Pesquise pela frase ou
          filtre pelo tema.
        </p>
      </header>

      <div className="acoes-topo">
        <BotaoPdfCompleto />
        <BotaoFolhaA4 totalLotes={TOTAL_LOTES} />
      </div>

      {/* useSearchParams exige Suspense: sem ele o build falha na pré-renderização. */}
      <Suspense>
        <Catalogo cartinhas={resumos} />
      </Suspense>

      {faltam > 0 && (
        <p className="chegando">
          Faltam <span className="numero">{faltam}</span> cartinhas para completar as 100 prometidas —
          elas entram neste catálogo conforme são publicadas, você não precisa fazer nada.
        </p>
      )}

      <div style={{ marginTop: 22 }}>
        <AvisoTecnico />
      </div>
    </>
  );
}
