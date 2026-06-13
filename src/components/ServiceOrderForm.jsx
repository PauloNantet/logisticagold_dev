import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { api } from "../utils/api";
import { downloadInvoicePDF } from "../utils/invoice";
import { formatDateBR, formatDateMask, handlePhoneKeyDown, handlePhoneInput, autoResize } from "../utils/formatters";
import ConfirmDialog from "./ConfirmDialog";

const EMPTY_ENTRY = {
  fornecedor: "",
  numero: "",
  data: "",
  hora: "",
  voo: "",
  servico: "",
  nome_guia: "",
  tel_guia: "",
  nome_pax: "",
  pax: "",
  file_evento: "",
  cliente: { nome: "", documento: "", email: "", endereco: "" },
  observacao: "",
  veiculo: "",
  placa: "",
  motorista: "",
  contato_motorista: "",
};

const ManualOSModal = ({ clients, vehicles, drivers = [], onSubmit, onClose, initialEntries, onSaveSimulacao }) => {
  const [entry, setEntry] = useState({ ...EMPTY_ENTRY, cliente: { ...EMPTY_ENTRY.cliente } });
  const [entries, setEntries] = useState(initialEntries || []);
  const [editingIdx, setEditingIdx] = useState(null);
  const [formErrors, setFormErrors] = useState({ fornecedor: false, numero: false, data: false });
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [confirmDeleteIdx, setConfirmDeleteIdx] = useState(null);
  const [alertMessage, setAlertMessage] = useState("");

  const manualTableRef = useRef(null);

  const servicoRef = useRef(null);
  const observacaoRef = useRef(null);
  const fornecedorRef = useRef(null);
  const numeroRef = useRef(null);
  const dataRef = useRef(null);
  const formRef = useRef(null);

  useEffect(() => {
    autoResize(servicoRef.current);
    autoResize(observacaoRef.current);
  }, [entry.servico, entry.observacao]);

  const [showClientSuggestions, setShowClientSuggestions] = useState(false);
  const [filteredClients, setFilteredClients] = useState([]);
  const [focusedClientIndex, setFocusedClientIndex] = useState(-1);
  const clientSuggestionsRef = useRef(null);

  const [showVehicleSuggestions, setShowVehicleSuggestions] = useState(false);
  const [filteredVehicles, setFilteredVehicles] = useState([]);
  const [focusedVehicleIndex, setFocusedVehicleIndex] = useState(-1);
  const vehicleSuggestionsRef = useRef(null);

  const [showDriverSuggestions, setShowDriverSuggestions] = useState(false);
  const [filteredDrivers, setFilteredDrivers] = useState([]);
  const [focusedDriverIndex, setFocusedDriverIndex] = useState(-1);
  const driverSuggestionsRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (clientSuggestionsRef.current && !clientSuggestionsRef.current.contains(event.target)) {
        setShowClientSuggestions(false);
        setFocusedClientIndex(-1);
      }
      if (vehicleSuggestionsRef.current && !vehicleSuggestionsRef.current.contains(event.target)) {
        setShowVehicleSuggestions(false);
        setFocusedVehicleIndex(-1);
      }
      if (driverSuggestionsRef.current && !driverSuggestionsRef.current.contains(event.target)) {
        setShowDriverSuggestions(false);
        setFocusedDriverIndex(-1);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const el = manualTableRef.current;
    if (!el) return;
    let isDown = false, startX, scrollLeft;

    const onMouseDown = (e) => {
      if (e.target.closest("button")) return;
      isDown = true;
      startX = e.pageX - el.offsetLeft;
      scrollLeft = el.scrollLeft;
      el.classList.add("is-dragging");
    };

    const onMouseMove = (e) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - el.offsetLeft;
      const walk = (startX - x) * 1.5;
      el.scrollLeft = scrollLeft + walk;
    };

    const onMouseUp = () => {
      isDown = false;
      el.classList.remove("is-dragging");
    };

    el.addEventListener("mousedown", onMouseDown);
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);

    return () => {
      el.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  const updateEntry = (field, value) => setEntry(prev => ({ ...prev, [field]: value }));
  const updateEntryClient = (field, value) => setEntry(prev => ({ ...prev, cliente: { ...prev.cliente, [field]: value } }));

  const handleDataChange = (e) => {
    let digits = e.target.value.replace(/\D/g, "").slice(0, 8);
    let formatted = "";
    if (digits.length > 0) {
      formatted = digits.slice(0, 2);
      if (digits.length > 2) {
        const month = parseInt(digits.slice(2, 4), 10);
        if (month > 12) digits = digits.slice(0, 2) + "12" + digits.slice(4);
        if (month === 0 && digits.length >= 4) digits = digits.slice(0, 2) + "01" + digits.slice(4);
        formatted = digits.slice(0, 2) + "/" + digits.slice(2, 4);
      }
      if (digits.length > 4) {
        const day = parseInt(digits.slice(0, 2), 10);
        const month = parseInt(digits.slice(2, 4), 10);
        const maxDays = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
        const limit = maxDays[month - 1] || 31;
        if (day > limit) digits = limit.toString().padStart(2, "0") + digits.slice(2);
        if (day === 0 && digits.length >= 2) digits = "01" + digits.slice(2);
        formatted = digits.slice(0, 2) + "/" + digits.slice(2, 4) + "/" + digits.slice(4);
      }
    }
    setEntry(prev => ({ ...prev, data: formatted }));
    setFormErrors(prev => ({ ...prev, data: false }));
  };

  const handleDataBlur = () => {
    const d = entry.data.replace(/\D/g, "");
    if (d.length > 0 && d.length < 8) {
      setEntry(prev => ({ ...prev, data: "" }));
    }
  };

  const handleHoraChange = (e) => {
    let digits = e.target.value.replace(/\D/g, "").slice(0, 4);
    let formatted = "";
    if (digits.length > 0) {
      formatted = digits.slice(0, 2);
      if (digits.length > 2) {
        const hours = parseInt(digits.slice(0, 2), 10);
        if (hours > 23) digits = "23" + digits.slice(2);
        formatted = digits.slice(0, 2) + ":" + digits.slice(2, 4);
      }
      if (digits.length === 4) {
        const mins = parseInt(digits.slice(2, 4), 10);
        if (mins > 59) digits = digits.slice(0, 2) + "59";
        formatted = digits.slice(0, 2) + ":" + digits.slice(2, 4);
      }
    }
    setEntry(prev => ({ ...prev, hora: formatted }));
  };

  const handleHoraBlur = () => {
    const h = entry.hora.replace(/\D/g, "");
    if (h.length > 0 && h.length < 4) {
      setEntry(prev => ({ ...prev, hora: "" }));
    }
  };

  const handleClientNameChange = (val) => {
    updateEntryClient("nome", val);
    if (val.length > 0) {
      const filtered = (clients || []).filter(c => c.nome.toLowerCase().includes(val.toLowerCase()));
      setFilteredClients(filtered);
      setShowClientSuggestions(true);
      setFocusedClientIndex(-1);
    } else {
      setShowClientSuggestions(false);
      setFocusedClientIndex(-1);
    }
  };

  const selectClient = (client) => {
    updateEntryClient("nome", client.nome);
    updateEntryClient("documento", (client.documento || "").replace(/\D/g, ""));
    updateEntryClient("email", client.email);
    updateEntryClient("endereco", client.endereco);
    setShowClientSuggestions(false);
    setFocusedClientIndex(-1);
  };

  const handleClientKeyDown = (e) => {
    if (!showClientSuggestions || filteredClients.length === 0) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setFocusedClientIndex(prev => (prev < filteredClients.length - 1 ? prev + 1 : prev)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setFocusedClientIndex(prev => (prev > 0 ? prev - 1 : 0)); }
    else if (e.key === "Enter") { if (focusedClientIndex >= 0) { e.preventDefault(); selectClient(filteredClients[focusedClientIndex]); } }
    else if (e.key === "Escape") { setShowClientSuggestions(false); setFocusedClientIndex(-1); }
  };

  const handleVehicleChange = (val) => {
    updateEntry("veiculo", val);
    if (val.length > 0) {
      const filtered = (vehicles || []).filter(v =>
        v.modelo.toLowerCase().includes(val.toLowerCase()) || v.placa.toLowerCase().includes(val.toLowerCase())
      );
      setFilteredVehicles(filtered);
      setShowVehicleSuggestions(true);
      setFocusedVehicleIndex(-1);
    } else {
      setShowVehicleSuggestions(false);
      setFocusedVehicleIndex(-1);
    }
  };

  const selectVehicle = (vehicle) => {
    updateEntry("veiculo", vehicle.modelo);
    updateEntry("placa", vehicle.placa || "");
    setShowVehicleSuggestions(false);
    setFocusedVehicleIndex(-1);
  };

  const handleVehicleKeyDown = (e) => {
    if (!showVehicleSuggestions || filteredVehicles.length === 0) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setFocusedVehicleIndex(prev => (prev < filteredVehicles.length - 1 ? prev + 1 : prev)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setFocusedVehicleIndex(prev => (prev > 0 ? prev - 1 : 0)); }
    else if (e.key === "Enter") { if (focusedVehicleIndex >= 0) { e.preventDefault(); selectVehicle(filteredVehicles[focusedVehicleIndex]); } }
    else if (e.key === "Escape") { setShowVehicleSuggestions(false); setFocusedVehicleIndex(-1); }
  };

  // Motorista autocomplete
  const handleMotoristaChange = (val) => {
    updateEntry("motorista", val);
    if (val.length > 0) {
      const filtered = (drivers || []).filter(d =>
        d.nome.toLowerCase().includes(val.toLowerCase()) ||
        d.contato.toLowerCase().includes(val.toLowerCase())
      );
      setFilteredDrivers(filtered);
      setShowDriverSuggestions(true);
      setFocusedDriverIndex(-1);
    } else {
      setShowDriverSuggestions(false);
      setFocusedDriverIndex(-1);
    }
  };

  const selectDriver = (driver) => {
    updateEntry("motorista", driver.nome);
    updateEntry("contato_motorista", driver.contato || "");
    setShowDriverSuggestions(false);
    setFocusedDriverIndex(-1);
  };

  const handleDriverKeyDown = (e) => {
    if (!showDriverSuggestions || filteredDrivers.length === 0) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setFocusedDriverIndex(prev => (prev < filteredDrivers.length - 1 ? prev + 1 : prev)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setFocusedDriverIndex(prev => (prev > 0 ? prev - 1 : 0)); }
    else if (e.key === "Enter") { if (focusedDriverIndex >= 0) { e.preventDefault(); selectDriver(filteredDrivers[focusedDriverIndex]); } }
    else if (e.key === "Escape") { setShowDriverSuggestions(false); setFocusedDriverIndex(-1); }
  };

  const resetForm = () => {
    setEntry({ ...EMPTY_ENTRY, cliente: { ...EMPTY_ENTRY.cliente } });
    setEditingIdx(null);
  };

  const handleAdd = () => {
    const errors = {
      fornecedor: !entry.fornecedor.trim(),
      numero: !entry.numero.trim(),
      data: !entry.data,
    };
    setFormErrors(errors);
    if (Object.values(errors).some(v => v)) {
      if (errors.fornecedor && fornecedorRef.current) fornecedorRef.current.focus();
      else if (errors.numero && numeroRef.current) numeroRef.current.focus();
      else if (errors.data && dataRef.current) dataRef.current.focus();
      return;
    }
    if (editingIdx !== null) {
      setEntries(prev => prev.map((s, i) => i === editingIdx ? { ...entry } : s));
    } else {
      setEntries(prev => [...prev, { ...entry }]);
    }
    resetForm();
  };

  const handleEdit = (idx) => {
    const item = entries[idx];
    setEntry({
      ...item,
      data: item.data ? (item.data.includes("-") ? formatDateBR(item.data) : item.data) : "",
      cliente: { ...item.cliente },
    });
    setEditingIdx(idx);
    setTimeout(() => {
      if (formRef.current) {
        formRef.current.scrollTo({ top: 0, behavior: "smooth" });
      }
    }, 200);
  };

  const handleDel = (idx) => {
    setEntries(prev => prev.filter((_, i) => i !== idx));
    if (editingIdx === idx) resetForm();
  };

  const handleGerarOS = () => {
    if (entries.length === 0) {
      setAlertMessage("Adicione ao menos um serviço antes de gerar a OS.");
      return;
    }
    onSubmit(entries, true);
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        <div className="modal-header">
          <h3 className="section-title" style={{ margin: 0, border: "none" }}>Gerar OS Manual</h3>
          <span className="table-count-header" style={{ fontSize: 12, color: "var(--text-placeholder)" }}>OS de última hora sem agendamento</span>
          <button onClick={() => {
            if (entries.length > 0) {
              setShowCloseConfirm(true);
            } else {
              onClose();
            }
          }} className="modal-close" style={{ background: "transparent", border: "none", fontSize: 24, cursor: "pointer", color: "var(--text-placeholder)" }}>✕</button>
        </div>
        <div className="modal-body uppercase-form" ref={formRef}>
          <div className="mapa-top-grid">
            <div className={`input-group${formErrors.fornecedor ? ' input-error' : ''}`}>
              <label className="input-label">Fornecedor</label>
              <input ref={fornecedorRef} type="text" value={entry.fornecedor} onChange={(e) => { updateEntry("fornecedor", e.target.value); setFormErrors(prev => ({ ...prev, fornecedor: false })); }} placeholder="Nome do fornecedor" className="custom-input" />
            </div>
            <div className={`input-group${formErrors.numero ? ' input-error' : ''}`}>
              <label className="input-label">Nº</label>
              <input ref={numeroRef} type="text" value={entry.numero} onChange={(e) => { updateEntry("numero", e.target.value); setFormErrors(prev => ({ ...prev, numero: false })); }} placeholder="Número" className="custom-input" />
            </div>
            <div className={`input-group${formErrors.data ? ' input-error' : ''}`}>
              <label className="input-label">Data</label>
              <input ref={dataRef} type="text" value={entry.data} onChange={handleDataChange} onBlur={handleDataBlur} placeholder="DD/MM/AAAA" maxLength={10} className="custom-input" />
            </div>
            <div className="input-group">
              <label className="input-label">Hora</label>
              <input type="text" value={entry.hora} onChange={handleHoraChange} onBlur={handleHoraBlur} placeholder="HH:MM" maxLength={5} className="custom-input" />
            </div>
            <div className="input-group">
              <label className="input-label">Voo</label>
              <input type="text" value={entry.voo} onChange={(e) => updateEntry("voo", e.target.value)} placeholder="Ex: B2010" className="custom-input" />
            </div>
          </div>
          <div className="section-grid">
            <div className="form-row-single">
              <div className="input-group">
                <label className="input-label">Serviço</label>
                <textarea ref={servicoRef} value={entry.servico} onChange={(e) => updateEntry("servico", e.target.value)} onInput={() => autoResize(servicoRef.current)} placeholder="Tipo de serviço" className="custom-input mapa-servico-textarea" />
              </div>
            </div>
            <div className="form-row-3">
              <div style={{ flex: 1 }}><div className="input-group"><label className="input-label">Nome do Guia</label><input type="text" value={entry.nome_guia} onChange={(e) => updateEntry("nome_guia", e.target.value)} placeholder="Nome do guia" className="custom-input" /></div></div>
              <div style={{ flex: 1 }}><div className="input-group"><label className="input-label">Contato do Guia</label><input type="text" value={entry.tel_guia} onKeyDown={(e) => handlePhoneKeyDown(e, (v) => updateEntry("tel_guia", v))} onInput={(e) => handlePhoneInput(e, (v) => updateEntry("tel_guia", v))} placeholder="Ex: 21 99292-1544 / 21 98985-5252" className="custom-input" /></div></div>
              <div style={{ flex: 1 }}><div className="input-group"><label className="input-label">Nome do PAX</label><input type="text" value={entry.nome_pax} onChange={(e) => updateEntry("nome_pax", e.target.value)} placeholder="Nome do passageiro" className="custom-input" /></div></div>
              <div style={{ flex: 1 }}><div className="input-group"><label className="input-label">PAX</label><input type="text" value={entry.pax} onChange={(e) => updateEntry("pax", e.target.value)} placeholder="Nº de passageiros" className="custom-input" /></div></div>
            </div>
            <div className="form-row-3">
              <div style={{ flex: 1 }}><div className="input-group"><label className="input-label">File / Evento</label><input type="text" value={entry.file_evento} onChange={(e) => updateEntry("file_evento", e.target.value)} placeholder="File ou evento" className="custom-input" /></div></div>
              <div className="relative-container" style={{ flex: 1 }}>
                <div className="input-group">
                  <label className="input-label">Cliente</label>
                  <input type="text" value={entry.cliente.nome} onChange={(e) => handleClientNameChange(e.target.value)} onFocus={() => entry.cliente.nome && handleClientNameChange(entry.cliente.nome)} onKeyDown={handleClientKeyDown} autoComplete="off" className="custom-input" placeholder="Comece a digitar..." />
                </div>
                {showClientSuggestions && filteredClients.length > 0 && (
                  <ul className="autocomplete-dropdown" ref={clientSuggestionsRef}>
                    {filteredClients.map((client, idx) => (
                      <li key={idx} onClick={() => selectClient(client)} className={`suggestion-item ${focusedClientIndex === idx ? 'focused' : ''}`}>
                        <div className="suggestion-name">{client.nome}</div>
                        <div className="suggestion-meta">{client.documento}</div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            <div className="form-row-single">
              <div className="input-group">
                <label className="input-label">Observação</label>
                <textarea ref={observacaoRef} value={entry.observacao} onChange={(e) => updateEntry("observacao", e.target.value)} onInput={() => autoResize(observacaoRef.current)} placeholder="Observações" className="custom-input mapa-servico-textarea" />
              </div>
            </div>
            <div className="form-row-3">
              <div className="relative-container" style={{ flex: 1 }}>
                <div className="input-group">
                  <label className="input-label">Veículo</label>
                  <input type="text" value={entry.veiculo} onChange={(e) => handleVehicleChange(e.target.value)} onKeyDown={handleVehicleKeyDown} autoComplete="off" className="custom-input" placeholder="Digite para buscar..." />
                </div>
                {showVehicleSuggestions && filteredVehicles.length > 0 && (
                  <ul className="autocomplete-dropdown" ref={vehicleSuggestionsRef}>
                    {filteredVehicles.map((vehicle, idx) => (
                      <li key={idx} onClick={() => selectVehicle(vehicle)} className={`suggestion-item ${focusedVehicleIndex === idx ? 'focused' : ''}`}>
                        <div className="suggestion-name">{vehicle.modelo}</div>
                        <div className="suggestion-meta">{vehicle.placa}</div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div style={{ flex: 1 }}><div className="input-group"><label className="input-label">Placa</label><input type="text" value={entry.placa} onChange={(e) => updateEntry("placa", e.target.value.toUpperCase())} placeholder="Ex: ABC-1234" className="custom-input" /></div></div>
              <div className="relative-container" style={{ flex: 1 }}>
                <div className="input-group">
                  <label className="input-label">Motorista</label>
                  <input type="text" value={entry.motorista} onChange={(e) => handleMotoristaChange(e.target.value)} onKeyDown={handleDriverKeyDown} autoComplete="off" className="custom-input" placeholder="Digite para buscar..." />
                </div>
                {showDriverSuggestions && filteredDrivers.length > 0 && (
                  <ul className="autocomplete-dropdown" ref={driverSuggestionsRef}>
                    {filteredDrivers.map((driver, idx) => (
                      <li key={idx} onClick={() => selectDriver(driver)} className={`suggestion-item ${focusedDriverIndex === idx ? 'focused' : ''}`}>
                        <div className="suggestion-name">{driver.nome}</div>
                        <div className="suggestion-meta">{driver.contato}</div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div style={{ flex: 1 }}><div className="input-group"><label className="input-label">Contato Motorista</label><input type="text" value={entry.contato_motorista} onKeyDown={(e) => handlePhoneKeyDown(e, (v) => updateEntry("contato_motorista", v))} onInput={(e) => handlePhoneInput(e, (v) => updateEntry("contato_motorista", v))} placeholder="Ex: 21 99292-1544 / 21 98985-5252" className="custom-input" /></div></div>
            </div>
          </div>

          <div className="form-actions-standard os-manual-actions" style={{ marginTop: 16 }}>
            <button type="button" onClick={handleAdd} className="submit-btn">
              {editingIdx !== null ? "Atualizar Serviço" : "Adicionar Serviço"}
            </button>
            <button type="button" onClick={handleGerarOS} className="submit-btn" style={{ marginLeft: 8 }}>
              Gerar OS
            </button>
          </div>

          <section className="section-card" style={{ marginTop: 20 }}>
            <div className="modal-header-row">
              <h3 className="section-title" style={{ margin: 0, border: "none" }}>Serviços ({entries.length})</h3>
            </div>
            <div className="table-responsive spreadsheet-container" ref={manualTableRef} style={{ cursor: "grab" }}>
              <table className="spreadsheet-table">
                <thead>
                  <tr>
                    <th>Fornecedor</th>
                    <th>Nº</th>
                    <th>Data</th>
                    <th>Hora</th>
                    <th>Voo</th>
                    <th>Serviço</th>
                    <th>Guia/Contato</th>
                    <th>Nome PAX</th>
                    <th>PAX</th>
                    <th>File/Evento</th>
                    <th>Cliente</th>
                    <th>Observação</th>
                    <th>Veículo</th>
                    <th>Placa</th>
                    <th>Motorista/Contato</th>
                    <th style={{ textAlign: "center" }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.length === 0 ? (
                    <tr>
                      <td colSpan={16} style={{ textAlign: "center", padding: 20, color: "var(--text-placeholder)", fontStyle: "italic" }}>
                        Nenhum serviço adicionado ainda.
                      </td>
                    </tr>
                  ) : entries.map((sim, i) => (
                    <tr key={i}>
                      <td style={{ whiteSpace: "nowrap" }}>{sim.fornecedor || "---"}</td>
                      <td>{sim.numero || "---"}</td>
                      <td>{formatDateBR(sim.data)}</td>
                      <td>{sim.hora || "---"}</td>
                      <td>{sim.voo || "---"}</td>
                      <td className="wrap-cell pre-wrap-cell" style={{ maxWidth: 130 }}>{sim.servico || "---"}</td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        {sim.nome_guia}
                        {sim.tel_guia ? <><br />{sim.tel_guia}</> : ""}
                      </td>
                      <td className="wrap-cell">{sim.nome_pax || "---"}</td>
                      <td>{sim.pax || "0"}</td>
                      <td className="wrap-cell">{sim.file_evento || "---"}</td>
                      <td className="wrap-cell">{sim.cliente?.nome || "---"}</td>
                      <td className="wrap-cell pre-wrap-cell" style={{ maxWidth: 130 }}>{sim.observacao || "---"}</td>
                      <td>{sim.veiculo || "---"}</td>
                      <td>{sim.placa || "---"}</td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        {sim.motorista}
                        {sim.contato_motorista ? <><br />{sim.contato_motorista}</> : ""}
                      </td>
                      <td className="actions-cell">
                        <div className="spreadsheet-actions justify-end" style={{ gap: 4 }}>
                          <button type="button" onClick={() => handleEdit(i)} className="action-icon-btn edit" title="Editar">✎</button>
                          <button type="button" onClick={() => setConfirmDeleteIdx(i)} className="action-icon-btn delete" title="Remover">🗑</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
      {showCloseConfirm && (
        <ConfirmDialog
          message="Deseja salvar esse serviço em Simulação de ordem de serviço?"
          onConfirm={() => {
            if (onSaveSimulacao) onSaveSimulacao(entries);
            setShowCloseConfirm(false);
            onClose();
          }}
          onCancel={() => { setShowCloseConfirm(false); onClose(); }}
        />
      )}
      {confirmDeleteIdx !== null && (
        <ConfirmDialog
          message="Tem certeza que deseja excluir este serviço?"
          onConfirm={() => { handleDel(confirmDeleteIdx); setConfirmDeleteIdx(null); }}
          onCancel={() => setConfirmDeleteIdx(null)}
        />
      )}
      {alertMessage && (
        <ConfirmDialog message={alertMessage} onConfirm={() => setAlertMessage("")} confirmText="OK" singleButton />
      )}
    </div>
  );
};

const SimularModal = ({ clients, vehicles, drivers = [], simulations, setSimulations, onClose, onVisualizarPdf }) => {
  const [entry, setEntry] = useState({ ...EMPTY_ENTRY, cliente: { ...EMPTY_ENTRY.cliente } });
  const [editingIdx, setEditingIdx] = useState(null);
  const [confirmDeleteIdx, setConfirmDeleteIdx] = useState(null);

  const servicoRef = useRef(null);
  const observacaoRef = useRef(null);

  useEffect(() => {
    autoResize(servicoRef.current);
    autoResize(observacaoRef.current);
  }, [entry.servico, entry.observacao]);

  // Autocomplete de cliente
  const [showClientSuggestions, setShowClientSuggestions] = useState(false);
  const [filteredClients, setFilteredClients] = useState([]);
  const [focusedClientIndex, setFocusedClientIndex] = useState(-1);
  const clientSuggestionsRef = useRef(null);

  // Autocomplete de veículo
  const [showVehicleSuggestions, setShowVehicleSuggestions] = useState(false);
  const [filteredVehicles, setFilteredVehicles] = useState([]);
  const [focusedVehicleIndex, setFocusedVehicleIndex] = useState(-1);
  const vehicleSuggestionsRef = useRef(null);

  // Autocomplete de motorista
  const [showDriverSuggestions, setShowDriverSuggestions] = useState(false);
  const [filteredDrivers, setFilteredDrivers] = useState([]);
  const [focusedDriverIndex, setFocusedDriverIndex] = useState(-1);
  const driverSuggestionsRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (clientSuggestionsRef.current && !clientSuggestionsRef.current.contains(event.target)) {
        setShowClientSuggestions(false);
        setFocusedClientIndex(-1);
      }
      if (vehicleSuggestionsRef.current && !vehicleSuggestionsRef.current.contains(event.target)) {
        setShowVehicleSuggestions(false);
        setFocusedVehicleIndex(-1);
      }
      if (driverSuggestionsRef.current && !driverSuggestionsRef.current.contains(event.target)) {
        setShowDriverSuggestions(false);
        setFocusedDriverIndex(-1);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const updateEntry = (field, value) => {
    setEntry(prev => ({ ...prev, [field]: value }));
  };

  const updateEntryClient = (field, value) => {
    setEntry(prev => ({ ...prev, cliente: { ...prev.cliente, [field]: value } }));
  };

  const handleClientNameChange = (val) => {
    updateEntryClient("nome", val);
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
    updateEntryClient("nome", client.nome);
    updateEntryClient("documento", (client.documento || "").replace(/\D/g, ""));
    updateEntryClient("email", client.email);
    updateEntryClient("endereco", client.endereco);
    setShowClientSuggestions(false);
    setFocusedClientIndex(-1);
  };

  const handleClientKeyDown = (e) => {
    if (!showClientSuggestions || filteredClients.length === 0) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setFocusedClientIndex(prev => (prev < filteredClients.length - 1 ? prev + 1 : prev)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setFocusedClientIndex(prev => (prev > 0 ? prev - 1 : 0)); }
    else if (e.key === "Enter") { if (focusedClientIndex >= 0) { e.preventDefault(); selectClient(filteredClients[focusedClientIndex]); } }
    else if (e.key === "Escape") { setShowClientSuggestions(false); setFocusedClientIndex(-1); }
  };

  const handleVehicleChange = (val) => {
    updateEntry("veiculo", val);
    if (val.length > 0) {
      const filtered = (vehicles || []).filter(v =>
        v.modelo.toLowerCase().includes(val.toLowerCase()) ||
        v.placa.toLowerCase().includes(val.toLowerCase())
      );
      setFilteredVehicles(filtered);
      setShowVehicleSuggestions(true);
      setFocusedVehicleIndex(-1);
    } else {
      setShowVehicleSuggestions(false);
      setFocusedVehicleIndex(-1);
    }
  };

  const selectVehicle = (vehicle) => {
    updateEntry("veiculo", vehicle.modelo);
    updateEntry("placa", vehicle.placa || "");
    setShowVehicleSuggestions(false);
    setFocusedVehicleIndex(-1);
  };

  const handleVehicleKeyDown = (e) => {
    if (!showVehicleSuggestions || filteredVehicles.length === 0) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setFocusedVehicleIndex(prev => (prev < filteredVehicles.length - 1 ? prev + 1 : prev)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setFocusedVehicleIndex(prev => (prev > 0 ? prev - 1 : 0)); }
    else if (e.key === "Enter") { if (focusedVehicleIndex >= 0) { e.preventDefault(); selectVehicle(filteredVehicles[focusedVehicleIndex]); } }
    else if (e.key === "Escape") { setShowVehicleSuggestions(false); setFocusedVehicleIndex(-1); }
  };

  // Motorista autocomplete
  const handleMotoristaChange = (val) => {
    updateEntry("motorista", val);
    if (val.length > 0) {
      const filtered = (drivers || []).filter(d =>
        d.nome.toLowerCase().includes(val.toLowerCase()) ||
        d.contato.toLowerCase().includes(val.toLowerCase())
      );
      setFilteredDrivers(filtered);
      setShowDriverSuggestions(true);
      setFocusedDriverIndex(-1);
    } else {
      setShowDriverSuggestions(false);
      setFocusedDriverIndex(-1);
    }
  };

  const selectDriver = (driver) => {
    updateEntry("motorista", driver.nome);
    updateEntry("contato_motorista", driver.contato || "");
    setShowDriverSuggestions(false);
    setFocusedDriverIndex(-1);
  };

  const handleDriverKeyDown = (e) => {
    if (!showDriverSuggestions || filteredDrivers.length === 0) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setFocusedDriverIndex(prev => (prev < filteredDrivers.length - 1 ? prev + 1 : prev)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setFocusedDriverIndex(prev => (prev > 0 ? prev - 1 : 0)); }
    else if (e.key === "Enter") { if (focusedDriverIndex >= 0) { e.preventDefault(); selectDriver(filteredDrivers[focusedDriverIndex]); } }
    else if (e.key === "Escape") { setShowDriverSuggestions(false); setFocusedDriverIndex(-1); }
  };

  const resetForm = () => {
    setEntry({ ...EMPTY_ENTRY, cliente: { ...EMPTY_ENTRY.cliente } });
    setEditingIdx(null);
  };

  const handleAdd = () => {
    if (editingIdx !== null) {
      setSimulations(prev => prev.map((s, i) => i === editingIdx ? { ...entry } : s));
    } else {
      setSimulations(prev => [...prev, { ...entry }]);
    }
    resetForm();
  };

  const handleVisualizarPdf = () => {
    const selected = simulations.filter(s => s.selected);
    if (selected.length === 0) {
      alert("Selecione ao menos um serviço para o PDF.");
      return;
    }
    onVisualizarPdf(selected);
    onClose();
  };

  const handleTogglePdf = (idx) => {
    setSimulations(prev => prev.map((s, i) => i === idx ? { ...s, selected: !s.selected } : s));
  };

  const handleEdit = (idx) => {
    setEntry({ ...simulations[idx], cliente: { ...simulations[idx].cliente } });
    setEditingIdx(idx);
  };

  const fileInputRef = useRef(null);

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(simulations, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `simulacoes_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (Array.isArray(data)) {
          setSimulations(data);
        } else {
          alert("Arquivo inválido.");
        }
      } catch {
        alert("Erro ao ler o arquivo.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleClear = () => {
    if (simulations.length === 0) return;
    if (confirm("Limpar todas as simulações?")) {
      setSimulations([]);
    }
  };

  const handleDel = (idx) => {
    setSimulations(prev => prev.filter((_, i) => i !== idx));
    if (editingIdx === idx) resetForm();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="section-title" style={{ margin: 0, border: "none" }}>Simular Serviço</h3>
          <span className="table-count-header" style={{ fontSize: 12, color: "var(--text-placeholder)" }}>Preencha os dados do serviço</span>
          <button onClick={onClose} className="modal-close" style={{ background: "transparent", border: "none", fontSize: 24, cursor: "pointer", color: "var(--text-placeholder)" }}>✕</button>
        </div>
        <div className="modal-body">
          <div className="mapa-top-grid">
              <div className="input-group">
                <label className="input-label">Fornecedor</label>
                <input type="text" value={entry.fornecedor} onChange={(e) => updateEntry("fornecedor", e.target.value)} placeholder="Nome do fornecedor" className="custom-input" />
              </div>
              <div className="input-group">
                <label className="input-label">Nº</label>
                <input type="text" value={entry.numero} onChange={(e) => updateEntry("numero", e.target.value)} placeholder="Número" className="custom-input" />
              </div>
              <div className="input-group">
                <label className="input-label">Data</label>
                <input type="text" value={entry.data} onChange={(e) => updateEntry("data", formatDateMask(e.target.value))} placeholder="DD/MM/AAAA" maxLength={10} className="custom-input" />
              </div>
              <div className="input-group">
                <label className="input-label">Hora</label>
                <input type="time" value={entry.hora} onChange={(e) => updateEntry("hora", e.target.value)} className="custom-input" />
              </div>
              <div className="input-group">
                <label className="input-label">Voo</label>
                <input type="text" value={entry.voo} onChange={(e) => updateEntry("voo", e.target.value)} placeholder="Ex: B2010" className="custom-input" />
              </div>
            </div>
            <div className="section-grid">
              <div className="form-row-single">
                <div className="input-group">
                  <label className="input-label">Serviço</label>
                <textarea ref={servicoRef} value={entry.servico} onChange={(e) => updateEntry("servico", e.target.value)} onInput={() => autoResize(servicoRef.current)} placeholder="Tipo de serviço" className="custom-input mapa-servico-textarea" />
                </div>
              </div>
              <div className="form-row-3">
                <div style={{ flex: 1 }}><div className="input-group"><label className="input-label">Nome do Guia</label><input type="text" value={entry.nome_guia} onChange={(e) => updateEntry("nome_guia", e.target.value)} placeholder="Nome do guia" className="custom-input" /></div></div>
                <div style={{ flex: 1 }}><div className="input-group"><label className="input-label">Contato do Guia</label><input type="text" value={entry.tel_guia} onKeyDown={(e) => handlePhoneKeyDown(e, (v) => updateEntry("tel_guia", v))} onInput={(e) => handlePhoneInput(e, (v) => updateEntry("tel_guia", v))} placeholder="Ex: 21 99292-1544 / 21 98985-5252" className="custom-input" /></div></div>
                <div style={{ flex: 1 }}><div className="input-group"><label className="input-label">Nome do PAX</label><input type="text" value={entry.nome_pax} onChange={(e) => updateEntry("nome_pax", e.target.value)} placeholder="Nome do passageiro" className="custom-input" /></div></div>
                <div style={{ flex: 1 }}><div className="input-group"><label className="input-label">PAX</label><input type="text" value={entry.pax} onChange={(e) => updateEntry("pax", e.target.value)} placeholder="Nº de passageiros" className="custom-input" /></div></div>
              </div>
              <div className="form-row-3">
                <div style={{ flex: 1 }}><div className="input-group"><label className="input-label">File / Evento</label><input type="text" value={entry.file_evento} onChange={(e) => updateEntry("file_evento", e.target.value)} placeholder="File ou evento" className="custom-input" /></div></div>
                <div className="relative-container" style={{ flex: 1 }}>
                  <div className="input-group">
                    <label className="input-label">Cliente</label>
                    <input type="text" value={entry.cliente.nome} onChange={(e) => handleClientNameChange(e.target.value)} onFocus={() => entry.cliente.nome && handleClientNameChange(entry.cliente.nome)} onKeyDown={handleClientKeyDown} autoComplete="off" className="custom-input" placeholder="Comece a digitar..." />
                  </div>
                  {showClientSuggestions && filteredClients.length > 0 && (
                    <ul className="autocomplete-dropdown" ref={clientSuggestionsRef}>
                      {filteredClients.map((client, idx) => (
                        <li key={idx} onClick={() => selectClient(client)} className={`suggestion-item ${focusedClientIndex === idx ? 'focused' : ''}`}>
                          <div className="suggestion-name">{client.nome}</div>
                          <div className="suggestion-meta">{client.documento}</div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
              <div className="form-row-single">
                <div className="input-group">
                  <label className="input-label">Observação</label>
                <textarea ref={observacaoRef} value={entry.observacao} onChange={(e) => updateEntry("observacao", e.target.value)} onInput={() => autoResize(observacaoRef.current)} placeholder="Observações" className="custom-input mapa-servico-textarea" />
                </div>
              </div>
              <div className="form-row-3">
                <div className="relative-container" style={{ flex: 1 }}>
                  <div className="input-group">
                    <label className="input-label">Veículo</label>
                    <input type="text" value={entry.veiculo} onChange={(e) => handleVehicleChange(e.target.value)} onKeyDown={handleVehicleKeyDown} autoComplete="off" className="custom-input" placeholder="Digite para buscar..." />
                  </div>
                  {showVehicleSuggestions && filteredVehicles.length > 0 && (
                    <ul className="autocomplete-dropdown" ref={vehicleSuggestionsRef}>
                      {filteredVehicles.map((vehicle, idx) => (
                        <li key={idx} onClick={() => selectVehicle(vehicle)} className={`suggestion-item ${focusedVehicleIndex === idx ? 'focused' : ''}`}>
                          <div className="suggestion-name">{vehicle.modelo}</div>
                          <div className="suggestion-meta">{vehicle.placa}</div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div style={{ flex: 1 }}><div className="input-group"><label className="input-label">Placa</label><input type="text" value={entry.placa} onChange={(e) => updateEntry("placa", e.target.value.toUpperCase())} placeholder="Ex: ABC-1234" className="custom-input" /></div></div>
                <div className="relative-container" style={{ flex: 1 }}>
                  <div className="input-group">
                    <label className="input-label">Motorista</label>
                    <input type="text" value={entry.motorista} onChange={(e) => handleMotoristaChange(e.target.value)} onKeyDown={handleDriverKeyDown} autoComplete="off" className="custom-input" placeholder="Digite para buscar..." />
                  </div>
                  {showDriverSuggestions && filteredDrivers.length > 0 && (
                    <ul className="autocomplete-dropdown" ref={driverSuggestionsRef}>
                      {filteredDrivers.map((driver, idx) => (
                        <li key={idx} onClick={() => selectDriver(driver)} className={`suggestion-item ${focusedDriverIndex === idx ? 'focused' : ''}`}>
                          <div className="suggestion-name">{driver.nome}</div>
                          <div className="suggestion-meta">{driver.contato}</div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div style={{ flex: 1 }}><div className="input-group"><label className="input-label">Contato Motorista</label><input type="text" value={entry.contato_motorista} onKeyDown={(e) => handlePhoneKeyDown(e, (v) => updateEntry("contato_motorista", v))} onInput={(e) => handlePhoneInput(e, (v) => updateEntry("contato_motorista", v))} placeholder="Ex: 21 99292-1544 / 21 98985-5252" className="custom-input" /></div></div>
              </div>
            </div>

          <div className="form-actions-standard" style={{ marginTop: 16 }}>
            <button type="button" onClick={handleAdd} className="submit-btn" style={{ background: "transparent" }}>
              {editingIdx !== null ? "Atualizar Simulação" : "Adicionar à Simulação"}
            </button>
            <button type="button" onClick={handleVisualizarPdf} className="submit-btn" style={{ marginLeft: 8 }}>
              Visualizar PDF
            </button>
          </div>

          <div className="form-actions-standard" style={{ marginTop: 12, gap: 8 }}>
            <input type="file" accept=".json" ref={fileInputRef} onChange={handleImport} style={{ display: "none" }} />
            <button type="button" onClick={handleExport} className="action-icon-btn" title="Exportar simulações" style={{ fontSize: 13, padding: "6px 12px", background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: 6, cursor: "pointer" }}>
              📥 Exportar
            </button>
            <button type="button" onClick={() => fileInputRef.current?.click()} className="action-icon-btn" title="Importar simulações" style={{ fontSize: 13, padding: "6px 12px", background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: 6, cursor: "pointer" }}>
              📤 Importar
            </button>
            <button type="button" onClick={handleClear} className="action-icon-btn" title="Limpar simulações" style={{ fontSize: 13, padding: "6px 12px", background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: 6, cursor: "pointer" }}>
              🗑 Limpar
            </button>
          </div>

          {simulations.length > 0 && (
            <section className="section-card" style={{ marginTop: 20 }}>
              <div className="modal-header-row">
                <h3 className="section-title" style={{ margin: 0, border: "none" }}>Simulações ({simulations.length})</h3>
              </div>
            <div className="table-responsive spreadsheet-container">
                <table className="spreadsheet-table">
                  <thead>
                    <tr>
                      <th>Fornecedor</th>
                      <th>Nº</th>
                      <th>Data</th>
                      <th>Hora</th>
                      <th>Voo</th>
                      <th>Serviço</th>
                      <th>Guia/Contato</th>
                      <th>Nome PAX</th>
                      <th>PAX</th>
                      <th>File/Evento</th>
                      <th>Cliente</th>
                      <th>Observação</th>
                      <th>Veículo</th>
                      <th>Placa</th>
                      <th>Motorista/Contato</th>
                    <th style={{ textAlign: "center" }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {simulations.map((sim, i) => (
                      <tr key={i}>
                        <td style={{ whiteSpace: "nowrap" }}>{sim.fornecedor || "---"}</td>
                        <td>{sim.numero || "---"}</td>
                        <td>{formatDateBR(sim.data)}</td>
                        <td>{sim.hora || "---"}</td>
                        <td>{sim.voo || "---"}</td>
                        <td className="wrap-cell pre-wrap-cell" style={{ maxWidth: 130 }}>{sim.servico || "---"}</td>
                        <td style={{ whiteSpace: "nowrap" }}>
                          {sim.nome_guia}
                          {sim.tel_guia ? <><br />{sim.tel_guia}</> : ""}
                        </td>
                        <td className="wrap-cell">{sim.nome_pax || "---"}</td>
                        <td>{sim.pax || "0"}</td>
                        <td className="wrap-cell">{sim.file_evento || "---"}</td>
                        <td className="wrap-cell">{sim.cliente?.nome || "---"}</td>
                        <td className="wrap-cell pre-wrap-cell" style={{ maxWidth: 130 }}>{sim.observacao || "---"}</td>
                        <td>{sim.veiculo || "---"}</td>
                        <td>{sim.placa || "---"}</td>
                        <td style={{ whiteSpace: "nowrap" }}>
                          {sim.motorista}
                          {sim.contato_motorista ? <><br />{sim.contato_motorista}</> : ""}
                        </td>
                        <td className="actions-cell">
                          <div className="spreadsheet-actions justify-end" style={{ gap: 4 }}>
                            <button type="button" onClick={() => handleTogglePdf(i)} className="action-icon-btn select" title={sim.selected ? "Remover do PDF" : "Adicionar ao PDF"} style={sim.selected ? { background: "rgba(212,175,55,0.2)", borderRadius: 6 } : {}}>{sim.selected ? "✅" : "➕"}</button>
                            <button type="button" onClick={() => handleEdit(i)} className="action-icon-btn edit" title="Editar">✎</button>
                          <button type="button" onClick={() => setConfirmDeleteIdx(i)} className="action-icon-btn delete" title="Remover">🗑</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      </div>
      {confirmDeleteIdx !== null && (
        <ConfirmDialog
          message="Tem certeza que deseja excluir este serviço?"
          onConfirm={() => { handleDel(confirmDeleteIdx); setConfirmDeleteIdx(null); }}
          onCancel={() => setConfirmDeleteIdx(null)}
        />
      )}
    </div>
  );
};

const SortHeader = ({ label, sortKey, style, sortConfig, onSort }) => (
  <th onClick={() => onSort(sortKey)} style={{ cursor: "pointer", userSelect: "none", ...style }}>
    {label}
  </th>
);

export default function ServiceOrderForm({ onSubmit, clients, vehicles, drivers = [], restoredEntries, onClearRestored, onSaveSimulacao, onPreviewOS, onDownloadOS, onBulkDownloadOS }) {
  const [entries, setEntries] = useState([]);
  const [simPreview, setSimPreview] = useState(false);
  const [simPreviewEntries, setSimPreviewEntries] = useState([]);
  const [fornecedorFilter, setFornecedorFilter] = useState([]);
  const [fornecedorError, setFornecedorError] = useState(false);
  const [dataFilter, setDataFilter] = useState([]);
  const [fileEventoFilter, setFileEventoFilter] = useState([]);
  const [motoristaFilter, setMotoristaFilter] = useState([]);
  const [hasHorizontalScroll, setHasHorizontalScroll] = useState(false);
  const [showFornecedorPopup, setShowFornecedorPopup] = useState(false);
  const [showDatePopup, setShowDatePopup] = useState(false);
  const [showFileEventoPopup, setShowFileEventoPopup] = useState(false);
  const [showMotoristaPopup, setShowMotoristaPopup] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [showSimularModal, setShowSimularModal] = useState(false);
  const [showManualOSModal, setShowManualOSModal] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const tableRef = useRef(null);
  const [simulations, setSimulations] = useState(() => {
    try {
      const saved = localStorage.getItem("fatura_simulacoes");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("fatura_simulacoes", JSON.stringify(simulations));
    } catch {}
  }, [simulations]);

  const toggleSelectMode = () => {
    setSelectMode(prev => !prev);
    setSelectedIds(new Set());
  };

  const toggleSelectEntry = (idx) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === sortedEntries.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sortedEntries.map((_, i) => i)));
    }
  };

  const handleBulkDownload = () => {
    const selected = [...selectedIds].map(i => sortedEntries[i]).filter(Boolean);
    if (selected.length === 0) return;
    if (onBulkDownloadOS) onBulkDownloadOS(selected);
  };

  useEffect(() => {
    api.get("/api/agenda").then(data => {
      setEntries(data.filter(e => !e.concluido));
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (restoredEntries && restoredEntries.length > 0) {
      setShowManualOSModal(true);
    }
  }, [restoredEntries]);

  useEffect(() => {
    const el = tableRef.current;
    if (!el) return;
    let isDown = false, startX, scrollLeft;

    const onMouseDown = (e) => {
      if (e.target.closest("button")) return;
      isDown = true;
      startX = e.pageX - el.offsetLeft;
      scrollLeft = el.scrollLeft;
      el.classList.add("is-dragging");
    };

    const onMouseMove = (e) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - el.offsetLeft;
      const walk = (startX - x) * 1.5;
      el.scrollLeft = scrollLeft + walk;
    };

    const onMouseUp = () => {
      isDown = false;
      el.classList.remove("is-dragging");
    };

    el.addEventListener("mousedown", onMouseDown);
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);

    return () => {
      el.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, [loading]);

  useEffect(() => {
    const el = tableRef.current;
    if (!el) return;
    const check = () => setHasHorizontalScroll(el.scrollWidth > el.clientWidth + 1);
    check();
    const observer = new ResizeObserver(check);
    observer.observe(el);
    window.addEventListener("resize", check);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", check);
    };
  }, [loading, entries.length]);

  const allEntries = entries;

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc"
    }));
  };

  const getSortValue = (e, key) => {
    if (key === "cliente") return (e.cliente?.nome || "").toLowerCase();
    if (key === "guia") return (e.nome_guia || "").toLowerCase();
    if (key === "motorista_contato") return (e.motorista || "").toLowerCase();
    return (e[key] || "").toString().toLowerCase();
  };

  const filterEntries = (entries, exclude) => entries.filter(e => {
    const matchesFornecedor = exclude === "fornecedor" || fornecedorFilter.length === 0 ||
      fornecedorFilter.some(f => (e.fornecedor || "").toLowerCase() === f.toLowerCase());
    const matchesData = exclude === "data" || dataFilter.length === 0 ||
      dataFilter.some(d => (e.data || "") === d);
    const matchesFileEvento = exclude === "fileEvento" || fileEventoFilter.length === 0 ||
      fileEventoFilter.some(f => (e.file_evento || "").toLowerCase() === f.toLowerCase());
    const matchesMotorista = exclude === "motorista" || motoristaFilter.length === 0 ||
      motoristaFilter.some(m => (e.motorista || "").toLowerCase() === m.toLowerCase());
    return matchesFornecedor && matchesData && matchesFileEvento && matchesMotorista;
  });

  const filteredEntries = filterEntries(allEntries);

  const sortByData = (a, b, dir) => {
    const dateA = new Date(a.data?.split("/").reverse().join("-") || a.data);
    const dateB = new Date(b.data?.split("/").reverse().join("-") || b.data);
    if (isNaN(dateA) || isNaN(dateB)) return 0;
    return dir === "asc" ? dateA - dateB : dateB - dateA;
  };

  const sortedEntries = [...filteredEntries].sort((a, b) => {
    if (!sortConfig.key) {
      const cmp = sortByData(a, b, "asc");
      if (cmp !== 0) return cmp;
      const aHora = (a.hora || "").toLowerCase();
      const bHora = (b.hora || "").toLowerCase();
      const cmpHora = aHora.localeCompare(bHora);
      if (cmpHora !== 0) return cmpHora;
      const aFor = (a.fornecedor || "").toLowerCase();
      const bFor = (b.fornecedor || "").toLowerCase();
      const cmpFor = aFor.localeCompare(bFor);
      if (cmpFor !== 0) return cmpFor;
      return (a.numero || "").localeCompare(b.numero || "");
    }
    if (sortConfig.key === "data") {
      return sortByData(a, b, sortConfig.direction);
    }
    const aVal = getSortValue(a, sortConfig.key);
    const bVal = getSortValue(b, sortConfig.key);
    const numA = parseFloat(aVal);
    const numB = parseFloat(bVal);
    const isNum = !isNaN(numA) && !isNaN(numB);
    if (isNum) return sortConfig.direction === "asc" ? numA - numB : numB - numA;
    return sortConfig.direction === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
  });

  const handleVisualizarPdf = (selected) => {
    setSimPreviewEntries(selected);
    setSimPreview(true);
    setShowSimularModal(false);
  };

  if (loading) {
    return (
      <div className="invoice-form-container" style={{ textAlign: "center", padding: 60 }}>
        <p style={{ color: "var(--text-placeholder)", fontSize: 14 }}>Carregando ordens de serviço...</p>
      </div>
    );
  }

  if (simPreview) {
    return <SimulacaoPreview entries={simPreviewEntries} onBack={() => { setSimPreview(false); setShowSimularModal(true); }} />;
  }

  return (
    <div className="invoice-form-container">
      {showSimularModal && (
        <SimularModal
          clients={clients}
          vehicles={vehicles}
          drivers={drivers}
          simulations={simulations}
          setSimulations={setSimulations}
          onClose={() => setShowSimularModal(false)}
          onVisualizarPdf={handleVisualizarPdf}
        />
      )}
      {showManualOSModal && (
        <ManualOSModal
          clients={clients}
          vehicles={vehicles}
          drivers={drivers}
          onSubmit={onSubmit}
          onClose={() => { setShowManualOSModal(false); if (onClearRestored) onClearRestored(); }}
          initialEntries={restoredEntries}
          onSaveSimulacao={onSaveSimulacao}
        />
      )}
      <form onSubmit={(e) => e.preventDefault()}>
        <section className="section-card">
          <div className="clients-list-container">
            <div className="modal-header-row">
              <h3 className="section-title" style={{ margin: 0 }}>Ordens de Serviço</h3>
              <span className="table-count-header">
                {sortedEntries.length} serviço{sortedEntries.length !== 1 ? "s" : ""} pendente{sortedEntries.length !== 1 ? "s" : ""}
              </span>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginLeft: "auto" }}>
                {selectMode && selectedIds.size > 0 && (
                  <button type="button" onClick={handleBulkDownload} className={`action-tab-btn${selectedIds.size > 0 ? " active" : ""}`}>
                    ⬇ Baixar ({selectedIds.size})
                  </button>
                )}
                <button type="button" onClick={toggleSelectMode} className={`action-tab-btn${selectMode ? " active" : ""}`}>
                  {selectMode ? "✕ Cancelar" : "☑ Selecionar p/ Baixar"}
                </button>
                {selectMode && (
                  <button type="button" onClick={toggleSelectAll} className="action-tab-btn">
                    Todos
                  </button>
                )}
                <button type="button" onClick={() => {
                  if (sortedEntries.length === 0) return;
                  const fornecedores = [...new Set(sortedEntries.map(e => e.fornecedor || "Sem fornecedor"))];
                  if (fornecedores.length > 1) {
                    setFornecedorError(true);
                    return;
                  }
                  setFornecedorError(false);
                  onSubmit(sortedEntries);
                }} className="action-tab-btn" style={{ whiteSpace: "nowrap" }}>
                  Gerar Ordem
                </button>
                <button type="button" onClick={() => setShowManualOSModal(true)} className="action-tab-btn" style={{ whiteSpace: "nowrap" }}>
                  Gerar Manualmente
                </button>
              </div>
            </div>
              <div style={{ display: "flex", gap: 6, maxWidth: "100%", alignItems: "center" }}>
                <div className="search-container" style={{ flex: "0 0 auto", width: "auto" }}>
                  <button
                    type="button"
                    onClick={() => setShowFornecedorPopup(true)}
                    className={`filter-btn${fornecedorError ? ' filter-error' : ''}`}
                    style={{ width: "auto", gap: 8, padding: "0 14px", fontSize: "13px", fontWeight: "600" }}
                  >
                    <span>{fornecedorFilter.length > 0 ? `${fornecedorFilter.length} fornecedor(es)` : "Fornecedor"}</span>
                  </button>
                  {showFornecedorPopup && (
                    <div onClick={() => setShowFornecedorPopup(false)} style={{ position: "fixed", inset: 0, zIndex: 2000 }}>
                      <div onClick={(e) => e.stopPropagation()} style={{ position: "fixed", top: 5, left: "50%", transform: "translateX(-50%)", background: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: 16, padding: 24, minWidth: 300, maxHeight: "70vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>
                        <h3 style={{ color: "var(--primary)", fontSize: 16, fontWeight: 700, marginBottom: 16, textTransform: "uppercase", letterSpacing: 1 }}>Filtrar por Fornecedor</h3>
                        <button type="button" onClick={() => { setFornecedorFilter([]); setFornecedorError(false); }} style={{ display: "block", width: "100%", padding: "10px 14px", textAlign: "left", background: fornecedorFilter.length === 0 ? "rgba(212,175,55,0.15)" : "transparent", border: "none", borderRadius: 8, color: "var(--text-main)", fontSize: 14, cursor: "pointer", fontWeight: fornecedorFilter.length === 0 ? 700 : 400, marginBottom: 4 }}>
                          📋 Todos os fornecedores
                        </button>
                        <div style={{ height: 1, background: "var(--border-color)", margin: "8px 0" }} />
                        {[...new Set(filterEntries(allEntries, "fornecedor").map(e => e.fornecedor).filter(Boolean))].sort().map(f => {
                          const isSelected = fornecedorFilter.some(v => v.toLowerCase() === f.toLowerCase());
                          return (
                            <button key={f} type="button" onClick={() => {
                              if (isSelected) {
                                setFornecedorFilter(prev => prev.filter(v => v.toLowerCase() !== f.toLowerCase()));
                              } else {
                                setFornecedorFilter(prev => [...prev, f]);
                              }
                              setFornecedorError(false);
                            }} style={{ display: "flex", alignItems: "center", width: "100%", padding: "10px 14px", textAlign: "left", background: isSelected ? "rgba(212,175,55,0.15)" : "transparent", border: "none", borderRadius: 8, color: "var(--text-main)", fontSize: 14, cursor: "pointer", fontWeight: isSelected ? 700 : 400, marginBottom: 4 }}>
                              <span style={{ marginRight: 8 }}>🏢</span>
                              <span style={{ flex: 1 }}>{f}</span>
                              <span>{isSelected ? "✅" : "⬜"}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
                <div className="search-container" style={{ flex: "0 0 auto", width: "auto" }}>
                  <button
                    type="button"
                    onClick={() => setShowDatePopup(true)}
                    className="filter-btn"
                    style={{ width: "auto", gap: 8, padding: "0 14px", color: "#FFF", fontSize: "13px", fontWeight: "600" }}
                  >
                    <span>{dataFilter.length > 0 ? `${dataFilter.length} data(s)` : "Data"}</span>
                  </button>
                  {showDatePopup && (
                    <div onClick={() => setShowDatePopup(false)} style={{ position: "fixed", inset: 0, zIndex: 2000 }}>
                      <div onClick={(e) => e.stopPropagation()} style={{ position: "fixed", top: 5, left: "50%", transform: "translateX(-50%)", background: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: 16, padding: 24, minWidth: 300, maxHeight: "70vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>
                        <h3 style={{ color: "var(--primary)", fontSize: 16, fontWeight: 700, marginBottom: 16, textTransform: "uppercase", letterSpacing: 1 }}>Filtrar por Data</h3>
                        <button type="button" onClick={() => { setDataFilter([]); }} style={{ display: "block", width: "100%", padding: "10px 14px", textAlign: "left", background: dataFilter.length === 0 ? "rgba(212,175,55,0.15)" : "transparent", border: "none", borderRadius: 8, color: "var(--text-main)", fontSize: 14, cursor: "pointer", fontWeight: dataFilter.length === 0 ? 700 : 400, marginBottom: 4 }}>
                          📋 Todas as datas
                        </button>
                        <div style={{ height: 1, background: "var(--border-color)", margin: "8px 0" }} />
                        {[...new Set(filterEntries(allEntries, "data").map(e => e.data).filter(Boolean))].sort().reverse().map(d => {
                          const isSelected = dataFilter.includes(d);
                          return (
                            <button key={d} type="button" onClick={() => {
                              if (isSelected) {
                                setDataFilter(prev => prev.filter(v => v !== d));
                              } else {
                                setDataFilter(prev => [...prev, d]);
                              }
                            }} style={{ display: "flex", alignItems: "center", width: "100%", padding: "10px 14px", textAlign: "left", background: isSelected ? "rgba(212,175,55,0.15)" : "transparent", border: "none", borderRadius: 8, color: "var(--text-main)", fontSize: 14, cursor: "pointer", fontWeight: isSelected ? 700 : 400, marginBottom: 4 }}>
                              <span style={{ marginRight: 8 }}>📅</span>
                              <span style={{ flex: 1 }}>{formatDateBR(d)}</span>
                              <span>{isSelected ? "✅" : "⬜"}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
                <div className="search-container" style={{ flex: "0 0 auto", width: "auto" }}>
                  <button
                    type="button"
                    onClick={() => setShowFileEventoPopup(true)}
                    className="filter-btn"
                    style={{ width: "auto", gap: 8, padding: "0 14px", color: "#FFF", fontSize: "13px", fontWeight: "600" }}
                  >
                    <span>{fileEventoFilter.length > 0 ? `${fileEventoFilter.length} file(s)` : "File/Evento"}</span>
                  </button>
                  {showFileEventoPopup && (
                    <div onClick={() => setShowFileEventoPopup(false)} style={{ position: "fixed", inset: 0, zIndex: 2000 }}>
                      <div onClick={(e) => e.stopPropagation()} style={{ position: "fixed", top: 5, left: "50%", transform: "translateX(-50%)", background: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: 16, padding: 24, minWidth: 300, maxHeight: "70vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>
                        <h3 style={{ color: "var(--primary)", fontSize: 16, fontWeight: 700, marginBottom: 16, textTransform: "uppercase", letterSpacing: 1 }}>Filtrar por File/Evento</h3>
                        <button type="button" onClick={() => { setFileEventoFilter([]); }} style={{ display: "block", width: "100%", padding: "10px 14px", textAlign: "left", background: fileEventoFilter.length === 0 ? "rgba(212,175,55,0.15)" : "transparent", border: "none", borderRadius: 8, color: "var(--text-main)", fontSize: 14, cursor: "pointer", fontWeight: fileEventoFilter.length === 0 ? 700 : 400, marginBottom: 4 }}>
                          📋 Todos os files/eventos
                        </button>
                        <div style={{ height: 1, background: "var(--border-color)", margin: "8px 0" }} />
                        {[...new Set(filterEntries(allEntries, "fileEvento").map(e => e.file_evento).filter(Boolean))].sort().map(f => {
                          const isSelected = fileEventoFilter.some(v => v.toLowerCase() === f.toLowerCase());
                          return (
                            <button key={f} type="button" onClick={() => {
                              if (isSelected) {
                                setFileEventoFilter(prev => prev.filter(v => v.toLowerCase() !== f.toLowerCase()));
                              } else {
                                setFileEventoFilter(prev => [...prev, f]);
                              }
                            }} style={{ display: "flex", alignItems: "center", width: "100%", padding: "10px 14px", textAlign: "left", background: isSelected ? "rgba(212,175,55,0.15)" : "transparent", border: "none", borderRadius: 8, color: "var(--text-main)", fontSize: 14, cursor: "pointer", fontWeight: isSelected ? 700 : 400, marginBottom: 4 }}>
                              <span style={{ marginRight: 8 }}>📁</span>
                              <span style={{ flex: 1 }}>{f}</span>
                              <span>{isSelected ? "✅" : "⬜"}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
                <div className="search-container" style={{ flex: "0 0 auto", width: "auto" }}>
                  <button
                    type="button"
                    onClick={() => setShowMotoristaPopup(true)}
                    className="filter-btn"
                    style={{ width: "auto", gap: 8, padding: "0 14px", color: "#FFF", fontSize: "13px", fontWeight: "600" }}
                  >
                    <span>{motoristaFilter.length > 0 ? `${motoristaFilter.length} motorista(s)` : "Motorista"}</span>
                  </button>
                  {showMotoristaPopup && (
                    <div onClick={() => setShowMotoristaPopup(false)} style={{ position: "fixed", inset: 0, zIndex: 2000 }}>
                      <div onClick={(e) => e.stopPropagation()} style={{ position: "fixed", top: 5, left: "50%", transform: "translateX(-50%)", background: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: 16, padding: 24, minWidth: 300, maxHeight: "70vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>
                        <h3 style={{ color: "var(--primary)", fontSize: 16, fontWeight: 700, marginBottom: 16, textTransform: "uppercase", letterSpacing: 1 }}>Filtrar por Motorista</h3>
                        <button type="button" onClick={() => { setMotoristaFilter([]); }} style={{ display: "block", width: "100%", padding: "10px 14px", textAlign: "left", background: motoristaFilter.length === 0 ? "rgba(212,175,55,0.15)" : "transparent", border: "none", borderRadius: 8, color: "var(--text-main)", fontSize: 14, cursor: "pointer", fontWeight: motoristaFilter.length === 0 ? 700 : 400, marginBottom: 4 }}>
                          📋 Todos os motoristas
                        </button>
                        <div style={{ height: 1, background: "var(--border-color)", margin: "8px 0" }} />
                        {[...new Set(filterEntries(allEntries, "motorista").map(e => e.motorista).filter(Boolean))].sort().map(m => {
                          const isSelected = motoristaFilter.some(v => v.toLowerCase() === m.toLowerCase());
                          return (
                            <button key={m} type="button" onClick={() => {
                              if (isSelected) {
                                setMotoristaFilter(prev => prev.filter(v => v.toLowerCase() !== m.toLowerCase()));
                              } else {
                                setMotoristaFilter(prev => [...prev, m]);
                              }
                            }} style={{ display: "flex", alignItems: "center", width: "100%", padding: "10px 14px", textAlign: "left", background: isSelected ? "rgba(212,175,55,0.15)" : "transparent", border: "none", borderRadius: 8, color: "var(--text-main)", fontSize: 14, cursor: "pointer", fontWeight: isSelected ? 700 : 400, marginBottom: 4 }}>
                              <span style={{ marginRight: 8 }}>🚗</span>
                              <span style={{ flex: 1 }}>{m}</span>
                              <span>{isSelected ? "✅" : "⬜"}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
                <button type="button" onClick={() => { setFornecedorFilter([]); setFornecedorError(false); setDataFilter([]); setFileEventoFilter([]); setMotoristaFilter([]); }} className="filter-btn" style={{ width: "auto", gap: 8, padding: "0 14px", color: "#ff6b6b", background: "rgba(255,107,107,0.12)", border: "1px solid rgba(255,107,107,0.3)", fontSize: "13px", fontWeight: "600" }}>
                  <span>Limpar</span>
                </button>
                {fornecedorError && <span style={{ color: "#ff6b6b", fontSize: "12px", fontWeight: "600", whiteSpace: "nowrap", display: "flex", alignItems: "center" }}>Escolha um fornecedor.</span>}
                <div className="scroll-hint" style={{ marginLeft: "auto", display: hasHorizontalScroll ? "flex" : "none", alignItems: "center", gap: 8 }}>
                  <span className="scroll-hint-text">← segure e arraste →</span>
                  <span className="scroll-hint-track">
                    <span className="scroll-hint-thumb"></span>
                  </span>
                </div>
              </div>
            <div className="table-responsive spreadsheet-container" ref={tableRef} style={{ cursor: "grab" }}>
              <table className="spreadsheet-table">
                <thead>
                  <tr>
                    <SortHeader label="Fornecedor" sortKey="fornecedor" sortConfig={sortConfig} onSort={handleSort} />
                    <SortHeader label="Nº" sortKey="numero" sortConfig={sortConfig} onSort={handleSort} />
                    <SortHeader label="Data" sortKey="data" sortConfig={sortConfig} onSort={handleSort} />
                    <SortHeader label="Hora" sortKey="hora" sortConfig={sortConfig} onSort={handleSort} />
                    <SortHeader label="Voo" sortKey="voo" sortConfig={sortConfig} onSort={handleSort} />
                    <SortHeader label="Serviço" sortKey="servico" sortConfig={sortConfig} onSort={handleSort} />
                    <SortHeader label="Guia/Contato" sortKey="guia" sortConfig={sortConfig} onSort={handleSort} />
                    <SortHeader label="Nome PAX" sortKey="nome_pax" sortConfig={sortConfig} onSort={handleSort} />
                    <SortHeader label="PAX" sortKey="pax" sortConfig={sortConfig} onSort={handleSort} />
                    <SortHeader label="File/Evento" sortKey="file_evento" sortConfig={sortConfig} onSort={handleSort} />
                    <SortHeader label="Cliente" sortKey="cliente" sortConfig={sortConfig} onSort={handleSort} />
                    <SortHeader label="Observação" sortKey="observacao" sortConfig={sortConfig} onSort={handleSort} />
                    <SortHeader label="Veículo" sortKey="veiculo" sortConfig={sortConfig} onSort={handleSort} />
                    <SortHeader label="Placa" sortKey="placa" sortConfig={sortConfig} onSort={handleSort} />
                    <SortHeader label="Motorista/Contato" sortKey="motorista_contato" sortConfig={sortConfig} onSort={handleSort} />
                    <th style={{ textAlign: "center" }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedEntries.length === 0 ? (
                    <tr>
                      <td colSpan={16} style={{ textAlign: "center", padding: 40, color: "var(--text-placeholder)", fontStyle: "italic" }}>
                        Nenhuma ordem de serviço pendente.
                      </td>
                    </tr>
                  ) : (sortedEntries.map((e, i) => (
                    <tr key={i}>
                      <td style={{ whiteSpace: "nowrap" }}>{e.fornecedor}</td>
                      <td>{e.numero}</td>
                      <td>{formatDateBR(e.data)}</td>
                      <td>{e.hora}</td>
                      <td>{e.voo}</td>
                      <td className="wrap-cell pre-wrap-cell">{e.servico}</td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        {e.nome_guia}
                        {e.tel_guia ? <><br />{e.tel_guia.split(" / ").map((line, i) => (
                          <span key={i}>{i > 0 && <br />}{line}</span>
                        ))}</> : ""}
                      </td>
                      <td className="wrap-cell">{e.nome_pax}</td>
                      <td>{e.pax}</td>
                      <td className="wrap-cell">{e.file_evento || "---"}</td>
                      <td className="wrap-cell">{e.cliente?.nome}</td>
                      <td className="wrap-cell pre-wrap-cell">{e.observacao}</td>
                      <td>{e.veiculo}</td>
                      <td>{e.placa}</td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        {e.motorista}
                        {e.contato_motorista ? <><br />{e.contato_motorista.split(" / ").map((line, i) => (
                          <span key={i}>{i > 0 && <br />}{line}</span>
                        ))}</> : ""}
                      </td>
                       <td className="actions-cell">
                        {selectMode ? (
                          <div style={{ display: "flex", justifyContent: "center" }}>
                            <button type="button" onClick={() => toggleSelectEntry(i)} className={`action-icon-btn select${selectedIds.has(i) ? " selected" : ""}`} title={selectedIds.has(i) ? "Desmarcar" : "Selecionar"} style={selectedIds.has(i) ? { background: "var(--primary)", color: "#000", borderRadius: "50%" } : {}}>
                              {selectedIds.has(i) ? "✓" : ""}
                            </button>
                          </div>
                        ) : (
                          <div className="spreadsheet-actions justify-end" style={{ gap: 4 }}>
                            {onPreviewOS && (
                              <button type="button" onClick={() => onPreviewOS(e)} className="action-icon-btn select" title="Visualizar OS">👁️</button>
                            )}
                            {onDownloadOS && (
                              <button type="button" onClick={() => onDownloadOS(e)} className="action-icon-btn download" title="Baixar OS em PDF">⬇️</button>
                            )}
                          </div>
                        )}
                      </td>

                    </tr>
                  )))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </form>
    </div>
  );
}

const SimulacaoPreview = ({ entries, onBack }) => {
  const wrapperRef = useRef(null);
  const scaleRef = useRef(1);
  const [scale, setScale] = useState(1);

  const calcScale = () => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const newScale = Math.min(1, wrapper.clientWidth / 1123);
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
    const el = document.getElementById("simulacao-pdf");
    if (!el) return;
    el.style.transform = "scale(1)";
    el.style.transformOrigin = "top center";
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        downloadInvoicePDF("simulacao-pdf", "Simulação de Serviços", "l");
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
        <button onClick={onBack} className="back-btn">← Voltar e Editar</button>
        <button onClick={handleDownload} className="download-btn">⬇ Baixar OS em PDF</button>
      </div>
      <div ref={wrapperRef} className="invoice-wrapper">
        <div id="simulacao-pdf" className="os-paper landscape" style={{ transform: `scale(${scale})`, transformOrigin: "top center" }}>
          <div className="os-header">
            <div className="os-brand">
              <span className="os-company">SIMULAÇÃO DE ORDEM DE SERVIÇO</span>
            </div>
          </div>
          <h1 className="os-title">SIMULAÇÃO DE SERVIÇOS</h1>
          <table className="os-table">
            <thead>
                    <tr>
                      <th>Fornecedor</th>
                      <th>Nº</th>
                      <th>Data</th>
                      <th>Hora</th>
                      <th>Voo</th>
                      <th>Serviço</th>
                      <th>Guia/Contato</th>
                      <th>Nome PAX</th>
                      <th>PAX</th>
                      <th>File/Evento</th>
                      <th>Cliente</th>
                      <th>Observação</th>
                      <th>Veículo</th>
                      <th>Placa</th>
                      <th>Motorista/Contato</th>
                    </tr>
            </thead>
            <tbody>
              {entries.map((e, i) => (
                <tr key={i} className="os-data-row">
                  <td>{e.fornecedor || "---"}</td>
                  <td className="os-num">{e.numero || "---"}</td>
                  <td>{formatDateBR(e.data)}</td>
                  <td>{e.hora || "---"}</td>
                  <td>{e.voo || "---"}</td>
                  <td className="os-wide-cell" style={{ whiteSpace: "pre-wrap" }}>{e.servico || "---"}</td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    {e.nome_guia}
                    {e.tel_guia ? <><br />{e.tel_guia}</> : ""}
                  </td>
                  <td>{e.nome_pax || "---"}</td>
                  <td className="os-pax">{e.pax || "0"}</td>
                  <td className="wrap-cell">{e.file_evento || "---"}</td>
                  <td>{e.cliente?.nome || "---"}</td>
                  <td className="os-wide-cell os-obs-cell">{e.observacao || "---"}</td>
                  <td>{e.veiculo || "---"}</td>
                  <td>{e.placa || "---"}</td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    {e.motorista}
                    {e.contato_motorista ? <><br />{e.contato_motorista}</> : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="os-footer">
            <p className="os-thanks">Obrigado pela preferência!</p>
          </div>
        </div>
      </div>
    </div>
  );
};
