import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { User, LogOut, Settings as SettingsIcon } from 'lucide-react';
import ProfileModal from './ProfileModal';

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const navLinks = [
    { name: 'Scraper', path: '/' },
    { name: 'Dashboard', path: '/dashboard' },
    { name: 'Campaigns', path: '/campaigns', comingSoon: true },
    { name: 'Templates', path: '/templates', comingSoon: true },
  ];

  return (
    <>
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
              Prospect<span className="text-zinc-400 font-normal">ly</span>
            </span>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.name}
                  to={link.path}
                  className={`text-[13px] font-medium transition-all duration-200 py-1 flex items-center gap-1.5 ${
                    isActive
                      ? 'text-white font-semibold drop-shadow-[0_0_12px_rgba(255,255,255,0.4)]'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <span>{link.name}</span>
                  {link.comingSoon && (
                    <span className="text-[9px] uppercase tracking-wider font-mono px-1.5 py-0.5 rounded-full bg-white/[0.06] text-zinc-400 border border-white/[0.08] leading-none">
                      Soon
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Right Action: User Profile or Sign In */}
          <div className="flex items-center gap-3">
            {isAuthenticated && user ? (
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 py-1.5 px-3 rounded-full bg-white/[0.06] hover:bg-white/12 border border-white/10 hover:border-white/20 text-xs font-medium text-white transition-all duration-200 btn-press"
                >
                  <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-bold text-white uppercase shadow-inner">
                    {user.full_name ? user.full_name.charAt(0) : 'U'}
                  </div>
                  <span className="max-w-[100px] truncate">{user.full_name}</span>
                </button>

                {dropdownOpen && (
                  <div
                    className="absolute right-0 mt-2.5 w-48 bg-[#0e0e15]/95 backdrop-blur-2xl border border-white/[0.12] rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.85)] py-1.5 z-50 text-xs text-neutral-300 animate-fade-scale overflow-hidden"
                    onMouseLeave={() => setDropdownOpen(false)}
                  >
                    <div className="px-3.5 py-2.5 border-b border-white/[0.06]">
                      <p className="font-semibold text-white truncate">{user.full_name}</p>
                      <p className="text-[10px] text-zinc-400 truncate mt-0.5">{user.email}</p>
                    </div>
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        setProfileOpen(true);
                      }}
                      className="w-full px-3.5 py-2 text-left hover:bg-white/[0.08] hover:text-white flex items-center gap-2.5 transition-colors duration-150"
                    >
                      <User className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Outreach Identity</span>
                    </button>
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        logout();
                        navigate('/login');
                      }}
                      className="w-full px-3.5 py-2 text-left hover:bg-red-500/15 text-red-400 flex items-center gap-2.5 transition-colors duration-150"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Log Out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                to="/login"
                className="text-xs font-semibold text-zinc-300 hover:text-white px-3 py-1.5 transition-colors duration-200"
              >
                Sign In
              </Link>
            )}

            <Link
              to="/dashboard"
              className="text-xs font-semibold text-black bg-white hover:bg-zinc-200 rounded-full px-4 sm:px-5 py-2 transition-all duration-300 shadow-[0_0_20px_rgba(255,255,255,0.15)] hover:shadow-[0_0_28px_rgba(255,255,255,0.35)] shrink-0 btn-press hover:scale-[1.03]"
            >
              Dashboard
            </Link>
          </div>

        </header>
      </div>

      <ProfileModal isOpen={profileOpen} onClose={() => setProfileOpen(false)} />
    </>
  );
};

export default Navbar;