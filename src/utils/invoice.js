import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import QRCode from "qrcode";
import { gerarPix } from "./pix";

const CAPTURE_SCALE = 2;
const PDF_MARGIN = 8;

export const generateQrCode = async (pagamento, total) => {
  let chaveLimpa = pagamento.pix.trim();
  const isEmail = chaveLimpa.includes("@");
  const isAleatoria = chaveLimpa.length > 20 && /[a-zA-Z]/.test(chaveLimpa) && !isEmail;
  if (!isEmail && !isAleatoria) {
    chaveLimpa = chaveLimpa.replace(/[^\d+]/g, "");
  }
  const payload = gerarPix({
    chave: chaveLimpa,
    nome: pagamento.nome || "EMPRESA",
    cidade: pagamento.cidade || "RIO",
    valor: total,
  });
  return await QRCode.toDataURL(payload);
};

const captureElement = async (element, width) => {
  const wrap = document.createElement("div");
  wrap.style.cssText = `position:absolute;left:-9999px;top:0;width:${width}px;background:#fff`;
  wrap.appendChild(element);
  document.body.appendChild(wrap);
  const canvas = await html2canvas(wrap, {
    scale: CAPTURE_SCALE, useCORS: true, allowTaint: true, backgroundColor: "#ffffff", logging: false,
  });
  document.body.removeChild(wrap);
  return canvas;
};

const groupRowsIntoPages = (rows, availableHeights) => {
  const groups = [];
  let cur = [];
  let h = 0;
  for (let i = 0; i < rows.length; i++) {
    const pageIdx = groups.length;
    const ah = availableHeights[Math.min(pageIdx, availableHeights.length - 1)];
    const rh = rows[i].offsetHeight;
    if (h + rh > ah && cur.length > 0) {
      groups.push(cur);
      cur = [i];
      h = rh;
    } else {
      cur.push(i);
      h += rh;
    }
  }
  if (cur.length > 0) groups.push(cur);
  return groups;
};

export const downloadInvoicePDF = async (elementId, filename, orientation) => {
  const el = document.getElementById(elementId);
  if (!el) return;

  const hadLock = el.classList.contains("is-locked");
  const naturalWidth = el.offsetWidth;

  const isLandscape = orientation === "l" ? true : orientation === "p" ? false : naturalWidth > 793;
  const pageWidthMm = isLandscape ? 297 : 210;
  const pageHeightMm = isLandscape ? 210 : 297;
  const margin = PDF_MARGIN;
  const contentW = pageWidthMm - 2 * margin;
  const contentH = pageHeightMm - 2 * margin;
  const pxPerMm = naturalWidth / pageWidthMm;
  const pageHeightPx = Math.round(pageHeightMm * pxPerMm);

  const measContainer = document.createElement("div");
  measContainer.style.cssText = `position:absolute;left:-9999px;top:0;width:${naturalWidth}px`;
  document.body.appendChild(measContainer);

  const measClone = el.cloneNode(true);
  measClone.style.cssText = "transform:none !important;margin:0 !important;width:100%";
  if (hadLock) measClone.classList.remove("is-locked");
  measContainer.appendChild(measClone);
  await new Promise(r => requestAnimationFrame(r));

  const table = measClone.querySelector(".os-table, .invoice-table");
  const tbody = table ? table.querySelector("tbody") : null;
  const rows = tbody ? Array.from(tbody.querySelectorAll("tr")) : [];

  try {
    const pdf = new jsPDF(isLandscape ? "l" : "p", "mm", "a4");

    if (rows.length > 1 && table) {
      const thead = table.querySelector("thead");
      const headerEl = measClone.querySelector(".os-header, .invoice-header");
      const footerEl = measClone.querySelector(".os-footer, .invoice-footer");
      const extraEls = measClone.querySelectorAll(".os-title, .os-period, .invoice-title");

      let fixedH = 0;
      if (headerEl) fixedH += headerEl.offsetHeight;
      extraEls.forEach(e => { fixedH += e.offsetHeight; const ms = parseFloat(getComputedStyle(e).marginBottom) || 0; fixedH += ms; });
      if (thead) fixedH += thead.offsetHeight;
      if (footerEl) fixedH += footerEl.offsetHeight;

      const rowArea1 = pageHeightPx - fixedH - 10;
      let fixedHNoHeader = 0;
      if (thead) fixedHNoHeader += thead.offsetHeight;
      if (footerEl) fixedHNoHeader += footerEl.offsetHeight;
      const rowArea2 = pageHeightPx - fixedHNoHeader - 10;
      const pageGroups = groupRowsIntoPages(rows, [rowArea1, rowArea2]);

      measContainer.parentNode.removeChild(measContainer);

      for (let g = 0; g < pageGroups.length; g++) {
        const pageClone = el.cloneNode(true);
        pageClone.style.cssText = "transform:none !important;margin:0 !important;width:100%";
        if (hadLock) pageClone.classList.remove("is-locked");

        if (g > 0) {
          const header = pageClone.querySelector(".invoice-header, .os-header");
          if (header) header.remove();
          const extra = pageClone.querySelectorAll(".os-title, .os-period, .invoice-title");
          extra.forEach(e => e.remove());
        }

        if (g < pageGroups.length - 1) {
          const footer = pageClone.querySelector(".invoice-footer, .os-footer");
          if (footer) footer.remove();
        }

        const pt = pageClone.querySelector(".os-table, .invoice-table");
        const ptb = pt ? pt.querySelector("tbody") : null;
        if (ptb) {
          Array.from(ptb.querySelectorAll("tr")).forEach((r, idx) => {
            if (!pageGroups[g].includes(idx)) r.remove();
          });
        }

        const canvas = await captureElement(pageClone, naturalWidth);
        if (g > 0) pdf.addPage();
        pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, pageWidthMm, pageHeightMm);
        pdf.setFontSize(8);
        pdf.setTextColor(150);
        pdf.text(`${g + 1} de ${pageGroups.length}`, pageWidthMm - 10, pageHeightMm - 5, { align: "right" });
      }
    } else {
      const canvas = await captureElement(measClone, naturalWidth);
      measContainer.parentNode.removeChild(measContainer);

      const totalHeightMm = (canvas.height / canvas.width) * contentW;
      const numPages = Math.max(1, Math.ceil(totalHeightMm / contentH));

      for (let i = 0; i < numPages; i++) {
        if (i > 0) pdf.addPage();
        pdf.addImage(canvas.toDataURL("image/png"), "PNG", margin, -i * contentH, contentW, totalHeightMm);
        pdf.setFontSize(8);
        pdf.setTextColor(150);
        pdf.text(`${i + 1} de ${numPages}`, pageWidthMm - 10, pageHeightMm - 5, { align: "right" });
      }
    }

    pdf.save(filename + ".pdf");
  } catch (error) {
    console.error("Erro ao gerar PDF:", error);
    alert("Erro ao gerar PDF: " + error.message);
  } finally {
    if (measContainer.parentNode) {
      document.body.removeChild(measContainer);
    }
  }
};
