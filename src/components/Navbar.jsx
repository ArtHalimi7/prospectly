import { Link, useLocation } from 'react-router-dom';

const Navbar = () => {
  const location = useLocation();

  const navLinks = [
    { name: 'Scraper', path: '/' },
    { name: 'Dashboard', path: '/dashboard' },
    { name: 'Campaigns', path: '/campaigns' },
    { name: 'Templates', path: '/templates' },
    { name: 'Settings', path: '/settings' },
  ];

  return (
    <div className="fixed top-5 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
      <header className="pointer-events-auto w-full max-w-5xl h-14 rounded-full bg-zinc-950/40 backdrop-blur-2xl border border-white/[0.12] shadow-[0_8px_32px_0_rgba(0,0,0,0.6),inset_0_1px_0_0_rgba(255,255,255,0.12)] flex items-center justify-between px-4 sm:px-6 transition-all duration-300">
        
        {/* Brand / Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          {/* Orbital Atom Symbol matching reference */}
          <div className="w-6 h-6 flex items-center justify-center text-white/90 group-hover:text-white transition-colors">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="w-5 h-5">
              <ellipse cx="12" cy="12" rx="9" ry="4" transform="rotate(30 12 12)" stroke="currentColor" />
              <ellipse cx="12" cy="12" rx="9" ry="4" transform="rotate(-30 12 12)" stroke="currentColor" />
              <ellipse cx="12" cy="12" rx="9" ry="4" transform="rotate(90 12 12)" stroke="currentColor" />
              <circle cx="12" cy="12" r="1.5" fill="currentColor" />
            </svg>
          </div>
          <span className="font-semibold text-sm tracking-tight text-white font-display">
            Client<span className="text-zinc-400 font-normal">Scrapper</span>
          </span>
        </Link>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-7">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.name}
                to={link.path}
                className={`text-[13px] font-medium transition-all duration-200 py-1 ${
                  isActive
                    ? 'text-white font-semibold drop-shadow-[0_0_12px_rgba(255,255,255,0.4)]'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {link.name}
              </Link>
            );
          })}
        </nav>

        {/* CTA Button matching reference */}
        <div className="flex items-center gap-2.5">
          <Link
            to="/dashboard"
            className="text-xs font-semibold text-black bg-white hover:bg-zinc-200 rounded-full px-5 py-2 transition-all duration-200 shadow-[0_0_20px_rgba(255,255,255,0.15)] hover:shadow-[0_0_25px_rgba(255,255,255,0.35)] shrink-0"
          >
            Dashboard
          </Link>
        </div>

      </header>
    </div>
  );
};

export default Navbar;