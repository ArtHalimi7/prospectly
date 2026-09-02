import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import DarkVeil from './DarkVeil';
import { AlertCircle, Lock, ArrowRight } from 'lucide-react';

const Hero = () => {
  const { isAuthenticated } = useAuth();
  const [query, setQuery] = useState('');
  const [minRating, setMinRating] = useState(4.0);
  const [maxLeads, setMaxLeads] = useState(10);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [authError, setAuthError] = useState(false);
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    // Check if user is logged in
    if (!isAuthenticated) {
      setAuthError(true);
      return;
    }
    
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
    <section className="relative min-h-screen pt-28 pb-20 px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center text-center overflow-hidden bg-[#050507]">
      
      {/* 1. Animated Monochrome DarkVeil Shader Texture (Silver / Gray) */}
      <div className="absolute inset-0 w-full h-full pointer-events-none z-0 opacity-40 mix-blend-screen overflow-hidden">
        <DarkVeil
          hueShift={0}
          noiseIntensity={0.12}
          scanlineIntensity={0.14}
          speed={0.35}
          scanlineFrequency={0}
          warpAmount={0.1}
          resolutionScale={1}
          grayscale={true}
        />
      </div>

      {/* 2. Layered Luxury Matrix Grid Texture with Radial Mask */}
      <div className="absolute inset-0 bg-mesh-dots opacity-35 mask-radial-fade pointer-events-none z-0" />
      <div className="absolute inset-0 bg-mesh-fine opacity-20 mask-radial-fade pointer-events-none z-0" />

      {/* 3. Cohesive Ambient Glows */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[380px] bg-gradient-to-b from-white/[0.07] via-zinc-400/[0.03] to-transparent rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-[850px] h-[280px] bg-gradient-to-t from-white/[0.03] to-transparent rounded-full blur-2xl"></div>
      </div>

      {/* Main Centered Content */}
      <div className="relative z-10 w-full max-w-4xl mx-auto flex flex-col items-center">
        
        {/* Subtle Live Badge Chip */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-950/70 border border-white/[0.1] backdrop-blur-xl shadow-inner mb-6 animate-fade-scale hover:border-white/20 transition-all cursor-default">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-[11px] font-mono-accent uppercase tracking-widest text-zinc-300 font-medium">
            Autonomous Pipeline Active
          </span>
        </div>

        {/* Feature Icon Graphic with subtle glow pulse */}
        <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-b from-zinc-800/90 to-zinc-950 border border-white/[0.18] p-3.5 text-white shadow-[0_12px_35px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.25)] mb-6 flex items-center justify-center group hover:scale-105 transition-transform duration-300">
          <div className="absolute inset-0 rounded-2xl bg-white/[0.04] opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
          <svg className="w-8 h-8 text-white group-hover:rotate-6 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
        </div>

        {/* Headline matching ComingSoon typography */}
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight font-display mb-4 text-white leading-[1.1] select-none">
          Top-rated businesses. <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-b from-white via-zinc-200 to-zinc-400">
            Zero website.
          </span>
        </h1>

        {/* Subtitle matching ComingSoon typography */}
        <p className="max-w-2xl text-zinc-400 text-sm sm:text-base leading-relaxed font-light mb-8">
          Search any city or industry. Extract verified local businesses with high star ratings and no website, enrich owner contacts with OSINT + Gemini AI, and reach out directly.
        </p>

        {/* Pill-Shaped Search & Typing Bar */}
        <form onSubmit={handleSearch} className="w-full max-w-xl relative mb-4 group">
          <div className="relative rounded-full bg-zinc-950/85 border border-white/[0.14] hover:border-white/[0.3] focus-within:border-white/50 backdrop-blur-2xl p-2 pl-5 pr-2 transition-all duration-300 shadow-[0_20px_50px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.1)] hover:shadow-[0_25px_60px_rgba(0,0,0,0.95),0_0_35px_rgba(255,255,255,0.04)] flex items-center gap-3">
            
            {/* Search Icon */}
            <div className="text-zinc-500 group-focus-within:text-white transition-colors duration-200 shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
            </div>

            {/* Input field */}
            <input
              type="text"
              placeholder="e.g. Autohandel Zürich, Dachdecker Hamburg..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                if (authError) setAuthError(false);
              }}
              className="w-full bg-transparent border-none text-white placeholder-zinc-500 focus:outline-none focus:ring-0 text-sm font-normal py-1 transition-all"
            />

            {/* Filter Toggle Chip */}
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-mono-accent uppercase tracking-wider transition-all duration-200 flex items-center gap-1.5 shrink-0 btn-press ${
                showAdvanced 
                  ? 'bg-zinc-800 text-white border border-white/20 shadow-[0_0_15px_rgba(255,255,255,0.1)]' 
                  : 'text-zinc-400 hover:text-zinc-200 bg-zinc-900/60 hover:bg-zinc-900 border border-white/[0.08] hover:border-white/20'
              }`}
              title="Filters"
            >
              <div className="flex items-center gap-1">
                <span>{minRating.toFixed(1)}</span>
                <svg className="w-3 h-3 text-amber-400 fill-amber-400" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </div>
              <svg className={`w-2.5 h-2.5 text-zinc-500 transition-transform duration-300 ${showAdvanced ? 'rotate-180 text-white' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Submit Button */}
            <button
              type="submit"
              className="h-9 px-5 bg-white hover:bg-zinc-200 text-black text-xs font-semibold rounded-full transition-all duration-300 shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:shadow-[0_0_28px_rgba(255,255,255,0.4)] shrink-0 flex items-center gap-1.5 cursor-pointer font-mono-accent uppercase tracking-wider btn-press hover:scale-[1.02]"
            >
              <span>Search</span>
              <span className="text-[10px] text-zinc-500">↵</span>
            </button>
          </div>

          {/* Animated "You must sign in first" Alert Modal/Banner */}
          {authError && (
            <div className="mt-3.5 p-3.5 rounded-2xl bg-[#121118]/95 border border-red-500/30 shadow-[0_12px_35px_rgba(239,68,68,0.15)] flex items-center justify-between gap-3 text-left animate-fade-scale">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                  <Lock className="w-4 h-4 text-red-400" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">Authentication required</p>
                  <p className="text-[11px] text-zinc-400">You must sign in first to run live scrapers and extract leads.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="px-3.5 py-1.5 rounded-full bg-white hover:bg-zinc-200 text-black text-xs font-semibold shrink-0 transition-all flex items-center gap-1 shadow-sm btn-press"
              >
                <span>Sign in</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          )}
        </form>

        {/* Quick Search Preset Pills */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
          <span className="text-[11px] font-mono-accent text-zinc-500">Quick search:</span>
          {quickPresets.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => {
                setQuery(item.q);
                if (authError) setAuthError(false);
              }}
              className="text-[11px] px-3.5 py-1.5 rounded-full bg-zinc-950/60 hover:bg-zinc-900 border border-white/[0.08] hover:border-white/[0.22] text-zinc-400 hover:text-zinc-100 transition-all duration-200 font-mono-accent btn-press card-hover-lift"
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Minimal Expandable Filter Drawer */}
        {showAdvanced && (
          <div className="w-full max-w-xl bg-zinc-950/90 rounded-2xl p-5 text-left border border-white/[0.1] shadow-2xl animate-slide-down backdrop-blur-xl mb-10">
            <div className="flex items-center justify-between mb-4 border-b border-white/[0.08] pb-2.5">
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