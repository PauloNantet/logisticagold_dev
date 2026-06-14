import { useState, useEffect, useRef } from "react";
import { Upload, Save, User } from "lucide-react";
import ImageManager from "./ImageManager";
import { Modal } from "../ui";
import { api } from "../utils/api";

export default function SettingsModal({ settings, onSave, onClose }) {
  const [formData, setFormData] = useState(settings);
  const [showImageManager, setShowImageManager] = useState(false);
  const fileInputRef = useRef(null);

  const splitTelefones = (str) => {
    const partes = (str || "").split(" / ").map(s => s.trim());
    return { tel1: partes[0] || "", tel2: partes[1] || "" };
  };

  const [tel1, setTel1] = useState(() => splitTelefones(settings.empresa.telefone).tel1);
  const [tel2, setTel2] = useState(() => splitTelefones(settings.empresa.telefone).tel2);

  useEffect(() => {
    const { tel1: t1, tel2: t2 } = splitTelefones(settings.empresa.telefone);
    setTel1(t1);
    setTel2(t2);
  }, [settings]);

  const formatPhone = (val) => {
    val = val.replace(/\D/g, "").slice(0, 11);
    val = val.replace(/^(\d{2})(\d)/, "$1 $2").replace(/(\d{5})(\d)/, "$1-$2");
    return val;
  };

  const formatDoc = (val) => {
    val = val.replace(/\D/g, "").slice(0, 14);
    if (val.length <= 11) {
      val = val.replace(/(\d{3})(\d)/, "$1.$2")
               .replace(/(\d{3})(\d)/, "$1.$2")
               .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    } else {
      val = val.replace(/^(\d{2})(\d)/, "$1.$2")
               .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
               .replace(/\.(\d{3})(\d)/, ".$1/$2")
               .replace(/(\d{4})(\d)/, "$1-$2");
    }
    return val;
  };

  const handleChange = (section, field, value) => {
    setFormData((prev) => ({
      ...prev,
      [section]: { ...prev[section], [field]: value },
    }));
  };

  const [reloadKey, setReloadKey] = useState(0);

  const handleUploadFile = async (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        await api.post("/api/images", {
          filename: file.name,
          data: reader.result,
          content_type: file.type
        });
        setReloadKey(k => k + 1);
      } catch (err) {
        console.error("Erro ao fazer upload:", err);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const telefones = [tel1, tel2].filter(t => t.trim()).join(" / ");
    onSave({
      ...formData,
      empresa: { ...formData.empresa, telefone: telefones }
    });
  };

  return (
    <Modal
      title={<span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><User size={18} /> Meus Dados</span>}
      onClose={onClose}
      footer={
        <>
          <button type="submit" form="settings-form" className="save-settings-btn">
            <Save size={16} /> Salvar Configurações
          </button>
          <button type="button" onClick={onClose} className="cancel-settings-btn">
            Cancelar
          </button>
        </>
      }
    >
      <form id="settings-form" onSubmit={handleSubmit}>
        <div className="modal-section">
          <h3 className="settings-section-title">Dados de Identidade</h3>

          <div className="logo-upload-preview">
            <div className="logo-preview-box">
              {formData.empresa.logo ? (
                <img src={formData.empresa.logo} alt="Logo" className="logo-img" />
              ) : (
                <span className="no-logo-text">SEM LOGO</span>
              )}
            </div>
            <div className="manage-images-row">
              <button
                type="button"
                className="manage-images-btn"
                onClick={() => setShowImageManager(!showImageManager)}
              >
                {showImageManager ? "Fechar" : "Gerenciar Imagens"}
              </button>
              {showImageManager && (
                <button
                  type="button"
                  className="manage-images-btn"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload size={14} /> Upload
                </button>
              )}
            </div>
            {showImageManager && (
              <ImageManager
                key={reloadKey}
                onSelectLogo={(data) => {
                  handleChange("empresa", "logo", data);
                  setShowImageManager(false);
                }}
                currentLogo={formData.empresa.logo}
              />
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => {
                if (e.target.files[0]) handleUploadFile(e.target.files[0]);
                e.target.value = "";
              }}
            />
          </div>

          <div className="settings-grid">
            <div className="input-group">
              <label className="input-label">Nome da Empresa</label>
              <input type="text" value={formData.empresa.nome} onChange={(e) => handleChange("empresa", "nome", e.target.value)} placeholder="Ex: Transportadora XYZ" className="custom-input" />
            </div>
            <div className="input-group">
              <label className="input-label">Email Profissional</label>
              <input type="email" value={formData.empresa.email} onChange={(e) => handleChange("empresa", "email", e.target.value)} placeholder="Ex: contato@transportadora.com" className="custom-input" />
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">Endereço Completo</label>
            <input type="text" value={formData.empresa.endereco} onChange={(e) => handleChange("empresa", "endereco", e.target.value)} placeholder="Ex: Rua, número, bairro, cidade" className="custom-input" />
          </div>

          <div className="form-row-3">
            <div>
              <label className="input-label">CPF / CNPJ</label>
              <input type="text" value={formData.empresa.documento || ""} onChange={(e) => handleChange("empresa", "documento", formatDoc(e.target.value))} placeholder="Ex: 123.456.789-00" className="custom-input" />
            </div>
            <div>
              <label className="input-label">Telefone / WhatsApp 1</label>
              <input type="text" value={tel1} onChange={(e) => setTel1(formatPhone(e.target.value))} placeholder="Ex: 21 99999-9999" className="custom-input" />
            </div>
            <div>
              <label className="input-label">Telefone / WhatsApp 2</label>
              <input type="text" value={tel2} onChange={(e) => setTel2(formatPhone(e.target.value))} placeholder="Ex: 21 98888-8888" className="custom-input" />
            </div>
          </div>
        </div>

        <div className="modal-section border-top">
          <h3 className="settings-section-title" style={{ color: "var(--primary)" }}>Dados de Recebimento (PIX)</h3>

          <div className="pix-config-container" style={{ marginBottom: '12px' }}>
            <label className="input-label">Tipo e Chave PIX Padrão</label>
            <div className="pix-row">
              <div className="pix-type-select">
                {["cpf", "cnpj", "celular", "email", "aleatoria"].map(tipo => (
                  <button
                    key={tipo}
                    type="button"
                    className={`pix-type-btn${(formData.pagamento.tipoPix || "aleatoria") === tipo ? " active" : ""}`}
                    onClick={() => { handleChange("pagamento", "tipoPix", tipo); handleChange("pagamento", "pix", ""); }}
                  >
                    {tipo === "aleatoria" ? "Aleatória" : tipo.toUpperCase()}
                  </button>
                ))}
              </div>
              <input type="text" value={formData.pagamento.pix} onChange={(e) => {
                let val = e.target.value;
                const tipo = formData.pagamento.tipoPix || "aleatoria";
                if (tipo === "aleatoria") {
                  val = val.replace(/[^a-fA-F0-9]/g, "").slice(0, 32);
                  if (val.length > 8) val = val.slice(0, 8) + "-" + val.slice(8);
                  if (val.length > 13) val = val.slice(0, 13) + "-" + val.slice(13);
                  if (val.length > 18) val = val.slice(0, 18) + "-" + val.slice(18);
                  if (val.length > 23) val = val.slice(0, 23) + "-" + val.slice(23);
                } else if (tipo === "cpf") {
                  val = val.replace(/\D/g, "").slice(0, 11);
                  val = val.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
                } else if (tipo === "cnpj") {
                  val = val.replace(/\D/g, "").slice(0, 14);
                  val = val.replace(/^(\d{2})(\d)/, "$1.$2").replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3").replace(/\.(\d{3})(\d)/, ".$1/$2").replace(/(\d{4})(\d)/, "$1-$2");
                } else if (tipo === "celular") {
                  val = val.replace(/\D/g, "");
                  if (!val.startsWith("55") && val.length > 0) val = "55" + val;
                  val = val.slice(0, 13);
                  val = val.replace(/^(\d{2})(\d{2})(\d)/, "+$1 ($2) $3").replace(/(\d{5})(\d)/, "$1-$2");
                }
                handleChange("pagamento", "pix", val);
              }} placeholder={formData.pagamento.tipoPix === "cpf" ? "000.000.000-00" : formData.pagamento.tipoPix === "cnpj" ? "00.000.000/0000-00" : formData.pagamento.tipoPix === "celular" ? "+55 (00) 00000-0000" : formData.pagamento.tipoPix === "email" ? "seu@email.com" : "Chave aleatória"} className="custom-input" style={{ flex: 1 }} />
            </div>
          </div>

          <div className="settings-grid">
            <div className="input-group">
              <label className="input-label">Nome do Titular</label>
              <input type="text" value={formData.pagamento.nome} onChange={(e) => handleChange("pagamento", "nome", e.target.value)} placeholder="Nome que aparece no PIX" className="custom-input" />
            </div>
            <div className="input-group">
              <label className="input-label">Cidade do Titular</label>
              <input type="text" value={formData.pagamento.cidade} onChange={(e) => handleChange("pagamento", "cidade", e.target.value)} placeholder="Ex: Rio de Janeiro" className="custom-input" />
            </div>
          </div>
        </div>

        <div className="modal-section border-top">
          <h3 className="settings-section-title" style={{ color: "var(--primary)" }}>Aparência da Fatura</h3>
          <div className="settings-grid">
            <div className="input-group">
              <label className="input-label">Tema da Fatura</label>
              <div className="tema-row">
                <label className="radio-label">
                  <input type="radio" name="tema" value="white" checked={formData.tema === "white"} onChange={(e) => setFormData(prev => ({ ...prev, tema: e.target.value }))} />
                  Branco
                </label>
                <label className="radio-label">
                  <input type="radio" name="tema" value="gold-text" checked={formData.tema === "gold-text"} onChange={(e) => setFormData(prev => ({ ...prev, tema: e.target.value }))} />
                  Gold
                </label>
                <label className="radio-label">
                  <input type="radio" name="tema" value="blue" checked={formData.tema === "blue"} onChange={(e) => setFormData(prev => ({ ...prev, tema: e.target.value }))} />
                  Azul
                </label>
                <label className="radio-label">
                  <input type="radio" name="tema" value="green" checked={formData.tema === "green"} onChange={(e) => setFormData(prev => ({ ...prev, tema: e.target.value }))} />
                  Verde
                </label>
                <label className="radio-label">
                  <input type="radio" name="tema" value="silver" checked={formData.tema === "silver"} onChange={(e) => setFormData(prev => ({ ...prev, tema: e.target.value }))} />
                  Prata
                </label>
                <label className="radio-label">
                  <input type="radio" name="tema" value="lilac" checked={formData.tema === "lilac"} onChange={(e) => setFormData(prev => ({ ...prev, tema: e.target.value }))} />
                  Lilás
                </label>
              </div>
            </div>
          </div>
        </div>
      </form>
    </Modal>
  );
}
