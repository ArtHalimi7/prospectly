import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DarkVeil from './DarkVeil';

const Hero = () => {
  const [query, setQuery] = useState('');
  const [minRating, setMinRating] = useState(4.0);
  const [maxLeads, setMaxLeads] = useState(10);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    // Redirect to dashboard/scraper with the query parameters
    navigate(`/dashboard?scrape=true&q=${encodeURIComponent(query.trim())}&rating=${minRating}&limit=${maxLeads}`);
  };

  const quickPresets = [
    { label: 'Dachdecker Hamburg', q: 'Dachdecker Hamburg' },
    { label: 'Autohandel Zürich', q: 'Autohandel Zürich' },
    { label: 'Autosallon Prishtinë', q: 'Autosallon Prishtinë' },
    { label: 'Sanitär Wien', q: 'Sanitär Wien' },
  ];

  return (
    <section className="relative min-h-screen pt-24 pb-16 px-6 md:px-12 flex flex-col items-center justify-center text-center overflow-hidden bg-[#050507]">
      
      {/* 1. Animated DarkVeil Shader Texture & Grunge Layer (Seamless Full Viewport) */}
      <div className="absolute inset-0 w-full h-full pointer-events-none z-0 opacity-80 mix-blend-screen overflow-hidden">
        <DarkVeil
          hueShift={0}
          noiseIntensity={0.14}
          scanlineIntensity={0.18}
          speed={0.45}
          scanlineFrequency={0}
          warpAmount={0.12}
          resolutionScale={1}
        />
      </div>

      {/* 2. Seamless Full-Width Radial Glow (Zero Hard Edges or Cut-Off Boxes) */}
      <div className="absolute inset-0 w-full h-full pointer-events-none z-0">
        {/* Soft top-down radial light centered seamlessly */}
        <div className="absolute top-0 left-0 right-0 h-[600px] bg-[radial-gradient(ellipse_100%_80%_at_50%_0%,rgba(140,130,255,0.12),rgba(255,255,255,0.04)_40%,transparent_70%)]"></div>
        {/* Subtle bottom/side vignette so edges blend to pure black */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_40%,#050507_100%)]"></div>
      </div>

      {/* Main Centered Content */}
      <div className="relative z-10 w-full max-w-3xl mx-auto flex flex-col items-center">
        
        {/* Subtle Tagline */}
        <div className="flex items-center gap-2 mb-6 text-zinc-500 text-xs font-mono-accent uppercase tracking-[0.25em]">
          <span className="w-1 h-1 rounded-full bg-zinc-400"></span>
          <span>Google Maps Client Acquisition</span>
          <span className="w-1 h-1 rounded-full bg-zinc-400"></span>
        </div>

        {/* Headline */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-[-0.035em] text-white leading-[1.05] mb-5 font-display select-none">
          Top-rated businesses. <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-b from-zinc-200 via-zinc-400 to-zinc-600">
            Zero website.
          </span>
        </h1>

        {/* Subtitle */}
        <p className="max-w-md text-zinc-400 text-sm md:text-[15px] font-light leading-relaxed mb-10 tracking-normal">
          Search any city or industry. Extract verified Google Maps leads with high star ratings and no website, then reach out directly on WhatsApp.
        </p>

        {/* Pill-Shaped Search & Typing Bar */}
        <form onSubmit={handleSearch} className="w-full max-w-xl relative mb-5 group">
          <div className="relative rounded-full bg-zinc-950/80 border border-zinc-800 hover:border-zinc-700 focus-within:border-zinc-500 backdrop-blur-2xl p-2 pl-5 pr-2 transition-all duration-300 shadow-[0_20px_50px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.08)] flex items-center gap-3">
            
            {/* Search Icon */}
            <div className="text-zinc-500 group-focus-within:text-zinc-300 transition-colors shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
            </div>

            {/* Input field */}
            <input
              type="text"
              placeholder="e.g. Autohandel Zürich, Dachdecker Hamburg..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-transparent border-none text-white placeholder-zinc-500 focus:outline-none focus:ring-0 text-sm font-normal py-1"
            />

            {/* Filter Toggle Chip */}
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-mono-accent uppercase tracking-wider transition-all duration-200 flex items-center gap-1.5 shrink-0 ${
                showAdvanced 
                  ? 'bg-zinc-800 text-white border border-zinc-600 shadow-[0_0_15px_rgba(255,255,255,0.1)]' 
                  : 'text-zinc-400 hover:text-zinc-200 bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800/80'
              }`}
              title="Filters"
            >
              <div className="flex items-center gap-1">
                <span>{minRating.toFixed(1)}</span>
                <svg className="w-3 h-3 text-amber-400 fill-amber-400" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </div>
              <svg className={`w-2.5 h-2.5 text-zinc-500 transition-transform duration-200 ${showAdvanced ? 'rotate-180 text-white' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Submit Button */}
            <button
              type="submit"
              className="h-9 px-5 bg-white hover:bg-zinc-200 text-black text-xs font-semibold rounded-full transition-all duration-200 shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:shadow-[0_0_25px_rgba(255,255,255,0.4)] shrink-0 flex items-center gap-1.5 cursor-pointer font-mono-accent uppercase tracking-wider"
            >
              <span>Search</span>
              <span className="text-[10px] text-zinc-500">↵</span>
            </button>
          </div>
        </form>

        {/* Quick Search Preset Pills */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
          <span className="text-[11px] font-mono-accent text-zinc-600">Quick search:</span>
          {quickPresets.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => setQuery(item.q)}
              className="text-[11px] px-3 py-1 rounded-full bg-zinc-950/60 hover:bg-zinc-900 border border-zinc-800/80 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200 transition-all font-mono-accent"
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Minimal Expandable Filter Drawer */}
        {showAdvanced && (
          <div className="w-full max-w-xl bg-zinc-950/90 rounded-2xl p-5 text-left border border-zinc-800 shadow-2xl animate-slide-down backdrop-blur-xl">
            <div className="flex items-center justify-between mb-4 border-b border-zinc-800/80 pb-2.5">
              <span className="text-[11px] font-mono-accent font-semibold tracking-[0.2em] uppercase text-zinc-400">
                Extraction Parameters
              </span>
              <span className="text-[10px] text-zinc-500 font-mono-accent">Custom thresholds</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-xs font-mono-accent text-zinc-400">Minimum Rating</span>
                  <span className="text-xs font-mono-accent font-bold text-white bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800 flex items-center gap-1">
                    <span>{minRating.toFixed(1)}</span>
                    <svg className="w-3 h-3 text-amber-400 fill-amber-400" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  </span>
                </div>
                <input
                  type="range"
                  min="3.0"
                  max="5.0"
                  step="0.1"
                  value={minRating}
                  onChange={(e) => setMinRating(parseFloat(e.target.value))}
                  className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-white"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-xs font-mono-accent text-zinc-400">Batch Limit</span>
                  <span className="text-xs font-mono-accent font-bold text-white bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                    {maxLeads} Leads
                  </span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="50"
                  step="5"
                  value={maxLeads}
                  onChange={(e) => setMaxLeads(parseInt(e.target.value))}
                  className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-white"
                />
              </div>
            </div>
          </div>
        )}

      </div>

    </section>
  );
};

export default Hero;