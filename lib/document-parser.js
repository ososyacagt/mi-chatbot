let pdfParse = null;
let mammoth = null;
let XLSX = null;

async function loadDependencies() {
  try {
    if (!pdfParse) pdfParse = (await import("pdf-parse")).default;
  } catch (e) {
    console.warn("[document-parser] pdf-parse not available");
  }
  try {
    if (!mammoth) mammoth = await import("mammoth");
  } catch (e) {
    console.warn("[document-parser] mammoth not available");
  }
  try {
    if (!XLSX) XLSX = await import("xlsx");
  } catch (e) {
    console.warn("[document-parser] xlsx not available");
  }
}

export async function parsePDF(buffer) {
  try {
    await loadDependencies();
    if (!pdfParse) {
      console.warn("[parsePDF] pdf-parse not available");
      return "";
    }
    const data = await pdfParse(buffer);
    return data.text || "";
  } catch (error) {
    console.error("[parsePDF] Error:", error.message);
    return "";
  }
}

export async function parseWord(buffer) {
  try {
    await loadDependencies();
    if (!mammoth) {
      console.warn("[parseWord] mammoth not available");
      return "";
    }
    const result = await mammoth.extractRawText({ buffer });
    return result.value || "";
  } catch (error) {
    console.error("[parseWord] Error:", error.message);
    return "";
  }
}

export async function parseExcel(buffer) {
  try {
    await loadDependencies();
    if (!XLSX) {
      console.warn("[parseExcel] xlsx not available");
      return "";
    }
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const textos = [];

    workbook.SheetNames.forEach((sheetName) => {
      textos.push(`\n=== Hoja: ${sheetName} ===\n`);
      const worksheet = workbook.Sheets[sheetName];
      const csv = XLSX.utils.sheet_to_csv(worksheet);
      textos.push(csv);
    });

    return textos.join("\n");
  } catch (error) {
    console.error("[parseExcel] Error:", error.message);
    return "";
  }
}

export async function parseImage(buffer, mimeType) {
  try {
    const base64 = buffer.toString("base64");
    return base64;
  } catch (error) {
    console.error("[parseImage] Error:", error.message);
    return null;
  }
}

export async function parseFile(buffer, mimeType, filename) {
  const imageTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  const esImagen = imageTypes.includes(mimeType);

  let contenido = "";
  let base64 = null;

  if (esImagen) {
    base64 = await parseImage(buffer, mimeType);
    contenido = `[Imagen: ${filename}]`;
  } else if (
    mimeType === "application/pdf"
  ) {
    contenido = await parsePDF(buffer);
  } else if (
    mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mimeType === "application/msword"
  ) {
    contenido = await parseWord(buffer);
  } else if (
    mimeType ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    mimeType === "application/vnd.ms-excel"
  ) {
    contenido = await parseExcel(buffer);
  } else {
    console.warn("[parseFile] Tipo de archivo no soportado:", mimeType);
    contenido = "";
  }

  return {
    contenido: contenido || `[No se pudo extraer contenido de ${filename}]`,
    esImagen,
    base64,
  };
}
