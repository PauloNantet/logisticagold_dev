import { useState, useMemo, useEffect } from "react";
import InvoiceForm from "./components/InvoiceForm";
import InvoicePreview from "./components/InvoicePreview";
import ServiceOrderForm from "./components/ServiceOrderForm";
import ServiceOrderPreview from "./components/ServiceOrderPreview";
import MapaServicoForm from "./components/MapaServicoForm";
import MapaServicoPreview from "./components/MapaServicoPreview";
import MapasHistoryModal from "./components/MapasHistoryModal";
import SettingsModal from "./components/SettingsModal";
import ClientsModal from "./components/ClientsModal";
import ServicesModal from "./components/ServicesModal";
import VehiclesModal from "./components/VehiclesModal";
import HistoryModal from "./components/HistoryModal";
import ServiceOrderHistoryModal from "./components/ServiceOrderHistoryModal";
import SimulacaoOSModal from "./components/SimulacaoOSModal";
import DriversModal from "./components/DriversModal";
import LoginModal from "./components/LoginModal";
import AdminPanel from "./components/AdminPanel";
import AccountSettings from "./components/AccountSettings";
import OrcamentoForm from "./components/OrcamentoForm";
import OrcamentoPreview from "./components/OrcamentoPreview";
import OrcamentoHistoryModal from "./components/OrcamentoHistoryModal";
import { generateQrCode, downloadInvoicePDF } from "./utils/invoice";
import { isLoggedIn, logoutUser, getCurrentUser, isAdmin, fetchMe } from "./utils/auth";
import { api } from "./utils/api";

const getToday = () => {
  const d = new Date();
  return d.toISOString().split('T')[0];
};

const getNextInvoiceNumber = (history) => {
  if (!history || history.length === 0) return "1";
  const numbers = history.map(item => {
    const parts = item.numero.split("/");
    return parseInt(parts[0]) || 0;
  });
  const maxNumber = Math.max(...numbers, 0);
  return (maxNumber + 1).toString();
};

const INITIAL_DATA_TEMPLATE = {
  fatura: { numero: "", data: getToday(), vencimento: "" },
  cliente: { nome: "", documento: "", email: "", endereco: "" },
  responsavel: { nome: "", telefone: "", telefoneCustom: false, email: "" },
  itens: [{ produto: "", descricao: "", valor: "", quantidade: "1" }],
  desconto: { tipo: "porcentagem", valor: "" },
  imposto: { tipo: "porcentagem", valor: "" },
  observacoes: "",
};

const INITIAL_OS_TEMPLATE = {
  os: { numero: "", data: getToday(), hora: "", voo: "" },
  cliente: { nome: "", documento: "", email: "", endereco: "" },
  servico: "",
  nome_guia: "",
  nome_pax: "",
  pax: "",
  file_evento: "",
  observacao: "",
  veiculo: "",
  placa: "",
  motorista: "",
};

const INITIAL_ORCAMENTO_TEMPLATE = {
  orcamento: { numero: "", data: getToday(), validade: "30" },
  cliente: { nome: "", documento: "", email: "", endereco: "" },
  responsavel: { nome: "", telefone: "", telefoneCustom: false, email: "" },
  itens: [{ descricao: "", valor: "", quantidade: "1" }],
  desconto: { tipo: "porcentagem", valor: "" },
  imposto: { tipo: "porcentagem", valor: "" },
  observacoes: "",
};

