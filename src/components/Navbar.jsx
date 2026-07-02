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
    <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-100 z-50 flex items-center justify-between px-8 md:px-16 font-sans">
      {/* Logo */}
      <Link to="/" className="flex items-center gap-2 group">
        <div className="h-6 w-6 bg-black rounded-full flex items-center justify-center relative shadow-sm">
          {/* Custom dotless logo styling: outer circle with offset center cutout */}
          <div className="absolute w-2 h-2 bg-white rounded-full translate-x-[2px] -translate-y-[2px]"></div>
        </div>
        <span className="font-bold text-lg text-black tracking-tight font-poppins">
          dotless<span className="text-gray-400 font-normal">.local</span>
        </span>
      </Link>

      {/* Navigation Links */}
      <nav className="hidden md:flex items-center gap-8">
        {navLinks.map((link) => {
          const isActive = location.pathname === link.path;
          return (
            <Link
              key={link.name}
              to={link.path}
              className={`text-sm font-medium transition-colors duration-200 py-1 ${
                isActive
                  ? 'text-black border-b border-black font-semibold'
                  : 'text-gray-500 hover:text-black'
              }`}
            >
              {link.name}
            </Link>
          );
        })}
      </nav>

      {/* CTA Buttons */}
      <div className="flex items-center gap-3">
        <Link
          to="/dashboard"
          className="text-xs font-semibold text-gray-700 hover:text-black border border-gray-200 hover:border-gray-300 rounded-full px-4 py-2 bg-gray-50/50 hover:bg-gray-50 transition-all duration-200"
        >
          Go to dashboard
        </Link>
        <Link
          to="/"
          className="text-xs font-semibold text-white bg-black hover:bg-gray-800 rounded-full px-4 py-2 transition-all duration-200 shadow-sm"
        >
          Run Scrape
        </Link>
      </div>
    </header>
  );
};

export default Navbar;