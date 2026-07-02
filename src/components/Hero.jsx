import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Hero = () => {
  const [query, setQuery] = useState('');
  const [minRating, setMinRating] = useState(4.0);
  const [maxLeads, setMaxLeads] = useState(10);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    if (!query) return;
    
    // Redirect to dashboard/scraper with the query parameters
    navigate(`/dashboard?scrape=true&q=${encodeURIComponent(query)}&rating=${minRating}&limit=${maxLeads}`);
  };

  return (
    <section className="relative pt-32 pb-20 px-6 md:px-16 flex flex-col items-center text-center bg-white min-h-[calc(100vh-64px)] overflow-hidden font-sans">
      
      {/* Premium Notification Badge */}
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-purple-100 bg-purple-50/40 text-xs text-purple-700 font-medium mb-8 animate-fade-in">
        <span className="bg-purple-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider">
          New
        </span>
        <span>Local database & Gemini API integrated. Puppeteer ready.</span>
      </div>

      {/* Main Typography */}
      <h1 className="max-w-4xl text-4xl md:text-6xl font-extrabold tracking-tight text-black leading-[1.1] mb-6 font-poppins">
        Find businesses without websites. <br />
        <span className="text-gray-400 font-normal md:text-5xl text-3xl block mt-2">
          Scrape Google Maps, enrich leads with AI, and launch outreach from one workflow.
        </span>
      </h1>

      {/* Hero CTA Buttons */}
      <div className="flex flex-row items-center gap-3 mb-10">
        <button
          onClick={() => navigate('/dashboard')}
          className="text-sm font-semibold text-white bg-black hover:bg-gray-800 rounded-full px-6 py-3 transition-all duration-200 shadow-md shadow-gray-200"
        >
          Go to Dashboard
        </button>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-sm font-semibold text-gray-600 hover:text-black bg-gray-50 border border-gray-200 hover:border-gray-300 rounded-full px-6 py-3 transition-all duration-200"
        >
          {showAdvanced ? 'Hide filters' : 'Customize filters'}
        </button>
      </div>

      {/* Advanced Filters Panel */}
      {showAdvanced && (
        <div className="w-full max-w-xl bg-gray-50/80 backdrop-blur-sm border border-gray-100 rounded-2xl p-6 mb-8 text-left animate-slide-down">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4">Scraping Configurations</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2">
                Minimum Rating: <span className="text-black font-bold">{minRating} ⭐</span>
              </label>
              <input
                type="range"
                min="3.0"
                max="5.0"
                step="0.1"
                value={minRating}
                onChange={(e) => setMinRating(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black"
              />
              <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                <span>3.0</span>
                <span>4.0</span>
                <span>5.0</span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2">
                Max Leads to Fetch: <span className="text-black font-bold">{maxLeads}</span>
              </label>
              <input
                type="range"
                min="5"
                max="50"
                step="5"
                value={maxLeads}
                onChange={(e) => setMaxLeads(parseInt(e.target.value))}
                className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black"
              />
              <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                <span>5</span>
                <span>25</span>
                <span>50</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Search Input Form */}
      <form onSubmit={handleSearch} className="w-full max-w-2xl relative mb-16 px-4">
        <div className="bg-white border border-gray-200 rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300 pl-6 pr-3 py-3 flex items-center justify-between gap-4">
          <input
            type="text"
            placeholder="Find businesses without websites in Austin (e.g., Plumbers in Hamburg)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent border-none text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-0 text-sm md:text-base font-normal"
          />
          <button
            type="submit"
            className="h-10 w-10 shrink-0 bg-purple-600 hover:bg-purple-700 text-white rounded-xl flex items-center justify-center transition-all duration-200 shadow-md shadow-purple-200 cursor-pointer"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.5"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              ></path>
            </svg>
          </button>
        </div>
      </form>

      {/* 3D Animated SVG Globe Graphic */}
      <div className="relative w-full max-w-4xl aspect-[2/1] overflow-hidden mt-auto select-none pointer-events-none">
        <svg
          viewBox="0 0 800 400"
          className="w-full h-full text-blue-500/10 fill-current opacity-80"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Subtle grid lines */}
          <g className="stroke-gray-100 stroke-[0.5]" fill="none">
            <path d="M 0,200 L 800,200" />
            <path d="M 400,0 L 400,400" />
            <circle cx="400" cy="400" r="380" />
            <circle cx="400" cy="400" r="300" />
            <circle cx="400" cy="400" r="220" />
          </g>

          {/* Large Globe Circle */}
          <circle cx="400" cy="420" r="260" className="fill-blue-50/50 stroke-blue-100 stroke-2" />

          {/* Custom earth continents shape (abstract illustration style matching the screenshot) */}
          <path
            d="M 220,320 C 230,300 250,280 270,290 C 290,300 310,270 320,290 C 330,310 320,330 310,340 C 290,350 260,340 230,350 Z
               M 480,290 C 490,270 520,260 540,280 C 560,300 580,280 590,295 C 600,310 570,330 550,325 C 530,320 510,340 490,330 Z
               M 350,230 C 370,210 390,215 410,225 C 430,235 440,220 450,235 C 460,250 440,270 420,265 C 400,260 380,280 360,270 Z
               M 280,210 C 290,190 310,180 320,195 C 330,210 350,200 340,220 C 330,240 310,235 290,240 Z"
            className="fill-green-100/70"
          />

          {/* Globe atmospheric layer */}
          <circle cx="400" cy="420" r="260" className="fill-none stroke-blue-200/50 stroke-4" />
        </svg>

        {/* Floating Pins and Avatars using absolute layout on top of SVG */}
        <div className="absolute inset-0">
          
          {/* Pin 1: "7" */}
          <div className="absolute left-[33%] bottom-[35%] flex flex-col items-center animate-bounce-slow">
            <div className="bg-purple-600 text-white font-bold text-[10px] h-5 w-5 rounded-full flex items-center justify-center shadow-lg border border-white">
              7
            </div>
            <div className="w-1.5 h-1.5 bg-purple-600 rounded-full border border-white -mt-0.5"></div>
          </div>

          {/* Pin 2: "8" */}
          <div className="absolute left-[62%] bottom-[15%] flex flex-col items-center animate-bounce">
            <div className="bg-purple-600 text-white font-bold text-[10px] h-5 w-5 rounded-full flex items-center justify-center shadow-lg border border-white">
              8
            </div>
            <div className="w-1.5 h-1.5 bg-purple-600 rounded-full border border-white -mt-0.5"></div>
          </div>

          {/* Pin 3: "9+" */}
          <div className="absolute left-[78%] bottom-[42%] flex flex-col items-center animate-bounce-slow" style={{ animationDelay: '0.4s' }}>
            <div className="bg-purple-600 text-white font-bold text-[10px] h-5 w-6 rounded-full flex items-center justify-center shadow-lg border border-white px-1">
              9+
            </div>
            <div className="w-1.5 h-1.5 bg-purple-600 rounded-full border border-white -mt-0.5"></div>
          </div>

          {/* Pin 4: "6" */}
          <div className="absolute left-[83%] bottom-[18%] flex flex-col items-center animate-bounce" style={{ animationDelay: '0.8s' }}>
            <div className="bg-purple-600 text-white font-bold text-[10px] h-5 w-5 rounded-full flex items-center justify-center shadow-lg border border-white">
              6
            </div>
            <div className="w-1.5 h-1.5 bg-purple-600 rounded-full border border-white -mt-0.5"></div>
          </div>

          {/* Floating Avatar 1: Left Edge */}
          <div className="absolute left-[15%] top-[55%] animate-float-slow">
            <div className="h-10 w-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center shadow-md overflow-hidden">
              <span className="text-lg">🍕</span>
            </div>
          </div>

          {/* Floating Avatar 2: Right Edge */}
          <div className="absolute right-[12%] top-[40%] animate-float">
            <div className="h-10 w-10 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center shadow-md overflow-hidden">
              <span className="text-lg">🔧</span>
            </div>
          </div>

          {/* Floating Avatar 3: Center Globe Avatar */}
          <div className="absolute left-[29%] bottom-[48%] animate-float-slow">
            <div className="h-8 w-8 rounded-full border-2 border-purple-500 overflow-hidden shadow-md bg-white flex items-center justify-center">
              <span className="text-xs">💇</span>
            </div>
          </div>
        </div>
      </div>

      {/* Mini notification in bottom-right corner - matching the promotional box */}
      <div className="fixed bottom-6 right-6 max-w-xs bg-white border border-gray-100 rounded-xl p-4 shadow-xl z-40 hidden md:block animate-fade-in text-left">
        <div className="flex justify-between items-start gap-2 mb-2">
          <p className="text-xs font-semibold text-gray-900 leading-normal">
            Need scraping tips or support setting up your Gmail App Password?
          </p>
          <button className="text-gray-400 hover:text-gray-600 text-sm font-semibold leading-none">&times;</button>
        </div>
        <div className="flex gap-2">
          <input
            type="email"
            placeholder="you@example.com"
            disabled
            className="w-full px-3 py-1.5 text-[11px] bg-gray-50 border border-gray-200 rounded-md focus:outline-none"
          />
          <button
            onClick={() => navigate('/settings')}
            className="px-3 py-1.5 bg-black text-white text-[11px] font-semibold rounded-md hover:bg-gray-800 transition-colors shrink-0"
          >
            Setup
          </button>
        </div>
      </div>
    </section>
  );
};

export default Hero;