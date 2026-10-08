import type { Metadata } from "next";
import Link from "next/link";
import { TOTAL_LOTES, cartinhasDoLote } from "@/lib/data/folha-a4";
import { urlCartinha, urlDownloadFolhaA4 } from "@/lib/urls";
import { AvisoTecnico } from "@/app/_componentes/marca";

export const metadata: Metadata = { title: "Folhas para imprimir" };

export default function PaginaImprimir() {
  const lotes = Array.from({ length: TOTAL_LOTES }, (_, i) => i + 1).map((lote) => ({
    lote,
    cartinhas: cartinhasDoLote(lote),
  }));

  return (
    <>
      <Link href="/cartinhas" className="voltar">
        ← Voltar às cartinhas
      </Link>

      <header className="cabeca-catalogo">
        <span className="rotulo">Impressão</span>
        <h1>Folhas 4 em 1, prontas para imprimir</h1>
        <p>
          Cada folha A4 traz 4 cartinhas lado a lado, com linha de corte entre elas — menos papel,
          corte mais fácil. <span className="numero">{TOTAL_LOTES}</span>{" "}
          {TOTAL_LOTES === 1 ? "folha cobre" : "folhas cobrem"} todas as cartinhas liberadas.
        </p>
      </header>

      <div className="grade-folhas">
        {lotes.map(({ lote, cartinhas }) => {
          const de = (lote - 1) * 4 + 1;
          const ate = de + cartinhas.length - 1;
          return (
            <div key={lote} className="card-folha">
              <div className="card-folha-grid" data-count={cartinhas.length}>
                {cartinhas.map((c) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={c.id} src={urlCartinha(c.id)} alt={`Cartinha ${c.numeroRotulo}`} loading="lazy" />
                ))}
              </div>
              <div className="card-folha-corpo">
                <h3>
                  Folha {lote} <span className="card-folha-faixa">· Cartinhas {String(de).padStart(2, "0")}–{String(ate).padStart(2, "0")}</span>
                </h3>
                <a href={urlDownloadFolhaA4(lote)} className="botao botao-claro" download>
                  Baixar esta folha (PDF A4)
                </a>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 28 }}>
        <AvisoTecnico />
      </div>
    </>
  );
}
