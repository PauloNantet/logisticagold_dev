import { useLayoutEffect, useRef, useState } from "react";
import { formatDateBR } from "../utils/formatters";

export default function ServiceOrderPreview({ data, qrCode, total, finalTotal, isLocked, onBack, onDownload, onBackToHistory, elementId = "ordem-servico" }) {
  const wrapperRef = useRef(null);
  const osRef = useRef(null);
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
    const el = document.getElementById(elementId);
    if (!el) return;
    el.style.transform = "scale(1)";
    el.style.transformOrigin = "top center";
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        onDownload();
        setTimeout(() => {
          el.style.transform = `scale(${scaleRef.current})`;
          el.style.transformOrigin = "top center";
        }, 2000);
      });
    });
  };

  return (
    <div className="preview-container">
      <div className="preview-actions no-print">
        <button onClick={onBack} className="back-btn">
          {isLocked ? "✳️ Nova OS" : "← Voltar e Editar"}
        </button>
        <button onClick={handleDownload} className="download-btn">
          ⬇ Baixar OS em PDF
        </button>
        {isLocked && (
          <button onClick={onBackToHistory} className="history-back-btn">
            📋 Voltar ao Histórico
          </button>
        )}
      </div>

      {isLocked && (
        <div className="locked-alert no-print" style={{ backgroundColor: "#fef2f2", color: "#b91c1c", border: "1px solid #fee2e2" }}>
          ⚠️ ESTA É UMA OS ARQUIVADA. ALTERAÇÕES NÃO SÃO PERMITIDAS.
        </div>
      )}

      <div ref={wrapperRef} className="invoice-wrapper">
        <div
          id={elementId}
          ref={osRef}
          className={`os-paper landscape ${isLocked ? 'is-locked' : ''}`}
          style={{ transform: `scale(${scale})`, transformOrigin: "top center" }}
        >
          {/* HEADER */}
          <div className="os-header">
            <div className="os-brand">
              {data.empresa.logo && (
                <img src={data.empresa.logo} className="os-logo" alt="Logo" />
              )}
              <span className="os-company">{data.empresa.nome || "SUA EMPRESA"}</span>
            </div>
          </div>

          <h1 className="os-title">ORDEM DE SERVIÇO</h1>

          {/* SINGLE TABLE - ALL COLUMNS */}
          <table className="os-table">
            <thead>
              <tr>
                <th>Nº</th>
                <th>DATA</th>
                <th>VÔO</th>
                <th>SERVIÇO</th>
                <th>NOME GUIA</th>
                <th>NOME DO PAX</th>
                <th>PAX</th>
                <th>FILE/EVENTO</th>
                <th>CLIENTE</th>
                <th>HORA</th>
                <th>OBS</th>
                <th>TIPO VEIC</th>
                <th>VEIC</th>
                <th>MOTORISTA</th>
              </tr>
            </thead>
            <tbody>
              <tr className="os-data-row">
                <td className="os-num">{data.os.numero || "---"}</td>
                <td>{formatDateBR(data.os.data)}</td>
                <td></td>
                <td className="os-wide-cell">{data.servico || "---"}</td>
                <td>{data.nome_guia || "---"}</td>
                <td>{data.nome_pax || "---"}</td>
                <td className="os-pax">{data.pax || "0"}</td>
                <td>{data.file_evento || "---"}</td>
                <td>{data.cliente.nome || "---"}</td>
                <td>{data.os.hora || "---"}</td>
                <td className="os-wide-cell os-obs-cell">{data.observacao || "---"}</td>
                <td>{data.veiculo || "---"}</td>
                <td>{data.placa || "---"}</td>
                <td>{data.motorista || "---"}</td>
              </tr>
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
