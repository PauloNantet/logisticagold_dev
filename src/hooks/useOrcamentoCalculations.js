import { useMemo } from "react";

export function useOrcamentoCalculations(itens, desconto, imposto) {
  const total = useMemo(() => {
    return itens.reduce((acc, item) => acc + (parseFloat(item.valor) || 0) * (parseFloat(item.quantidade) || 0), 0);
  }, [itens]);

  const descontoCalculado = useMemo(() => {
    const raw = parseInt((desconto?.valor || "").replace(/\D/g, ""), 10) || 0;
    return desconto?.tipo === "porcentagem" ? total * (raw / 10000) : raw / 100;
  }, [total, desconto]);

  const impostoCalculado = useMemo(() => {
    const raw = parseInt((imposto?.valor || "").replace(/\D/g, ""), 10) || 0;
    return imposto?.tipo === "porcentagem" ? total * (raw / 10000) : raw / 100;
  }, [total, imposto]);

  const finalTotal = useMemo(() => total - descontoCalculado + impostoCalculado, [total, descontoCalculado, impostoCalculado]);

  return { total, descontoCalculado, impostoCalculado, finalTotal };
}
