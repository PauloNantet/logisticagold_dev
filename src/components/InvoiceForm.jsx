import { useEffect, useRef, useState, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { Trash2, Plus } from "lucide-react";
import { autoResize, formatDateMask } from "../utils/formatters";
import { Section, InputField } from "../utils/components";

export default function InvoiceForm({ data, clients, services, total, descontoCalculado, impostoCalculado, finalTotal, update, updateItem, addItem, removeItem, onSubmit, onLogoChange, fieldErrors = {}, clearFieldError, scrollToError }) {
  const lastItemRef = useRef(null);
  const prevItensLength = useRef(data.itens.length);
  
  const clienteNomeRef = useRef(null);
  const clienteDocumentoRef = useRef(null);
  const clienteEmailRef = useRef(null);
  const clienteEnderecoRef = useRef(null);
  const responsavelNomeRef = useRef(null);
  const responsavelTelefoneRef = useRef(null);
  const dataEmissaoRef = useRef(null);
  const dataVencimentoRef = useRef(null);
  const itensSectionRef = useRef(null);
  const faturaNumeroRef = useRef(null);
  const observacoesRef = useRef(null);

  useEffect(() => {
    autoResize(observacoesRef.current);
  }, [data.observacoes]);

  useEffect(() => {
    if (!scrollToError) return;
    const fieldRefMap = [
      { key: "faturaNumero", ref: faturaNumeroRef },
      { key: "clienteNome", ref: clienteNomeRef },
      { key: "clienteDocumento", ref: clienteDocumentoRef },
      { key: "clienteEmail", ref: clienteEmailRef },
      { key: "clienteEndereco", ref: clienteEnderecoRef },
      { key: "responsavelNome", ref: responsavelNomeRef },
      { key: "responsavelTelefone", ref: responsavelTelefoneRef },
      { key: "dataEmissao", ref: dataEmissaoRef },
      { key: "dataVencimento", ref: dataVencimentoRef },
      { key: "itens", ref: itensSectionRef },
    ];
    for (const { key, ref } of fieldRefMap) {
      if (fieldErrors[key] && ref.current) {
        ref.current.scrollIntoView({ behavior: "smooth", block: "center" });
        if (ref.current.tagName !== "SECTION") ref.current.focus();
        break;
      }
    }
  }, [scrollToError]);

  useEffect(() => {
    if (fieldErrors.itens && data.itens.every(item => item.produto.trim() && item.descricao.trim() && item.valor && item.quantidade)) {
      clearFieldError("itens");
    }
  }, [data.itens]);

  // States para autocomplete de cliente
  const [showClientSuggestions, setShowClientSuggestions] = useState(false);
  const [filteredClients, setFilteredClients] = useState([]);
  const [focusedClientIndex, setFocusedClientIndex] = useState(-1);
  const clientSuggestionsRef = useRef(null);

  // States para autocomplete de serviços (por linha)
  const [activeItemIndex, setActiveItemIndex] = useState(null);

  const [filteredServices, setFilteredServices] = useState([]);
  const [focusedServiceIndex, setFocusedServiceIndex] = useState(-1);
  const serviceSuggestionsRef = useRef(null);
  const [serviceDropdownStyle, setServiceDropdownStyle] = useState(null);
  const itemInputRefs = useRef([]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (clientSuggestionsRef.current && !clientSuggestionsRef.current.contains(event.target)) {
        setShowClientSuggestions(false);
        setFocusedClientIndex(-1);
      }
      if (serviceSuggestionsRef.current && !serviceSuggestionsRef.current.contains(event.target)) {
        setActiveItemIndex(null);
        setFocusedServiceIndex(-1);
        setServiceDropdownStyle(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (data.itens.length > prevItensLength.current) {
      lastItemRef.current?.focus();
    }
    prevItensLength.current = data.itens.length;
  }, [data.itens.length]);

  useLayoutEffect(() => {
    const inputs = document.querySelectorAll(".items-table tbody input");
    inputs.forEach((input) => {
      input.style.width = "";
      if (input.scrollWidth > input.clientWidth + 1) {
        input.style.width = (input.scrollWidth + 2) + "px";
      }
    });
  });

  // Efeito para scroll do autocomplete de clientes
  useEffect(() => {
    if (focusedClientIndex >= 0 && clientSuggestionsRef.current) {
      const activeItem = clientSuggestionsRef.current.children[focusedClientIndex];
      if (activeItem) {
        activeItem.scrollIntoView({
          behavior: "smooth",
          block: "nearest"
        });
      }
    }
  }, [focusedClientIndex]);

  // Efeito para scroll do autocomplete de serviços
  useEffect(() => {
    if (focusedServiceIndex >= 0 && serviceSuggestionsRef.current) {
      const activeItem = serviceSuggestionsRef.current.children[focusedServiceIndex];
      if (activeItem) {
        activeItem.scrollIntoView({
          behavior: "smooth",
          block: "nearest"
        });
      }
    }
  }, [focusedServiceIndex]);

  // Atualiza posição do dropdown de serviço ao scroll/resize
  useEffect(() => {
    if (activeItemIndex === null) return;
    const handleScrollOrResize = () => {
      updateServiceDropdownPosition(activeItemIndex);
    };
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [activeItemIndex]);

  // Lógica Autocomplete Cliente
  const handleClientNameChange = (val) => {
    update("cliente", "nome", val);
    if (val.length > 0) {
      const filtered = (clients || []).filter(c => 
        c.nome.toLowerCase().includes(val.toLowerCase())
      );
      setFilteredClients(filtered);
      setShowClientSuggestions(true);
      setFocusedClientIndex(-1);
    } else {
      setShowClientSuggestions(false);
      setFocusedClientIndex(-1);
    }
  };

  const selectClient = (client) => {
    update("cliente", "nome", client.nome);
    update("cliente", "documento", (client.documento || "").replace(/\D/g, ""));
    update("cliente", "email", client.email);
    update("cliente", "endereco", client.endereco);
    update("responsavel", "nome", client.responsavelNome || "");
    update("responsavel", "telefone", data.responsavel.telefoneCustom
      ? (client.responsavelTelefone || "")
      : (client.responsavelTelefone || "").replace(/\D/g, ""));
    clearFieldError("clienteNome");
    clearFieldError("clienteDocumento");
    clearFieldError("clienteEmail");
    clearFieldError("clienteEndereco");
    clearFieldError("responsavelNome");
    clearFieldError("responsavelTelefone");
    setShowClientSuggestions(false);
    setFocusedClientIndex(-1);
  };

  const handleClientKeyDown = (e) => {
    if (!showClientSuggestions || filteredClients.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedClientIndex(prev => (prev < filteredClients.length - 1 ? prev + 1 : prev));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedClientIndex(prev => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === "Enter") {
      if (focusedClientIndex >= 0) {
        e.preventDefault();
        selectClient(filteredClients[focusedClientIndex]);
      }
    } else if (e.key === "Escape") {
      setShowClientSuggestions(false);
      setFocusedClientIndex(-1);
    }
  };

  // Lógica Autocomplete Serviço
  const updateServiceDropdownPosition = (index) => {
    const input = itemInputRefs.current[index];
    if (input) {
      const rect = input.getBoundingClientRect();
      const cell = input.closest('td');
      const cellWidth = cell ? cell.getBoundingClientRect().width : rect.width;
      setServiceDropdownStyle({
        position: 'fixed',
        top: `${rect.bottom + 4}px`,
        left: `${rect.left}px`,
        width: `${Math.max(cellWidth, 300)}px`,
      });
    }
  };

  const handleItemNameChange = (index, val) => {
    updateItem(index, "produto", val);
    if (val.length > 0) {
      const filtered = (services || []).filter(s => 
        s.produto.toLowerCase().includes(val.toLowerCase())
      );
      setFilteredServices(filtered.slice(0, 3));
      setActiveItemIndex(index);
      setFocusedServiceIndex(-1);
      updateServiceDropdownPosition(index);
    } else {
      setActiveItemIndex(null);
      setFocusedServiceIndex(-1);
      setServiceDropdownStyle(null);
    }
  };

  const normalizeValue = (val) => {
    if (!val) return "";
    let s = val.trim();
    if (s.includes(",")) {
      s = s.replace(/\./g, "").replace(",", ".");
    }
    const num = parseFloat(s);
    return isNaN(num) ? "" : num.toString();
  };

  const selectService = (index, service) => {
    updateItem(index, "produto", service.produto);
    updateItem(index, "descricao", service.descricao);
    updateItem(index, "valor", normalizeValue(service.valor));
    setActiveItemIndex(null);
    setFocusedServiceIndex(-1);
    setServiceDropdownStyle(null);
  };

  const handleServiceKeyDown = (e, index) => {
    if (activeItemIndex !== index || filteredServices.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedServiceIndex(prev => (prev < filteredServices.length - 1 ? prev + 1 : prev));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedServiceIndex(prev => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === "Enter") {
      if (focusedServiceIndex >= 0) {
        e.preventDefault();
        selectService(index, filteredServices[focusedServiceIndex]);
      }
    } else if (e.key === "Escape") {
      setActiveItemIndex(null);
      setFocusedServiceIndex(-1);
      setServiceDropdownStyle(null);
    }
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

  const formatPhoneCustom = (val) => {
    if (!val) return "";
    return val.replace(/[^0-9\s()+\-/]/g, "").slice(0, 50);
  };

  const formatPhone = (val) => {
    return data.responsavel.telefoneCustom ? formatPhoneCustom(val) : formatPhoneBR(val);
  };

  const handlePhoneChange = (val) => {
    if (data.responsavel.telefoneCustom) {
      update("responsavel", "telefone", val);
    } else {
      const digits = val.replace(/\D/g, "").slice(0, 22);
      update("responsavel", "telefone", digits);
    }
    if (fieldErrors.responsavelTelefone) clearFieldError("responsavelTelefone");
  };

  const togglePhoneCustom = () => {
    const newCustom = !data.responsavel.telefoneCustom;
    if (newCustom) {
      update("responsavel", "telefone", formatPhoneBR(data.responsavel.telefone));
    } else {
      const cleaned = (data.responsavel.telefone || "").replace(/[^0-9]/g, "");
      update("responsavel", "telefone", cleaned);
    }
    update("responsavel", "telefoneCustom", newCustom);
  };

  const safeTotal = typeof total === "number" ? total : 0;

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

  const handleCpfCnpjChange = (val) => {
    const digits = val.replace(/\D/g, "").slice(0, 14);
    update("cliente", "documento", digits);
    if (fieldErrors.clienteDocumento) clearFieldError("clienteDocumento");
  };

  const handleFormKeyDown = (e) => {
    // Permite o Enter se:
    // 1. For em um TEXTAREA (para quebra de linha)
    // 2. For no botão de submit ou botões de ação (Add/Remover item)
    if (e.key === "Enter") {
      const isButton = e.target.tagName === "BUTTON" || e.target.type === "submit";
      if (e.target.tagName === "TEXTAREA" || isButton) {
        return;
      }
      // Para todos os outros casos (inputs normais), previne o submit automático
      e.preventDefault();
    }
  };

  return (
    <div className="invoice-form-container">
      <form onSubmit={onSubmit} onKeyDown={handleFormKeyDown}>
        <Section title="Sua Empresa">
          <div className="company-logo-section">
            <div className="logo-column">
              <label className="input-label">LOGOTIPO</label>
              <div className="logo-upload-box no-hover">
                {data.empresa.logo ? (
                  <img src={data.empresa.logo} alt="Logo preview" className="logo-preview" />
                ) : (
                  <div className="no-logo">Sem Logo</div>
                )}
              </div>
            </div>
            <div className="company-info-grid">
              <InputField label="Nome da Empresa" value={data.empresa.nome} readOnly={true} placeholder="Nome da empresa" />
              <InputField label="CPF / CNPJ" value={data.empresa.documento || ""} readOnly={true} placeholder="CPF ou CNPJ" />
              <InputField label="Telefone / WhatsApp" value={data.empresa.telefone} readOnly={true} placeholder="Telefone da empresa" />
              <InputField label="Email Profissional" value={data.empresa.email} readOnly={true} placeholder="Email da empresa" />
              <div className="full-width">
                <InputField label="Endereço" value={data.empresa.endereco} readOnly={true} placeholder="Endereço da empresa" />
              </div>
            </div>
          </div>
        </Section>

        <Section title="Dados da Fatura">
          <InputField 
            label="Número" 
            value={data.fatura.numero}
            onChange={(e) => {
              update("fatura", "numero", e.target.value);
              if (fieldErrors.faturaNumero) clearFieldError("faturaNumero");
            }}
            placeholder="Número da fatura" 
            error={fieldErrors.faturaNumero}
            inputRef={faturaNumeroRef}
          />
          <div className="date-grid">
            <div className={`input-group${fieldErrors.dataEmissao ? ' input-error' : ''}`}>
              <label className="input-label">Data de Emissão</label>
              <input 
                ref={dataEmissaoRef}
                type="text"
                value={data.fatura.data} 
                onChange={(e) => {
                  update("fatura", "data", formatDateMask(e.target.value));
                  if (fieldErrors.dataEmissao) clearFieldError("dataEmissao");
                }}
                className={`custom-input${fieldErrors.dataEmissao ? ' input-error' : ''}`}
                placeholder="DD/MM/AAAA"
                maxLength={10}
              />
            </div>
            <div className={`input-group${fieldErrors.dataVencimento ? ' input-error' : ''}`}>
              <label className="input-label">Data de Vencimento</label>
              <input 
                ref={dataVencimentoRef}
                type="text"
                value={data.fatura.vencimento} 
                onChange={(e) => {
                  update("fatura", "vencimento", formatDateMask(e.target.value));
                  if (fieldErrors.dataVencimento) clearFieldError("dataVencimento");
                }}
                className={`custom-input${fieldErrors.dataVencimento ? ' input-error' : ''}`}
                placeholder="DD/MM/AAAA"
                maxLength={10}
              />
            </div>
          </div>
        </Section>

        <Section title="Informações do Cliente">
          <div className="full-width relative-container">
            <div className="input-group">
              <label className="input-label">Nome Completo / Razão Social</label>
              <input 
                ref={clienteNomeRef}
                type="text"
                value={data.cliente.nome} 
                onChange={(e) => {
                  handleClientNameChange(e.target.value);
                  if (fieldErrors.clienteNome) clearFieldError("clienteNome");
                }}
                onFocus={() => data.cliente.nome && handleClientNameChange(data.cliente.nome)}
                onKeyDown={handleClientKeyDown}
                autoComplete="off"
                className={`custom-input${fieldErrors.clienteNome ? ' input-error' : ''}`}
                placeholder="Comece a digitar para buscar..."
              />
            </div>
            {showClientSuggestions && filteredClients.length > 0 && (
              <ul className="autocomplete-dropdown" ref={clientSuggestionsRef}>
                {filteredClients.map((client, idx) => (
                  <li 
                    key={idx} 
                    onClick={() => selectClient(client)} 
                    className={`suggestion-item ${focusedClientIndex === idx ? 'focused' : ''}`}
                  >
                    <div className="suggestion-name">{client.nome}</div>
                    <div className="suggestion-meta">{client.documento}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <InputField label="CPF / CNPJ" value={formatCpfCnpj(data.cliente.documento)} onChange={(e) => handleCpfCnpjChange(e.target.value)} placeholder="Ex: 123.456.789-00" error={fieldErrors.clienteDocumento} inputRef={clienteDocumentoRef} />
          <InputField label="Email" value={data.cliente.email} onChange={(e) => {
            update("cliente", "email", e.target.value);
            if (fieldErrors.clienteEmail) clearFieldError("clienteEmail");
          }} placeholder="Ex: cliente@email.com" error={fieldErrors.clienteEmail} inputRef={clienteEmailRef} />
          <div className="full-width">
            <InputField label="Endereço Completo" value={data.cliente.endereco} onChange={(e) => {
              update("cliente", "endereco", e.target.value);
              if (fieldErrors.clienteEndereco) clearFieldError("clienteEndereco");
            }} placeholder="Ex: Rua, número, bairro, cidade" error={fieldErrors.clienteEndereco} inputRef={clienteEnderecoRef} />
          </div>
        </Section>

        <Section title="Responsável Comercial">
          <InputField label="Nome do Responsável" value={data.responsavel.nome} onChange={(e) => {
            update("responsavel", "nome", e.target.value);
            if (fieldErrors.responsavelNome) clearFieldError("responsavelNome");
          }} placeholder="Ex: Maria" error={fieldErrors.responsavelNome} inputRef={responsavelNomeRef} />
          <div className="phone-inline-group">
            <div className="input-group">
              <div className="phone-label-row">
                <label className="input-label">Telefone de Contato</label>
                <button
                  id="phone-toggle"
                  type="button"
                  className={`phone-toggle-switch ${data.responsavel.telefoneCustom ? 'active' : ''}`}
                  onClick={togglePhoneCustom}
                  title={data.responsavel.telefoneCustom ? "Modo Internacional: aceita números, espaços, () - / +" : "Modo Brasil: formatação automática de telefone"}
                >
                  <span className="phone-toggle-knob" />
                </button>
                <label className="phone-toggle-label" htmlFor="phone-toggle">Custom</label>
              </div>
              <input
                ref={responsavelTelefoneRef}
                type="text"
                value={formatPhone(data.responsavel.telefone)}
                onChange={(e) => handlePhoneChange(e.target.value)}
                placeholder={data.responsavel.telefoneCustom ? "Ex: +1 (555) 123-4567 / +44 20 7946 0958" : "Ex: 21 99999-9999 / 21 99999-9999"}
                className={`custom-input${fieldErrors.responsavelTelefone ? ' input-error' : ''}`}
              />
            </div>
          </div>
        </Section>

        <section ref={itensSectionRef} className={`section-card${fieldErrors.itens ? ' items-has-error' : ''}`}>
          <h3 className="section-title">Itens & Serviços</h3>
          {fieldErrors.itens && <p className="section-error-msg">Preencha todos os campos de cada item para continuar.</p>}
          <div className="table-responsive">
            <table className="items-table">
              <thead>
                <tr>
                  <th className="produto">Produto/Serviço</th>
                  <th className="descrição">Descrição</th>
                  <th className="valor-unit text-right">Valor</th>
                  <th className="qtd text-center">Qtd</th>
                  <th className="subtotal text-right">Subtotal</th>
                  <th className="acoes text-center">Ações</th>
                </tr>
              </thead>
              <tbody>
                {data.itens.map((item, i) => (
                  <tr key={i}>
                    <td>
                      <input 
                        ref={(el) => {
                          itemInputRefs.current[i] = el;
                          if (i === data.itens.length - 1) {
                            lastItemRef.current = el;
                          }
                        }}
                        value={item.produto} 
                        onChange={(e) => handleItemNameChange(i, e.target.value)}
                        onFocus={() => item.produto && handleItemNameChange(i, item.produto)}
                        onKeyDown={(e) => handleServiceKeyDown(e, i)}
                        autoComplete="off"
                        placeholder="Item" 
                      />
                      {activeItemIndex === i && filteredServices.length > 0 && serviceDropdownStyle && createPortal(
                        <ul className="autocomplete-dropdown" ref={serviceSuggestionsRef} style={serviceDropdownStyle}>
                          {filteredServices.map((service, idx) => (
                            <li 
                              key={idx} 
                              onClick={() => selectService(i, service)} 
                              className={`suggestion-item ${focusedServiceIndex === idx ? 'focused' : ''}`}
                            >
                              <div className="suggestion-name">{service.produto}</div>
                              <div className="suggestion-meta">{(parseFloat(service.valor || 0)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
                            </li>
                          ))}
                        </ul>,
                        document.body
                      )}
                    </td>
                    <td>
                      <input value={item.descricao} onChange={(e) => updateItem(i, "descricao", e.target.value)} placeholder="Descrição" />
                    </td>
                    <td className="text-right">
                      <input 
                        type="text" 
                        className="text-right" 
                        value={item.valor ? (parseFloat(item.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })) : ""} 
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, "");
                          const numericValue = val ? (parseFloat(val) / 100).toString() : "";
                          updateItem(i, "valor", numericValue);
                        }} 
                        placeholder="R$ 0,00"
                      />
                    </td>
                    <td className="text-center">
                      <input type="text" className="text-center" value={item.quantidade} onChange={(e) => updateItem(i, "quantidade", e.target.value.replace(/\D/g, ""))} placeholder="1" />
                    </td>
                    <td className="subtotal-cell">
                      {(Number(item.valor) * Number(item.quantidade)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </td>
                    <td className="text-center">
                      <button 
                        type="button" 
                        onClick={() => removeItem(i)}
                        className="delete-item-inline-btn"
                        title="Remover Item"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                {/* LINHA DE TOTAL */}
                <tr className="total-row">
                  <td colSpan="4" className="text-right total-label">Total Geral:</td>
                  <td className="text-right total-value">{safeTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>
          <button 
            type="button" 
            onClick={addItem}
            className="add-item-btn"
          >
            <Plus size={16} /> Adicionar Novo Item
          </button>
        </section>

        <section className="section-card">
          <h3 className="section-title">Desconto & Imposto</h3>
          <div className="discount-tax-grid">
            <div>
              <div className="discount-input-row">
                <div className="discount-type-toggle">
                  <button
                    type="button"
                    onClick={() => { update("desconto", "tipo", "porcentagem"); update("desconto", "valor", ""); }}
                    className={`discount-type-btn ${data.desconto.tipo === "porcentagem" ? "active" : ""}`}
                  >
                    %
                  </button>
                  <button
                    type="button"
                    onClick={() => { update("desconto", "tipo", "fixed"); update("desconto", "valor", ""); }}
                    className={`discount-type-btn ${data.desconto.tipo === "fixed" ? "active" : ""}`}
                  >
                    R$
                  </button>
                </div>
                <div style={{ flex: 1 }}>
                  <label className="input-label">Desconto</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={(() => {
                      const v = data.desconto.valor || "";
                      if (!v) return "";
                      const digits = v.toString().replace(/\D/g, "");
                      if (!digits) return "";
                      const num = parseInt(digits, 10) / 100;
                      return num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                    })()}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, "");
                      update("desconto", "valor", digits);
                    }}
                    placeholder={"0,00"}
                    className="discount-value-input"
                  />
                  <div className="calc-hint discount-hint">
                    – {descontoCalculado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </div>
                </div>
              </div>
            </div>
            <div>
              <div className="discount-input-row">
                <div className="discount-type-toggle">
                  <button
                    type="button"
                    onClick={() => { update("imposto", "tipo", "porcentagem"); update("imposto", "valor", ""); }}
                    className={`discount-type-btn ${data.imposto.tipo === "porcentagem" ? "active" : ""}`}
                  >
                    %
                  </button>
                  <button
                    type="button"
                    onClick={() => { update("imposto", "tipo", "fixed"); update("imposto", "valor", ""); }}
                    className={`discount-type-btn ${data.imposto.tipo === "fixed" ? "active" : ""}`}
                  >
                    R$
                  </button>
                </div>
                <div style={{ flex: 1 }}>
                  <label className="input-label">Imposto</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={(() => {
                      const v = data.imposto.valor || "";
                      if (!v) return "";
                      const digits = v.toString().replace(/\D/g, "");
                      if (!digits) return "";
                      const num = parseInt(digits, 10) / 100;
                      return num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                    })()}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, "");
                      update("imposto", "valor", digits);
                    }}
                    placeholder={"0,00"}
                    className="discount-value-input"
                  />
                  <div className="calc-hint tax-hint">
                    + {impostoCalculado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="final-total-row">
            <span className="final-total-label">Valor Final da Nota:</span>
            <span className="final-total-value">{finalTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
          </div>
        </section>

        <Section title="Informações Adicionais">
          <div className="full-width">
            <label className="input-label">Observações / Termos</label>
            <textarea 
              ref={observacoesRef}
              value={data.observacoes} 
              onChange={(e) => update("", "observacoes", e.target.value)}
              onInput={() => autoResize(observacoesRef.current)}
              placeholder="Ex: Pagamento em 3x sem juros..."
            />
          </div>
        </Section>

        <Section title="Configurações de Pagamento (PIX)">
          <div className="form-row-3">
            <div>
              <InputField label="Chave PIX" value={data.pagamento.pix} readOnly={true} placeholder="Chave PIX" />
            </div>
            <div>
              <InputField label="Nome do Favorecido" value={data.pagamento.nome} readOnly={true} placeholder="Nome do titular" />
            </div>
            <div>
              <InputField label="Cidade" value={data.pagamento.cidade} readOnly={true} placeholder="Cidade do titular" />
            </div>
          </div>
        </Section>

        <div className="form-actions-standard no-print">
          <button 
            type="submit"
            className="submit-btn"
          >
            Visualizar e Gerar Fatura
          </button>
        </div>
      </form>
    </div>
  );
}
