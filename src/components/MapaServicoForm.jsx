import { useEffect, useRef, useState } from "react";
import { api } from "../utils/api";
import ConfirmDialog from "./ConfirmDialog";

const formatDateBR = (val) => {
  if (!val) return "";
  const parts = val.split("-");
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return val;
};

const formatPhone = (val) => {
  const digits = val.replace(/\D/g, "").slice(0, 22);
  if (!digits) return "";
  const parts = [];
  let i = 0;
  while (i < digits.length) {
    const remaining = digits.length - i;
    const take = remaining >= 11 ? 11 : remaining >= 10 ? 10 : remaining;
    const chunk = digits.slice(i, i + take);
    if (chunk.length >= 7) {
      parts.push(`${chunk.slice(0, 2)} ${chunk.slice(2, 7)}-${chunk.slice(7)}`);
    } else if (chunk.length > 2) {
      parts.push(`${chunk.slice(0, 2)} ${chunk.slice(2)}`);
    } else {
      parts.push(chunk);
    }
    i += take;
  }
  return parts.join(" / ");
};

const handlePhoneKeyDown = (e, updater) => {
  if (e.key !== "Backspace" && e.key !== "Delete") return;
  const input = e.target;
  const pos = input.selectionStart;
  const val = input.value;

  if (e.key === "Backspace" && pos > 0 && !/\d/.test(val[pos - 1])) {
    e.preventDefault();
    let removeStart = pos - 1;
    while (removeStart > 0 && !/\d/.test(val[removeStart - 1])) removeStart--;
    if (removeStart > 0) removeStart--;
    const newVal = val.slice(0, removeStart) + val.slice(pos);
    const formatted = formatPhone(newVal);
    const newPos = Math.min(removeStart, formatted.length);
    updater(formatted);
    requestAnimationFrame(() => { input.selectionStart = newPos; input.selectionEnd = newPos; });
  } else if (e.key === "Delete" && pos < val.length && !/\d/.test(val[pos])) {
    e.preventDefault();
    let removeEnd = pos + 1;
    while (removeEnd < val.length && !/\d/.test(val[removeEnd])) removeEnd++;
    if (removeEnd < val.length) removeEnd++;
    const newVal = val.slice(0, pos) + val.slice(removeEnd);
    const formatted = formatPhone(newVal);
    const newPos = Math.min(pos, formatted.length);
    updater(formatted);
    requestAnimationFrame(() => { input.selectionStart = newPos; input.selectionEnd = newPos; });
  }
};

const handlePhoneInput = (e, updater) => {
  const input = e.target;
  const formatted = formatPhone(input.value);
  const pos = input.selectionStart;
  const oldLen = input.value.length;
  const newLen = formatted.length;
  let newPos = pos;
  if (newLen > oldLen) newPos = pos + (newLen - oldLen);
  else if (newLen < oldLen) newPos = Math.max(0, pos - (oldLen - newLen));
  newPos = Math.min(newPos, formatted.length);
  updater(formatted);
  requestAnimationFrame(() => { input.selectionStart = newPos; input.selectionEnd = newPos; });
};

const autoResize = (el) => {
  if (!el) return;
  el.style.height = "40px";
  el.style.height = el.scrollHeight + "px";
};

