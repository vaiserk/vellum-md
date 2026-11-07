import { useEffect, useState, type RefObject } from 'react';
import { slugifyAnchor } from '../../utils/wikilink';

/**
 * Âncora de seção (`[[Nota#Seção]]`).
 *
 * O clique no wikilink só PEDE a abertura da nota; quem abre é o tratador do
 * evento, de forma assíncrona. Rolar na hora levaria à seção da nota ANTIGA,
 * que ainda está na tela. Por isso a âncora fica pendente, junto do nome da
 * nota esperada, e só é consumida quando essa nota é de fato a ativa E o
 * título já existe no DOM.
 *
 * @param previewRef   contêiner onde o markdown renderizado é montado
 * @param activeFile   caminho da nota aberta agora
 * @param conteudo     conteúdo já renderizado (muda depois do activeFile)
 * @param aoSaltar     avisado imediatamente antes de rolar, para que a
 *                     sincronia editor↔pré-visualização não desfaça o salto
 */
export function useAncoraDeSecao(
  previewRef: RefObject<HTMLElement>,
  activeFile: string | null | undefined,
  conteudo: unknown,
  aoSaltar?: () => void,
) {
  const [ancoraPendente, setAncoraPendente] =
    useState<{ nota: string; ancora: string } | null>(null);

  useEffect(() => {
    const aoAbrirNota = (e: any) => {
      const ancora = e.detail?.anchor;
      if (ancora) setAncoraPendente({ nota: (e.detail?.name || '').trim(), ancora });
    };
    window.addEventListener('vellum:open-note', aoAbrirNota);
    return () => window.removeEventListener('vellum:open-note', aoAbrirNota);
  }, []);

  useEffect(() => {
    if (!ancoraPendente) return;

    const notaAtual = (activeFile?.split(/[/\\]/).pop() ?? '').replace(/\.md$/i, '');
    // Sem nome => âncora da própria nota (`[[#Seção]]`), rola já.
    const chegou = !ancoraPendente.nota
      || notaAtual.toLowerCase() === ancoraPendente.nota.toLowerCase();

    // Descarte por tempo, para a âncora não disparar numa navegação futura sem
    // relação com o clique. Cobre os dois becos sem saída: a nota nunca abre
    // (não existe, ou o usuário recusou criá-la) e o título procurado não
    // existe na nota.
    const desistir = setTimeout(() => setAncoraPendente(null), 3000);
    if (!chegou) return () => clearTimeout(desistir);

    // O conteúdo chega DEPOIS do activeFile: a leitura do arquivo é assíncrona
    // e o preview ainda passa por um debounce. Quando este efeito roda pela
    // primeira vez, o DOM ainda exibe o HTML da nota anterior.
    //
    // Por isso a âncora só é consumida quando o título aparece de fato. A
    // versão anterior tentava uma única vez e descartava a âncora mesmo sem
    // achar nada — o salto se perdia, e a nota abria no topo. Mantendo a
    // âncora pendente, o efeito roda de novo quando o conteúdo muda.
    const id = requestAnimationFrame(() => {
      const slug = slugifyAnchor(ancoraPendente.ancora);
      const alvo = slug ? previewRef.current?.querySelector(`#${CSS.escape(slug)}`) : null;
      if (!alvo) return;
      // Avisa ANTES de rolar: o editor da nota recém-aberta ainda emite
      // rolagens, e a sincronia entre os painéis mapearia o topo dele por cima
      // do salto. Era isso que levava a pré-visualização de volta ao começo.
      aoSaltar?.();
      // Salto instantâneo, não suave: a animação durava centenas de
      // milissegundos e qualquer escrita em scrollTop no meio do caminho a
      // cancelava, deixando o painel parado a menos de um pixel da origem.
      alvo.scrollIntoView({ behavior: 'auto', block: 'start' });
      setAncoraPendente(null);
    });
    return () => {
      cancelAnimationFrame(id);
      clearTimeout(desistir);
    };
  }, [ancoraPendente, conteudo, activeFile]);
}
