import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { User, Mail, Lock, Globe, Briefcase, ArrowRight, ShieldCheck, Sparkles, AlertCircle, Eye, EyeOff, Check } from 'lucide-react';
import DarkVeil from '../components/DarkVeil';

const Login = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [profession, setProfession] = useState('Web Developer');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        if (!fullName.trim()) throw new Error('Full Name is required.');
        await register({
          email,
          password,
          full_name: fullName,
          profession,
          portfolio_url: portfolioUrl
        });
      } else {
        await login(email, password);
      }
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 pt-28 pb-16 overflow-hidden bg-[#050507]">
      {/* 1. Animated Monochrome DarkVeil Shader Texture matching Hero */}
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
      <div className="absolute inset-0 bg-mesh-dots opacity-40 mask-radial-fade pointer-events-none z-0" />
      <div className="absolute inset-0 bg-mesh-fine opacity-25 mask-radial-fade pointer-events-none z-0" />

      {/* Layered luxury ambient glows & orbital light rings */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[450px] bg-gradient-to-b from-white/[0.06] via-zinc-500/[0.02] to-transparent rounded-full blur-3xl pointer-events-none animate-float" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[580px] h-[580px] rounded-full border border-white/[0.04] pointer-events-none animate-orbit" />
      <div className="absolute bottom-10 left-1/4 w-80 h-80 bg-zinc-800/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-80 h-80 bg-zinc-700/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Glass Card Container */}
      <div className="relative w-full max-w-[460px] bg-[#0c0c12]/85 border border-white/[0.14] backdrop-blur-2xl rounded-3xl p-7 sm:p-9 shadow-[0_30px_80px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.15)] z-10 animate-fade-scale transition-all duration-300">
        
        {/* Subtle top interior glow line */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-[1px] bg-gradient-to-r from-transparent via-white/50 to-transparent" />

        {/* Brand header matching Navbar */}
        <div className="text-center mb-7">
          <div className="inline-flex items-center justify-center gap-2.5 mb-3 group">
            {/* Orbital Atom Symbol matching Navbar */}
            <div className="w-7 h-7 flex items-center justify-center text-white/90 group-hover:text-white transition-colors">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="w-6 h-6">
                <ellipse cx="12" cy="12" rx="9" ry="4" transform="rotate(30 12 12)" stroke="currentColor" />
                <ellipse cx="12" cy="12" rx="9" ry="4" transform="rotate(-30 12 12)" stroke="currentColor" />
                <ellipse cx="12" cy="12" rx="9" ry="4" transform="rotate(90 12 12)" stroke="currentColor" />
                <circle cx="12" cy="12" r="1.5" fill="currentColor" />
              </svg>
            </div>
            <span className="font-semibold text-xl tracking-tight text-white font-display">
              Prospect<span className="text-zinc-400 font-normal">ly</span>
            </span>
          </div>

          <h1 className="text-2xl sm:text-[25px] font-bold tracking-tight text-white font-display">
            {isRegister ? 'Create your account' : 'Welcome back'}
          </h1>
          <p className="text-xs sm:text-[13px] text-zinc-400 mt-1.5 leading-relaxed">
            {isRegister
              ? 'Configure your identity and start extracting website-less clients.'
              : 'Sign in to access your private pipeline & automated AI outreach.'}
          </p>
        </div>

        {/* Animated Tab Switcher */}
        <div className="relative flex bg-zinc-950/60 border border-white/[0.08] rounded-2xl p-1 mb-6 shadow-inner">
          <div
            className={`absolute top-1 bottom-1 rounded-xl bg-white/[0.12] border border-white/10 shadow-sm transition-all duration-300 ease-out ${
              !isRegister ? 'left-1 w-[calc(50%-4px)]' : 'left-[50%] w-[calc(50%-4px)]'
            }`}
          />
          <button
            type="button"
            onClick={() => { setIsRegister(false); setError(''); }}
            className={`relative z-10 flex-1 py-2 text-xs font-medium rounded-xl transition-colors duration-200 ${
              !isRegister ? 'text-white font-semibold' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setIsRegister(true); setError(''); }}
            className={`relative z-10 flex-1 py-2 text-xs font-medium rounded-xl transition-colors duration-200 ${
              isRegister ? 'text-white font-semibold' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Error notification banner */}
        {error && (
          <div className="mb-5 p-3.5 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-2.5 text-xs text-red-300 animate-fade-scale">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
            <span className="leading-snug">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div className="space-y-4 animate-fade-scale">
              <div>
                <label className="block text-[11px] uppercase tracking-wider font-semibold text-zinc-400 mb-1.5 ml-1">
                  Full Name <span className="text-zinc-500 font-normal lowercase">(used in pitches)</span>
                </label>
                <div className="relative group">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-white transition-colors" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Besart Gashi"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-[#13131b]/90 border border-white/[0.1] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white/40 focus:ring-1 focus:ring-white/20 transition-all shadow-inner"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] uppercase tracking-wider font-semibold text-zinc-400 mb-1.5 ml-1">
                    Profession
                  </label>
                  <div className="relative group">
                    <Briefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-white transition-colors" />
                    <input
                      type="text"
                      placeholder="Web Developer"
                      value={profession}
                      onChange={(e) => setProfession(e.target.value)}
                      className="w-full bg-[#13131b]/90 border border-white/[0.1] rounded-xl pl-10 pr-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white/40 focus:ring-1 focus:ring-white/20 transition-all shadow-inner"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] uppercase tracking-wider font-semibold text-zinc-400 mb-1.5 ml-1">
                    Portfolio Link
                  </label>
                  <div className="relative group">
                    <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-white transition-colors" />
                    <input
                      type="text"
                      placeholder="myportfolio.com"
                      value={portfolioUrl}
                      onChange={(e) => setPortfolioUrl(e.target.value)}
                      className="w-full bg-[#13131b]/90 border border-white/[0.1] rounded-xl pl-10 pr-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white/40 focus:ring-1 focus:ring-white/20 transition-all shadow-inner"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-[11px] uppercase tracking-wider font-semibold text-zinc-400 mb-1.5 ml-1">
              Email Address
            </label>
            <div className="relative group">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-white transition-colors" />
              <input
                type="email"
                required
                placeholder="you@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#13131b]/90 border border-white/[0.1] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white/40 focus:ring-1 focus:ring-white/20 transition-all shadow-inner"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-wider font-semibold text-zinc-400 mb-1.5 ml-1">
              Password
            </label>
            <div className="relative group">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-white transition-colors" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#13131b]/90 border border-white/[0.1] rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white/40 focus:ring-1 focus:ring-white/20 transition-all shadow-inner"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="group relative w-full mt-3 py-3.5 px-4 bg-white hover:bg-zinc-200 text-black font-semibold rounded-2xl text-sm transition-all duration-300 flex items-center justify-center gap-2 shadow-[0_4px_25px_rgba(255,255,255,0.15)] hover:shadow-[0_6px_30px_rgba(255,255,255,0.25)] hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>{isRegister ? 'Create Account & Launch' : 'Sign In to Prospectly'}</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>

        {/* Footnote reassurance */}
        <div className="mt-6 pt-5 border-t border-white/[0.06] flex items-center justify-center gap-2 text-[11px] text-zinc-500">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Central platform Gemini API enabled & secured</span>
        </div>
      </div>
    </div>
  );
};

export default Login;