const formatCurrency = (val) => {
  let digits = val.replace(/\D/g, "");
  if (!digits) return "";
  digits = digits.replace(/^0+/, "") || "0";
  while (digits.length < 3) digits = "0" + digits;
  const intPart = digits.slice(0, -2);
  const decPart = digits.slice(-2);
  const formatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${formatted},${decPart}`;
};

const InputField = ({ label, value, onChange, onInput, onKeyDown, onBlur, type = "text", placeholder = "", error = false, inputRef }) => (
  <div className={`input-group${error ? ' input-error' : ''}`}>
    <label className="input-label">{label}</label>
    <input
      ref={inputRef}
      type={type}
      value={value}
      onChange={onChange}
      onInput={onInput}
      onKeyDown={onKeyDown}
      onBlur={onBlur}
      placeholder={placeholder}
      className={`custom-input${error ? ' input-error' : ''}`}
    />
  </div>
);

export default function MapaServicoForm({
  entries, setEntries, clients, vehicles,
  drivers = [],
  onSubmit
}) {
  // Current entry form state
  const [entry, setEntry] = useState({
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
    tel_guia: "",
    veiculo: "",
    placa: "",
    motorista: "",
    valor_pagar: "",
    valor_receber: "",
  });

  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showFinanceiro, setShowFinanceiro] = useState(false);
  const [fornecedorFilter, setFornecedorFilter] = useState([]);
  const [fileEventoFilter, setFileEventoFilter] = useState([]);
  const [motoristaFilter, setMotoristaFilter] = useState([]);
  const [dataFilter, setDataFilter] = useState([]);
  const [showFornecedorPopup, setShowFornecedorPopup] = useState(false);
  const [showFileEventoPopup, setShowFileEventoPopup] = useState(false);
  const [showMotoristaPopup, setShowMotoristaPopup] = useState(false);
  const [showDatePopup, setShowDatePopup] = useState(false);

  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [loading, setLoading] = useState(true);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const servicoRef = useRef(null);
  const observacaoRef = useRef(null);
  const formRef = useRef(null);
  const fornecedorRef = useRef(null);
  const numeroRef = useRef(null);
  const dataRef = useRef(null);

  useEffect(() => {
    autoResize(servicoRef.current);
    autoResize(observacaoRef.current);
  }, [entry.servico, entry.observacao]);

  useEffect(() => {
    api.get("/api/agenda").then(data => {
      setEntries(data);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

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

  const updateEntryOs = (field, value) => {
    setEntry(prev => ({ ...prev, os: { ...prev.os, [field]: value } }));
  };

  const updateEntryClient = (field, value) => {
    setEntry(prev => ({ ...prev, cliente: { ...prev.cliente, [field]: value } }));
  };

  // Cliente autocomplete
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

  // Veículo autocomplete
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
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedVehicleIndex(prev => (prev < filteredVehicles.length - 1 ? prev + 1 : prev));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedVehicleIndex(prev => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === "Enter") {
      if (focusedVehicleIndex >= 0) {
        e.preventDefault();
        selectVehicle(filteredVehicles[focusedVehicleIndex]);
      }
    } else if (e.key === "Escape") {
      setShowVehicleSuggestions(false);
      setFocusedVehicleIndex(-1);
    }
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

  const [formErrors, setFormErrors] = useState({ fornecedor: false, numero: false, data: false });

  const addOrUpdateEntry = async () => {
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
    const pagar = parseFloat((entry.valor_pagar || "0").replace(/\./g, "").replace(",", ".")) || 0;
    const receber = parseFloat((entry.valor_receber || "0").replace(/\./g, "").replace(",", ".")) || 0;
    const entryWithLucro = { ...entry, lucro: receber - pagar };
    if (editingId) {
      try {
        const updated = await api.put(`/api/agenda/${editingId}`, entryWithLucro);
        setEntries(prev => prev.map(e => e.id === editingId ? updated : e));
        setEditingId(null);
        setShowForm(false);
      } catch (err) {
        console.error("Erro ao atualizar agendamento:", err);
        return;
      }
    } else {
      try {
        const created = await api.post("/api/agenda", entryWithLucro);
        setEntries(prev => [...prev, created]);
      } catch (err) {
        console.error("Erro ao salvar agendamento:", err);
        return;
      }
    }
    setEntry({
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
      valor_pagar: "",
      valor_receber: "",
    });
  };


  const editEntry = (item) => {
    setEntry({
      fornecedor: item.fornecedor || "",
      numero: item.numero || "",
      data: item.data || "",
      hora: item.hora || "",
      voo: item.voo || "",
      servico: item.servico || "",
      nome_guia: item.nome_guia || "",
      tel_guia: item.tel_guia || "",
      nome_pax: item.nome_pax || "",
      pax: item.pax || "",
      file_evento: item.file_evento || "",
      cliente: item.cliente || { nome: "", documento: "", email: "", endereco: "" },
      observacao: item.observacao || "",
      veiculo: item.veiculo || "",
      placa: item.placa || "",
      motorista: item.motorista || "",
      contato_motorista: item.contato_motorista || "",
      valor_pagar: item.valor_pagar || "",
      valor_receber: item.valor_receber || "",
    });
    setEditingId(item.id);
    setShowForm(true);
    setTimeout(() => {
      if (formRef.current) formRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  const removeEntry = async (id) => {
    try {
      await api.del(`/api/agenda/${id}`);
      setEntries(prev => prev.filter(e => e.id !== id));
      if (editingId === id) {
        setEditingId(null);
        setShowForm(false);
        setEntry({
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
          valor_pagar: "",
          valor_receber: "",
        });
      }
    } catch (err) {
      console.error("Erro ao remover agendamento:", err);
    }
  };

  const filterEntries = (entries, exclude) => entries.filter(e => {
    const matchesFornecedor = exclude === "fornecedor" || fornecedorFilter.length === 0 ||
      fornecedorFilter.some(f => (e.fornecedor || "").toLowerCase() === f.toLowerCase());
    const matchesFileEvento = exclude === "fileEvento" || fileEventoFilter.length === 0 ||
      fileEventoFilter.some(f => (e.file_evento || "").toLowerCase() === f.toLowerCase());
    const matchesMotorista = exclude === "motorista" || motoristaFilter.length === 0 ||
      motoristaFilter.some(m => (e.motorista || "").toLowerCase() === m.toLowerCase());
    const matchesData = exclude === "data" || dataFilter.length === 0 ||
      dataFilter.some(d => (e.data || "") === d);
    return matchesFornecedor && matchesFileEvento && matchesMotorista && matchesData;
  });

  const filteredEntries = filterEntries(entries);

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
    if (key === "valor_pagar" || key === "valor_receber" || key === "lucro") {
      const val = e[key];
      if (val === null || val === undefined || val === "") return "0";
      return String(val).replace(/\./g, "").replace(",", ".");
    }
    return (e[key] || "").toString().toLowerCase();
  };

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

  const SortHeader = ({ label, sortKey, style }) => (
    <th onClick={() => handleSort(sortKey)} style={{ cursor: "pointer", userSelect: "none", ...style }}>
      {label}
    </th>
  );

  if (loading) {
    return (
      <div className="invoice-form-container" style={{ textAlign: "center", padding: 60 }}>
        <p style={{ color: "var(--text-placeholder)", fontSize: 14 }}>Carregando agenda...</p>
      </div>
    );
  }

  return (
    <div className="invoice-form-container">
      <form onSubmit={(e) => { e.preventDefault(); }}>
        {/* NOVO SERVIÇO BUTTON (when no entries yet) */}
        {!showForm && entries.length === 0 && (
          <div className="form-actions-standard" style={{ marginBottom: 16 }}>
            <button type="button" onClick={() => { setShowForm(true); setEditingId(null); setEntry({ fornecedor: "", numero: "", data: "", hora: "", voo: "", servico: "", nome_guia: "", tel_guia: "", nome_pax: "", pax: "", file_evento: "", cliente: { nome: "", documento: "", email: "", endereco: "" }, observacao: "", veiculo: "", placa: "", motorista: "", contato_motorista: "", valor_pagar: "", valor_receber: "" }); }} className="submit-btn">
              Agendar Serviço
            </button>
          </div>
        )}

        {/* CURRENT ENTRY FORM */}
        {showForm && (
        <section className="section-card" ref={formRef}>
          <h3 className="section-title">{editingId ? "Editando Serviço" : "Novo Serviço"}</h3>
          <div className="mapa-top-grid">
            <InputField label="Fornecedor" value={entry.fornecedor} onChange={(e) => { updateEntry("fornecedor", e.target.value); setFormErrors(prev => ({ ...prev, fornecedor: false })); }} placeholder="Nome do fornecedor" error={formErrors.fornecedor} inputRef={fornecedorRef} />
            <InputField label="Nº" value={entry.numero} onChange={(e) => { updateEntry("numero", e.target.value); setFormErrors(prev => ({ ...prev, numero: false })); }} placeholder="Número" error={formErrors.numero} inputRef={numeroRef} />
            <div className={`input-group${formErrors.data ? ' input-error' : ''}`}>
              <label className="input-label">Data</label>
              <input ref={dataRef} type="date" value={entry.data} onChange={(e) => { updateEntry("data", e.target.value); setFormErrors(prev => ({ ...prev, data: false })); }} className="custom-input" />
            </div>
            <InputField label="Hora" type="time" value={entry.hora} onChange={(e) => updateEntry("hora", e.target.value)} placeholder="00:00" />
            <InputField label="Voo" value={entry.voo} onChange={(e) => updateEntry("voo", e.target.value)} placeholder="Ex: B2010" />
          </div>
            <div className="section-grid">
              <div className="form-row-single">
              <div className="input-group">
                <label className="input-label">Serviço</label>
                <textarea ref={servicoRef} value={entry.servico} onChange={(e) => updateEntry("servico", e.target.value)} onInput={() => autoResize(servicoRef.current)} placeholder="Tipo de serviço" className="custom-input" />
              </div>
            </div>
              <div className="form-row-3">
                <div style={{ flex: 1 }}><InputField label="Nome do Guia" value={entry.nome_guia} onChange={(e) => updateEntry("nome_guia", e.target.value)} placeholder="Nome do guia" /></div>
                <div style={{ flex: 1 }}><InputField label="Contato do Guia" value={entry.tel_guia} onKeyDown={(e) => handlePhoneKeyDown(e, (v) => updateEntry("tel_guia", v))} onInput={(e) => handlePhoneInput(e, (v) => updateEntry("tel_guia", v))} placeholder="Ex: 21 99292-1544 / 21 98985-5252" /></div>
                <div style={{ flex: 1 }}><InputField label="Nome do PAX" value={entry.nome_pax} onChange={(e) => updateEntry("nome_pax", e.target.value)} placeholder="Nome do passageiro" /></div>
                <div style={{ flex: 1 }}><InputField label="PAX" value={entry.pax} onChange={(e) => updateEntry("pax", e.target.value)} placeholder="Nº de passageiros" /></div>
              </div>
            <div className="form-row-3">
              <div style={{ flex: 1 }}><InputField label="File / Evento" value={entry.file_evento} onChange={(e) => updateEntry("file_evento", e.target.value)} placeholder="File ou evento" /></div>
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
                <textarea ref={observacaoRef} value={entry.observacao} onChange={(e) => updateEntry("observacao", e.target.value)} onInput={() => autoResize(observacaoRef.current)} placeholder="Observações" className="custom-input" />
              </div>
            </div>
              <div className="form-row-3">
                <div className="relative-container" style={{ flex: 1.2 }}>
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
                <div style={{ flex: 0.8 }}><InputField label="Placa" value={entry.placa} onChange={(e) => updateEntry("placa", e.target.value.toUpperCase())} placeholder="Ex: ABC-1234" /></div>
                <div className="relative-container" style={{ flex: 1.2 }}>
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
                <div style={{ flex: 1.2 }}><InputField label="Contato Motorista" value={entry.contato_motorista} onKeyDown={(e) => handlePhoneKeyDown(e, (v) => updateEntry("contato_motorista", v))} onInput={(e) => handlePhoneInput(e, (v) => updateEntry("contato_motorista", v))} placeholder="Ex: 21 99292-1544 / 21 98985-5252" /></div>
                <div style={{ flex: 0.6 }}>
                  <div className="input-group">
                    <label className="input-label">A Pagar</label>
                    <input type="text" value={entry.valor_pagar} onChange={(e) => updateEntry("valor_pagar", formatCurrency(e.target.value))} placeholder="R$ 0,00" className="custom-input" />
                  </div>
                </div>
                <div style={{ flex: 0.6 }}>
                  <div className="input-group">
                    <label className="input-label">A Receber</label>
                    <input type="text" value={entry.valor_receber} onChange={(e) => updateEntry("valor_receber", formatCurrency(e.target.value))} placeholder="R$ 0,00" className="custom-input" />
                  </div>
                </div>
                <div style={{ flex: 0.6 }}>
                  <div className="input-group">
                    <label className="input-label">Lucro</label>
                    <div 
                      className="custom-input" 
                      style={{ 
                        display: "flex", 
                        alignItems: "center", 
                        justifyContent: "space-between",
                        padding: "0 12px",
                        height: "40px",
                        backgroundColor: "var(--bg-input)",
                        border: "1px solid var(--input-border)",
                        borderRadius: "8px",
                        fontSize: "14px",
                        fontWeight: 700,
                        boxSizing: "border-box"
                      }}
                    >
                      <span style={{ color: "var(--text-secondary)", fontSize: "12px" }}>R$</span>
                      <span style={{ 
                        color: (() => {
                          const pagar = parseFloat((entry.valor_pagar || "0").replace(/\./g, "").replace(",", ".")) || 0;
                          const receber = parseFloat((entry.valor_receber || "0").replace(/\./g, "").replace(",", ".")) || 0;
                          const diff = receber - pagar;
                          return diff >= 0 ? "#22c55e" : "#ef4444";
                        })()
                      }}>
                        {(() => {
                          const pagar = parseFloat((entry.valor_pagar || "0").replace(/\./g, "").replace(",", ".")) || 0;
                          const receber = parseFloat((entry.valor_receber || "0").replace(/\./g, "").replace(",", ".")) || 0;
                          const diff = receber - pagar;
                          const abs = Math.abs(diff);
                          const formatted = abs.toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
                          return diff >= 0 ? `+ ${formatted}` : `- ${formatted}`;
                        })()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
          </div>
          <div className="form-actions-standard" style={{ marginTop: 12 }}>
            <button type="button" onClick={addOrUpdateEntry} className="submit-btn">
              {editingId ? "Atualizar" : "Adicionar"}
            </button>
            <button type="button" onClick={() => { setEditingId(null); setShowForm(false); setEntry({ fornecedor: "", numero: "", data: "", hora: "", voo: "", servico: "", nome_guia: "", tel_guia: "", nome_pax: "", pax: "", file_evento: "", cliente: { nome: "", documento: "", email: "", endereco: "" }, observacao: "", veiculo: "", placa: "", motorista: "", contato_motorista: "", valor_pagar: "", valor_receber: "" }); }} className="back-btn" style={{ marginLeft: 8 }}>
              Cancelar
            </button>
          </div>
        </section>
        )}

        {/* ENTRIES TABLE */}
        {entries.length > 0 && (
          <section className="section-card">
            <div className="clients-list-container">
              <div className="modal-header-row">
                <h3 className="section-title" style={{ margin: 0 }}>Serviços Agendados</h3>
                <span className="table-count-header">
                  {sortedEntries.length < entries.length
                    ? `${sortedEntries.length} de ${entries.length}`
                    : `${entries.length}`} serviço{entries.length !== 1 ? "s" : ""}
                </span>

                <div style={{ display: "flex", gap: 8, marginLeft: "auto", alignItems: "center" }}>
                  <button 
                    type="button" 
                    onClick={() => setShowFinanceiro(prev => !prev)} 
                    className="action-tab-btn" 
                    style={{ 
                      color: showFinanceiro ? "var(--primary)" : "inherit", 
                      borderColor: showFinanceiro ? "var(--primary)" : "inherit" 
                    }}
                  >
                    R$
                  </button>
                  <button type="button" onClick={() => onSubmit(sortedEntries)} className="action-tab-btn" style={{ whiteSpace: "nowrap" }}>
                    Gerar Mapa
                  </button>
                  <button type="button" onClick={() => { setShowForm(true); setEditingId(null); setEntry({ fornecedor: "", numero: "", data: "", hora: "", voo: "", servico: "", nome_guia: "", tel_guia: "", nome_pax: "", pax: "", file_evento: "", cliente: { nome: "", documento: "", email: "", endereco: "" }, observacao: "", veiculo: "", placa: "", motorista: "", contato_motorista: "", valor_pagar: "", valor_receber: "" }); }} className="action-tab-btn">
                    Agendar Serviço
                  </button>
                </div>
              </div>
              <div style={{ display: "flex", gap: 4, maxWidth: "100%" }}>
                <div className="search-container" style={{ flex: "0 0 220px" }}>
                  <button
                    type="button"
                    onClick={() => setShowFornecedorPopup(true)}
                    className="search-input"
                    style={{ textAlign: "left", cursor: "pointer", height: 44, display: "flex", alignItems: "center", justifyContent: "space-between" }}
                  >
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{fornecedorFilter.length > 0 ? `${fornecedorFilter.length} fornecedor(es)` : "Fornecedor"}</span>
                    <span style={{ fontSize: 10, color: "var(--text-placeholder)", flexShrink: 0 }}>▼</span>
                  </button>
                  {showFornecedorPopup && (
                    <div onClick={() => setShowFornecedorPopup(false)} style={{ position: "fixed", inset: 0, zIndex: 2000 }}>
                      <div onClick={(e) => e.stopPropagation()} style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", background: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: 16, padding: 24, minWidth: 300, maxHeight: "70vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>
                        <h3 style={{ color: "var(--primary)", fontSize: 16, fontWeight: 700, marginBottom: 16, textTransform: "uppercase", letterSpacing: 1 }}>Filtrar por Fornecedor</h3>
                        <button type="button" onClick={() => { setFornecedorFilter([]); }} style={{ display: "block", width: "100%", padding: "10px 14px", textAlign: "left", background: fornecedorFilter.length === 0 ? "rgba(212,175,55,0.15)" : "transparent", border: "none", borderRadius: 8, color: "var(--text-main)", fontSize: 14, cursor: "pointer", fontWeight: fornecedorFilter.length === 0 ? 700 : 400, marginBottom: 4 }}>
                          📋 Todos os fornecedores
                        </button>
                        <div style={{ height: 1, background: "var(--border-color)", margin: "8px 0" }} />
                        {[...new Set(filterEntries(entries, "fornecedor").map(e => e.fornecedor).filter(Boolean))].sort().map(f => {
                          const isSelected = fornecedorFilter.some(v => v.toLowerCase() === f.toLowerCase());
                          return (
                            <button key={f} type="button" onClick={() => {
                              if (isSelected) {
                                setFornecedorFilter(prev => prev.filter(v => v.toLowerCase() !== f.toLowerCase()));
                              } else {
                                setFornecedorFilter(prev => [...prev, f]);
                              }
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
                <div className="search-container" style={{ flex: "0 0 150px" }}>
                  <button
                    type="button"
                    onClick={() => setShowDatePopup(true)}
                    className="search-input"
                    style={{ textAlign: "left", cursor: "pointer", height: 44, display: "flex", alignItems: "center", justifyContent: "space-between" }}
                  >
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{dataFilter.length > 0 ? `${dataFilter.length} data(s)` : "Data"}</span>
                    <span style={{ fontSize: 10, color: "var(--text-placeholder)", flexShrink: 0 }}>▼</span>
                  </button>
                  {showDatePopup && (
                    <div onClick={() => setShowDatePopup(false)} style={{ position: "fixed", inset: 0, zIndex: 2000 }}>
                      <div onClick={(e) => e.stopPropagation()} style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", background: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: 16, padding: 24, minWidth: 300, maxHeight: "70vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>
                        <h3 style={{ color: "var(--primary)", fontSize: 16, fontWeight: 700, marginBottom: 16, textTransform: "uppercase", letterSpacing: 1 }}>Filtrar por Data</h3>
                        <button type="button" onClick={() => { setDataFilter([]); }} style={{ display: "block", width: "100%", padding: "10px 14px", textAlign: "left", background: dataFilter.length === 0 ? "rgba(212,175,55,0.15)" : "transparent", border: "none", borderRadius: 8, color: "var(--text-main)", fontSize: 14, cursor: "pointer", fontWeight: dataFilter.length === 0 ? 700 : 400, marginBottom: 4 }}>
                          📋 Todas as datas
                        </button>
                        <div style={{ height: 1, background: "var(--border-color)", margin: "8px 0" }} />
                        {[...new Set(filterEntries(entries, "data").map(e => e.data).filter(Boolean))].sort().reverse().map(d => {
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
                <div className="search-container" style={{ flex: "0 0 150px" }}>
                  <button
                    type="button"
                    onClick={() => setShowFileEventoPopup(true)}
                    className="search-input"
                    style={{ textAlign: "left", cursor: "pointer", height: 44, display: "flex", alignItems: "center", justifyContent: "space-between" }}
                  >
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{fileEventoFilter.length > 0 ? `${fileEventoFilter.length} file(s)` : "File/Evento"}</span>
                    <span style={{ fontSize: 10, color: "var(--text-placeholder)", flexShrink: 0 }}>▼</span>
                  </button>
                  {showFileEventoPopup && (
                    <div onClick={() => setShowFileEventoPopup(false)} style={{ position: "fixed", inset: 0, zIndex: 2000 }}>
                      <div onClick={(e) => e.stopPropagation()} style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", background: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: 16, padding: 24, minWidth: 300, maxHeight: "70vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>
                        <h3 style={{ color: "var(--primary)", fontSize: 16, fontWeight: 700, marginBottom: 16, textTransform: "uppercase", letterSpacing: 1 }}>Filtrar por File/Evento</h3>
                        <button type="button" onClick={() => { setFileEventoFilter([]); }} style={{ display: "block", width: "100%", padding: "10px 14px", textAlign: "left", background: fileEventoFilter.length === 0 ? "rgba(212,175,55,0.15)" : "transparent", border: "none", borderRadius: 8, color: "var(--text-main)", fontSize: 14, cursor: "pointer", fontWeight: fileEventoFilter.length === 0 ? 700 : 400, marginBottom: 4 }}>
                          📋 Todos os files/eventos
                        </button>
                        <div style={{ height: 1, background: "var(--border-color)", margin: "8px 0" }} />
                        {[...new Set(filterEntries(entries, "fileEvento").map(e => e.file_evento).filter(Boolean))].sort().map(f => {
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
                <div className="search-container" style={{ flex: "0 0 150px" }}>
                  <button
                    type="button"
                    onClick={() => setShowMotoristaPopup(true)}
                    className="search-input"
                    style={{ textAlign: "left", cursor: "pointer", height: 44, display: "flex", alignItems: "center", justifyContent: "space-between" }}
                  >
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{motoristaFilter.length > 0 ? `${motoristaFilter.length} motorista(s)` : "Motorista"}</span>
                    <span style={{ fontSize: 10, color: "var(--text-placeholder)", flexShrink: 0 }}>▼</span>
                  </button>
                  {showMotoristaPopup && (
                    <div onClick={() => setShowMotoristaPopup(false)} style={{ position: "fixed", inset: 0, zIndex: 2000 }}>
                      <div onClick={(e) => e.stopPropagation()} style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", background: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: 16, padding: 24, minWidth: 300, maxHeight: "70vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>
                        <h3 style={{ color: "var(--primary)", fontSize: 16, fontWeight: 700, marginBottom: 16, textTransform: "uppercase", letterSpacing: 1 }}>Filtrar por Motorista</h3>
                        <button type="button" onClick={() => { setMotoristaFilter([]); }} style={{ display: "block", width: "100%", padding: "10px 14px", textAlign: "left", background: motoristaFilter.length === 0 ? "rgba(212,175,55,0.15)" : "transparent", border: "none", borderRadius: 8, color: "var(--text-main)", fontSize: 14, cursor: "pointer", fontWeight: motoristaFilter.length === 0 ? 700 : 400, marginBottom: 4 }}>
                          📋 Todos os motoristas
                        </button>
                        <div style={{ height: 1, background: "var(--border-color)", margin: "8px 0" }} />
                        {[...new Set(filterEntries(entries, "motorista").map(e => e.motorista).filter(Boolean))].sort().map(m => {
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
                <button type="button" onClick={() => { setFornecedorFilter([]); setFileEventoFilter([]); setMotoristaFilter([]); setDataFilter([]); }} style={{ fontSize: 12, padding: "0 14px", height: 44, background: "var(--bg-input)", border: "1px solid var(--border-color)", borderRadius: 20, cursor: "pointer", color: "var(--text-main)", whiteSpace: "nowrap", flexShrink: 0 }}>
                  Limpar Filtro
                </button>
              </div>
              <div className="table-responsive spreadsheet-container">
                <table className="spreadsheet-table">
                  <thead>
                    <tr>
                      <SortHeader label="Fornecedor" sortKey="fornecedor" />
                      <SortHeader label="Nº" sortKey="numero" />
                      <SortHeader label="Data" sortKey="data" />
                      <SortHeader label="Hora" sortKey="hora" />
                      <SortHeader label="Voo" sortKey="voo" />
                      <SortHeader label="Serviço" sortKey="servico" />
                      <SortHeader label="Guia/Contato" sortKey="guia" />
                      <SortHeader label="Nome PAX" sortKey="nome_pax" />
                      <SortHeader label="PAX" sortKey="pax" />
                      <SortHeader label="File/Evento" sortKey="file_evento" />
                      <SortHeader label="Cliente" sortKey="cliente" />
                      <SortHeader label="Observação" sortKey="observacao" />
                      <SortHeader label="Veículo" sortKey="veiculo" />
                      <SortHeader label="Placa" sortKey="placa" />
                      <SortHeader label="Motorista/Contato" sortKey="motorista_contato" />
                      {showFinanceiro && <SortHeader label="A Pagar" sortKey="valor_pagar" />}
                      {showFinanceiro && <SortHeader label="A Receber" sortKey="valor_receber" />}
                      {showFinanceiro && <SortHeader label="Lucro" sortKey="lucro" />}
                      <th style={{ textAlign: "center" }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedEntries.length === 0 ? (
                      <tr>
                        <td colSpan={showFinanceiro ? 19 : 16} style={{ textAlign: "center", padding: 40, color: "var(--text-placeholder)", fontStyle: "italic" }}>
                          Nenhum serviço encontrado para este filtro.
                        </td>
                      </tr>
                    ) : (sortedEntries.map((e, i) => (
                      <tr key={i} style={e.concluido ? { opacity: 0.7, backgroundColor: "rgba(76, 175, 80, 0.06)", color: "var(--primary)" } : {}}>
                        <td style={{ whiteSpace: "nowrap" }}>{e.fornecedor}</td>
                        <td>{e.numero}</td>
                        <td>{formatDateBR(e.data)}</td>
                        <td>{e.hora}</td>
                        <td>{e.voo}</td>
                        <td className="wrap-cell pre-wrap-cell">{e.servico}</td>
                        <td style={{ whiteSpace: "nowrap" }}>
                          {e.nome_guia}<br />
                          {e.tel_guia ? e.tel_guia.split(" / ").map((line, i) => (
                            <span key={i}>{i > 0 && <br />}{line}</span>
                          )) : ""}
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
                        {showFinanceiro && <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>{e.valor_pagar && e.valor_pagar !== "0" && e.valor_pagar !== "" ? `R$ ${Number(String(e.valor_pagar).replace(/\./g, "").replace(",", ".")).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "---"}</td>}
                        {showFinanceiro && <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>{e.valor_receber && e.valor_receber !== "0" && e.valor_receber !== "" ? `R$ ${Number(String(e.valor_receber).replace(/\./g, "").replace(",", ".")).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "---"}</td>}
                        {showFinanceiro && <td style={{ textAlign: "right", whiteSpace: "nowrap", color: e.lucro < 0 ? "#d32f2f" : "#2e7d32" }}>{e.lucro ? `R$ ${Number(e.lucro).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "---"}</td>}
                        <td className="actions-cell">
                          <div className="spreadsheet-actions justify-end">
                            <button type="button" onClick={() => editEntry(e)} className="action-icon-btn edit" title="Editar">✎</button>
                            <button type="button" onClick={() => setConfirmDeleteId(e.id)} className="action-icon-btn delete" title="Remover">🗑</button>
                          </div>
                        </td>
                      </tr>
                    )))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

      </form>
      {confirmDeleteId !== null && (
        <ConfirmDialog
          message="Tem certeza que deseja excluir este agendamento?"
          onConfirm={() => { removeEntry(confirmDeleteId); setConfirmDeleteId(null); }}
          onCancel={() => setConfirmDeleteId(null)}
        />
      )}
    </div>
  );
}
