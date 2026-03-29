import React from 'react';

export default function Card({ children, className = '', ...props }) {
  return (
    <div 
      className={`relative group p-6 rounded-2xl bg-slate-900/50 border border-slate-800 backdrop-blur-xl shadow-2xl transition-all duration-300 hover:border-slate-700 hover:bg-slate-900/80 ${className}`}
      {...props}
    >
      {/* Subtle top highlight */}
      <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      {children}
    </div>
  );
}
