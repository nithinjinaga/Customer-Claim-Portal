"use client";

import { useState } from "react";

export type GalleryItem = {
  url: string | null;
  thumbUrl: string | null;
  isImage: boolean;
  name: string;
  size: string;
};

export default function Gallery({ items }: { items: GalleryItem[] }) {
  const [open, setOpen] = useState<GalleryItem | null>(null);

  return (
    <>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((item) => (
          <li key={item.name + item.size} className="overflow-hidden rounded-card border border-line">
            {item.isImage && item.url ? (
              <button
                type="button"
                onClick={() => setOpen(item)}
                className="block w-full cursor-zoom-in"
                aria-label={`Enlarge ${item.name}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.thumbUrl ?? item.url}
                  alt={item.name}
                  className="h-28 w-full object-cover"
                />
              </button>
            ) : !item.isImage && item.url ? (
              <video src={item.url} controls preload="metadata" className="h-28 w-full bg-black object-contain" />
            ) : (
              <div className="flex h-28 items-center justify-center bg-surface text-3xl">
                {item.isImage ? "🖼️" : "🎬"}
              </div>
            )}
            <div className="px-2 py-1.5">
              <p className="truncate text-xs font-medium">{item.name}</p>
              <p className="text-[10px] text-muted">{item.size}</p>
            </div>
          </li>
        ))}
      </ul>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={open.name}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setOpen(null)}
          onKeyDown={(e) => e.key === "Escape" && setOpen(null)}
          tabIndex={-1}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={open.url!} alt={open.name} className="max-h-full max-w-full rounded" />
          <button
            type="button"
            aria-label="Close"
            onClick={() => setOpen(null)}
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-xl text-white hover:bg-white/30"
          >
            ×
          </button>
        </div>
      )}
    </>
  );
}
