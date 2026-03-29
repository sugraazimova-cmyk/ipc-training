import React from 'react';

export function PhotoBackground({ children }) {
  return (
    <div className="relative min-h-screen w-full">
      {/* Background */}
      <div className="fixed inset-0 z-0">
        <img
          src="/background.png"
          alt="background"
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/50" />
      </div>

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
