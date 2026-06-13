import { useState, useEffect } from "react";
import { api } from "../utils/api";

export default function ImageManager({ onSelectLogo, currentLogo }) {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadImages = async () => {
    try {
      const data = await api.get("/api/images");
      setImages(data);
    } catch (err) {
      console.error("Erro ao carregar imagens:", err);
    }
    setLoading(false);
  };

  useEffect(() => { loadImages(); }, []);

  const handleUpload = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const img = await api.post("/api/images", {
          filename: file.name,
          data: reader.result,
          content_type: file.type
        });
        setImages(prev => [img, ...prev]);
      } catch (err) {
        console.error("Erro ao fazer upload:", err);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDelete = async (id) => {
    try {
      await api.del(`/api/images/${id}`);
      setImages(prev => prev.filter(img => img.id !== id));
    } catch (err) {
      console.error("Erro ao excluir imagem:", err);
    }
  };

  return (
    <div className="image-manager">
      {loading ? (
        <p className="image-manager-empty">Carregando...</p>
      ) : images.length === 0 ? (
        <p className="image-manager-empty">Nenhuma imagem enviada ainda.</p>
      ) : (
        <div className="image-grid">
          {images.map(img => (
            <div key={img.id} className={`image-card ${currentLogo === img.data ? "image-card-active" : ""}`}>
              <img src={img.data} alt={img.filename} className="image-card-img" />
              <span className="image-card-name">{img.filename}</span>
              <div className="image-card-actions">
                <button
                  type="button"
                  className="image-card-use"
                  onClick={() => onSelectLogo(img.data)}
                >
                  Usar Logo
                </button>
                <button
                  type="button"
                  className="image-card-del"
                  onClick={() => handleDelete(img.id)}
                >
                  Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
