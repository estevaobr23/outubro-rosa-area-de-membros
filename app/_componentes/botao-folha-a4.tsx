"use client";

import { useEffect, useRef, useState } from "react";
import { urlDownloadFolhaA4 } from "@/lib/urls";

/**
 * Botão "4 em 1": baixa uma folha A4 com 4 cartinhas lado a lado, linha de
 * corte tracejada entre elas — pensado pra quem vai imprimir e recortar.
 *
 * Os lotes são sequenciais (1-4, 5-8, ...), derivados da lista real de
 * cartinhas — nunca digitados. Com poucas folhas (até 4) mostra um botão por
 * lote; com mais, um menu suspenso simples evita a fileira de botões crescer
 * sem limite conforme o catálogo cresce para 100 cartinhas.
 */
export function BotaoFolhaA4({ totalLotes }: { totalLotes: number }) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;
    function aoClicarFora(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false);
    }
    document.addEventListener("mousedown", aoClicarFora);
    return () => document.removeEventListener("mousedown", aoClicarFora);
  }, [aberto]);

  if (totalLotes === 0) return null;

  const lotes = Array.from({ length: totalLotes }, (_, i) => i + 1);

  return (
    <div className="folha-a4" ref={ref}>
      <button type="button" className="botao botao-claro" onClick={() => setAberto((v) => !v)} aria-expanded={aberto}>
        <IconeFolha /> Baixar 4 em 1 (folha A4)
      </button>
      {aberto && (
        <div className="folha-a4-menu" role="menu">
          {lotes.map((lote) => {
            const de = (lote - 1) * 4 + 1;
            const ate = Math.min(lote * 4, (lote - 1) * 4 + 4);
            return (
              <a
                key={lote}
                href={urlDownloadFolhaA4(lote)}
                className="folha-a4-item"
                download
                role="menuitem"
                onClick={() => setAberto(false)}
              >
                Folha {lote} · Cartinhas {String(de).padStart(2, "0")}–{String(ate).padStart(2, "0")}
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}

function IconeFolha() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="3" width="8" height="8" rx="1" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <rect x="13" y="3" width="8" height="8" rx="1" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <rect x="3" y="13" width="8" height="8" rx="1" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <rect x="13" y="13" width="8" height="8" rx="1" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}
