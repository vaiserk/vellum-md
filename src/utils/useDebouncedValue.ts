import { useEffect, useRef, useState } from 'react';

/**
 * Retorna `value` com atraso de `delay` ms (debounce).
 *
 * `flushKey`: quando muda, o valor é aplicado IMEDIATAMENTE (sem debounce).
 * Usado pelo Preview: digitar tem debounce (não re-parseia o markdown a cada
 * tecla), mas trocar de nota atualiza o preview na hora.
 */
export function useDebouncedValue<T>(value: T, delay: number, flushKey?: unknown): T {
  const [debounced, setDebounced] = useState(value);
  const keyRef = useRef(flushKey);

  useEffect(() => {
    if (keyRef.current !== flushKey) {
      keyRef.current = flushKey;
      setDebounced(value);
      return;
    }
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay, flushKey]);

  return debounced;
}
