"use client";

import { useEffect, useRef, useState } from "react";
import {
  IMAGE_TYPES,
  VIDEO_TYPES,
  INVOICE_TYPES,
  MAX_IMAGE_BYTES,
  MAX_VIDEO_BYTES,
  MAX_INVOICE_BYTES,
  MAX_EVIDENCE_FILES,
} from "@/lib/validation";
import { Alert } from "@/components/ui";
import {
  IconUploadCloud,
  IconImage,
  IconVideo,
  IconFile,
  IconCamera,
  IconTrash,
} from "@/components/icons";

export type AttachmentMeta = {
  kind: "INVOICE" | "EVIDENCE";
  storagePath: string;
  thumbPath?: string;
  mimeType: string;
  sizeBytes: number;
  originalName: string;
};

export const fmtSize = (b: number) =>
  b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.ceil(b / 1024)} KB`;

function putWithProgress(
  signedUrl: string,
  body: Blob,
  contentType: string,
  onProgress?: (pct: number) => void,
) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", signedUrl);
    xhr.setRequestHeader("content-type", contentType);
    xhr.upload.onprogress = (e) =>
      e.lengthComputable && onProgress?.(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () =>
      xhr.status < 300 ? resolve() : reject(new Error(`Upload failed (${xhr.status})`));
    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.send(body);
  });
}

export class StorageOffError extends Error {}

/** Compress (images), get signed URLs, upload with progress; returns stored metadata. */
export async function uploadFile(
  file: File,
  kind: "INVOICE" | "EVIDENCE",
  onProgress: (pct: number) => void,
): Promise<AttachmentMeta> {
  const isImage = file.type.startsWith("image/");
  let blob: Blob = file;
  let thumbBlob: Blob | null = null;

  if (isImage) {
    const { default: compress } = await import("browser-image-compression");
    blob = await compress(file, { maxSizeMB: 2, maxWidthOrHeight: 2560, useWebWorker: true });
    thumbBlob = await compress(file, {
      maxSizeMB: 0.1,
      maxWidthOrHeight: 300,
      fileType: "image/jpeg",
    });
  }

  const res = await fetch("/api/upload-url", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      fileName: file.name,
      mimeType: file.type,
      sizeBytes: blob.size,
      kind,
      thumbnail: !!thumbBlob,
    }),
  });
  if (res.status === 503) throw new StorageOffError();
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Could not start upload");

  await putWithProgress(json.signedUrl, blob, file.type, onProgress);
  if (thumbBlob && json.thumb) {
    await putWithProgress(json.thumb.signedUrl, thumbBlob, "image/jpeg");
  }

  return {
    kind,
    storagePath: json.path,
    thumbPath: json.thumb?.path,
    mimeType: file.type,
    sizeBytes: blob.size,
    originalName: file.name,
  };
}

type Uploading = { name: string; pct: number };

export function validateFile(file: File, kind: "INVOICE" | "EVIDENCE"): string | null {
  const isVideo = file.type.startsWith("video/");
  if (kind === "INVOICE") {
    if (!INVOICE_TYPES.includes(file.type)) return "Invoice must be a PDF or image (JPG/PNG/WEBP)";
    if (file.size > MAX_INVOICE_BYTES) return "Invoice file exceeds 25MB";
    return null;
  }
  if (isVideo) {
    if (!VIDEO_TYPES.includes(file.type)) return `${file.name}: only MP4 or MOV videos are allowed`;
    if (file.size > MAX_VIDEO_BYTES) return `${file.name}: video exceeds 100MB`;
    return null;
  }
  if (!IMAGE_TYPES.includes(file.type)) return `${file.name}: only JPG, PNG, or WEBP images are allowed`;
  if (file.size > MAX_IMAGE_BYTES) return `${file.name}: image exceeds 10MB`;
  return null;
}

export function ProgressBar({ pct }: { pct: number }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-line">
      <div className="h-full bg-pe-blue transition-all" style={{ width: `${pct}%` }} />
    </div>
  );
}

/** Multi-file drag-and-drop evidence uploader (images + videos). */
export function EvidenceUpload({
  files,
  onChange,
}: {
  files: AttachmentMeta[];
  onChange: (files: AttachmentMeta[]) => void;
}) {
  const [uploading, setUploading] = useState<Uploading[]>([]);
  const [error, setError] = useState<string>();
  const [storageOff, setStorageOff] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const previewsRef = useRef(previews);
  previewsRef.current = previews;
  useEffect(
    () => () => Object.values(previewsRef.current).forEach(URL.revokeObjectURL),
    [],
  );

  async function handleFiles(list: FileList | File[]) {
    setError(undefined);
    const incoming = Array.from(list);
    if (files.length + incoming.length > MAX_EVIDENCE_FILES) {
      setError(`Maximum ${MAX_EVIDENCE_FILES} files in total`);
      return;
    }
    for (const f of incoming) {
      const problem = validateFile(f, "EVIDENCE");
      if (problem) {
        setError(problem);
        continue;
      }
      setUploading((u) => [...u, { name: f.name, pct: 0 }]);
      try {
        const meta = await uploadFile(f, "EVIDENCE", (pct) =>
          setUploading((u) => u.map((x) => (x.name === f.name ? { ...x, pct } : x))),
        );
        if (meta.mimeType.startsWith("image/")) {
          const objUrl = URL.createObjectURL(f);
          setPreviews((p) => ({ ...p, [meta.storagePath]: objUrl }));
        }
        onChange([...files, meta]);
        files = [...files, meta]; // keep loop-local view current for multi-select
      } catch (e) {
        if (e instanceof StorageOffError) setStorageOff(true);
        else setError(e instanceof Error ? e.message : "Upload failed");
      } finally {
        setUploading((u) => u.filter((x) => x.name !== f.name));
      }
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {storageOff && (
        <Alert kind="info">
          File storage is not configured yet, so you can submit the complaint
          without attachments for now.
        </Alert>
      )}
      {error && <Alert kind="error">{error}</Alert>}

      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={`flex cursor-pointer flex-col items-center gap-1 rounded-card border-2 border-dashed px-6 py-10 text-center transition-colors ${
          dragOver ? "border-pe-green bg-green-50" : "border-line bg-surface hover:border-pe-blue"
        }`}
      >
        <IconUploadCloud className="mb-1 h-8 w-8 text-pe-blue" />
        <p className="text-sm font-medium text-ink">Drag &amp; drop files here, or click to browse</p>
        <p className="text-xs text-muted">
          Images JPG/PNG/WEBP up to 10MB · Videos MP4/MOV up to 100MB · max{" "}
          {MAX_EVIDENCE_FILES} files
        </p>
      </div>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={[...IMAGE_TYPES, ...VIDEO_TYPES].join(",")}
        className="hidden"
        onChange={(e) => {
          if (e.target.files) handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          if (e.target.files) handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        onClick={() => cameraRef.current?.click()}
        className="inline-flex items-center gap-1.5 self-start text-sm font-medium text-pe-blue hover:underline sm:hidden"
      >
        <IconCamera className="h-4 w-4" /> Take a photo
      </button>

      {uploading.map((u) => (
        <div key={u.name} className="flex items-center gap-3 text-sm">
          <span className="w-40 truncate">{u.name}</span>
          <ProgressBar pct={u.pct} />
          <span className="tnum w-10 text-right text-xs text-muted">{u.pct}%</span>
        </div>
      ))}

      {files.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {files.map((f, i) => {
            const isImage = f.mimeType.startsWith("image/");
            const preview = previews[f.storagePath];
            return (
              <li key={f.storagePath} className="relative overflow-hidden rounded-card border border-line bg-card">
                <div className="flex h-24 items-center justify-center overflow-hidden bg-surface">
                  {isImage && preview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={preview} alt={f.originalName} className="h-full w-full object-cover" />
                  ) : isImage ? (
                    <IconImage className="h-8 w-8 text-muted" />
                  ) : (
                    <IconVideo className="h-8 w-8 text-muted" />
                  )}
                </div>
                <div className="px-2 py-1.5">
                  <p className="truncate text-xs font-medium">{f.originalName}</p>
                  <p className="tnum text-[10px] text-muted">{fmtSize(f.sizeBytes)}</p>
                </div>
                <button
                  type="button"
                  aria-label={`Remove ${f.originalName}`}
                  onClick={() => {
                    const url = previews[f.storagePath];
                    if (url) {
                      URL.revokeObjectURL(url);
                      setPreviews((p) => {
                        const next = { ...p };
                        delete next[f.storagePath];
                        return next;
                      });
                    }
                    onChange(files.filter((_, j) => j !== i));
                  }}
                  className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-card/90 text-status-rejected shadow-soft transition-colors hover:bg-status-rejected hover:text-white"
                >
                  <IconTrash className="h-3.5 w-3.5" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** Single-file invoice uploader. */
export function InvoiceUpload({
  file,
  onChange,
}: {
  file: AttachmentMeta | null;
  onChange: (file: AttachmentMeta | null) => void;
}) {
  const [pct, setPct] = useState<number | null>(null);
  const [error, setError] = useState<string>();
  const [storageOff, setStorageOff] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-col gap-2">
      {storageOff && (
        <Alert kind="info">Storage not configured, invoice upload skipped for now.</Alert>
      )}
      {error && <Alert kind="error">{error}</Alert>}
      {file ? (
        <div className="flex items-center justify-between gap-3 rounded-card border border-line px-3 py-2.5 text-sm">
          <span className="flex min-w-0 items-center gap-2">
            <IconFile className="h-4 w-4 shrink-0 text-pe-blue" />
            <span className="truncate">{file.originalName}</span>
            <span className="shrink-0 text-xs text-muted">({fmtSize(file.sizeBytes)})</span>
          </span>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="shrink-0 text-xs font-medium text-status-rejected hover:underline"
          >
            Remove
          </button>
        </div>
      ) : pct !== null ? (
        <ProgressBar pct={pct} />
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="rounded-card border-2 border-dashed border-line bg-surface px-4 py-3 text-sm text-muted hover:border-pe-blue"
        >
          Upload invoice copy (PDF or image, max 25MB)
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={INVOICE_TYPES.join(",")}
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          setError(undefined);
          const problem = validateFile(f, "INVOICE");
          if (problem) {
            setError(problem);
            return;
          }
          setPct(0);
          try {
            const meta = await uploadFile(f, "INVOICE", setPct);
            onChange(meta);
          } catch (err) {
            if (err instanceof StorageOffError) setStorageOff(true);
            else setError(err instanceof Error ? err.message : "Upload failed");
          } finally {
            setPct(null);
          }
        }}
      />
    </div>
  );
}
