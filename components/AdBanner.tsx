import React, { useState, useEffect } from 'react';
import { ExternalLink, X } from 'lucide-react';

const MOCK_ADS = [
  {
    id: 1,
    title: "MOBBRASIL",
    description: "A EMPRESA PARCEIRA DO AGENDEI!",
    cta: "Conhecer",
    link: "https://mobbrasil.com",
    color: "bg-gradient-to-r from-[#002776] to-[#009B3A]",
    textColor: "text-white"
  },
  {
    id: 2,
    title: "Agendei PRO",
    description: "Remova os anúncios e tenha transcrições ilimitadas.",
    cta: "Assinar Agora",
    link: "https://seusite.com/pro",
    color: "bg-gradient-to-r from-[#FEDF00] to-orange-400",
    textColor: "text-[#002776]"
  },
  {
    id: 3,
    title: "Equipamentos para Home Office",
    description: "Microfones e webcams com até 40% de desconto.",
    cta: "Ver Ofertas",
    link: "https://seusite.com/loja",
    color: "bg-gradient-to-r from-slate-800 to-slate-600",
    textColor: "text-white"
  }
];

interface AdBannerProps {
  onClose?: () => void;
}

const AdBanner: React.FC<AdBannerProps> = ({ onClose }) => {
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentAdIndex((prev) => (prev + 1) % MOCK_ADS.length);
    }, 10000); // Rotate ad every 10 seconds

    return () => clearInterval(interval);
  }, []);

  if (!isVisible) return null;

  const ad = MOCK_ADS[currentAdIndex];

  const handleClose = () => {
    setIsVisible(false);
    if (onClose) onClose();
  };

  return (
    <div className={`w-full ${ad.color} ${ad.textColor} p-4 min-h-[75px] rounded-2xl shadow-sm relative overflow-hidden animate-in fade-in duration-500 flex flex-col justify-center`}>
      <button onClick={handleClose} className="absolute top-2 right-2 p-1.5 hover:bg-black/10 rounded-full transition-colors z-10">
        <X size={16} />
      </button>

      <div className="flex flex-wrap items-center justify-between gap-3 pr-6">
        <div className="flex-1 min-w-[160px]">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[9px] font-black uppercase tracking-widest opacity-60 bg-black/10 px-1.5 py-0.5 rounded-md shrink-0">Patrocinado</span>
            <h4 className="font-black text-[14px] uppercase tracking-wide truncate">{ad.title}</h4>
          </div>
          <p className="text-[11.5px] opacity-90 line-clamp-2">{ad.description}</p>
        </div>
        
        <div className="shrink-0">
          <a 
            href={ad.link} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-[11.5px] font-black uppercase tracking-widest bg-white/20 hover:bg-white/30 px-3 py-2 rounded-lg transition-colors"
          >
            {ad.cta} <ExternalLink size={14} />
          </a>
        </div>
      </div>
    </div>
  );
};

export default AdBanner;