function AuthenticatedApp({ onLogout }) {
  const [activeTab, setActiveTab] = useState("mapa");
  const [clients, setClients] = useState([]);
  const [services, setServices] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [history, setHistory] = useState([]);
  const [osHistory, setOsHistory] = useState([]);
  const [mapaEntries, setMapaEntries] = useState([]);
  const [mapaPreviewEntries, setMapaPreviewEntries] = useState([]);
  const [osPreviewEntries, setOsPreviewEntries] = useState([]);
  const [mapaHistory, setMapaHistory] = useState([]);
  const [orcamentoHistory, setOrcamentoHistory] = useState([]);
  const [orcamentoPreviewEntries, setOrcamentoPreviewEntries] = useState([]);
  const [savedSettings, setSavedSettings] = useState({ empresa: {}, pagamento: {}, tema: "white" });
  const [data, setData] = useState(() => ({
    ...INITIAL_DATA_TEMPLATE,
    empresa: {},
    pagamento: {},
    tema: "white"
  }));
  const [osData, setOsData] = useState(() => ({
    ...INITIAL_OS_TEMPLATE,
    empresa: {},
    pagamento: {},
    tema: "white"
  }));
  const [orcamentoData, setOrcamentoData] = useState(() => ({
    ...INITIAL_ORCAMENTO_TEMPLATE,
    empresa: {},
    pagamento: {},
    tema: "white"
  }));
  const [loading, setLoading] = useState(true);

  const [showAdmin, setShowAdmin] = useState(false);
  const [showAccountSettings, setShowAccountSettings] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showClients, setShowClients] = useState(false);
  const [showServices, setShowServices] = useState(false);
  const [showVehicles, setShowVehicles] = useState(false);
  const [showDrivers, setShowDrivers] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showOSHistory, setShowOSHistory] = useState(false);
  const [showSimulacaoOS, setShowSimulacaoOS] = useState(false);
  const [showMapaHistory, setShowMapaHistory] = useState(false);
  const [showOrcamentoHistory, setShowOrcamentoHistory] = useState(false);
  const [preview, setPreview] = useState(false);
  const [osPreview, setOsPreview] = useState(false);
  const [mapaPreview, setMapaPreview] = useState(false);
  const [orcamentoPreview, setOrcamentoPreview] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [osIsLocked, setOsIsLocked] = useState(false);
  const [mapaIsLocked, setMapaIsLocked] = useState(false);
  const [orcamentoIsLocked, setOrcamentoIsLocked] = useState(false);
  const [restoredEntries, setRestoredEntries] = useState([]);
  const [isManualOSFlow, setIsManualOSFlow] = useState(false);
  const [osPreviewSource, setOsPreviewSource] = useState(null);
  const [simulacaoOSData, setSimulacaoOSData] = useState(() => {
    try {
      const saved = localStorage.getItem("fatura_simulacao_os");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [qrCode, setQrCode] = useState("");
  const [fieldErrors, setFieldErrors] = useState({
    clienteNome: false, clienteDocumento: false, clienteEmail: false, clienteEndereco: false,
    responsavelNome: false, responsavelTelefone: false,
    dataEmissao: false, dataVencimento: false, itens: false, faturaNumero: false,
  });
  const [osFieldErrors, setOsFieldErrors] = useState({
    numero: false, data: false, hora: false, voo: false, servico: false,
    nomeGuia: false, nomePax: false, pax: false, fileEvento: false,
    clienteNome: false, observacao: false, veiculo: false, placa: false, motorista: false,
  });
  const [scrollToError, setScrollToError] = useState(0);
  const [osScrollToError, setOsScrollToError] = useState(0);
  const [orcamentoFieldErrors, setOrcamentoFieldErrors] = useState({
    clienteNome: false, clienteDocumento: false, clienteEmail: false, clienteEndereco: false,
    responsavelNome: false, responsavelTelefone: false,
    dataEmissao: false, itens: false, orcamentoNumero: false,
  });
  const [orcamentoScrollToError, setOrcamentoScrollToError] = useState(0);

  const user = getCurrentUser();

  useEffect(() => {
    async function loadAll() {
      try {
        const [c, s, v, d, h, settings, os, mapas, orcs] = await Promise.all([
          api.get("/api/clients"),
          api.get("/api/services"),
          api.get("/api/vehicles"),
          api.get("/api/drivers"),
          api.get("/api/history"),
          api.get("/api/settings"),
          api.get("/api/service-orders"),
          api.get("/api/mapas"),
          api.get("/api/orcamentos"),
        ]);
        setClients(c);
        setServices(s);
        setVehicles(v);
        setDrivers(d);
        setHistory(h);
        setOsHistory(os);
        setMapaHistory(mapas);
        setOrcamentoHistory(orcs);
        setSavedSettings(settings);
        setData(prev => ({
          ...prev,
          empresa: settings.empresa || {},
          pagamento: settings.pagamento || {},
          tema: settings.tema || "white"
        }));
        setOsData(prev => ({
          ...prev,
          empresa: settings.empresa || {},
          pagamento: settings.pagamento || {},
          tema: settings.tema || "white"
        }));
        setOrcamentoData(prev => ({
          ...prev,
          empresa: settings.empresa || {},
          pagamento: settings.pagamento || {},
          tema: settings.tema || "white"
        }));
      } catch (err) {
        console.error("Erro ao carregar dados:", err);
      }
      setLoading(false);
    }
    loadAll();
  }, []);

  useEffect(() => {
    document.body.dataset.theme = data.tema;
  }, [data.tema]);

  useEffect(() => {
    try {
      localStorage.setItem("fatura_simulacao_os", JSON.stringify(simulacaoOSData));
    } catch {}
  }, [simulacaoOSData]);

  // ---- FATURA LOGIC ----
  const total = useMemo(() => {
    try {
      return data.itens.reduce((acc, item) => {
        const v = parseFloat(item.valor) || 0;
        const q = parseFloat(item.quantidade) || 0;
        return acc + (v * q);
      }, 0);
    } catch {
      return 0;
    }
  }, [data.itens]);

  const descontoCalculado = useMemo(() => {
    const raw = parseInt((data.desconto.valor || "").toString().replace(/\D/g, ""), 10) || 0;
    if (data.desconto.tipo === "porcentagem") {
      return total * (raw / 10000);
    }
    return raw / 100;
  }, [total, data.desconto.tipo, data.desconto.valor]);

  const impostoCalculado = useMemo(() => {
    const raw = parseInt((data.imposto.valor || "").toString().replace(/\D/g, ""), 10) || 0;
    if (data.imposto.tipo === "porcentagem") {
      return total * (raw / 10000);
    }
    return raw / 100;
  }, [total, data.imposto.tipo, data.imposto.valor]);

  const finalTotal = useMemo(() => {
    return total - descontoCalculado + impostoCalculado;
  }, [total, descontoCalculado, impostoCalculado]);

  const update = (secao, campo, valor) => {
    setData((prev) => {
      if (!secao) return { ...prev, [campo]: valor };
      return { ...prev, [secao]: { ...prev[secao], [campo]: valor } };
    });
  };

  const updateItem = (i, campo, valor) => {
    setData((prev) => {
      const novosItens = [...prev.itens];
      novosItens[i] = { ...novosItens[i], [campo]: valor };
      return { ...prev, itens: novosItens };
    });
  };

  const addItem = () => {
    setData((prev) => ({
      ...prev,
      itens: [...prev.itens, { produto: "", descricao: "", valor: "", quantidade: "1" }],
    }));
  };

  const removeItem = (index) => {
    setData((prev) => {
      const novosItens = [...prev.itens];
      if (novosItens.length > 1) {
        novosItens.splice(index, 1);
      } else {
        novosItens[0] = { produto: "", descricao: "", valor: "", quantidade: "1" };
      }
      return { ...prev, itens: novosItens };
    });
  };

  const handleLogoChange = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => update("empresa", "logo", reader.result);
    reader.readAsDataURL(file);
  };

  const handleSaveSettings = async (newSettings) => {
    try {
      await api.put("/api/settings", newSettings);
      setSavedSettings(newSettings);
      setData(prev => ({
        ...prev,
        empresa: newSettings.empresa || {},
        pagamento: newSettings.pagamento || {},
        tema: newSettings.tema || "white"
      }));
      setOsData(prev => ({
        ...prev,
        empresa: newSettings.empresa || {},
        pagamento: newSettings.pagamento || {},
        tema: newSettings.tema || "white"
      }));
      setOrcamentoData(prev => ({
        ...prev,
        empresa: newSettings.empresa || {},
        pagamento: newSettings.pagamento || {},
        tema: newSettings.tema || "white"
      }));
      setShowSettings(false);
    } catch (err) {
      console.error("Erro ao salvar configurações:", err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = {
      clienteNome: false,
      clienteDocumento: false,
      clienteEmail: false,
      clienteEndereco: false,
      responsavelNome: false,
      responsavelTelefone: false,
      dataEmissao: !data.fatura.data,
      dataVencimento: !data.fatura.vencimento,
      itens: !data.itens.every(item => item.produto.trim() && item.descricao.trim() && item.valor && item.quantidade),
      faturaNumero: !data.fatura.numero.trim(),
    };
    setFieldErrors(errors);
    if (Object.values(errors).some(v => v)) {
      setScrollToError(prev => prev + 1);
      return;
    }
    try {
      if (data.pagamento.pix) {
        const url = await generateQrCode(data.pagamento, finalTotal);
        setQrCode(url);
      }
      setPreview(true);
      window.scrollTo(0, 0);
    } catch (err) {
      console.error("Erro ao gerar QR Code:", err);
      setPreview(true);
      window.scrollTo(0, 0);
    }
  };

  const handleDownload = () => {
    const clientNome = data.cliente.nome.trim();
    const fmtDoc = (val) => {
      if (!val) return "";
      const d = val.replace(/\D/g, "");
      if (d.length <= 11) return d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
      return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
    };
    const fmtTel = (val) => {
      if (!val) return "";
      const d = val.replace(/\D/g, "").slice(0, 22);
      let r = "";
      for (let i = 0; i < d.length; i++) {
        if (i === 2 || i === 13) r += " ";
        if (i === 7 || i === 18) r += "-";
        if (i === 11) r += " / ";
        r += d[i];
      }
      return r;
    };
    if (clientNome && !clients.some(c => c.nome.toLowerCase() === clientNome.toLowerCase())) {
      api.post("/api/clients", {
        nome: data.cliente.nome,
        documento: fmtDoc(data.cliente.documento),
        email: data.cliente.email,
        endereco: data.cliente.endereco,
        responsavelNome: data.responsavel.nome,
        responsavelTelefone: fmtTel(data.responsavel.telefone),
      }).then(newClient => {
        setClients(prev => [...prev, newClient]);
      }).catch(console.error);
    }
    const rawNumber = data.fatura.numero.toString().split("/")[0] || "1";
    const paddedNumber = rawNumber.padStart(3, '0');
    const nomeCliente = (data.cliente.nome || "Sem nome").replace(/[<>:"/\\|?*]/g, "");
    const filename = `Fatura ${rawNumber} - ${nomeCliente}`;
    if (isLocked) {
      downloadInvoicePDF("fatura", filename);
      return;
    }
    setIsLocked(true);
    setData(prev => ({
      ...prev,
      fatura: { ...prev.fatura, numero: paddedNumber }
    }));
    setTimeout(() => {
      downloadInvoicePDF("fatura", filename);
      const historyItem = {
        numero: paddedNumber,
        dataEmissao: data.fatura.data || getToday(),
        cliente: data.cliente.nome || "Não informado",
        valor: finalTotal,
        fullData: { ...data, fatura: { ...data.fatura, numero: paddedNumber } }
      };
      api.post("/api/history", historyItem).then(saved => {
        setHistory(prev => [saved, ...prev]);
      }).catch(console.error);
    }, 100);
  };

  const deleteHistoryItem = async (id) => {
    try {
      await api.del(`/api/history/${id}`);
      setHistory(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      console.error("Erro ao excluir histórico:", err);
    }
  };

  const restoreHistoryItem = async (fullData, isViewing = true) => {
    if (isViewing) {
      setData({ ...fullData, tema: fullData.tema || data.tema || "white" });
      setIsLocked(true);
      setPreview(true);
    } else {
      const nextNum = getNextInvoiceNumber(history);
      setData({
        ...fullData,
        fatura: { ...fullData.fatura, numero: nextNum, data: getToday(), vencimento: "" },
        tema: data.tema
      });
      setIsLocked(false);
      setPreview(false);
    }
    setShowHistory(false);
    if (fullData.pagamento?.pix) {
      try {
        const sub = fullData.itens.reduce((acc, item) => acc + (parseFloat(item.valor) * parseFloat(item.quantidade)), 0);
        const descVal = parseFloat((fullData.desconto?.valor || "").replace(",", ".")) || 0;
        const desc = fullData.desconto?.tipo === "porcentagem" ? sub * (descVal / 100) : descVal;
        const impVal = parseFloat((fullData.imposto?.valor || "").replace(",", ".")) || 0;
        const imp = fullData.imposto?.tipo === "porcentagem" ? sub * (impVal / 100) : impVal;
        const finalVal = sub - desc + imp;
        const url = await generateQrCode(fullData.pagamento, finalVal);
        setQrCode(url);
      } catch (err) {
        console.error("Erro ao regenerar QR Code:", err);
      }
    }
  };

  const clearFieldError = (field) => {
    setFieldErrors(prev => ({ ...prev, [field]: false }));
  };

  const handleNewInvoice = () => {
    setData({
      ...INITIAL_DATA_TEMPLATE,
      empresa: data.empresa,
      pagamento: data.pagamento,
      tema: data.tema
    });
    setIsLocked(false);
    setPreview(false);
  };

  // ---- OS LOGIC ----
  const osUpdate = (secao, campo, valor) => {
    setOsData((prev) => {
      if (!secao) return { ...prev, [campo]: valor };
      return { ...prev, [secao]: { ...prev[secao], [campo]: valor } };
    });
  };

  const handleOSSubmit = (filteredEntries, isManual = false) => {
    if (!filteredEntries || filteredEntries.length === 0) return;
    setOsPreviewEntries(filteredEntries);
    setOsPreview(true);
    if (isManual) setIsManualOSFlow(true);
    window.scrollTo(0, 0);
    if (isManual) {
      const first = filteredEntries[0] || {};
      const fornecedores = [...new Set(filteredEntries.map(e => e.fornecedor).filter(Boolean))];
      api.post("/api/service-orders", {
        numero: first.numero || "",
        dataEmissao: first.data || "",
        hora: first.hora || "",
        servico: fornecedores.join(", ") || "OS",
        cliente: first.cliente?.nome || "",
        nomePax: first.nome_pax || "",
        entries: filteredEntries,
        fullData: { entries: filteredEntries, empresa: data.empresa }
      }).then(saved => {
        setOsHistory(prev => [saved, ...prev]);
      }).catch(err => {
        console.error("Erro ao salvar OS manual:", err);
      });
    }
  };

  const handleOSDownload = () => {
    const filename = `OS ${new Date().toLocaleDateString("pt-BR")}`;
    if (osIsLocked) {
      downloadInvoicePDF("mapa-servico", filename, "l");
      return;
    }
    setOsIsLocked(true);
    setTimeout(() => {
      downloadInvoicePDF("mapa-servico", filename, "l");
      const first = osPreviewEntries[0] || {};
      const fornecedores = [...new Set(osPreviewEntries.map(e => e.fornecedor).filter(Boolean))];
      api.post("/api/service-orders", {
        numero: first.numero || "",
        dataEmissao: first.data || "",
        hora: first.hora || "",
        servico: fornecedores.join(", ") || "OS",
        cliente: first.cliente?.nome || "",
        nomePax: first.nome_pax || "",
        entries: osPreviewEntries,
        fullData: { entries: osPreviewEntries, empresa: data.empresa }
      }).then(saved => {
        setOsHistory(prev => [saved, ...prev]);
      }).catch(err => {
        console.error("Erro ao salvar OS:", err);
        alert("Erro ao salvar a OS no histórico: " + err.message);
      });
    }, 500);
  };

  const deleteOSHistoryItem = async (id) => {
    try {
      await api.del(`/api/service-orders/${id}`);
      setOsHistory(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      console.error("Erro ao excluir OS:", err);
    }
  };

  const restoreOSHistoryItem = async (fullData, isViewing = true) => {
    if (isViewing) {
      const entries = fullData.entries || [];
      setOsPreviewEntries(entries);
      setOsIsLocked(true);
      setOsPreview(true);
      setOsPreviewSource("history");
    } else {
      setRestoredEntries(fullData.entries || []);
    }
    setShowOSHistory(false);
  };

  const clearOSFieldError = (field) => {
    setOsFieldErrors(prev => ({ ...prev, [field]: false }));
  };

  const handleNewOS = () => {
    const entries = osPreviewSource ? [...osPreviewEntries] : [];
    setOsPreviewEntries([]);
    setOsIsLocked(false);
    setOsPreview(false);
    setOsPreviewSource(null);
    if (entries.length) {
      setRestoredEntries(entries);
    }
  };

  const handlePreviewSingleOS = (entry) => {
    setOsPreviewEntries([entry]);
    setOsIsLocked(false);
    setOsPreview(true);
    setOsPreviewSource("single");
    window.scrollTo(0, 0);
  };

  const handleDownloadSingleOS = (entry) => {
    const formatDateBR = (val) => {
      if (!val) return "";
      const parts = val.split("-");
      if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
      return val;
    };
    const fornecedor = entry.fornecedor || "";
    const empresa = data.empresa || {};
    const html = `
      <div class="os-paper landscape" style="width:1123px;margin:0;padding:0;font-family:Arial,sans-serif;">
        <div class="os-header">
          <div class="os-brand">
            ${empresa.logo ? `<img src="${empresa.logo}" class="os-logo" alt="Logo" />` : ""}
            <span class="os-company">${empresa.nome || "SUA EMPRESA"} - Ordem de Serviço - ${fornecedor}</span>
          </div>
        </div>
        <table class="os-table">
          <thead><tr>
            <th>Nº</th><th>DATA</th><th>HORA</th><th>VOO</th><th>SERVIÇO</th>
            <th>GUIA/CONTATO</th><th>NOME PAX</th><th>PAX</th><th>CLIENTE</th>
            <th>OBSERVAÇÃO</th><th>VEÍCULO</th><th>PLACA</th><th>MOTORISTA/CONTATO</th>
          </tr></thead>
          <tbody><tr class="os-data-row">
            <td class="os-num">${entry.numero || "---"}</td>
            <td>${formatDateBR(entry.data)}</td>
            <td>${entry.hora || "---"}</td>
            <td>${entry.voo || "---"}</td>
            <td class="os-wide-cell" style="white-space:pre-wrap">${entry.servico || "---"}</td>
            <td style="white-space:nowrap">${entry.nome_guia || ""}${entry.tel_guia ? `<br/>${entry.tel_guia}` : ""}</td>
            <td>${entry.nome_pax || "---"}</td>
            <td class="os-pax">${entry.pax || "0"}</td>
            <td>${entry.cliente?.nome || "---"}</td>
            <td class="os-wide-cell os-obs-cell">${entry.observacao || "---"}</td>
            <td>${entry.veiculo || "---"}</td>
            <td>${entry.placa || "---"}</td>
            <td style="white-space:nowrap">${entry.motorista || ""}${entry.contato_motorista ? `<br/>${entry.contato_motorista}` : ""}</td>
          </tr></tbody>
        </table>
        <div class="os-footer"><p class="os-thanks">Obrigado pela preferência!</p></div>
      </div>`;
    const container = document.createElement("div");
    container.id = "os-single-hidden";
    container.style.cssText = "position:absolute;left:-9999px;top:0;width:1123px;";
    container.innerHTML = html;
    document.body.appendChild(container);
    const filename = (entry.motorista || "OS").toUpperCase();
    setTimeout(() => {
      downloadInvoicePDF("os-single-hidden", filename, "l").finally(() => {
        setTimeout(() => {
          if (container.parentNode) document.body.removeChild(container);
        }, 2000);
      });
    }, 100);
  };

  const handleBulkDownloadOS = async (selectedEntries) => {
    const formatDateBR = (val) => {
      if (!val) return "";
      const parts = val.split("-");
      if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
      return val;
    };
    const empresa = data.empresa || {};
    const grouped = {};
    selectedEntries.forEach(entry => {
      const fornecedor = (entry.fornecedor || "SEM_FORNECEDOR").toUpperCase();
      const motorista = (entry.motorista || "SEM_MOTORISTA").toUpperCase();
      if (!grouped[fornecedor]) grouped[fornecedor] = {};
      if (!grouped[fornecedor][motorista]) grouped[fornecedor][motorista] = [];
      grouped[fornecedor][motorista].push(entry);
    });
    const fornecedores = Object.keys(grouped);
    for (const fornecedor of fornecedores) {
      const motoristas = Object.keys(grouped[fornecedor]);
      for (const motorista of motoristas) {
        const entries = grouped[fornecedor][motorista].sort((a, b) => {
          const ha = (a.hora || "").toLowerCase();
          const hb = (b.hora || "").toLowerCase();
          return ha.localeCompare(hb);
        });
        const rowsHtml = entries.map(entry => `
          <tr class="os-data-row">
            <td class="os-num">${entry.numero || "---"}</td>
            <td>${formatDateBR(entry.data)}</td>
            <td>${entry.hora || "---"}</td>
            <td>${entry.voo || "---"}</td>
            <td class="os-wide-cell" style="white-space:pre-wrap">${entry.servico || "---"}</td>
            <td style="white-space:nowrap">${entry.nome_guia || ""}${entry.tel_guia ? `<br/>${entry.tel_guia}` : ""}</td>
            <td>${entry.nome_pax || "---"}</td>
            <td class="os-pax">${entry.pax || "0"}</td>
            <td>${entry.cliente?.nome || "---"}</td>
            <td class="os-wide-cell os-obs-cell">${entry.observacao || "---"}</td>
            <td>${entry.veiculo || "---"}</td>
            <td>${entry.placa || "---"}</td>
            <td style="white-space:nowrap">${entry.motorista || ""}${entry.contato_motorista ? `<br/>${entry.contato_motorista}` : ""}</td>
          </tr>
        `).join("");
        const html = `
          <div class="os-paper landscape" style="width:1123px;margin:0;padding:0;font-family:Arial,sans-serif;">
            <div class="os-header">
              <div class="os-brand">
                ${empresa.logo ? `<img src="${empresa.logo}" class="os-logo" alt="Logo" />` : ""}
                <span class="os-company">${empresa.nome || "SUA EMPRESA"} - Ordem de Serviço - ${fornecedor}</span>
              </div>
            </div>
            <table class="os-table">
              <thead><tr>
                <th>Nº</th><th>DATA</th><th>HORA</th><th>VOO</th><th>SERVIÇO</th>
                <th>GUIA/CONTATO</th><th>NOME PAX</th><th>PAX</th><th>CLIENTE</th>
                <th>OBSERVAÇÃO</th><th>VEÍCULO</th><th>PLACA</th><th>MOTORISTA/CONTATO</th>
              </tr></thead>
              <tbody>${rowsHtml}</tbody>
            </table>
            <div class="os-footer"><p class="os-thanks">Obrigado pela preferência!</p></div>
          </div>`;
        await new Promise((resolve) => {
          const container = document.createElement("div");
          container.id = "os-bulk-hidden";
          container.style.cssText = "position:absolute;left:-9999px;top:0;width:1123px;";
          container.innerHTML = html;
          document.body.appendChild(container);
          setTimeout(() => {
            downloadInvoicePDF("os-bulk-hidden", motorista, "l").finally(() => {
              setTimeout(() => {
                if (container.parentNode) document.body.removeChild(container);
                resolve();
              }, 1500);
            });
          }, 200);
        });
      }
    }
  };

  const handleSaveSimulacao = (entries) => {
    const nova = {
      id: Date.now(),
      data: new Date().toISOString().split("T")[0],
      entries: entries,
    };
    setSimulacaoOSData(prev => [nova, ...prev]);
  };

  // ---- MAPA LOGIC ----
  const handleMapaSubmit = (filteredEntries) => {
    if (!filteredEntries || filteredEntries.length === 0) return;
    setMapaPreviewEntries(filteredEntries);
    setMapaPreview(true);
    window.scrollTo(0, 0);
  };

  const handleMapaDownload = () => {
    const filename = `Mapa ${new Date().toLocaleDateString("pt-BR")}`;
    if (mapaIsLocked) {
      downloadInvoicePDF("mapa-servico", filename, "l");
      return;
    }
    setMapaIsLocked(true);
    setTimeout(() => {
      downloadInvoicePDF("mapa-servico", filename, "l");
      api.post("/api/mapas", {
        entries: mapaPreviewEntries,
        fullData: { empresa: data.empresa }
      }).then(saved => {
        setMapaHistory(prev => [{ ...saved }, ...prev]);
      }).catch(err => {
        console.error("Erro ao salvar mapa:", err);
        alert("Erro ao salvar o mapa no histórico: " + err.message);
      });
    }, 500);
  };

  const handleViewMapa = (item) => {
    setMapaPreviewEntries(item.entries || []);
    setMapaIsLocked(true);
    setMapaPreview(true);
    setShowMapaHistory(false);
  };

  const handleNewMapa = () => {
    setMapaEntries([]);
    setMapaIsLocked(false);
    setMapaPreview(false);
  };

  const handleDeleteMapa = async (id) => {
    try {
      await api.del(`/api/mapas/${id}`);
      setMapaHistory(prev => prev.filter(m => m.id !== id));
    } catch (err) {
      console.error("Erro ao excluir mapa:", err);
    }
  };

  // ---- ORCAMENTO LOGIC ----
  const orcamentoUpdate = (secao, campo, valor) => {
    setOrcamentoData((prev) => {
      if (!secao) return { ...prev, [campo]: valor };
      return { ...prev, [secao]: { ...prev[secao], [campo]: valor } };
    });
  };

  const orcamentoUpdateItem = (i, campo, valor) => {
    setOrcamentoData((prev) => {
      const novosItens = [...prev.itens];
      novosItens[i] = { ...novosItens[i], [campo]: valor };
      return { ...prev, itens: novosItens };
    });
  };

  const orcamentoAddItem = () => {
    setOrcamentoData((prev) => ({
      ...prev,
      itens: [...prev.itens, { descricao: "", valor: "", quantidade: "1" }],
    }));
  };

  const orcamentoRemoveItem = (index) => {
    setOrcamentoData((prev) => {
      const novosItens = [...prev.itens];
      if (novosItens.length > 1) {
        novosItens.splice(index, 1);
      } else {
        novosItens[0] = { descricao: "", valor: "", quantidade: "1" };
      }
      return { ...prev, itens: novosItens };
    });
  };

  const handleOrcamentoSubmit = (e) => {
    e.preventDefault();
    const errors = {
      clienteNome: false,
      clienteDocumento: false,
      clienteEmail: false,
      clienteEndereco: false,
      responsavelNome: false,
      responsavelTelefone: false,
      dataEmissao: !orcamentoData.orcamento.data,
      itens: !orcamentoData.itens.every(item => item.descricao.trim() && item.valor && item.quantidade),
      orcamentoNumero: !orcamentoData.orcamento.numero.trim(),
    };
    setOrcamentoFieldErrors(errors);
    if (Object.values(errors).some(v => v)) {
      setOrcamentoScrollToError(prev => prev + 1);
      return;
    }
    setOrcamentoPreview(true);
    window.scrollTo(0, 0);
  };

  const handleOrcamentoDownload = () => {
    const rawNumber = orcamentoData.orcamento.numero.toString().split("/")[0] || "1";
    const paddedNumber = rawNumber.padStart(3, '0');
    const nomeCliente = (orcamentoData.cliente.nome || "Sem nome").replace(/[<>:"/\\|?*]/g, "");
    const filename = `Orcamento ${rawNumber} - ${nomeCliente}`;
    if (orcamentoIsLocked) {
      downloadInvoicePDF("orcamento", filename);
      return;
    }
    setOrcamentoIsLocked(true);
    setOrcamentoData(prev => ({
      ...prev,
      orcamento: { ...prev.orcamento, numero: paddedNumber }
    }));
    setTimeout(() => {
      downloadInvoicePDF("orcamento", filename);
      const total = orcamentoData.itens.reduce((acc, item) => acc + (parseFloat(item.valor) || 0) * (parseFloat(item.quantidade) || 0), 0);
      const descRaw = parseInt((orcamentoData.desconto?.valor || "").replace(/\D/g, ""), 10) || 0;
      const desc = orcamentoData.desconto?.tipo === "porcentagem" ? total * (descRaw / 10000) : descRaw / 100;
      const impRaw = parseInt((orcamentoData.imposto?.valor || "").replace(/\D/g, ""), 10) || 0;
      const imp = orcamentoData.imposto?.tipo === "porcentagem" ? total * (impRaw / 10000) : impRaw / 100;
      const finalVal = total - desc + imp;
      const historyItem = {
        numero: paddedNumber,
        dataEmissao: orcamentoData.orcamento.data || getToday(),
        validade: orcamentoData.orcamento.validade || "30",
        cliente: orcamentoData.cliente.nome || "Não informado",
        valor: finalVal,
        fullData: { ...orcamentoData, orcamento: { ...orcamentoData.orcamento, numero: paddedNumber } }
      };
      api.post("/api/orcamentos", historyItem).then(saved => {
        setOrcamentoHistory(prev => [saved, ...prev]);
      }).catch(console.error);
    }, 100);
  };

  const deleteOrcamentoHistoryItem = async (id) => {
    try {
      await api.del(`/api/orcamentos/${id}`);
      setOrcamentoHistory(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      console.error("Erro ao excluir orçamento:", err);
    }
  };

  const restoreOrcamentoHistoryItem = async (fullData, isViewing = true) => {
    if (isViewing) {
      setOrcamentoData({ ...fullData, tema: fullData.tema || orcamentoData.tema || "white" });
      setOrcamentoIsLocked(true);
      setOrcamentoPreview(true);
    } else {
      setOrcamentoData({
        ...fullData,
        tema: orcamentoData.tema
      });
      setOrcamentoIsLocked(false);
      setOrcamentoPreview(false);
    }
    setShowOrcamentoHistory(false);
  };

  const clearOrcamentoFieldError = (field) => {
    setOrcamentoFieldErrors(prev => ({ ...prev, [field]: false }));
  };

  const handleNewOrcamento = () => {
    setOrcamentoData({
      ...INITIAL_ORCAMENTO_TEMPLATE,
      empresa: orcamentoData.empresa,
      pagamento: orcamentoData.pagamento,
      tema: orcamentoData.tema
    });
    setOrcamentoIsLocked(false);
    setOrcamentoPreview(false);
  };

  const handleLogout = () => {
    logoutUser();
    onLogout();
  };

  const switchTab = (tab) => {
    setActiveTab(tab);
    setPreview(false);
    setOsPreview(false);
    setMapaPreview(false);
    setOrcamentoPreview(false);
  };

  if (loading) return null;

  return (
    <div className="app-container">
      <header className="main-header no-print">
        <div className="header-content">
          <h1 className="logo">{data.empresa.nome || "LOG GOLD"}</h1>
          <p className="slogan">Sempre buscando a perfeição</p>
          <div className="tab-bar">
            <button
              className={`tab-btn ${activeTab === "mapa" ? "active" : ""}`}
              onClick={() => switchTab("mapa")}
              disabled={preview || osPreview || mapaPreview || orcamentoPreview}
            >
              🗺️ Mapa de Serviço
            </button>
            <button
              className={`tab-btn ${activeTab === "ordem-servico" ? "active" : ""}`}
              onClick={() => switchTab("ordem-servico")}
              disabled={preview || osPreview || mapaPreview || orcamentoPreview}
            >
              🛠️ Ordem de Serviço
            </button>
            <button
              className={`tab-btn ${activeTab === "fatura" ? "active" : ""}`}
              onClick={() => switchTab("fatura")}
              disabled={preview || osPreview || mapaPreview || orcamentoPreview}
            >
              📄 Fatura
            </button>
            <button
              className={`tab-btn ${activeTab === "orcamento" ? "active" : ""}`}
              onClick={() => switchTab("orcamento")}
              disabled={preview || osPreview || mapaPreview || orcamentoPreview}
            >
              💰 Orçamento
            </button>
          </div>
        </div>
        <div className="header-actions">
          {user && <span className="user-badge">@{user.displayName || user.username}</span>}
          {isAdmin() && (
            <button onClick={() => setShowAdmin(true)} className="admin-btn" title="Administrar Usuários" disabled={preview || osPreview || mapaPreview || orcamentoPreview}>
              Admin
            </button>
          )}
          <button onClick={() => setShowAccountSettings(true)} className="admin-btn" title="Ajustes da Conta" disabled={preview || osPreview || mapaPreview || orcamentoPreview}>
            Ajustes
          </button>
          <button onClick={handleLogout} className="logout-btn" title="Sair" disabled={preview || osPreview || mapaPreview || orcamentoPreview}>
            Sair
          </button>
        </div>
      </header>

      <main className="main-content">
        {/* Action buttons - shared */}
        {!preview && !osPreview && !mapaPreview && !orcamentoPreview && (
          <div className="action-buttons-container no-print">
            <button onClick={() => setShowSettings(true)} className="action-button settings-toggle" title="Meus Dados">
              <span className="icon">👤</span><span className="label">Meus dados</span>
            </button>
            <button onClick={() => setShowClients(true)} className="action-button clients-toggle" title="Gerenciar Clientes">
              <span className="icon">👥</span><span className="label">Clientes</span>
            </button>
            <button onClick={() => setShowServices(true)} className="action-button services-toggle" title="Gerenciar Serviços">
              <span className="icon">🛠️</span><span className="label">Serviços</span>
            </button>
            <button onClick={() => setShowVehicles(true)} className="action-button services-toggle" title="Gerenciar Veículos">
              <span className="icon">🚗</span><span className="label">Veículos</span>
            </button>
            <button onClick={() => setShowDrivers(true)} className="action-button services-toggle" title="Gerenciar Motoristas">
              <span className="icon">👤</span><span className="label">Motoristas</span>
            </button>
            {activeTab === "fatura" && (
              <button onClick={() => setShowHistory(true)} className="action-button history-toggle" title="Histórico de Faturas">
                <span className="icon">📋</span><span className="label">Histórico de Faturas</span>
              </button>
            )}
            {activeTab === "ordem-servico" && (
              <>
                <button onClick={() => setShowOSHistory(true)} className="action-button history-toggle" title="Histórico de Ordem">
                  <span className="icon">📋</span><span className="label">Histórico de Ordem</span>
                </button>
                <button onClick={() => setShowSimulacaoOS(true)} className="action-button history-toggle" title="Simulação de Ordem">
                  <span className="icon">🧪</span><span className="label">Simulação de Ordem</span>
                </button>
              </>
            )}
            {activeTab === "mapa" && (
              <button onClick={() => setShowMapaHistory(true)} className="action-button history-toggle" title="Histórico de Mapas">
                <span className="icon">🗺️</span><span className="label">Histórico de Mapas</span>
              </button>
            )}
            {activeTab === "orcamento" && (
              <button onClick={() => setShowOrcamentoHistory(true)} className="action-button history-toggle" title="Histórico de Orçamentos">
                <span className="icon">📋</span><span className="label">Histórico de Orçamentos</span>
              </button>
            )}
          </div>
        )}

        {showSettings && (
          <SettingsModal
            settings={savedSettings}
            onSave={handleSaveSettings}
            onClose={() => setShowSettings(false)}
          />
        )}

        {showHistory && (
          <HistoryModal
            history={history}
            onDelete={deleteHistoryItem}
            onRestore={restoreHistoryItem}
            onClose={() => setShowHistory(false)}
          />
        )}

        {showOSHistory && (
          <ServiceOrderHistoryModal
            history={osHistory}
            onDelete={deleteOSHistoryItem}
            onRestore={restoreOSHistoryItem}
            onClose={() => setShowOSHistory(false)}
          />
        )}

        {showSimulacaoOS && (
          <SimulacaoOSModal
            data={simulacaoOSData}
            onDelete={(id) => setSimulacaoOSData(prev => prev.filter(item => item.id !== id))}
            onRestore={(entries) => { setRestoredEntries(entries); setShowSimulacaoOS(false); }}
            onView={(item) => {
              const entries = item.entries || [];
              setOsPreviewEntries(entries);
              setOsIsLocked(true);
              setOsPreview(true);
              setOsPreviewSource("simulation");
              setShowSimulacaoOS(false);
            }}
            onClose={() => setShowSimulacaoOS(false)}
          />
        )}

        {showMapaHistory && (
          <MapasHistoryModal
            history={mapaHistory}
            onView={handleViewMapa}
            onDelete={handleDeleteMapa}
            onClose={() => setShowMapaHistory(false)}
          />
        )}

        {showOrcamentoHistory && (
          <OrcamentoHistoryModal
            history={orcamentoHistory}
            onDelete={deleteOrcamentoHistoryItem}
            onRestore={restoreOrcamentoHistoryItem}
            onClose={() => setShowOrcamentoHistory(false)}
          />
        )}

        {showAccountSettings && (
          <AccountSettings onClose={() => setShowAccountSettings(false)} />
        )}

        {showAdmin && (
          <AdminPanel onClose={() => setShowAdmin(false)} />
        )}

        {showClients && (
          <ClientsModal
            onClose={() => { setShowClients(false); api.get("/api/clients").then(setClients).catch(console.error); }}
          />
        )}

        {showVehicles && (
          <VehiclesModal
            onClose={() => { setShowVehicles(false); api.get("/api/vehicles").then(setVehicles).catch(console.error); }}
          />
        )}

        {showDrivers && (
          <DriversModal
            onClose={() => { setShowDrivers(false); api.get("/api/drivers").then(setDrivers).catch(console.error); }}
          />
        )}

        {showServices && (
          <ServicesModal
            onClose={() => { setShowServices(false); api.get("/api/services").then(setServices).catch(console.error); }}
          />
        )}

        {/* FATURA */}
        {activeTab === "fatura" && preview ? (
          <InvoicePreview
            data={data} qrCode={qrCode} total={total} descontoCalculado={descontoCalculado}
            impostoCalculado={impostoCalculado} finalTotal={finalTotal} isLocked={isLocked}
            onBack={isLocked ? handleNewInvoice : () => setPreview(false)}
            onDownload={handleDownload}
            onBackToHistory={() => { setPreview(false); setShowHistory(true); }}
          />
        ) : activeTab === "fatura" ? (
          <InvoiceForm
            data={data} clients={clients} services={services} total={total}
            descontoCalculado={descontoCalculado} impostoCalculado={impostoCalculado}
            finalTotal={finalTotal} update={update} updateItem={updateItem}
            addItem={addItem} removeItem={removeItem} onLogoChange={handleLogoChange}
            onSubmit={handleSubmit} fieldErrors={fieldErrors} clearFieldError={clearFieldError}
            scrollToError={scrollToError}
          />
        ) : null}

        {/* ORDEM DE SERVICO */}
        {activeTab === "ordem-servico" && osPreview ? (
          <MapaServicoPreview
            entries={osPreviewEntries}
            empresa={data.empresa}
            isLocked={osIsLocked}
            onBack={osIsLocked ? handleNewOS : () => {
              if (isManualOSFlow) {
                setRestoredEntries([...osPreviewEntries]);
                setIsManualOSFlow(false);
              }
              setOsPreview(false);
            }}
            onDownload={handleOSDownload}
            onBackToHistory={() => {
              setOsPreview(false);
              if (osPreviewSource === "simulation") {
                setShowSimulacaoOS(true);
              } else {
                setShowOSHistory(true);
              }
              setOsPreviewSource(null);
            }}
            isOS={true}
          />
        ) : activeTab === "ordem-servico" ? (
          <ServiceOrderForm
            onSubmit={handleOSSubmit}
            clients={clients}
            vehicles={vehicles}
            drivers={drivers}
            restoredEntries={restoredEntries}
            onClearRestored={() => setRestoredEntries([])}
            onSaveSimulacao={handleSaveSimulacao}
            onPreviewOS={handlePreviewSingleOS}
            onDownloadOS={handleDownloadSingleOS}
            onBulkDownloadOS={handleBulkDownloadOS}
          />
        ) : null}

        {/* MAPA DE SERVICO */}
        {activeTab === "mapa" && mapaPreview ? (
          <MapaServicoPreview
            entries={mapaPreviewEntries}
            empresa={data.empresa}
            isLocked={mapaIsLocked}
            onBack={mapaIsLocked ? handleNewMapa : () => setMapaPreview(false)}
            onDownload={handleMapaDownload}
            onBackToHistory={() => { setMapaPreview(false); setShowMapaHistory(true); }}
          />
        ) : activeTab === "mapa" ? (
          <MapaServicoForm
            entries={mapaEntries}
            setEntries={setMapaEntries}
            clients={clients}
            vehicles={vehicles}
            drivers={drivers}
            onSubmit={handleMapaSubmit}
          />
        ) : null}

        {/* ORCAMENTO */}
        {activeTab === "orcamento" && orcamentoPreview ? (
          <OrcamentoPreview
            data={orcamentoData}
            total={orcamentoData.itens.reduce((acc, item) => acc + (parseFloat(item.valor) || 0) * (parseFloat(item.quantidade) || 0), 0)}
            descontoCalculado={(() => {
              const t = orcamentoData.itens.reduce((acc, item) => acc + (parseFloat(item.valor) || 0) * (parseFloat(item.quantidade) || 0), 0);
              const raw = parseInt((orcamentoData.desconto.valor || "").replace(/\D/g, ""), 10) || 0;
              return orcamentoData.desconto.tipo === "porcentagem" ? t * (raw / 10000) : raw / 100;
            })()}
            impostoCalculado={(() => {
              const t = orcamentoData.itens.reduce((acc, item) => acc + (parseFloat(item.valor) || 0) * (parseFloat(item.quantidade) || 0), 0);
              const raw = parseInt((orcamentoData.imposto.valor || "").replace(/\D/g, ""), 10) || 0;
              return orcamentoData.imposto.tipo === "porcentagem" ? t * (raw / 10000) : raw / 100;
            })()}
            finalTotal={(() => {
              const t = orcamentoData.itens.reduce((acc, item) => acc + (parseFloat(item.valor) || 0) * (parseFloat(item.quantidade) || 0), 0);
              const dr = parseInt((orcamentoData.desconto.valor || "").replace(/\D/g, ""), 10) || 0;
              const d = orcamentoData.desconto.tipo === "porcentagem" ? t * (dr / 10000) : dr / 100;
              const ir = parseInt((orcamentoData.imposto.valor || "").replace(/\D/g, ""), 10) || 0;
              const i = orcamentoData.imposto.tipo === "porcentagem" ? t * (ir / 10000) : ir / 100;
              return t - d + i;
            })()}
            isLocked={orcamentoIsLocked}
            onBack={orcamentoIsLocked ? handleNewOrcamento : () => setOrcamentoPreview(false)}
            onDownload={handleOrcamentoDownload}
            onBackToHistory={() => { setOrcamentoPreview(false); setShowOrcamentoHistory(true); }}
          />
        ) : activeTab === "orcamento" ? (
          <OrcamentoForm
            data={orcamentoData}
            clients={clients}
            total={orcamentoData.itens.reduce((acc, item) => acc + (parseFloat(item.valor) || 0) * (parseFloat(item.quantidade) || 0), 0)}
            descontoCalculado={(() => {
              const t = orcamentoData.itens.reduce((acc, item) => acc + (parseFloat(item.valor) || 0) * (parseFloat(item.quantidade) || 0), 0);
              const raw = parseInt((orcamentoData.desconto.valor || "").replace(/\D/g, ""), 10) || 0;
              return orcamentoData.desconto.tipo === "porcentagem" ? t * (raw / 10000) : raw / 100;
            })()}
            impostoCalculado={(() => {
              const t = orcamentoData.itens.reduce((acc, item) => acc + (parseFloat(item.valor) || 0) * (parseFloat(item.quantidade) || 0), 0);
              const raw = parseInt((orcamentoData.imposto.valor || "").replace(/\D/g, ""), 10) || 0;
              return orcamentoData.imposto.tipo === "porcentagem" ? t * (raw / 10000) : raw / 100;
            })()}
            finalTotal={(() => {
              const t = orcamentoData.itens.reduce((acc, item) => acc + (parseFloat(item.valor) || 0) * (parseFloat(item.quantidade) || 0), 0);
              const dr = parseInt((orcamentoData.desconto.valor || "").replace(/\D/g, ""), 10) || 0;
              const d = orcamentoData.desconto.tipo === "porcentagem" ? t * (dr / 10000) : dr / 100;
              const ir = parseInt((orcamentoData.imposto.valor || "").replace(/\D/g, ""), 10) || 0;
              const i = orcamentoData.imposto.tipo === "porcentagem" ? t * (ir / 10000) : ir / 100;
              return t - d + i;
            })()}
            update={orcamentoUpdate}
            updateItem={orcamentoUpdateItem}
            addItem={orcamentoAddItem}
            removeItem={orcamentoRemoveItem}
            onSubmit={handleOrcamentoSubmit}
            fieldErrors={orcamentoFieldErrors}
            clearFieldError={clearOrcamentoFieldError}
            scrollToError={orcamentoScrollToError}
          />
        ) : null}
      </main>

      <footer className="main-footer no-print">
        <div className="footer-content">
          <div className="contact-info">
            <span>{data.empresa.telefone || "21 96781-1733 / 21 97338-5432"}</span>
            <span className="separator">|</span>
            <span>{data.empresa.email || "contatologicagold@gmail.com"}</span>
          </div>
          <p className="copyright">&copy; {new Date().getFullYear()} {data.empresa.nome || "LOG GOLD"}. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  const [authenticated, setAuthenticated] = useState(() => isLoggedIn());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isLoggedIn()) {
      fetchMe().then(() => setLoading(false)).catch(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  if (loading) return null;

  if (!authenticated) {
    return <LoginModal onLogin={() => { setAuthenticated(true); }} />;
  }

  return <AuthenticatedApp onLogout={() => setAuthenticated(false)} />;
}
