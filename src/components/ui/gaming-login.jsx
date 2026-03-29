import React, { useRef, useState } from 'react';
import { Camera } from 'lucide-react';

const STORAGE_KEY = 'ipc_bg_image';

export function PhotoBackground({ children }) {
  const [imageUrl, setImageUrl] = useState(() => localStorage.getItem(STORAGE_KEY) || '');
  const fileInputRef = useRef(null);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);

    // Convert to base64 so it persists across refreshes
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target.result;
      localStorage.setItem(STORAGE_KEY, base64);
      setImageUrl(base64);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="relative min-h-screen w-full">
      {/* Background */}
      <div className="fixed inset-0 z-0">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt="background"
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900" />
        )}
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/50" />
      </div>

      {/* Change background button */}
      <button
        onClick={() => fileInputRef.current?.click()}
        title="Arxa fon şəklini dəyiş"
        className="fixed bottom-4 right-4 z-50 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/40 border border-white/20 text-white/60 hover:text-white hover:bg-black/60 text-xs transition-all backdrop-blur-sm"
      >
        <Camera size={13} />
        Arxa fon
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />

      {/* Content */}
      <div className="relative z-10 w-full min-h-screen flex items-center justify-center px-4 py-12">
        {children}
      </div>
    </div>
  );
}

export function GlassCard({ children, className = '' }) {
  return (
    <div className={`rounded-2xl backdrop-blur-sm bg-black/50 border border-white/10 p-8 ${className}`}>
      {children}
    </div>
  );
}
