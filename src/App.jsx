import { useState, useMemo, useEffect } from "react";
import { User, Users, Wrench, Car, ClipboardList, FlaskConical, Map, UserCheck } from "lucide-react";
import InvoiceForm from "./components/InvoiceForm";
import InvoicePreview from "./components/InvoicePreview";
import ServiceOrderForm from "./components/ServiceOrderForm";

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
import { formatDateBR } from "./utils/formatters";
import { useOrcamentoCalculations } from "./hooks/useOrcamentoCalculations";

function escapeHTML(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/ /g, "&nbsp;")
    .replace(/\n/g, "<br/>");
}

const getToday = () => {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

const INITIAL_DATA_TEMPLATE = {
  fatura: { numero: "", data: getToday(), vencimento: "" },
  cliente: { nome: "", documento: "", email: "", endereco: "" },
  responsavel: { nome: "", telefone: "", telefoneCustom: false, email: "" },
  itens: [{ produto: "", descricao: "", valor: "", quantidade: "1" }],
  desconto: { tipo: "fixed", valor: "" },
  imposto: { tipo: "fixed", valor: "" },
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
  orcamento: { numero: "", data: getToday(), validade: "" },
  cliente: { nome: "", documento: "", email: "", endereco: "" },
  responsavel: { nome: "", telefone: "", telefoneCustom: false, email: "" },
  itens: [{ produto: "", descricao: "", valor: "", quantidade: "1" }],
  desconto: { tipo: "fixed", valor: "" },
  imposto: { tipo: "fixed", valor: "" },
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
  const [mapaShowFinanceiro, setMapaShowFinanceiro] = useState(false);
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
  const [orcamentoData, setOrcamentoData] = useState(() => ({
    ...INITIAL_ORCAMENTO_TEMPLATE,
    empresa: {},
    pagamento: {},
    tema: "white"
  }));
  const [loading, setLoading] = useState(true);

  const { total: orcamentoTotal, descontoCalculado: orcamentoDesconto, impostoCalculado: orcamentoImposto, finalTotal: orcamentoFinalTotal } = useOrcamentoCalculations(
    orcamentoData.itens,
    orcamentoData.desconto,
    orcamentoData.imposto
  );

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
  const [hiddenOSDownload, setHiddenOSDownload] = useState(null);
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
  const [scrollToError, setScrollToError] = useState(0);
  const [orcamentoFieldErrors, setOrcamentoFieldErrors] = useState({
    clienteNome: false, clienteDocumento: false, clienteEmail: false, clienteEndereco: false,
    responsavelNome: false, responsavelTelefone: false,
    dataEmissao: false, itens: false, orcamentoNumero: false, orcamentoValidade: false,
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
        const loadedTema = localStorage.getItem("fatura_theme") || settings.tema || "white";
        setSavedSettings(settings);
        setData(prev => ({
          ...prev,
          empresa: settings.empresa || {},
          pagamento: settings.pagamento || {},
          tema: loadedTema
        }));
        setOrcamentoData(prev => ({
          ...prev,
          empresa: settings.empresa || {},
          pagamento: settings.pagamento || {},
          tema: loadedTema
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
    const tema = newSettings.tema || "white";
    localStorage.setItem("fatura_theme", tema);
    setData(prev => ({ ...prev, empresa: newSettings.empresa || {}, pagamento: newSettings.pagamento || {}, tema }));
    setOrcamentoData(prev => ({ ...prev, empresa: newSettings.empresa || {}, pagamento: newSettings.pagamento || {}, tema }));
    setShowSettings(false);
    try {
      await api.put("/api/settings", newSettings);
      setSavedSettings(newSettings);
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
    const currentFaturaData = data.fatura.data || getToday();
    const currentClientName = data.cliente.nome || "Não informado";
    const snapshotData = { ...data };
    setData(prev => ({
      ...prev,
      fatura: { ...prev.fatura, numero: paddedNumber }
    }));
    setTimeout(() => {
      downloadInvoicePDF("fatura", filename);
      const historyItem = {
        numero: paddedNumber,
        dataEmissao: currentFaturaData,
        cliente: currentClientName,
        valor: finalTotal,
        fullData: { ...snapshotData, fatura: { ...snapshotData.fatura, numero: paddedNumber } }
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
      setData({ ...fullData, tema: data.tema });
      setIsLocked(true);
      setPreview(true);
    } else {
      setData({
        ...fullData,
        tema: data.tema
      });
      setIsLocked(false);
      setPreview(false);
    }
    setShowHistory(false);

    if (fullData.pagamento?.pix) {
      try {
        const sub = fullData.itens.reduce((acc, item) => acc + (parseFloat(item.valor) * parseFloat(item.quantidade)), 0);
        const rawDesc = parseInt((fullData.desconto?.valor || "").toString().replace(/\D/g, ""), 10) || 0;
        const desc = fullData.desconto?.tipo === "porcentagem" ? sub * (rawDesc / 10000) : rawDesc / 100;
        const rawImp = parseInt((fullData.imposto?.valor || "").toString().replace(/\D/g, ""), 10) || 0;
        const imp = fullData.imposto?.tipo === "porcentagem" ? sub * (rawImp / 10000) : rawImp / 100;
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
    const first = osPreviewEntries[0] || {};
    const filename = osPreviewSource === "single"
      ? (first.motorista || "OS").toUpperCase()
      : (first.fornecedor || "OS").toUpperCase();
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
    setHiddenOSDownload(entry);
  };

  const handleBulkDownloadOS = async (selectedEntries) => {
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
            <td class="os-num">${escapeHTML(entry.numero) || "---"}</td>
            <td>${escapeHTML(formatDateBR(entry.data))}</td>
            <td>${escapeHTML(entry.hora) || "---"}</td>
            <td>${escapeHTML(entry.voo) || "---"}</td>
            <td class="os-wide-cell" style="white-space:pre-wrap">${escapeHTML(entry.servico) || "---"}</td>
            <td style="white-space:nowrap">${escapeHTML(entry.nome_guia) || ""}${entry.tel_guia ? `<br/>${escapeHTML(entry.tel_guia)}` : ""}</td>
            <td>${escapeHTML(entry.nome_pax) || "---"}</td>
            <td class="os-pax">${escapeHTML(entry.pax) || "0"}</td>
            <td>${escapeHTML(entry.cliente?.nome) || "---"}</td>
            <td class="os-wide-cell os-obs-cell">${escapeHTML(entry.observacao) || "---"}</td>
            <td>${escapeHTML(entry.veiculo) || "---"}</td>
            <td>${escapeHTML(entry.placa) || "---"}</td>
            <td style="white-space:nowrap">${escapeHTML(entry.motorista) || ""}${entry.contato_motorista ? `<br/>${escapeHTML(entry.contato_motorista)}` : ""}</td>
          </tr>
        `).join("");
        const html = `
          <div class="os-paper landscape" style="width:1123px;margin:0;padding:0;font-family:Arial,sans-serif;">
            <div class="os-header">
              <div class="os-brand">
                ${empresa.logo ? `<img src="${empresa.logo}" class="os-logo" alt="Logo" />` : ""}
                <span class="os-company">${escapeHTML(empresa.nome || "SUA EMPRESA")} - Ordem de Serviço - ${escapeHTML(fornecedor)}</span>
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
  const handleMapaSubmit = (filteredEntries, showFinanceiro = false) => {
    if (!filteredEntries || filteredEntries.length === 0) return;
    setMapaPreviewEntries(filteredEntries);
    setMapaShowFinanceiro(showFinanceiro);
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
      itens: [...prev.itens, { produto: "", descricao: "", valor: "", quantidade: "1" }],
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
      itens: !orcamentoData.itens.every(item => item.produto.trim() && item.valor && item.quantidade),
      orcamentoNumero: !orcamentoData.orcamento.numero.trim(),
      orcamentoValidade: !orcamentoData.orcamento.validade.trim(),
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
    const currentOrcData = orcamentoData.orcamento.data || getToday();
    const currentOrcValidade = orcamentoData.orcamento.validade || "30";
    const currentOrcClient = orcamentoData.cliente.nome || "Não informado";
    const snapshotOrcData = { ...orcamentoData };
    setOrcamentoData(prev => ({
      ...prev,
      orcamento: { ...prev.orcamento, numero: paddedNumber }
    }));
    setTimeout(() => {
      downloadInvoicePDF("orcamento", filename);
      const historyItem = {
        numero: paddedNumber,
        dataEmissao: currentOrcData,
        validade: currentOrcValidade,
        cliente: currentOrcClient,
        valor: orcamentoFinalTotal,
        fullData: { ...snapshotOrcData, orcamento: { ...snapshotOrcData.orcamento, numero: paddedNumber } }
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
      setOrcamentoData({ ...fullData, tema: orcamentoData.tema });
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

  const convertOrcamentoToInvoice = (fullData) => {
    setData({
      ...INITIAL_DATA_TEMPLATE,
      fatura: { ...INITIAL_DATA_TEMPLATE.fatura, numero: fullData.orcamento?.numero || "" },
      cliente: { ...fullData.cliente },
      responsavel: { ...fullData.responsavel },
      itens: (fullData.itens || []).map(item => ({
        produto: item.produto || item.descricao || "",
        descricao: item.produto ? (item.descricao || "") : "",
        valor: item.valor || "",
        quantidade: item.quantidade || "1"
      })),
      desconto: { ...fullData.desconto },
      imposto: { ...fullData.imposto },
      observacoes: fullData.observacoes || "",
      empresa: data.empresa,
      pagamento: data.pagamento,
      tema: data.tema
    });
    setShowOrcamentoHistory(false);
    setActiveTab("fatura");
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
        <div className="header-left"></div>
        <div className="header-content">
          <h1 className="logo">{data.empresa.nome || "LOG GOLD"}</h1>
          <p className="slogan">Sempre buscando a perfeição</p>
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
      <nav className="navbar no-print">
        <div className="tab-bar">
          <button className={`tab-btn ${activeTab === "mapa" ? "active" : ""}`} onClick={() => switchTab("mapa")} disabled={preview || osPreview || mapaPreview || orcamentoPreview}>
            Mapa de Serviço
          </button>
          <button className={`tab-btn ${activeTab === "ordem-servico" ? "active" : ""}`} onClick={() => switchTab("ordem-servico")} disabled={preview || osPreview || mapaPreview || orcamentoPreview}>
            Ordem de Serviço
          </button>
          <button className={`tab-btn ${activeTab === "fatura" ? "active" : ""}`} onClick={() => switchTab("fatura")} disabled={preview || osPreview || mapaPreview || orcamentoPreview}>
            Fatura
          </button>
          <button className={`tab-btn ${activeTab === "orcamento" ? "active" : ""}`} onClick={() => switchTab("orcamento")} disabled={preview || osPreview || mapaPreview || orcamentoPreview}>
            Orçamento
          </button>
        </div>
      </nav>

      <main className="main-content">
        {/* Action buttons - shared */}
        {!preview && !osPreview && !mapaPreview && !orcamentoPreview && (
          <div className="action-buttons-container no-print">
            <button onClick={() => setShowSettings(true)} className="action-button settings-toggle" title="Meus Dados">
              <span className="icon"><User size={20} /></span><span className="label">Meus dados</span>
            </button>
            <button onClick={() => setShowClients(true)} className="action-button clients-toggle" title="Gerenciar Clientes">
              <span className="icon"><Users size={20} /></span><span className="label">Clientes</span>
            </button>
            <button onClick={() => setShowServices(true)} className="action-button services-toggle" title="Gerenciar Serviços">
              <span className="icon"><Wrench size={20} /></span><span className="label">Serviços</span>
            </button>
            <button onClick={() => setShowVehicles(true)} className="action-button services-toggle" title="Gerenciar Veículos">
              <span className="icon"><Car size={20} /></span><span className="label">Veículos</span>
            </button>
            <button onClick={() => setShowDrivers(true)} className="action-button services-toggle" title="Gerenciar Motoristas">
              <span className="icon"><UserCheck size={20} /></span><span className="label">Motoristas</span>
            </button>
            {activeTab === "fatura" && (
              <button onClick={() => setShowHistory(true)} className="action-button history-toggle" title="Histórico de Faturas">
                <span className="icon"><ClipboardList size={20} /></span><span className="label">Histórico de Faturas</span>
              </button>
            )}
            {activeTab === "ordem-servico" && (
              <>
                <button onClick={() => setShowOSHistory(true)} className="action-button history-toggle" title="Histórico de Ordem">
                  <span className="icon"><ClipboardList size={20} /></span><span className="label">Histórico de Ordem</span>
                </button>
                <button onClick={() => setShowSimulacaoOS(true)} className="action-button history-toggle" title="Simulação de Ordem">
                  <span className="icon"><FlaskConical size={20} /></span><span className="label">Simulação de Ordem</span>
                </button>
              </>
            )}
            {activeTab === "mapa" && (
              <button onClick={() => setShowMapaHistory(true)} className="action-button history-toggle" title="Histórico de Mapas">
                <span className="icon"><Map size={20} /></span><span className="label">Histórico de Mapas</span>
              </button>
            )}
            {activeTab === "orcamento" && (
              <button onClick={() => setShowOrcamentoHistory(true)} className="action-button history-toggle" title="Histórico de Orçamentos">
                <span className="icon"><ClipboardList size={20} /></span><span className="label">Histórico de Orçamentos</span>
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
            onConvertToInvoice={convertOrcamentoToInvoice}
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
            headerName={osPreviewSource === "single"
              ? (osPreviewEntries[0]?.motorista || "").toUpperCase()
              : (osPreviewEntries[0]?.fornecedor || "").toUpperCase()
            }
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

        {/* OS DOWNLOAD OCULTO */}
        {hiddenOSDownload && (
          <div style={{ position: "fixed", left: "-9999px", top: 0, pointerEvents: "none", opacity: 0 }}>
            <MapaServicoPreview
              entries={[hiddenOSDownload]}
              empresa={data.empresa}
              isLocked={false}
              onBack={() => {}}
              onDownload={() => {
                const filename = (hiddenOSDownload.motorista || "OS").toUpperCase();
                downloadInvoicePDF("mapa-servico", filename, "l").finally(() => {
                  const entry = hiddenOSDownload;
                  const fornecedores = [entry.fornecedor].filter(Boolean);
                  api.post("/api/service-orders", {
                    numero: entry.numero || "",
                    dataEmissao: entry.data || "",
                    hora: entry.hora || "",
                    servico: fornecedores.join(", ") || "OS",
                    cliente: entry.cliente?.nome || "",
                    nomePax: entry.nome_pax || "",
                    entries: [entry],
                    fullData: { entries: [entry], empresa: data.empresa }
                  }).then(saved => {
                    setOsHistory(prev => [saved, ...prev]);
                  }).catch(err => {
                    console.error("Erro ao salvar OS:", err);
                  }).finally(() => {
                    setHiddenOSDownload(null);
                  });
                });
              }}
              onBackToHistory={() => {}}
              isOS={true}
              headerName={(hiddenOSDownload.motorista || "").toUpperCase()}
              autoDownload={true}
              onAutoDownloadDone={() => {}}
            />
          </div>
        )}

        {/* MAPA DE SERVICO */}
        {activeTab === "mapa" && mapaPreview ? (
          <MapaServicoPreview
            entries={mapaPreviewEntries}
            empresa={data.empresa}
            showFinanceiro={mapaShowFinanceiro}
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
            total={orcamentoTotal}
            descontoCalculado={orcamentoDesconto}
            impostoCalculado={orcamentoImposto}
            finalTotal={orcamentoFinalTotal}
            isLocked={orcamentoIsLocked}
            onBack={orcamentoIsLocked ? handleNewOrcamento : () => setOrcamentoPreview(false)}
            onDownload={handleOrcamentoDownload}
            onBackToHistory={() => { setOrcamentoPreview(false); setShowOrcamentoHistory(true); }}
          />
        ) : activeTab === "orcamento" ? (
          <OrcamentoForm
            data={orcamentoData}
            clients={clients}
            services={services}
            total={orcamentoTotal}
            descontoCalculado={orcamentoDesconto}
            impostoCalculado={orcamentoImposto}
            finalTotal={orcamentoFinalTotal}
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
    async function init() {
      const savedTheme = localStorage.getItem("fatura_theme");
      if (savedTheme) {
        document.body.dataset.theme = savedTheme;
      } else {
        try {
          const res = await fetch("/api/settings/theme");
          const data = await res.json();
          if (data.tema) {
            localStorage.setItem("fatura_theme", data.tema);
            document.body.dataset.theme = data.tema;
          }
        } catch {}
      }
      if (isLoggedIn()) {
        await fetchMe();
      }
      setLoading(false);
    }
    init();
  }, []);

  if (loading) return null;

  if (!authenticated) {
    return <LoginModal onLogin={() => { setAuthenticated(true); }} />;
  }

  return <AuthenticatedApp onLogout={() => setAuthenticated(false)} />;
}
