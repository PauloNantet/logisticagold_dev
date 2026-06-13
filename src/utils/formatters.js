export const formatDateBR = (val) => {
  if (!val) return "";
  if (val.includes("/")) return val;
  const parts = val.split("-");
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return val;
};

export const formatPhone = (val) => {
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
    } else if (chunk.length === 2) {
      parts.push(`${chunk} `);
    } else {
      parts.push(chunk);
    }
    i += take;
  }
  return parts.join(" / ");
};

export const handlePhoneKeyDown = (e, updater) => {
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

export const handlePhoneInput = (e, updater) => {
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

export const autoResize = (el) => {
  if (!el) return;
  el.style.height = "38px";
  el.style.height = Math.max(38, el.scrollHeight) + "px";
};

export const formatDateMask = (val) => {
  const digits = val.replace(/\D/g, "").slice(0, 8);
  if (!digits) return "";
  let formatted = digits.slice(0, 2);
  if (digits.length > 2) formatted += "/" + digits.slice(2, 4);
  if (digits.length > 4) formatted += "/" + digits.slice(4);
  return formatted;
};

export const formatCurrency = (val) => {
  let digits = val.replace(/\D/g, "");
  if (!digits) return "";
  digits = digits.replace(/^0+/, "") || "0";
  while (digits.length < 3) digits = "0" + digits;
  const intPart = digits.slice(0, -2);
  const decPart = digits.slice(-2);
  const formatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${formatted},${decPart}`;
};
