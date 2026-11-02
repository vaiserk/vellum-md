import { useCallback, useEffect, useState } from 'react';
import { useVaultStore } from '../../store/vault.store';
import { Trash2, RotateCcw, X } from 'lucide-react';

interface ItemLixeira {
  nomeNaLixeira: string;
  caminhoOriginal: string;
  nome: string;
  excluidoEm: number;
  tamanho: number;
}

/**
 * Data da exclusão em formato amigável: "há 5 minutos", "ontem às 14:30",
 * "há 3 dias" ou a data, para itens antigos.
 */
export function formatarQuando(epochMs: number, agora: number = Date.now()): string {
  const minuto = 60_000;
  const hora = 60 * minuto;
  const dia = 24 * hora;
  const diff = agora - epochMs;

  // Relógio adiantado / arquivo com data no futuro: não inventa "há -2 minutos"
  if (diff < minuto) return 'há poucos segundos';
  if (diff < hora) {
    const n = Math.floor(diff / minuto);
    return `há ${n} ${n === 1 ? 'minuto' : 'minutos'}`;
  }

  const data = new Date(epochMs);
  const mesmoDia = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const horaTexto = data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  if (mesmoDia(data, new Date(agora))) {
    const n = Math.floor(diff / hora);
    return `há ${n} ${n === 1 ? 'hora' : 'horas'}`;
  }
  if (mesmoDia(data, new Date(agora - dia))) return `ontem às ${horaTexto}`;

  const dias = Math.floor(diff / dia);
  if (dias < 7) return `há ${dias} ${dias === 1 ? 'dia' : 'dias'}`;
  return data.toLocaleDateString('pt-BR');
}

/**
 * Painel da Lixeira (`.vellum/trash`), acessível a qualquer momento.
 *
 * Antes, a única forma de recuperar uma nota era o banner "↩ Desfazer" da barra
 * de status, que some depois de 10 s — passado esse tempo o arquivo continuava
 * no disco mas não havia como chegar nele pela interface.
 */
export function TrashModal({ onFechar }: { onFechar: () => void }) {
  const [itens, setItens] = useState<ItemLixeira[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  // Nome na lixeira do item em restauração — desabilita só o botão dele
  const [restaurando, setRestaurando] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      // Já vem ordenado do mais recente para o mais antigo
      setItens(await window.electron.fs.listTrash());
    } catch (e: any) {
      setErro(`Não foi possível ler a lixeira: ${e?.message ?? e}`);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  // Escape fecha — mesmo comportamento dos outros modais do app
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onFechar(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onFechar]);

  const handleRestaurar = async (item: ItemLixeira) => {
    setErro(null);
    setRestaurando(item.nomeNaLixeira);
    try {
      const resultado = await window.electron.fs.restoreFromTrash(item.nomeNaLixeira);
      if (!resultado.ok) {
        // Motivo real do processo principal (ex.: "Ja existe uma nota em ...").
        // Sem isto, o clique morria em silêncio.
        setErro(resultado.erro ?? `Não foi possível restaurar "${item.nome}".`);
        return;
      }
      const { vaultPath, setFiles } = useVaultStore.getState();
      if (vaultPath) setFiles(await window.electron.fs.readDir(vaultPath));
      // Atualiza a lista: o item restaurado sai da lixeira
      await carregar();
    } catch (e: any) {
      setErro(`Não foi possível restaurar "${item.nome}": ${e?.message ?? e}`);
    } finally {
      setRestaurando(null);
    }
  };

  return (
    <div className="command-palette-overlay" onClick={onFechar}>
      <div
        className="settings-modal"
        style={{ width: '520px' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="settings-header">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Trash2 size={15} /> Lixeira
          </h3>
          <button className="settings-close" onClick={onFechar} title="Fechar">
            <X size={16} />
          </button>
        </div>

        <div className="settings-body">
          {erro && (
            <div className="trash-error">{erro}</div>
          )}

          {carregando && (
            <div className="trash-empty">Carregando…</div>
          )}

          {!carregando && itens.length === 0 && (
            <div className="trash-empty">A lixeira está vazia.</div>
          )}

          {!carregando && itens.map(item => (
            <div key={item.nomeNaLixeira} className="trash-item">
              <div className="trash-item-info">
                <div className="trash-item-name">📄 {item.nome}</div>
                <div className="trash-item-meta" title={item.caminhoOriginal}>
                  {item.caminhoOriginal} · excluído {formatarQuando(item.excluidoEm)}
                </div>
              </div>
              <button
                className="btn-secondary trash-restore-btn"
                onClick={() => handleRestaurar(item)}
                disabled={restaurando === item.nomeNaLixeira}
                title="Restaurar no local original"
              >
                <RotateCcw size={12} />
                {restaurando === item.nomeNaLixeira ? 'Restaurando…' : 'Restaurar'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
