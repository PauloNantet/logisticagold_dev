import { useLayoutEffect, useRef, useState } from "react";
import { formatDateBR } from "../utils/formatters";

export default function MapaServicoPreview({ entries, empresa, showFinanceiro, isLocked, onBack, onDownload, onBackToHistory, isOS }) {
  const fornecedor = entries[0]?.fornecedor || "";
  const wrapperRef = useRef(null);
  const mapaRef = useRef(null);
  const scaleRef = useRef(1);
  const [scale, setScale] = useState(1);

  const calcScale = () => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const wrapperWidth = wrapper.clientWidth;
    const newScale = Math.min(1, wrapperWidth / 1123);
    scaleRef.current = newScale;
    setScale(newScale);
  };

  useLayoutEffect(() => {
    calcScale();
    const observer = new ResizeObserver(calcScale);
    const wrapper = wrapperRef.current;
    if (wrapper) observer.observe(wrapper);
    return () => observer.disconnect();
  }, []);

  const handleDownload = () => {
    onDownload();
  };

  return (
    <div className="preview-container">
      <div className="preview-actions no-print">
        <button onClick={onBack} className="back-btn">
          ← Voltar e Editar
        </button>
        <button onClick={handleDownload} className="download-btn">
          ⬇ Baixar {isOS ? "Ordem" : "Mapa"} em PDF
        </button>
        {isLocked && (
          <button onClick={onBackToHistory} className="history-back-btn">
            📋 Voltar ao Histórico
          </button>
        )}
      </div>

      {isLocked && (
        <div className="locked-alert no-print" style={{ backgroundColor: "#fef2f2", color: "#b91c1c", border: "1px solid #fee2e2" }}>
          ⚠️ ESTE É UM MAPA ARQUIVADO. ALTERAÇÕES NÃO SÃO PERMITIDAS.
        </div>
      )}

      <div ref={wrapperRef} className="invoice-wrapper">
        <div
          id="mapa-servico"
          ref={mapaRef}
          className={`os-paper landscape ${isLocked ? 'is-locked' : ''} ${showFinanceiro ? 'with-financeiro' : ''}`}
          style={{ transform: `scale(${scale})`, transformOrigin: "top center" }}
        >
          {/* HEADER */}
          <div className="os-header">
            <div className="os-brand">
              {empresa.logo && (
                <img src={empresa.logo} className="os-logo" alt="Logo" />
              )}
              <span className="os-company">{empresa.nome || "SUA EMPRESA"}{isOS ? ` - Ordem de Serviço - ${fornecedor}` : " - MAPA DE SERVIÇO"}</span>
            </div>
          </div>

          {/* ENTRIES TABLE */}
          <table className="os-table">
            <thead>
              <tr>
                {!isOS && <th>FORNECEDOR</th>}
                <th>Nº</th>
                <th>DATA</th>
                <th>HORA</th>
                <th>VOO</th>
                <th>SERVIÇO</th>
                <th>GUIA/CONTATO</th>
                <th>NOME PAX</th>
                <th>PAX</th>
                <th>CLIENTE</th>
                <th>OBSERVAÇÃO</th>
                <th>VEÍCULO</th>
                <th>PLACA</th>
                <th>MOTORISTA/CONTATO</th>
                {showFinanceiro && (
                  <>
                    <th>A PAGAR</th>
                    <th>A RECEBER</th>
                    <th>LUCRO</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {entries.map((e, i) => (
                  <tr className="os-data-row" key={i}>
                  {!isOS && <td>{e.fornecedor || "---"}</td>}
                  <td className="os-num">{e.numero || "---"}</td>
                  <td>{formatDateBR(e.data)}</td>
                  <td>{e.hora || "---"}</td>
                  <td>{e.voo || "---"}</td>
                  <td className="os-wide-cell" style={{ whiteSpace: "pre-wrap" }}>{e.servico || "---"}</td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    {e.nome_guia}
                    {e.tel_guia ? <><br />{e.tel_guia.split(" / ").map((line, i) => (
                      <span key={i}>{i > 0 && <br />}{line}</span>
                    ))}</> : ""}
                  </td>
                  <td>{e.nome_pax || "---"}</td>
                  <td className="os-pax">{e.pax || "0"}</td>
                  <td>{e.cliente?.nome || "---"}</td>
                  <td className="os-wide-cell os-obs-cell">{e.observacao || "---"}</td>
                  <td>{e.veiculo || "---"}</td>
                  <td>{e.placa || "---"}</td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    {e.motorista}
                    {e.contato_motorista ? <><br />{e.contato_motorista.split(" / ").map((line, i) => (
                      <span key={i}>{i > 0 && <br />}{line}</span>
                    ))}</> : ""}
                  </td>
                  {showFinanceiro && (
                    <>
                      <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                        {e.valor_pagar && e.valor_pagar !== "0" && e.valor_pagar !== ""
                          ? `R$ ${Number(String(e.valor_pagar).replace(/\./g, "").replace(",", ".")).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
                          : "---"}
                      </td>
                      <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                        {e.valor_receber && e.valor_receber !== "0" && e.valor_receber !== ""
                          ? `R$ ${Number(String(e.valor_receber).replace(/\./g, "").replace(",", ".")).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
                          : "---"}
                      </td>
                      <td style={{ textAlign: "right", whiteSpace: "nowrap", color: e.lucro < 0 ? "#d32f2f" : "#2e7d32" }}>
                        {e.lucro ? `R$ ${Number(e.lucro).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "---"}
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>

          {/* FOOTER */}
          <div className="os-footer">
            <p className="os-thanks">Obrigado pela preferência!</p>
          </div>
        </div>
      </div>
    </div>
  );
}
