import { useState, useRef, useEffect } from "react";

export function useEntityAutocomplete(entities, field) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredItems, setFilteredItems] = useState([]);
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

  const handleChange = (val, filterFn) => {
    if (val.length > 0) {
      const filtered = (entities || []).filter(c =>
        filterFn ? filterFn(c, val) : c[field || "nome"].toLowerCase().includes(val.toLowerCase())
      );
      setFilteredItems(filtered);
      setShowSuggestions(true);
      setFocusedIndex(-1);
    } else {
      setShowSuggestions(false);
      setFocusedIndex(-1);
    }
  };

  const handleKeyDown = (e, onSelect) => {
    if (!showSuggestions || filteredItems.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedIndex(prev => (prev < filteredItems.length - 1 ? prev + 1 : prev));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedIndex(prev => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === "Enter") {
      if (focusedIndex >= 0) {
        e.preventDefault();
        onSelect(filteredItems[focusedIndex]);
      }
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
      setFocusedIndex(-1);
    }
  };

  const selectItem = (item, onSelect) => {
    onSelect(item);
    setShowSuggestions(false);
    setFocusedIndex(-1);
  };

  return {
    showSuggestions,
    filteredItems,
    focusedIndex,
    suggestionsRef,
    handleChange,
    handleKeyDown,
    selectItem,
    setShowSuggestions,
    setFocusedIndex,
  };
}
