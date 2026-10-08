"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { TEMAS, type Tema } from "@/lib/config/temas";
import { urlCartinha } from "@/lib/urls";
import {
  CHAVE_LISTA_NAVEGACAO,
  CHAVE_ULTIMA_BUSCA,
  lerPreferencia,
  gravarPreferencia,
  normalizarBusca,
} from "@/lib/rotulos";

export interface CartinhaResumo {
  id: string;
  numeroRotulo: string;
  frase: string;
  tema: Tema;
}

type Feed = "normal" | "duplo";
const CHAVE_FEED = "cartinhas:feed";

/**
 * Os filtros moram na URL (?tema=&q=), não em estado: o botão voltar do
 * celular devolve a pessoa exatamente à lista que ela via, e um atalho da
 * Início ("/cartinhas?tema=forca") já chega filtrado.
 *
 * O FEED (Normal × Duplo) é preferência da pessoa, não da busca: mora no
 * localStorage. É lido em useEffect, NUNCA no inicializador do useState — o
 * servidor não tem localStorage e o primeiro render precisa bater com o HTML.
 *
 * As opções do filtro de tema são DERIVADAS da lista real de cartinhas.
 */
export function Catalogo({ cartinhas }: { cartinhas: CartinhaResumo[] }) {
  const router = useRouter();
  const caminho = usePathname();
  const busca = useSearchParams();
  const [feed, setFeed] = useState<Feed>("normal");

  useEffect(() => {
    const salvo = lerPreferencia(CHAVE_FEED);
    if (salvo === "normal" || salvo === "duplo") setFeed(salvo);
  }, []);

  function escolherFeed(f: Feed) {
    setFeed(f);
    gravarPreferencia(CHAVE_FEED, f);
  }

  const tema = busca.get("tema");

  // BUSCA POR TEXTO. O que a pessoa digita vive em estado local (a tecla tem de
  // aparecer na hora) e a lista filtra a cada letra; a URL (?q=) é só um espelho,
  // gravado com atraso, para o "voltar" devolver a busca.
  const [texto, setTexto] = useState(() => busca.get("q") ?? "");
  const ultimoQ = useRef(busca.get("q") ?? "");

  useEffect(() => {
    const q = busca.get("q") ?? "";
    if (q !== ultimoQ.current) {
      ultimoQ.current = q;
      setTexto(q);
    }
  }, [busca]);

  useEffect(() => {
    const q = texto.trim();
    if (q === ultimoQ.current) return;
    const t = setTimeout(() => {
      ultimoQ.current = q;
      // lê a URL de agora (não a do render): um filtro clicado nesse meio-tempo não se perde
      const novo = new URLSearchParams(window.location.search);
      if (q) novo.set("q", q);
      else novo.delete("q");
      const qs = novo.toString();
      router.replace(qs ? `${caminho}?${qs}` : caminho, { scroll: false });
    }, 300);
    return () => clearTimeout(t);
  }, [texto, router, caminho]);

  const palavras = useMemo(() => normalizarBusca(texto).split(" ").filter(Boolean), [texto]);

  // Texto pesquisável de cada cartinha, montado uma vez: número + frase + tema.
  const textos = useMemo(
    () =>
      new Map(
        cartinhas.map((c) => [
          c.id,
          normalizarBusca(
            [c.numeroRotulo, `cartinha ${c.numeroRotulo}`, c.frase, TEMAS.find((t) => t.slug === c.tema)?.nome ?? ""].join(" "),
          ),
        ]),
      ),
    [cartinhas],
  );

  const opcoesTema = useMemo(
    () => TEMAS.filter((t) => cartinhas.some((c) => c.tema === t.slug)),
    [cartinhas],
  );

  const filtradas = useMemo(
    () =>
      cartinhas.filter(
        (c) => (!tema || c.tema === tema) && palavras.every((w) => textos.get(c.id)?.includes(w)),
      ),
    [cartinhas, tema, palavras, textos],
  );

  const algumFiltro = Boolean(tema || palavras.length);

  // Guarda a busca (para o "voltar") e a LISTA FILTRADA (para as setas da
  // página da cartinha andarem só entre o que ela estava vendo).
  useEffect(() => {
    try {
      sessionStorage.setItem(CHAVE_ULTIMA_BUSCA, busca.toString());
      sessionStorage.setItem(CHAVE_LISTA_NAVEGACAO, JSON.stringify(filtradas.map((c) => c.id)));
    } catch {
      /* modo privado / storage bloqueado: voltar e setas usam a lista inteira */
    }
  }, [busca, filtradas]);

  function alternarTema(valor: string) {
    const novo = new URLSearchParams(window.location.search);
    if (novo.get("tema") === valor) novo.delete("tema");
    else novo.set("tema", valor);
    const qs = novo.toString();
    router.replace(qs ? `${caminho}?${qs}` : caminho, { scroll: false });
  }

  function limpar() {
    ultimoQ.current = "";
    setTexto("");
    router.replace(caminho, { scroll: false });
  }

  return (
    <>
      <section className="filtros" aria-label="Filtros">
        <div className="pesquisa">
          <svg className="pesquisa-lupa" width="18" height="18" viewBox="0 0 20 20" aria-hidden="true">
            <circle cx="8.5" cy="8.5" r="5.5" fill="none" stroke="currentColor" strokeWidth="2" />
            <path d="m13 13 4.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            className="pesquisa-campo"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Pesquisar: frase, número, tema…"
            aria-label="Pesquisar cartinhas"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="search"
          />
          {texto && (
            <button type="button" className="pesquisa-limpar" onClick={() => setTexto("")} aria-label="Apagar a pesquisa">
              ×
            </button>
          )}
        </div>

        <div className="filtro filtro-tema">
          <span className="filtro-nome" id="f-tema">Tema</span>
          <div className="opcoes" role="group" aria-labelledby="f-tema">
            {opcoesTema.map((t) => (
              <button key={t.slug} type="button" className="opcao" aria-pressed={tema === t.slug} onClick={() => alternarTema(t.slug)}>
                {t.nome}
              </button>
            ))}
          </div>
        </div>

        <div className="filtros-rodape">
          <span className="contagem" aria-live="polite">
            <strong>{filtradas.length}</strong> {filtradas.length === 1 ? "cartinha encontrada" : "cartinhas encontradas"}
          </span>
          <button type="button" className="limpar" onClick={limpar} disabled={!algumFiltro}>
            Limpar filtros
          </button>
          <div className="seletor-feed" role="group" aria-label="Como ver as cartinhas">
            <button type="button" aria-pressed={feed === "normal"} onClick={() => escolherFeed("normal")}>
              <IconeNormal /> Normal
            </button>
            <button type="button" aria-pressed={feed === "duplo"} onClick={() => escolherFeed("duplo")}>
              <IconeDuplo /> Duplo
            </button>
          </div>
        </div>
      </section>

      {filtradas.length === 0 ? (
        <div className="vazio">
          <h2>{palavras.length ? "Nenhuma cartinha encontrada" : "Nenhuma cartinha com esse tema"}</h2>
          <p>{palavras.length ? "Confira o que foi digitado ou tire o filtro." : "Tire o filtro para ver mais opções."}</p>
          <button type="button" className="botao botao-claro" onClick={limpar} style={{ marginTop: 10 }}>
            Limpar filtros
          </button>
        </div>
      ) : (
        <div className={`grade-cartinhas feed-${feed}`} data-feed={feed}>
          {filtradas.map((c, i) => (
            <Link key={c.id} href={`/cartinhas/${c.id}`} className="card">
              <div className="card-imagem">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={urlCartinha(c.id)}
                  alt={`Cartinha ${c.numeroRotulo}: ${c.frase}`}
                  width={1024}
                  height={1365}
                  loading={i < 4 ? "eager" : "lazy"}
                  decoding="async"
                />
              </div>
              <div className="card-corpo">
                <span className="card-tipo">
                  <span className="card-num">{c.numeroRotulo}</span> {TEMAS.find((t) => t.slug === c.tema)?.nome}
                </span>
                {feed === "normal" && <p className="card-frase">{c.frase}</p>}
                <span className="card-acao">Abrir cartinha →</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

function IconeNormal() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <rect x="2" y="2" width="12" height="5" rx="1.2" fill="currentColor" />
      <rect x="2" y="9" width="12" height="5" rx="1.2" fill="currentColor" />
    </svg>
  );
}

function IconeDuplo() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <rect x="2" y="2" width="5" height="5" rx="1.2" fill="currentColor" />
      <rect x="9" y="2" width="5" height="5" rx="1.2" fill="currentColor" />
      <rect x="2" y="9" width="5" height="5" rx="1.2" fill="currentColor" />
      <rect x="9" y="9" width="5" height="5" rx="1.2" fill="currentColor" />
    </svg>
  );
}
