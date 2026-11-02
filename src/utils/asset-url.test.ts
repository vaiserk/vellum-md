import { describe, it, expect } from 'vitest';
import { resolveAssetUrl } from './asset-url';

const NOTA = 'C:\\Vault\\Pesquisa\\Arquitetura.md';

describe('resolveAssetUrl', () => {
  it('resolve caminho relativo contra a pasta da nota', () => {
    expect(resolveAssetUrl('assets/foto.png', NOTA))
      .toBe('file:///C:/Vault/Pesquisa/assets/foto.png');
  });

  it('resolve "./" como a própria pasta', () => {
    expect(resolveAssetUrl('./foto.png', NOTA))
      .toBe('file:///C:/Vault/Pesquisa/foto.png');
  });

  it('resolve ".." subindo uma pasta', () => {
    expect(resolveAssetUrl('../assets/foto.png', NOTA))
      .toBe('file:///C:/Vault/assets/foto.png');
  });

  it('não sobe além da raiz da unidade', () => {
    expect(resolveAssetUrl('../../../../../foto.png', NOTA))
      .toBe('file:///C:/foto.png');
  });

  it('codifica espaços no caminho', () => {
    expect(resolveAssetUrl('minha foto.png', NOTA))
      .toBe('file:///C:/Vault/Pesquisa/minha%20foto.png');
  });

  it('não codifica duas vezes o que já veio codificado', () => {
    expect(resolveAssetUrl('minha%20foto.png', NOTA))
      .toBe('file:///C:/Vault/Pesquisa/minha%20foto.png');
  });

  it('aceita barra invertida como separador', () => {
    expect(resolveAssetUrl('assets\\foto.png', NOTA))
      .toBe('file:///C:/Vault/Pesquisa/assets/foto.png');
  });

  // ── O que NÃO deve ser tocado ──────────────────────────────────────────────

  it('deixa URL http(s) intacta', () => {
    expect(resolveAssetUrl('https://exemplo.com/a.png', NOTA))
      .toBe('https://exemplo.com/a.png');
  });

  it('deixa data: URI intacta', () => {
    const data = 'data:image/png;base64,iVBORw0KGgo=';
    expect(resolveAssetUrl(data, NOTA)).toBe(data);
  });

  it('deixa file:// já absoluto intacto', () => {
    const url = 'file:///C:/Outro/Lugar/a.png';
    expect(resolveAssetUrl(url, NOTA)).toBe(url);
  });

  it('deixa caminho de raiz e relativo a protocolo intactos', () => {
    expect(resolveAssetUrl('/imagens/a.png', NOTA)).toBe('/imagens/a.png');
    expect(resolveAssetUrl('//cdn.exemplo/a.png', NOTA)).toBe('//cdn.exemplo/a.png');
  });

  it('sem nota aberta, devolve o que recebeu', () => {
    expect(resolveAssetUrl('assets/foto.png', null)).toBe('assets/foto.png');
    expect(resolveAssetUrl('assets/foto.png', undefined)).toBe('assets/foto.png');
  });

  it('src vazio continua vazio (o preview não monta <img>)', () => {
    expect(resolveAssetUrl('', NOTA)).toBe('');
    expect(resolveAssetUrl('   ', NOTA)).toBe('');
  });

  it('funciona com caminho estilo Unix', () => {
    expect(resolveAssetUrl('a.png', '/home/user/vault/nota.md'))
      .toBe('file:///home/user/vault/a.png');
  });
});
