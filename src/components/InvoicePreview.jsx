import { useLayoutEffect, useRef, useState } from "react";

export default function InvoicePreview({ data, qrCode, total, descontoCalculado, impostoCalculado, finalTotal, isLocked, onBack, onDownload, onBackToHistory }) {
  const formatInvoiceNumber = (num) => {
    if (!num) return "001";
    const str = num.toString();
    if (str.includes("/")) return str.split("/")[0];
    return str.toString().padStart(3, '0');
  };

  const wrapperRef = useRef(null);
  const invoiceRef = useRef(null);
  const scaleRef = useRef(1);
  const [scale, setScale] = useState(1);

  const formatCpfCnpj = (val) => {
    if (!val) return "";
    const digits = val.replace(/\D/g, "");
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    if (digits.length <= 11) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
    if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
    if (digits.length <= 13) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`;
  };

  const formatDateBR = (val) => {
    if (!val) return "--/--/----";
    const parts = val.split("-");
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return val;
  };

  const formatPhoneBR = (val) => {
    if (!val) return "";
    const digits = val.replace(/\D/g, "").slice(0, 22);
    let result = "";
    for (let i = 0; i < digits.length; i++) {
      if (i === 2 || i === 13) result += " ";
      if (i === 7 || i === 18) result += "-";
      if (i === 11) result += " / ";
      result += digits[i];
    }
    return result;
  };

  const formatPhone = (val) => {
    if (data.responsavel.telefoneCustom) return val || "";
    return formatPhoneBR(val);
  };

  const calcScale = () => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const wrapperWidth = wrapper.clientWidth;
    const newScale = Math.min(1, wrapperWidth / 793);
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
      {/* ACTIONS */}
      <div className="preview-actions no-print">
        <button 
          onClick={onBack}
          className="back-btn"
        >
          {isLocked ? "✨ Nova Fatura" : "← Voltar e Editar"}
        </button>

        <button 
          onClick={handleDownload}
          className="download-btn"
        >
          ⬇ Baixar Fatura em PDF
        </button>

      </div>

      {isLocked && (
        <div className="locked-alert no-print">
          ⚠️ ESTA É UMA FATURA ARQUIVADA. ALTERAÇÕES NÃO SÃO PERMITIDAS.
        </div>
      )}

      {/* INVOICE WRAPPER (scaling container) */}
      <div ref={wrapperRef} className="invoice-wrapper">
        <div 
          id="fatura" 
          ref={invoiceRef}
          className={`invoice-paper ${isLocked ? 'is-locked' : ''} theme-${data.tema || 'white'}`}
          style={{ transform: `scale(${scale})`, transformOrigin: "top center" }}
        >
        {/* HEADER */}
        <div className="invoice-header">
          {/* Linha Superior: Nome da Empresa e Título FATURA */}
          <div className="header-top-row">
            <div className="brand-title-group">
              {data.empresa.logo && (
                <img src={data.empresa.logo} className="invoice-logo" alt="Logo" />
              )}
              <h2 className="company-name">{data.empresa.nome || "SUA EMPRESA"}</h2>
            </div>
            <h1 className="document-title">FATURA</h1>
          </div>

          {/* Linha Inferior: Contatos e Metadados */}
          <div className="header-bottom-row">
            <div className="company-contact">
              <p>{data.empresa.endereco}</p>
              <p>{data.empresa.telefone}</p>
              <p>{data.empresa.email}</p>
            </div>
            <div className="document-info">
              <p><span className="info-label">Número:</span> <span className="info-value">{formatInvoiceNumber(data.fatura.numero, data.fatura.data)}</span></p>
              <p><span className="info-label">Emissão:</span> {formatDateBR(data.fatura.data)}</p>
              <p className="due-date"><span className="info-label">Vencimento:</span> {formatDateBR(data.fatura.vencimento)}</p>
            </div>
          </div>
        </div>

        {/* CLIENT & RESPONSIBLE */}
        <div className="client-responsible-grid">
          <div className="client-box">
            <h4 className="box-title">Destinatário (Cliente)</h4>
            <div className="client-data">
              <p className="client-name">{data.cliente.nome || "Nome do Cliente"}</p>
              <p>{formatCpfCnpj(data.cliente.documento)}</p>
              <p>{data.cliente.email}</p>
              <p>{data.cliente.endereco}</p>
            </div>
          </div>
          <div className="responsible-box">
            <h4 className="box-title">Responsável</h4>
            <div className="responsible-data">
              <p className="responsible-name">{data.responsavel.nome || "Não informado"}</p>
              <p>{formatPhone(data.responsavel.telefone)}</p>
              <p>{data.responsavel.email}</p>
            </div>
          </div>
        </div>

        {/* ITEMS TABLE */}
        <div className="items-section">
          <table className="invoice-table">
            <thead>
              <tr>
                <th>Item / Serviço</th>
                <th>Descrição</th>
                <th className="text-right">Valor</th>
                <th className="text-center">Qtd</th>
                <th className="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {data.itens.map((item, i) => (
                <tr key={i}>
                  <td className="item-name">{item.produto || "---"}</td>
                  <td className="item-desc">{item.descricao}</td>
                  <td className="text-right">
                    {Number(item.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </td>
                  <td className="text-center">{item.quantidade}</td>
                  <td className="text-right font-bold">
                    {(Number(item.valor) * Number(item.quantidade)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* SUMMARY & PIX */}
        <div className="summary-pix-grid">
          <div className="pix-section">
            <div className="pix-box">
              {qrCode ? (
                <img src={qrCode} className="pix-qr" alt="Pix QR" />
              ) : (
                <div className="pix-placeholder" />
              )}
              <div className="pix-details">
                <h4 className="pix-title">Pagamento via PIX</h4>
                <p className="pix-key">{data.pagamento.pix || "Chave não informada"}</p>
                <p className="pix-owner">{data.pagamento.nome}</p>
              </div>
            </div>
          </div>

          <div className="summary-section">
            <div className="summary-rows">
              <div className="summary-row">
                <span className="row-label">Subtotal</span>
                <span className="row-value">
                  {total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              </div>
              <div className="summary-row">
                <span className="row-label">Desconto</span>
                <span className="row-value">
                  {descontoCalculado > 0 ? "– " : ""}{descontoCalculado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              </div>
              <div className="summary-row">
                <span className="row-label">Imposto</span>
                <span className="row-value">
                  {impostoCalculado > 0 ? "+ " : ""}{impostoCalculado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              </div>
              <div className="total-main-row">
                <span className="total-label">Total Geral</span>
                <span className="total-value">
                  {finalTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* OBSERVATIONS */}
        <div className="obs-section">
          <h4 className="box-title">Observações</h4>
          <div className="obs-content">
            {data.observacoes || "Nenhuma observação informada."}
          </div>
        </div>

        {/* FOOTER */}
        <div className="invoice-footer">
          <p className="thanks">Obrigado pela preferência!</p>
        </div>
      </div>
      </div>
    </div>
  );
}
