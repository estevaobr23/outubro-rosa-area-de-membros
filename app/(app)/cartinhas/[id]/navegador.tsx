"use client";

import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Cartinha } from "@/lib/config/cartinhas";
import { TEMAS } from "@/lib/config/temas";
import { CHAVE_LISTA_NAVEGACAO, gravarPreferencia, lerPreferencia } from "@/lib/rotulos";
import { urlCartinha, urlDownloadCartinha } from "@/lib/urls";
import { Visualizador } from "@/app/_componentes/visualizador";
import { AvisoTecnico } from "@/app/_componentes/marca";
import { VoltarAoCatalogo } from "./voltar";

type ModoCelular = "carrossel" | "vertical";
const CHAVE_MODO = "cartinhas:navegacao";

/**
 * NAVEGAÇÃO ENTRE CARTINHAS — a página da cartinha vira um "passador".
 *
 *   • PC: setas grandes nas laterais da cartinha + ← → do teclado.
 *   • Celular, CARROSSEL: arrasta a cartinha para o lado (scroll-snap nativo).
 *   • Celular, VERTICAL: as cartinhas uma embaixo da outra, rolando.
 *
 * A LISTA é a que a pessoa estava vendo no feed (filtrada, na ordem), lida
 * do sessionStorage. Sem ela (link direto, aba nova), vale o catálogo inteiro.
 *
 * No carrossel só a imagem da cartinha atual e a dos vizinhos são montadas;
 * as outras são caixas vazias do mesmo tamanho — mesma economia de tráfego do
 * projeto de casas, adaptada: a cartinha pesa menos que uma prancha, mas o
 * princípio vale igual.
 */
