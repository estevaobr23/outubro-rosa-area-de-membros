/** Ícone da marca: laço em traço delicado, paleta rosa/vinho da página de vendas. */
export function IconeMarca({ className = "marca-icone" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden="true">
      <rect width="48" height="48" rx="14" fill="#8c1d40" />
      <path
        d="M24 14.5c-3.1 0-5.6 2.6-5.6 5.9 0 2.7 1.5 5.3 3.1 7.6l-6.8 9.6 2.8 2.1 6.3-8.8 6.3 8.8 2.8-2.1-6.8-9.6c1.6-2.3 3.1-4.9 3.1-7.6 0-3.3-2.5-5.9-5.6-5.9z"
        fill="#fff"
      />
    </svg>
  );
}

export function Marca() {
  return (
    <span className="marca">
      <IconeMarca />
      <span className="marca-texto">
        Kit Outubro Rosa
        <small>Área de membros</small>
      </span>
    </span>
  );
}

/** Aviso de produto digital — curto, visível, sem virar texto jurídico. */
export function AvisoTecnico() {
  return (
    <div className="aviso" role="note">
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3 2 21h20L12 3Z" fill="#fcc419" stroke="#b07d00" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M12 10v5" stroke="#3f2f00" strokeWidth="2" strokeLinecap="round" />
        <circle cx="12" cy="18" r="1.1" fill="#3f2f00" />
      </svg>
      <span>
        <strong>Produto digital imprimível.</strong> As cartinhas são gestos de carinho e acolhimento
        — não substituem diagnóstico, tratamento ou acompanhamento médico.
      </span>
    </div>
  );
}
