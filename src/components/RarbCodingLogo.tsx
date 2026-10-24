import React from 'react';

export const RarbCodingLogo = () => (
  <div className="flex flex-col items-center opacity-50 hover:opacity-100 transition-opacity pb-8 mt-12 mb-4">
    <div className="flex items-center space-x-3 group transform scale-75 origin-top">
      <svg className="w-12 h-12 transition-transform duration-300 group-hover:scale-105" viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M10 12 L10 88 L52 88 C72 88 84 74 84 50 C84 26 72 12 52 12 Z" fill="none" stroke="#FFFFFF" strokeWidth="6" strokeLinejoin="round" />
        <path d="M17 42 C12 42 12 49 8 50 C12 51 12 58 17 58" fill="none" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" />
        <path d="M30 64 L30 36 L54 36 C64 36 68 42 68 49 C68 56 61 60 52 60 L30 60" fill="none" stroke="#00F2FE" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M48 58 L72 90 L108 34" fill="none" stroke="#00F2FE" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
        <polygon points="108,24 94,40 116,44" fill="#FFFFFF" />
      </svg>
      <div className="flex flex-col text-left">
        <span className="text-[9px] text-white/80 uppercase tracking-[0.3em] mb-0.5">Desenvolvido por</span>
        <span className="text-xl font-extrabold tracking-wider font-mono text-white leading-none">
          Rar<span className="text-[#00F2FE]">b</span><span className="relative inline-block border-b-2 border-[#00F2FE] pb-0.5">_CODING</span>
        </span>
        <span className="text-[8px] tracking-[0.25em] uppercase text-gray-400 font-mono font-bold mt-1">Software Development</span>
      </div>
    </div>
  </div>
);
