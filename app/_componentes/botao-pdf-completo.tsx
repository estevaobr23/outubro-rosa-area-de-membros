import { urlDownloadPdfCompleto } from "@/lib/urls";

/**
 * Botão de destaque: baixar as 100 cartinhas num PDF só, pronto pra imprimir.
 * A rota (/api/download/pdf-completo) confere entitlement antes de redirecionar
 * para o Blob privado — nunca é uma URL pública.
 */
export function BotaoPdfCompleto() {
  return (
    <a href={urlDownloadPdfCompleto()} className="botao botao-destaque" download>
      <IconePdf /> Baixar as 100 cartinhas em PDF
    </a>
  );
}

function IconePdf() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M14 3v5h5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M8 17v-4h1.6c.9 0 1.6.7 1.6 1.4 0 .8-.7 1.4-1.6 1.4H8m5-2.8V17m2.8-4v4m0-2h1.6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}
