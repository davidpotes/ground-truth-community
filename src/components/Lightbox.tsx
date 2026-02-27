/**
 * Lightbox.tsx — Image gallery and lightbox modal component
 * 
 * Provides grid gallery with full-screen overlay for viewing asset photos.
 * Features keyboard navigation and responsive layout.
 */

"use client";

import { useState } from "react";

export function Gallery({ images }: { images: { src: string; alt: string }[] }) {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {images.map((img, i) => (
          <div
            key={img.src}
            className="aspect-square rounded-lg border border-white/5 overflow-hidden cursor-pointer"
            onClick={() => setOpen(i)}
          >
            <img
              src={img.src}
              alt={img.alt}
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {open !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => setOpen(null)}
        >
          {/* Close */}
          <button
            className="absolute top-4 right-4 text-white/60 hover:text-white text-3xl z-10"
            onClick={() => setOpen(null)}
          >
            ✕
          </button>

          {/* Prev */}
          {open > 0 && (
            <button
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white text-4xl z-10 p-2"
              onClick={(e) => { e.stopPropagation(); setOpen(open - 1); }}
            >
              ‹
            </button>
          )}

          {/* Next */}
          {open < images.length - 1 && (
            <button
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white text-4xl z-10 p-2"
              onClick={(e) => { e.stopPropagation(); setOpen(open + 1); }}
            >
              ›
            </button>
          )}

          {/* Image */}
          <img
            src={images[open].src}
            alt={images[open].alt}
            className="max-h-[90vh] max-w-[90vw] object-contain"
            onClick={(e) => e.stopPropagation()}
          />

          {/* Caption */}
          <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/50 text-sm text-center max-w-lg">
            {images[open].alt}
          </p>

          {/* Counter */}
          <p className="absolute top-4 left-4 text-white/40 text-sm">
            {open + 1} / {images.length}
          </p>
        </div>
      )}
    </>
  );
}