export function NavegadorCartinhas({ todas, idInicial }: { todas: Cartinha[]; idInicial: string }) {
  const inicial = todas.find((c) => c.id === idInicial)!;
  const [lista, setLista] = useState<Cartinha[]>([inicial]);
  const [atualId, setAtualId] = useState(idInicial);
  const [modo, setModo] = useState<ModoCelular>("carrossel");
  const [celular, setCelular] = useState(false);
  const [expandida, setExpandida] = useState(false);

  const trilhoRef = useRef<HTMLDivElement>(null);
  const indiceRef = useRef(0);

  // ── a lista que a pessoa estava vendo ───────────────────────────────────
  useEffect(() => {
    let ids: string[] | null = null;
    try {
      const cru = sessionStorage.getItem(CHAVE_LISTA_NAVEGACAO);
      if (cru) ids = JSON.parse(cru);
    } catch {
      /* storage bloqueado */
    }
    const porId = new Map(todas.map((c) => [c.id, c]));
    const filtrada = (ids ?? []).map((id) => porId.get(id)).filter((c): c is Cartinha => Boolean(c));
    setLista(filtrada.some((c) => c.id === idInicial) ? filtrada : todas);
    setExpandida(true);

    const salvo = lerPreferencia(CHAVE_MODO);
    if (salvo === "carrossel" || salvo === "vertical") setModo(salvo);

    const mq = matchMedia("(max-width: 899px)");
    const aplicar = () => setCelular(mq.matches);
    aplicar();
    mq.addEventListener("change", aplicar);
    return () => mq.removeEventListener("change", aplicar);
  }, [todas, idInicial]);

  const vertical = celular && modo === "vertical";
  const indice = Math.max(0, lista.findIndex((c) => c.id === atualId));
  const atual = lista[indice] ?? inicial;
  indiceRef.current = indice;

  const posicao = expandida ? indice + 1 : todas.findIndex((c) => c.id === idInicial) + 1;
  const total = expandida ? lista.length : todas.length;

  // ── endereço e título acompanham a cartinha atual ───────────────────────
  useEffect(() => {
    if (!expandida) return;
    const alvo = `/cartinhas/${atual.id}`;
    if (location.pathname !== alvo) history.replaceState(null, "", alvo);
    document.title = `Cartinha ${atual.numeroRotulo} · Kit Outubro Rosa`;
  }, [atual, expandida]);

  // ── posiciona o trilho / o feed na cartinha atual, ANTES da pintura ─────
  useLayoutEffect(() => {
    if (!expandida) return;
    if (vertical) {
      document.getElementById(`cartinha-${atualId}`)?.scrollIntoView({ block: "start" });
    } else if (trilhoRef.current) {
      const t = trilhoRef.current;
      t.scrollTo({ left: indiceRef.current * t.clientWidth, behavior: "instant" as ScrollBehavior });
    }
    // só quando a lista chega ou o modo muda — não a cada troca de cartinha
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expandida, vertical, lista]);

  // ── carrossel: descobre a cartinha pela posição da rolagem ──────────────
  useEffect(() => {
    const t = trilhoRef.current;
    if (!t || vertical || !expandida) return;
    let espera: ReturnType<typeof setTimeout>;
    const aoRolar = () => {
      clearTimeout(espera);
      espera = setTimeout(() => {
        const i = Math.round(t.scrollLeft / t.clientWidth);
        const c = lista[i];
        if (c && c.id !== atualId) setAtualId(c.id);
      }, 90);
    };
    t.addEventListener("scroll", aoRolar, { passive: true });
    return () => {
      t.removeEventListener("scroll", aoRolar);
      clearTimeout(espera);
    };
  }, [lista, atualId, vertical, expandida]);

  // ── feed vertical: a cartinha que ocupa a tela vira a atual ─────────────
  useEffect(() => {
    if (!vertical || !expandida) return;
    const obs = new IntersectionObserver(
      (entradas) => {
        const visivel = entradas.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        const id = visivel?.target.getAttribute("data-id");
        if (id) setAtualId(id);
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    document.querySelectorAll(".cartao-vertical").forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [vertical, expandida, lista]);

  const irPara = useCallback(
    (i: number) => {
      const c = lista[i];
      if (!c) return;
      const t = trilhoRef.current;
      if (t && !vertical) {
        t.scrollTo({ left: i * t.clientWidth, behavior: "smooth" });
      }
      setAtualId(c.id);
    },
    [lista, vertical],
  );

  // ── teclado no PC: ← → passam de cartinha (fora do visor de zoom) ───────
  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (vertical || document.querySelector(".visor")) return;
      const alvo = e.target as HTMLElement;
      if (alvo.closest("input, textarea, select")) return;
      if (e.key === "ArrowRight") irPara(indiceRef.current + 1);
      if (e.key === "ArrowLeft") irPara(indiceRef.current - 1);
    };
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [irPara, vertical]);

  function escolherModo(m: ModoCelular) {
    setModo(m);
    gravarPreferencia(CHAVE_MODO, m);
  }

  const anterior = lista[indice - 1];
  const proximo = lista[indice + 1];

  return (
    <div className="tema-cartinha">
      <div className="proj-barra">
        <VoltarAoCatalogo />
        <span className="proj-posicao" aria-live="polite">
          Cartinha <b className="numero">{posicao}</b> de <span className="numero">{total}</span>
        </span>
        <div className="seletor-modo" role="group" aria-label="Como passar as cartinhas">
          <button type="button" aria-pressed={!vertical} onClick={() => escolherModo("carrossel")}>
            Carrossel
          </button>
          <button type="button" aria-pressed={vertical} onClick={() => escolherModo("vertical")}>
            Vertical
          </button>
        </div>
      </div>

      {vertical ? (
        <div className="feed-vertical">
          {lista.map((c) => (
            <article key={c.id} id={`cartinha-${c.id}`} data-id={c.id} className="cartao-vertical">
              <Cabecalho c={c} nivel="h2" />
              <Visualizador
                src={urlCartinha(c.id)}
                largura={c.imagem.largura}
                altura={c.imagem.altura}
                alt={`Cartinha ${c.numeroRotulo}: ${c.frase}`}
                titulo={`Cartinha ${c.numeroRotulo}`}
                rotuloAmpliar="Ampliar"
                carregamento="lazy"
                giroAutomatico={false}
              />
              <Detalhes c={c} />
            </article>
          ))}
          <div className="feed-fim">
            <AvisoTecnico />
          </div>
        </div>
      ) : (
        <>
          <Cabecalho c={atual} nivel="h1" />

          <div className="palco-cartinhas">
            <button
              type="button"
              className="seta seta-esq"
              onClick={() => irPara(indice - 1)}
              disabled={!anterior}
              aria-label={anterior ? `Cartinha anterior: ${anterior.numeroRotulo}` : "Não há cartinha anterior"}
            >
              <IconeSeta />
            </button>

            <div className="trilho trilho-retrato" ref={trilhoRef}>
              {lista.map((c, i) => (
                <div key={c.id} className="slide" aria-hidden={c.id !== atual.id}>
                  {Math.abs(i - indice) <= 1 ? (
                    <Visualizador
                      src={urlCartinha(c.id)}
                      largura={c.imagem.largura}
                      altura={c.imagem.altura}
                      alt={`Cartinha ${c.numeroRotulo}: ${c.frase}`}
                      titulo={`Cartinha ${c.numeroRotulo}`}
                      rotuloAmpliar="Ampliar cartinha"
                      giroAutomatico={false}
                    />
                  ) : (
                    <div className="slide-vazio" style={{ aspectRatio: `${c.imagem.largura} / ${c.imagem.altura}` }} />
                  )}
                </div>
              ))}
            </div>

            <button
              type="button"
              className="seta seta-dir"
              onClick={() => irPara(indice + 1)}
              disabled={!proximo}
              aria-label={proximo ? `Próxima cartinha: ${proximo.numeroRotulo}` : "Não há próxima cartinha"}
            >
              <IconeSeta />
            </button>
          </div>

          <p className="dica-arraste">Arraste a cartinha para o lado para trocar</p>

          <div className="cartinha-grade">
            <Detalhes c={atual} />
          </div>

          <nav className="vizinhos" aria-label="Outras cartinhas">
            {anterior ? (
              <button type="button" className="vizinho" onClick={() => irPara(indice - 1)}>
                <span>← Anterior</span>
                <strong>Cartinha {anterior.numeroRotulo}</strong>
              </button>
            ) : (
              <span />
            )}
            {proximo && (
              <button type="button" className="vizinho vizinho-prox" onClick={() => irPara(indice + 1)}>
                <span>Próxima →</span>
                <strong>Cartinha {proximo.numeroRotulo}</strong>
              </button>
            )}
          </nav>
        </>
      )}
    </div>
  );
}

function Cabecalho({ c, nivel }: { c: Cartinha; nivel: "h1" | "h2" }) {
  const Titulo = nivel;
  const nomeTema = TEMAS.find((t) => t.slug === c.tema)?.nome;
  return (
    <header className="cartinha-topo">
      <span className="rotulo">
        Cartinha <span className="numero">{c.numeroRotulo}</span> · {nomeTema}
      </span>
      <Titulo className="cartinha-nome">{c.frase}</Titulo>
    </header>
  );
}

function Detalhes({ c }: { c: Cartinha }) {
  return (
    <div className="bloco bloco-cartinha">
      {c.complemento && <p className="partido">{c.complemento}</p>}
      <div className="cartinha-acoes">
        <a href={urlDownloadCartinha(c.id)} className="botao botao-claro" download>
          Baixar só esta cartinha
        </a>
        <Link className="chip chip-destaque" href={`/cartinhas?tema=${c.tema}`}>
          Ver mais do tema {TEMAS.find((t) => t.slug === c.tema)?.nome}
        </Link>
      </div>
    </div>
  );
}

function IconeSeta() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
