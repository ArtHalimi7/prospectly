import { useState, useEffect } from 'react';

const Settings = () => {
  const [dbHost, setDbHost] = useState('localhost');
  const [dbUser, setDbUser] = useState('root');
  const [dbPassword, setDbPassword] = useState('');
  const [dbName, setDbName] = useState('client_scrapper');
  
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [gmailUser, setGmailUser] = useState('');
  const [gmailPass, setGmailPass] = useState('');
  const [smtpDelay, setSmtpDelay] = useState(30);

  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState({ type: '', message: '' });

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/settings');
      if (res.ok) {
        const data = await res.json();
        setDbHost(data.DB_HOST || 'localhost');
        setDbUser(data.DB_USER || 'root');
        setDbPassword(data.DB_PASSWORD || '');
        setDbName(data.DB_NAME || 'client_scrapper');
        setGeminiApiKey(data.GEMINI_API_KEY || '');
        setGmailUser(data.GMAIL_USER || '');
        setGmailPass(data.GMAIL_PASS || '');
        setSmtpDelay(data.SMTP_DELAY ? parseInt(data.SMTP_DELAY) : 30);
      }
    } catch (err) {
      console.warn("Backend offline, using local states.");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaveStatus({ type: '', message: '' });
    
    const payload = {
      DB_HOST: dbHost,
      DB_USER: dbUser,
      DB_PASSWORD: dbPassword,
      DB_NAME: dbName,
      GEMINI_API_KEY: geminiApiKey,
      GMAIL_USER: gmailUser,
      GMAIL_PASS: gmailPass,
      SMTP_DELAY: smtpDelay.toString()
    };

    try {
      const res = await fetch('http://localhost:5000/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setSaveStatus({ type: 'success', message: 'Configurations saved successfully! Backend server restarted with new environment.' });
      } else {
        setSaveStatus({ type: 'error', message: 'Failed to write configurations to backend. Writing values locally.' });
      }
    } catch (err) {
      setSaveStatus({ type: 'success', message: 'Offline Mode: Settings saved to memory (Start the Node backend to bind database & SMTP keys).' });
    }
  };

  return (
    <div className="pt-24 pb-12 px-6 md:px-12 bg-[#fafbfd] min-h-screen font-sans">
      <div className="max-w-3xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-black font-poppins">System Settings</h1>
          <p className="text-gray-500 text-sm mt-1">Configure your MySQL instance credentials, SMTP mail server keys, and Google Gemini API keys.</p>
        </div>

        {saveStatus.message && (
          <div className={`p-4 rounded-xl mb-6 text-sm font-semibold border ${
            saveStatus.type === 'success' 
              ? 'bg-green-50 border-green-100 text-green-700 animate-slide-down' 
              : 'bg-red-50 border-red-100 text-red-700 animate-slide-down'
          }`}>
            {saveStatus.message}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          
          {/* Section: MySQL Credentials */}
          <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-extrabold text-black font-poppins mb-4 pb-2 border-b border-gray-50 flex items-center gap-2">
              <span className="h-2.5 w-2.5 bg-blue-500 rounded-full"></span>
              MySQL Database Configuration
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Host address</label>
                <input
                  type="text"
                  value={dbHost}
                  onChange={(e) => setDbHost(e.target.value)}
                  required
                  placeholder="localhost"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-black text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Database Name</label>
                <input
                  type="text"
                  value={dbName}
                  onChange={(e) => setDbName(e.target.value)}
                  required
                  placeholder="client_scrapper"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-black text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Database User</label>
                <input
                  type="text"
                  value={dbUser}
                  onChange={(e) => setDbUser(e.target.value)}
                  required
                  placeholder="root"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-black text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Database Password</label>
                <input
                  type="password"
                  value={dbPassword}
                  onChange={(e) => setDbPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-black text-sm"
                />
              </div>
            </div>
          </div>

          {/* Section: Gemini API Key */}
          <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-extrabold text-black font-poppins mb-4 pb-2 border-b border-gray-50 flex items-center gap-2">
              <span className="h-2.5 w-2.5 bg-purple-500 rounded-full"></span>
              Google Gemini LLM Integration
            </h3>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Gemini API Key</label>
              <input
                type="password"
                value={geminiApiKey}
                onChange={(e) => setGeminiApiKey(e.target.value)}
                required
                placeholder="AIzaSy..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-black text-sm"
              />
              <p className="text-[10px] text-gray-400 mt-1.5 leading-normal">Required to enrich business profiles and generate custom cold email hooks using Gemini 1.5 Flash. Key is stored locally in your .env file.</p>
            </div>
          </div>

          {/* Section: Gmail SMTP */}
          <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-extrabold text-black font-poppins mb-4 pb-2 border-b border-gray-50 flex items-center gap-2">
              <span className="h-2.5 w-2.5 bg-orange-500 rounded-full"></span>
              Gmail Cold Mail Sending (SMTP)
            </h3>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Gmail Email Address</label>
                  <input
                    type="email"
                    value={gmailUser}
                    onChange={(e) => setGmailUser(e.target.value)}
                    required
                    placeholder="example@gmail.com"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-black text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Gmail App Password</label>
                  <input
                    type="password"
                    value={gmailPass}
                    onChange={(e) => setGmailPass(e.target.value)}
                    required
                    placeholder="xxxx xxxx xxxx xxxx"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-black text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Send Throttle Delay (Seconds)</label>
                  <input
                    type="number"
                    value={smtpDelay}
                    onChange={(e) => setSmtpDelay(parseInt(e.target.value))}
                    required
                    min="5"
                    max="300"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-black text-sm"
                  />
                </div>
              </div>

              <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 text-xs text-orange-800 leading-relaxed">
                <strong>How to get a Gmail App Password:</strong>
                <ol className="list-decimal pl-4 mt-2 space-y-1">
                  <li>Go to your Google Account Security Settings.</li>
                  <li>Enable <strong>2-Step Verification</strong> (if not already enabled).</li>
                  <li>Search for <strong>"App Passwords"</strong> or visit the settings page.</li>
                  <li>Select "Other" or "Mail" and generate a key. Copy the 16-character code directly into the field above.</li>
                </ol>
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-3">
            <button
              type="submit"
              className="text-xs font-bold text-white bg-black hover:bg-gray-800 rounded-full px-6 py-3 shadow-md transition-all cursor-pointer"
            >
              Save System configurations
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default Settings;
