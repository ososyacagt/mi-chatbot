"use client";

import { useEffect, useRef, useState } from "react";
import ConfirmModal from "./ConfirmModal";
import Toast from "./Toast";

function getFileIcon(type) {
  if (type.includes("pdf")) return "📄";
  if (type.includes("word") || type.includes("document")) return "📝";
  if (type.includes("sheet") || type.includes("excel")) return "📊";
  if (type.includes("html")) return "🌐";
  if (type.includes("image")) return "🖼️";
  return "📎";
}

function formatFileSize(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString("es-ES", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function DocumentsSection({ clientId }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [toast, setToast] = useState({ message: "", type: "success" });
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: null,
    type: "danger",
  });
  const [deletingId, setDeletingId] = useState(null);
  const fileInputRef = useRef(null);

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  const ACCEPTED_TYPES = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/html",
    "application/xhtml+xml",
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
  ];

  useEffect(() => {
    if (clientId) {
      loadDocuments();
    }
  }, [clientId]);

  async function loadDocuments() {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/documents?clientId=${clientId}`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error);
      setDocuments(data.documents || []);
    } catch (error) {
      console.error("Error cargando documentos:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleFileUpload(file) {
    if (file.size > MAX_FILE_SIZE) {
      setToast({
        message: `✗ El archivo es muy grande. Máximo: ${formatFileSize(MAX_FILE_SIZE)}`,
        type: "error"
      });
      return;
    }

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setToast({
        message: "✗ Tipo de archivo no soportado. Acepto: PDF, Word, Excel, imágenes",
        type: "error"
      });
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(0);

      const formData = new FormData();
      formData.append("clientId", clientId);
      formData.append("file", file);

      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          setUploadProgress((e.loaded / e.total) * 100);
        }
      });

      xhr.addEventListener("load", async () => {
        if (xhr.status === 201) {
          await loadDocuments();
          setUploadProgress(0);
          setToast({ message: "✓ Documento subido correctamente", type: "success" });
        } else {
          const error = JSON.parse(xhr.responseText);
          setToast({ message: `✗ Error: ${error.error}`, type: "error" });
        }
      });

      xhr.addEventListener("error", () => {
        setToast({ message: "✗ Error al subir el archivo", type: "error" });
      });

      xhr.open("POST", "/api/admin/documents");
      xhr.send(formData);
    } catch (error) {
      console.error("Error:", error);
      setToast({ message: "✗ Error al subir el archivo", type: "error" });
    } finally {
      setUploading(false);
    }
  }

  function openDeleteConfirm(docId) {
    setConfirmModal({
      isOpen: true,
      title: "Eliminar documento",
      message: "¿Estás seguro de que deseas eliminar este documento?",
      confirmText: "Eliminar",
      onConfirm: () => handleDelete(docId),
      type: "danger",
    });
  }

  async function handleDelete(docId) {
    try {
      setDeletingId(docId);
      const res = await fetch(`/api/admin/documents/${docId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Error al eliminar");
      await loadDocuments();
      setToast({ message: "✓ Documento eliminado correctamente", type: "success" });
      setConfirmModal({ ...confirmModal, isOpen: false });
    } catch (error) {
      console.error("Error:", error);
      setToast({ message: "✗ Error al eliminar documento", type: "error" });
      setConfirmModal({ ...confirmModal, isOpen: false });
    } finally {
      setDeletingId(null);
    }
  }

  function handleDragEnter(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }

  function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }

  function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  }

  return (
    <div className="mt-8 pt-8 border-t border-zinc-200 dark:border-zinc-800">
      <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
        📚 Documentos Base
      </h3>

      {/* Zona de drag & drop */}
      <div
        onDragEnter={!uploading ? handleDragEnter : undefined}
        onDragLeave={!uploading ? handleDragLeave : undefined}
        onDragOver={!uploading ? handleDragOver : undefined}
        onDrop={!uploading ? handleDrop : undefined}
        onClick={() => !uploading && fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          uploading
            ? "border-zinc-300 dark:border-zinc-700 cursor-not-allowed opacity-50"
            : dragActive
            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 cursor-pointer"
            : "border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-600 cursor-pointer"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
          accept={ACCEPTED_TYPES.join(",")}
          className="hidden"
          disabled={uploading}
        />

        <div className="text-4xl mb-2">📤</div>
        <p className="font-medium text-zinc-900 dark:text-white">
          {uploading ? "Subiendo..." : "Arrastra archivos aquí o haz clic"}
        </p>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          PDF, Word, Excel, HTML, imágenes • Máximo 10MB
        </p>

        {uploading && (
          <div className="mt-4 bg-zinc-200 dark:bg-zinc-700 rounded-full h-2 overflow-hidden">
            <div
              className="bg-blue-600 h-full transition-all"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        )}
      </div>

      {/* Lista de documentos */}
      <div className="mt-6">
        {loading ? (
          <div className="text-center py-8 text-zinc-500">Cargando documentos...</div>
        ) : documents.length === 0 ? (
          <div className="text-center py-8 text-zinc-500">
            No hay documentos subidos aún
          </div>
        ) : (
          <div className="space-y-2">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className="text-2xl flex-shrink-0">
                    {getFileIcon(doc.tipo)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-zinc-900 dark:text-white truncate">
                      {doc.nombre}
                    </p>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      {formatFileSize(doc.tamanio)} • {formatDate(doc.created_at)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => openDeleteConfirm(doc.id)}
                  disabled={deletingId === doc.id}
                  className="ml-4 flex-shrink-0 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Eliminar documento"
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        type={confirmModal.type}
      />

      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: "", type: "success" })}
      />
    </div>
  );
}
