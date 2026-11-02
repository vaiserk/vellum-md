/**
 * Resolve o endereço de uma imagem escrita na nota.
 *
 * O problema: a janela carrega de `dist/index.html`, então `![](assets/foto.png)`
 * era resolvido a partir da pasta do aplicativo — nunca a partir do vault. Toda
 * imagem com caminho relativo, que é a forma normal de escrever em Markdown,
 * aparecia como "imagem não encontrada". A única forma que funcionava era
 * `file:///C:/...` escrito à mão na nota, que quebra assim que o vault muda de
 * lugar.
 *
 * Aqui o caminho relativo é resolvido contra a pasta da PRÓPRIA NOTA, como faz
 * qualquer editor de Markdown, e vira uma URL `file://` absoluta.
 */

/** Um segmento que já contém %XX veio codificado do Markdown — não codificar de novo. */
const JA_CODIFICADO = /%[0-9A-Fa-f]{2}/;

function codificarSegmento(segmento: string): string {
  return JA_CODIFICADO.test(segmento) ? segmento : encodeURIComponent(segmento);
}

/** Converte um caminho absoluto de disco em URL `file://`. */
function paraUrlDeArquivo(caminhoAbsoluto: string): string {
  const partes = caminhoAbsoluto.replace(/\\/g, '/').split('/');
  const ehUnidadeWindows = /^[a-zA-Z]:$/.test(partes[0]);
  const codificadas = partes.map((p, i) =>
    i === 0 && ehUnidadeWindows ? p : codificarSegmento(p)
  );
  const caminho = codificadas.join('/');
  return ehUnidadeWindows ? `file:///${caminho}` : `file://${caminho}`;
}

/**
 * @param src     o que está escrito entre parênteses no Markdown
 * @param notePath caminho absoluto da nota aberta (ou `null` se nenhuma)
 * @returns o endereço a usar no `<img>`; `src` inalterado quando não há o que resolver
 */
export function resolveAssetUrl(src: string, notePath: string | null | undefined): string {
  const bruto = (src ?? '').trim();
  if (!bruto) return bruto;

  // Já tem esquema (http:, https:, data:, file:, blob:…): não é nosso problema.
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(bruto)) return bruto;
  // Relativo a protocolo (//cdn.exemplo/x.png) ou à raiz: deixa como está, em
  // vez de adivinhar uma raiz que o autor da nota não escreveu.
  if (bruto.startsWith('//') || bruto.startsWith('/')) return bruto;

  if (!notePath) return bruto;

  const pastaDaNota = notePath.replace(/\\/g, '/').split('/').slice(0, -1);
  for (const parte of bruto.replace(/\\/g, '/').split('/')) {
    if (parte === '' || parte === '.') continue;
    if (parte === '..') {
      // Nunca sobe além da raiz da unidade
      if (pastaDaNota.length > 1) pastaDaNota.pop();
      continue;
    }
    pastaDaNota.push(parte);
  }

  return paraUrlDeArquivo(pastaDaNota.join('/'));
}
