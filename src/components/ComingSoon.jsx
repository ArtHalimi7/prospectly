import { Link } from 'react-router-dom';

const ComingSoon = ({
  badge = 'IN ACTIVE DEVELOPMENT',
  title,
  subtitle,
  icon,
  features = [],
  eta = 'Q2 2026'
}) => {
  return (
    <div className="relative min-h-screen pt-28 pb-20 px-4 sm:px-6 lg:px-8 bg-[#050507] text-white flex flex-col items-center justify-center overflow-hidden">
      
      {/* Background Ambient Glows */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-b from-indigo-500/10 via-purple-500/5 to-transparent rounded-full blur-3xl opacity-70"></div>
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-[800px] h-[250px] bg-gradient-to-t from-white/[0.02] to-transparent rounded-full blur-2xl"></div>
        {/* Subtle grid pattern */}
        <div 
          className="absolute inset-0 opacity-[0.02] bg-[linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] bg-[size:4rem_4rem]"
        ></div>
      </div>

      <div className="relative z-10 w-full max-w-4xl mx-auto flex flex-col items-center text-center">
        
        {/* Top Status Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-900/90 border border-white/[0.12] text-xs font-mono uppercase tracking-[0.2em] text-zinc-300 shadow-[0_0_20px_rgba(255,255,255,0.05)] mb-8">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span>{badge}</span>
          <span className="text-zinc-600">•</span>
          <span className="text-zinc-400">{eta}</span>
        </div>

        {/* Feature Icon Graphic */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-b from-zinc-800/80 to-zinc-950/90 border border-white/[0.15] p-3.5 text-white shadow-[0_10px_30px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.2)] mb-6 flex items-center justify-center">
          {icon}
        </div>

        {/* Main Title */}
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight font-display mb-4 text-white leading-[1.1]">
          {title}
        </h1>

        {/* Subtitle */}
        <p className="max-w-2xl text-zinc-400 text-sm sm:text-base leading-relaxed font-light mb-10">
          {subtitle}
        </p>

        {/* Planned Capabilities Grid */}
        <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-4 text-left mb-12">
          {features.map((item, idx) => (
            <div 
              key={idx}
              className="p-5 rounded-2xl bg-zinc-950/60 border border-white/[0.08] hover:border-white/[0.18] transition-all duration-300 backdrop-blur-xl group shadow-[0_4px_20px_rgba(0,0,0,0.4)]"
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xl group-hover:scale-110 transition-transform duration-300 select-none">
                  {item.icon}
                </span>
                <h3 className="font-semibold text-sm text-zinc-200 group-hover:text-white transition-colors">
                  {item.title}
                </h3>
              </div>
              <p className="text-xs text-zinc-400 font-light leading-relaxed">
                {item.description}
              </p>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/dashboard"
            className="px-6 py-2.5 rounded-full bg-white hover:bg-zinc-200 text-black text-xs sm:text-sm font-semibold transition-all duration-200 shadow-[0_0_25px_rgba(255,255,255,0.2)] hover:shadow-[0_0_30px_rgba(255,255,255,0.4)] flex items-center gap-2"
          >
            <span>Back to Lead Radar</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </Link>

          <Link
            to="/"
            className="px-5 py-2.5 rounded-full bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs sm:text-sm font-medium border border-white/[0.1] transition-all duration-200"
          >
            New Google Maps Search
          </Link>
        </div>

      </div>
    </div>
  );
};

export default ComingSoon;
