import Link from "next/link";

/**
 * Leva para /cartinhas/imprimir: a pessoa vê a prévia visual de cada folha
 * "4 em 1" (grid 2×2 com as 4 cartinhas reais) antes de escolher qual baixar
 * — em vez de abrir o PDF direto sem saber o que vem dentro.
 */
export function BotaoFolhaA4({ totalLotes }: { totalLotes: number }) {
  if (totalLotes === 0) return null;

  return (
    <Link href="/cartinhas/imprimir" className="botao botao-claro">
      <IconeFolha /> Baixar 4 em 1 (folha A4)
    </Link>
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
