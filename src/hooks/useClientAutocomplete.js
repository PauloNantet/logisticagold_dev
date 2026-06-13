import { useState, useRef, useEffect } from "react";

export function useClientAutocomplete(clients, updateFn, clearErrorsFn) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredClients, setFilteredClients] = useState([]);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const suggestionsRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target)) {
        setShowSuggestions(false);
        setFocusedIndex(-1);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (focusedIndex >= 0 && suggestionsRef.current) {
      const activeItem = suggestionsRef.current.children[focusedIndex];
      if (activeItem) {
        activeItem.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }
  }, [focusedIndex]);

  const handleNameChange = (val) => {
    updateFn("cliente", "nome", val);
    if (val.length > 0) {
      const filtered = (clients || []).filter(c =>
        c.nome.toLowerCase().includes(val.toLowerCase())
      );
      setFilteredClients(filtered);
      setShowSuggestions(true);
      setFocusedIndex(-1);
    } else {
      setShowSuggestions(false);
      setFocusedIndex(-1);
    }
  };

  const selectClient = (client) => {
    updateFn("cliente", "nome", client.nome);
    updateFn("cliente", "documento", (client.documento || "").replace(/\D/g, ""));
    updateFn("cliente", "email", client.email);
    updateFn("cliente", "endereco", client.endereco);
    updateFn("responsavel", "nome", client.responsavelNome || "");
    if (clearErrorsFn) {
      clearErrorsFn("clienteNome");
      clearErrorsFn("clienteDocumento");
      clearErrorsFn("clienteEmail");
      clearErrorsFn("clienteEndereco");
      clearErrorsFn("responsavelNome");
      clearErrorsFn("responsavelTelefone");
    }
    setShowSuggestions(false);
    setFocusedIndex(-1);
  };

  const handleKeyDown = (e) => {
    if (!showSuggestions || filteredClients.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedIndex(prev => (prev < filteredClients.length - 1 ? prev + 1 : prev));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedIndex(prev => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === "Enter") {
      if (focusedIndex >= 0) {
        e.preventDefault();
        selectClient(filteredClients[focusedIndex]);
      }
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
      setFocusedIndex(-1);
    }
  };

  return {
    showSuggestions,
    filteredClients,
    focusedIndex,
    suggestionsRef,
    handleNameChange,
    selectClient,
    handleKeyDown,
  };
}
