import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

const cleanPhoneForWhatsApp = (phone, location = '') => {
  if (!phone) return '';
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('00')) {
    cleaned = cleaned.substring(2);
  }
  if (cleaned.startsWith('0') && !cleaned.startsWith('49') && !cleaned.startsWith('355') && !cleaned.startsWith('383')) {
    const loc = location.toLowerCase();
    if (loc.includes('germany') || loc.includes('deutschland')) {
      cleaned = '49' + cleaned.substring(1);
    } else if (loc.includes('albania')) {
      cleaned = '355' + cleaned.substring(1);
    } else if (loc.includes('kosovo')) {
      cleaned = '383' + cleaned.substring(1);
    } else {
      cleaned = '49' + cleaned.substring(1);
    }
  }
  return cleaned;
};

const Dashboard = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('All');
  const [selectedLeads, setSelectedLeads] = useState([]);
  const [editingLead, setEditingLead] = useState(null);
  
  // Scraper status states
  const [scrapingActive, setScrapingActive] = useState(false);
  const [scrapeLogs, setScrapeLogs] = useState([]);
  const [scrapeQuery, setScrapeQuery] = useState('');
  
  // Fetch Leads from Backend MySQL Database
  const fetchLeads = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/leads');
      if (res.ok) {
        const data = await res.json();
        setLeads(data);
      } else {
        // Fallback mock data for development
        setLeads(getMockLeads());
      }
    } catch (err) {
      console.warn("Backend not running yet, using mock leads.");
      setLeads(getMockLeads());
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLeads();

    // Check if redirecting from landing page search
    const scrapeParam = searchParams.get('scrape');
    const queryParam = searchParams.get('q');
    if (scrapeParam === 'true' && queryParam) {
      setScrapeQuery(queryParam);
      // Clean query parameters from URL
      setSearchParams({});
      // Start scraping
      triggerScraping(queryParam, parseFloat(searchParams.get('rating') || '4.0'), parseInt(searchParams.get('limit') || '10'));
    }
  }, []);

  const triggerScraping = async (queryStr, minRating, maxLeads) => {
    setScrapingActive(true);
    setScrapeLogs([`[INFO] Starting Google Maps Scraper for: "${queryStr}"...`, `[INFO] Minimum rating filter: ${minRating} ⭐`, `[INFO] Max target results: ${maxLeads}`]);
    
    try {
      const response = await fetch('http://localhost:5000/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: queryStr, minRating, limit: maxLeads }),
      });

      if (response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let done = false;
        
        while (!done) {
          const { value, done: readerDone } = await reader.read();
          done = readerDone;
          if (value) {
            const chunk = decoder.decode(value, { stream: true });
            const logLines = chunk.split('\n').filter(Boolean);
            setScrapeLogs((prev) => [...prev, ...logLines]);
          }
        }
        setScrapeLogs((prev) => [...prev, `[SUCCESS] Scraping and Enrichment completed!`]);
        fetchLeads();
      } else {
        // Mock scraping simulator if backend is offline
        simulateMockScraping(queryStr);
      }
    } catch (err) {
      console.warn("Backend offline, running mock scraping simulation.");
      simulateMockScraping(queryStr);
    }
  };

  // Mock Scraping Simulation for testing UI immediately
  const simulateMockScraping = (queryStr) => {
    let step = 0;
    const interval = setInterval(() => {
      step++;
      if (step === 1) {
        setScrapeLogs((prev) => [...prev, `[SCRAPER] Launching headless Chrome browser...`]);
      } else if (step === 2) {
        setScrapeLogs((prev) => [...prev, `[SCRAPER] Searching Google Maps for "${queryStr}"...`]);
      } else if (step === 3) {
        setScrapeLogs((prev) => [...prev, `[SCRAPER] Scrolling Map results panel to load businesses...`]);
      } else if (step === 4) {
        setScrapeLogs((prev) => [...prev, `[SCRAPER] Scraped 12 local listings. Filtering for businesses with NO website...`]);
      } else if (step === 5) {
        setScrapeLogs((prev) => [...prev, `[FILTER] Found 3 businesses missing website URL with high ratings!`]);
      } else if (step === 6) {
        setScrapeLogs((prev) => [...prev, `[OSINT] Querying Google Search for "Max's Plumber Hamburg email facebook" to enrich lead #1...`]);
      } else if (step === 7) {
        setScrapeLogs((prev) => [...prev, `[GEMINI] Generating quick personalized pitch hook for "Max's Plumber"...`]);
      } else if (step === 8) {
        setScrapeLogs((prev) => [...prev, `[DATABASE] Saved 3 enriched leads to MySQL!`]);
        // Add mock items to local state
        const newMockLeads = [
          {
            id: Date.now(),
            business_name: `${queryStr.split(' ')[0] || 'Local'} Services Ltd`,
            category: queryStr.split(' ')[0] || 'Service',
            location: queryStr.split('in ')[1] || 'Main Street',
            phone_number: '+49 176 1234567',
            rating: 4.8,
            reviews_count: 32,
            status: 'Enriched',
            estimated_owner_name: 'Markus Weber',
            primary_contact_email: 'markus@weberservices.de',
            primary_social_pitch_url: 'https://facebook.com/weber-services',
            confidence_score: 'High',
            quick_pitch_hook: 'Loved your 4.8 star review from customers! Let\'s build a custom landing page to get you even more direct calls.'
          },
          ...leads
        ];
        setLeads(newMockLeads);
      } else if (step === 9) {
        setScrapeLogs((prev) => [...prev, `[SUCCESS] Scraping task finished.`]);
        setScrapingActive(false);
        clearInterval(interval);
      }
    }, 1500);
  };

  const handleEditSave = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`http://localhost:5000/api/leads/${editingLead.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingLead),
      });
      if (res.ok) {
        setLeads(leads.map(l => l.id === editingLead.id ? editingLead : l));
        setEditingLead(null);
      } else {
        // Fallback update in state directly for frontend-only mode
        setLeads(leads.map(l => l.id === editingLead.id ? editingLead : l));
        setEditingLead(null);
      }
    } catch (err) {
      setLeads(leads.map(l => l.id === editingLead.id ? editingLead : l));
      setEditingLead(null);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this lead?")) return;
    try {
      const res = await fetch(`http://localhost:5000/api/leads/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setLeads(leads.filter(l => l.id !== id));
      } else {
        setLeads(leads.filter(l => l.id !== id));
      }
    } catch (err) {
      setLeads(leads.filter(l => l.id !== id));
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedLeads(filteredLeads.map(l => l.id));
    } else {
      setSelectedLeads([]);
    }
  };

  const handleSelectLead = (id) => {
    if (selectedLeads.includes(id)) {
      setSelectedLeads(selectedLeads.filter(lid => lid !== id));
    } else {
      setSelectedLeads([...selectedLeads, id]);
    }
  };

  // Launch campaign with selected leads
  const startCampaign = () => {
    if (selectedLeads.length === 0) {
      alert("Please select at least one lead to launch campaign.");
      return;
    }
    // Navigate to templates/campaign page with preselected leads in storage
    sessionStorage.setItem('preselectedLeads', JSON.stringify(selectedLeads));
    window.location.href = '/campaigns?new=true';
  };

  const filteredLeads = leads.filter(lead => {
    if (filter === 'All') return true;
    return lead.status === filter;
  });

  // Mock initial leads
  function getMockLeads() {
    return [
      {
        id: 1,
        business_name: 'Schmitt Sanitär & Heizung',
        category: 'Plumber',
        location: 'Hamburg',
        phone_number: '+49 40 5556677',
        rating: 4.7,
        reviews_count: 54,
        status: 'Enriched',
        estimated_owner_name: 'Andreas Schmitt',
        primary_contact_email: 'info@schmitt-sanitaer-hamburg.de',
        primary_social_pitch_url: 'https://facebook.com/schmittsanitaer',
        confidence_score: 'High',
        quick_pitch_hook: 'I saw your excellent 4.7-star rating on Google Maps but noticed you do not have a website yet; I\'d love to build one to help you showcase your quality work.'
      },
      {
        id: 2,
        business_name: 'Salon Beauté & Haar',
        category: 'Hair Salon',
        location: 'Berlin',
        phone_number: '+49 30 1122334',
        rating: 4.9,
        reviews_count: 82,
        status: 'Enriched',
        estimated_owner_name: 'Sabine Fischer',
        primary_contact_email: 'fischer.salon@gmail.com',
        primary_social_pitch_url: 'https://instagram.com/beauty_sabine_berlin',
        confidence_score: 'Medium',
        quick_pitch_hook: 'Your client reviews show you are the top salon on the block! A premium, mobile-friendly landing page with booking integration would help secure more bookings directly.'
      },
      {
        id: 3,
        business_name: 'Becker Auto-Werkstatt',
        category: 'Auto Repair Shop',
        location: 'Munich',
        phone_number: '+49 89 998877',
        rating: 4.5,
        reviews_count: 21,
        status: 'Scraped',
        estimated_owner_name: 'Unknown',
        primary_contact_email: null,
        primary_social_pitch_url: null,
        confidence_score: 'Low',
        quick_pitch_hook: ''
      }
    ];
  }

  return (
    <div className="pt-24 pb-12 px-6 md:px-12 bg-[#fafbfd] min-h-screen font-sans">
      <div className="max-w-7xl mx-auto">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-black font-poppins">Leads Database</h1>
            <p className="text-gray-500 text-sm mt-1">Review scraped businesses, enrich missing details, and fire cold email campaigns.</p>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                const q = prompt("Enter search query (e.g. Roofers in Berlin):");
                if (q) triggerScraping(q, 4.0, 10);
              }}
              disabled={scrapingActive}
              className="text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 rounded-full px-5 py-2.5 shadow-md flex items-center gap-2 transition-all cursor-pointer"
            >
              {scrapingActive ? 'Scraping Active...' : 'Start New Scrape'}
            </button>
            
            <button
              onClick={startCampaign}
              disabled={selectedLeads.length === 0}
              className="text-xs font-bold text-white bg-black hover:bg-gray-800 disabled:bg-gray-400 rounded-full px-5 py-2.5 shadow-md transition-all cursor-pointer"
            >
              Email Selected ({selectedLeads.length})
            </button>
          </div>
        </div>

        {/* Live Scraper Output Console Overlay */}
        {scrapingActive && (
          <div className="bg-black text-green-400 font-mono text-xs rounded-xl p-5 mb-8 shadow-inner max-h-60 overflow-y-auto border border-gray-800 relative animate-slide-down">
            <div className="absolute top-3 right-3 flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-ping"></span>
              <span className="text-[10px] text-gray-400 font-sans font-bold">LIVE CONSOLE</span>
            </div>
            {scrapeLogs.map((log, index) => (
              <div key={index} className="py-0.5 leading-relaxed">{log}</div>
            ))}
          </div>
        )}

        {/* Stats Summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Total Scraped</span>
            <div className="text-2xl font-extrabold text-black mt-2 font-poppins">{leads.length}</div>
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Enriched Leads</span>
            <div className="text-2xl font-extrabold text-green-600 mt-2 font-poppins">
              {leads.filter(l => l.status === 'Enriched').length}
            </div>
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Contact Emails Found</span>
            <div className="text-2xl font-extrabold text-purple-600 mt-2 font-poppins">
              {leads.filter(l => l.primary_contact_email).length}
            </div>
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Selected Leads</span>
            <div className="text-2xl font-extrabold text-orange-600 mt-2 font-poppins">{selectedLeads.length}</div>
          </div>
        </div>

        {/* Filter Navigation Bar */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4 mb-6 flex flex-wrap gap-2 items-center justify-between">
          <div className="flex gap-2">
            {['All', 'Scraped', 'Enriched', 'Emailed', 'No Context Found'].map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`text-xs font-semibold px-4 py-2 rounded-full transition-all duration-200 cursor-pointer ${
                  filter === status
                    ? 'bg-black text-white'
                    : 'text-gray-500 hover:text-black hover:bg-gray-50'
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          <span className="text-xs text-gray-400 font-medium">
            Showing {filteredLeads.length} of {leads.length} leads
          </span>
        </div>

        {/* Leads Table */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="py-20 text-center text-gray-500 text-sm font-medium">Loading database leads...</div>
          ) : filteredLeads.length === 0 ? (
            <div className="py-20 text-center text-gray-400 text-sm">No leads match this filter. Run a scraper search!</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/70 border-b border-gray-100 text-gray-500 font-semibold text-xs tracking-wider uppercase">
                    <th className="p-4 w-12 text-center border-none">
                      <input
                        type="checkbox"
                        onChange={handleSelectAll}
                        checked={selectedLeads.length === filteredLeads.length && filteredLeads.length > 0}
                        className="rounded accent-black cursor-pointer"
                      />
                    </th>
                    <th className="p-4 border-none">Business / Category</th>
                    <th className="p-4 border-none">Location</th>
                    <th className="p-4 border-none text-center">Rating</th>
                    <th className="p-4 border-none">Phone</th>
                    <th className="p-4 border-none">Email Contact</th>
                    <th className="p-4 border-none">Social DM</th>
                    <th className="p-4 border-none">Status</th>
                    <th className="p-4 border-none text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-sm">
                  {filteredLeads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-4 text-center border-none">
                        <input
                          type="checkbox"
                          checked={selectedLeads.includes(lead.id)}
                          onChange={() => handleSelectLead(lead.id)}
                          className="rounded accent-black cursor-pointer"
                        />
                      </td>
                      <td className="p-4 border-none">
                        <div className="font-bold text-gray-900 font-poppins">{lead.business_name}</div>
                        <div className="text-xs text-gray-400 mt-0.5">{lead.category || 'N/A'}</div>
                        {lead.estimated_owner_name && lead.estimated_owner_name !== 'Unknown' && (
                          <div className="text-[10px] text-purple-600 font-semibold mt-1">👤 Owner: {lead.estimated_owner_name}</div>
                        )}
                      </td>
                      <td className="p-4 border-none text-gray-600">{lead.location}</td>
                      <td className="p-4 border-none text-center">
                        <div className="font-semibold text-gray-900">{lead.rating ? `${lead.rating} ⭐` : 'N/A'}</div>
                        <div className="text-[10px] text-gray-400 mt-0.5">({lead.reviews_count || 0} reviews)</div>
                      </td>
                      <td className="p-4 border-none text-gray-700">
                        {lead.phone_number ? (
                          <div className="flex flex-col gap-1.5 items-start">
                            <a
                              href={`tel:${lead.phone_number}`}
                              className="text-gray-700 hover:text-black font-semibold hover:underline flex items-center gap-1"
                            >
                              📞 <span className="text-xs">{lead.phone_number}</span>
                            </a>
                            <a
                              href={`https://wa.me/${cleanPhoneForWhatsApp(lead.phone_number, lead.location)}?text=${encodeURIComponent(
                                lead.personalized_body || lead.quick_pitch_hook || 'Hallo!'
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[10px] font-bold text-green-600 hover:text-green-800 bg-green-50 border border-green-100 hover:border-green-200 rounded px-1.5 py-0.5 transition-colors cursor-pointer"
                            >
                              💬 WhatsApp Pitch
                            </a>
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">No phone</span>
                        )}
                      </td>
                      <td className="p-4 border-none">
                        {lead.primary_contact_email ? (
                          <a
                            href={`mailto:${lead.primary_contact_email}`}
                            className="text-purple-600 hover:text-purple-800 underline font-medium"
                          >
                            {lead.primary_contact_email}
                          </a>
                        ) : (
                          <span className="text-gray-400 italic">No email</span>
                        )}
                      </td>
                      <td className="p-4 border-none">
                        {lead.primary_social_pitch_url ? (
                          <a
                            href={lead.primary_social_pitch_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-bold text-pink-600 hover:text-pink-800 border border-pink-100 hover:border-pink-200 bg-pink-50/50 rounded-full px-2.5 py-1"
                          >
                            💬 Open DM
                          </a>
                        ) : (
                          <span className="text-gray-400 italic">No social page</span>
                        )}
                      </td>
                      <td className="p-4 border-none">
                        <span
                          className={`inline-block text-[10px] font-bold uppercase px-2.5 py-1 rounded-full ${
                            lead.status === 'Enriched'
                              ? 'bg-green-50 text-green-700 border border-green-100'
                              : lead.status === 'Emailed'
                              ? 'bg-blue-50 text-blue-700 border border-blue-100'
                              : lead.status === 'Scraped'
                              ? 'bg-yellow-50 text-yellow-700 border border-yellow-100'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {lead.status}
                        </span>
                      </td>
                      <td className="p-4 border-none text-right">
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => setEditingLead(lead)}
                            className="text-xs font-semibold text-gray-500 hover:text-black border border-gray-200 hover:border-gray-300 bg-white rounded-lg px-2.5 py-1.5 transition-colors cursor-pointer"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(lead.id)}
                            className="text-xs font-semibold text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg px-2.5 py-1.5 transition-colors cursor-pointer"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Lead Editing Modal */}
        {editingLead && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white border border-gray-100 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden animate-slide-down">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-extrabold text-lg text-black font-poppins">Edit Lead Metadata</h3>
                <button
                  onClick={() => setEditingLead(null)}
                  className="text-gray-400 hover:text-black text-xl font-bold leading-none cursor-pointer"
                >
                  &times;
                </button>
              </div>

              <form onSubmit={handleEditSave} className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Business Name</label>
                    <input
                      type="text"
                      value={editingLead.business_name}
                      onChange={(e) => setEditingLead({ ...editingLead, business_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-black text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Estimated Owner Name</label>
                    <input
                      type="text"
                      value={editingLead.estimated_owner_name || ''}
                      onChange={(e) => setEditingLead({ ...editingLead, estimated_owner_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-black text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Primary Contact Email</label>
                    <input
                      type="email"
                      value={editingLead.primary_contact_email || ''}
                      onChange={(e) => setEditingLead({ ...editingLead, primary_contact_email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-black text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Social Pitch URL</label>
                    <input
                      type="text"
                      value={editingLead.primary_social_pitch_url || ''}
                      onChange={(e) => setEditingLead({ ...editingLead, primary_social_pitch_url: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-black text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Quick AI Pitch Hook</label>
                  <textarea
                    value={editingLead.quick_pitch_hook || ''}
                    onChange={(e) => setEditingLead({ ...editingLead, quick_pitch_hook: e.target.value })}
                    rows="2"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-black text-sm"
                  ></textarea>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">AI-Personalized Subject Line</label>
                  <input
                    type="text"
                    value={editingLead.personalized_subject || ''}
                    onChange={(e) => setEditingLead({ ...editingLead, personalized_subject: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-black text-sm font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">AI-Personalized Email Body</label>
                  <textarea
                    value={editingLead.personalized_body || ''}
                    onChange={(e) => setEditingLead({ ...editingLead, personalized_body: e.target.value })}
                    rows="6"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-black text-sm font-sans"
                  ></textarea>
                </div>

                <div className="flex gap-3 justify-end pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setEditingLead(null)}
                    className="text-xs font-semibold text-gray-600 hover:text-black border border-gray-200 rounded-lg px-4 py-2 hover:bg-gray-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="text-xs font-bold text-white bg-black hover:bg-gray-800 rounded-lg px-4 py-2 shadow-md cursor-pointer"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default Dashboard;
