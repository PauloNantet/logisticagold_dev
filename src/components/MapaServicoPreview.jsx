import { useLayoutEffect, useRef, useState } from "react";

const formatDateBR = (val) => {
  if (!val) return "";
  const parts = val.split("-");
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return val;
};

export default function MapaServicoPreview({ entries, empresa, isLocked, onBack, onDownload, onBackToHistory, isOS }) {
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
          {isLocked ? (isOS ? "✳️ Nova Ordem" : "✳️ Novo Mapa") : "← Voltar e Editar"}
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
          className={`os-paper landscape ${isLocked ? 'is-locked' : ''}`}
          style={{ transform: `scale(${scale})`, transformOrigin: "top center" }}
        >
          {/* HEADER */}
          <div className="os-header">
            <div className="os-brand">
              {empresa.logo && (
                <img src={empresa.logo} className="os-logo" alt="Logo" />
              )}
              <span className="os-company">{empresa.nome || "SUA EMPRESA"}{isOS ? ` - Ordem de Serviço - ${fornecedor}` : ""}</span>
            </div>
          </div>

          {!isOS && <h1 className="os-title">MAPA DE SERVIÇO</h1>}

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
