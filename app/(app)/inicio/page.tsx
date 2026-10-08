import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentCustomer } from "@/lib/auth/session";
import { getBiblioteca } from "@/lib/data/biblioteca";
import { CARTINHAS, TOTAL_CARTINHAS, TOTAL_PROMETIDO } from "@/lib/config/cartinhas";
import { TEMAS } from "@/lib/config/temas";
import { MATERIAIS } from "@/lib/config/materiais";
import { urlCartinha } from "@/lib/urls";
import { AvisoTecnico } from "@/app/_componentes/marca";
import { BotaoPdfCompleto } from "@/app/_componentes/botao-pdf-completo";
import { BotaoFolhaA4 } from "@/app/_componentes/botao-folha-a4";
import { TOTAL_LOTES } from "@/lib/data/folha-a4";

export const metadata: Metadata = { title: "Início" };

/** Até três cartinhas para a arte da capa. */
function imagensDaCapa() {
  return CARTINHAS.slice(0, 3).map((c) => urlCartinha(c.id));
}

const primeiroNome = (nome: string | null) => nome?.trim().split(/\s+/)[0] ?? null;

export default async function Inicio() {
  const [cliente, { minhas }] = await Promise.all([getCurrentCustomer(), getBiblioteca()]);
  const nome = primeiroNome(cliente?.name ?? null);
  const capa = imagensDaCapa();
  const faltam = TOTAL_PROMETIDO - TOTAL_CARTINHAS;

  // Contagem por tema vem da lista real — nenhum número digitado.
  const porTema = TEMAS.map((t) => ({
    ...t,
    total: CARTINHAS.filter((c) => c.tema === t.slug).length,
  })).filter((t) => t.total > 0);

  return (
    <>
      <section className="saudacao">
        <span className="rotulo">Sua biblioteca</span>
        <h1>{nome ? `Olá, ${nome}!` : "Olá!"}</h1>
        <p>
          Escolha a cartinha pela frase ou pelo tema que combina com o momento. Toque na imagem para
          ampliar.
        </p>
      </section>

      <div className="acoes-topo" style={{ marginTop: 20 }}>
        <BotaoPdfCompleto />
        <BotaoFolhaA4 totalLotes={TOTAL_LOTES} />
      </div>

      <div className="secao-titulo">
        <h2>Seus materiais</h2>
      </div>
      <div className="prateleira">
        {minhas.map(({ oferta }) => (
          <Link key={oferta.slug} href={oferta.href} className="capa">
            <div className="capa-arte" aria-hidden="true">
              {capa.map((src) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={src} src={src} alt="" loading="eager" />
              ))}
              <span className="capa-selo">
                <span className="numero">{TOTAL_CARTINHAS}</span> cartinhas liberadas
              </span>
            </div>
            <div className="capa-corpo">
              <h3>{oferta.nome}</h3>
              <p>{oferta.chamada}</p>
              <span className="capa-acao">Abrir catálogo →</span>
            </div>
          </Link>
        ))}
      </div>
      {faltam > 0 && (
        <p className="chegando">
          Faltam <span className="numero">{faltam}</span> cartinhas para completar as 100 prometidas —
          elas aparecem aqui sozinhas conforme são publicadas.
        </p>
      )}

      <div className="secao-titulo">
        <h2>Escolha pelo tema</h2>
      </div>
      <div className="atalhos">
        {porTema.map((t) => (
          <Link key={t.slug} className="atalho" href={`/cartinhas?tema=${t.slug}`}>
            <strong>{t.nome}</strong>
            <span>
              <span className="numero">{t.total}</span> {t.total === 1 ? "cartinha" : "cartinhas"}
            </span>
          </Link>
        ))}
      </div>

      <div className="secao-titulo">
        <h2>Materiais complementares do kit</h2>
      </div>
      <div className="atalhos atalhos-materiais">
        {MATERIAIS.map((m) =>
          m.href ? (
            <a key={m.slug} className="atalho" href={m.href} download>
              <strong>{m.nome}</strong>
              <span>{m.descricao}</span>
            </a>
          ) : (
            <div key={m.slug} className="atalho atalho-preparando">
              <strong>{m.nome}</strong>
              <span>{m.descricao}</span>
              <span className="selo-preparando">Preparando</span>
            </div>
          ),
        )}
      </div>
      <p className="chegando">
        Os materiais complementares estão sendo preparados. Eles já são seus — o acesso está
        registrado e não vence. Assim que ficarem prontos, aparecem aqui sozinhos, sem custo nenhum e
        sem você precisar fazer nada.
      </p>

      <div style={{ marginTop: 28 }}>
        <AvisoTecnico />
      </div>
    </>
  );
}
