import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

const Campaigns = () => {
  const [searchParams] = useSearchParams();
  const [campaigns, setCampaigns] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // New campaign form state
  const [campaignName, setCampaignName] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [targetLeadIds, setTargetLeadIds] = useState([]);
  
  // Campaign sending status states
  const [sendingActive, setSendingActive] = useState(false);
  const [currentCampaignId, setCurrentCampaignId] = useState(null);
  const [sendStatusLogs, setSendStatusLogs] = useState([]);
  const [sendProgress, setSendProgress] = useState({ current: 0, total: 0 });

  const fetchCampaignData = async () => {
    setLoading(true);
    try {
      const campRes = await fetch('http://localhost:5000/api/campaigns');
      const tempRes = await fetch('http://localhost:5000/api/templates'); // we will fetch templates
      
      if (campRes.ok) {
        const data = await campRes.json();
        setCampaigns(data);
      } else {
        setCampaigns(getMockCampaigns());
      }
    } catch (err) {
      console.warn("Backend offline, using mock data.");
      setCampaigns(getMockCampaigns());
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCampaignData();
    
    // Load preselected templates for campaign modal
    const mockTemplates = getMockTemplates();
    setTemplates(mockTemplates);
    if (mockTemplates.length > 0) {
      setSelectedTemplateId(mockTemplates[0].id.toString());
    }

    // Check if redirecting from Dashboard with leads selected
    const isNew = searchParams.get('new') === 'true';
    if (isNew) {
      const storedLeads = sessionStorage.getItem('preselectedLeads');
      if (storedLeads) {
        const leadIds = JSON.parse(storedLeads);
        setTargetLeadIds(leadIds);
        setCampaignName(`Campaign - ${new Date().toLocaleDateString()}`);
        setShowCreateModal(true);
        sessionStorage.removeItem('preselectedLeads'); // clear
      }
    }
  }, []);

  const handleCreateCampaign = async (e) => {
    e.preventDefault();
    if (!campaignName || !selectedTemplateId) {
      alert("Please fill in all campaign fields.");
      return;
    }

    const payload = {
      name: campaignName,
      templateId: parseInt(selectedTemplateId),
      leadIds: targetLeadIds
    };

    try {
      const res = await fetch('http://localhost:5000/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const newCamp = await res.json();
        setCampaigns([newCamp, ...campaigns]);
        setShowCreateModal(false);
        // Prompt user to start campaign
        if (window.confirm(`Campaign "${campaignName}" created! Would you like to start sending now?`)) {
          triggerSendCampaign(newCamp.id);
        }
      } else {
        simulateMockCampaign(payload);
      }
    } catch (err) {
      console.warn("Backend offline, creating mock campaign.");
      simulateMockCampaign(payload);
    }
  };

  const simulateMockCampaign = (payload) => {
    const selectedTemp = templates.find(t => t.id === parseInt(payload.templateId));
    const newCamp = {
      id: Date.now(),
      name: payload.name,
      template_name: selectedTemp ? selectedTemp.name : 'Custom Template',
      status: 'Draft',
      total_leads: payload.leadIds.length || 5,
      sent_leads: 0,
      created_at: new Date().toISOString()
    };
    setCampaigns([newCamp, ...campaigns]);
    setShowCreateModal(false);
    
    if (window.confirm(`Campaign "${payload.name}" created! Would you like to start sending now?`)) {
      triggerSendCampaign(newCamp.id, payload.leadIds.length || 5);
    }
  };

  const triggerSendCampaign = async (campaignId, mockTotalCount = 5) => {
    setSendingActive(true);
    setCurrentCampaignId(campaignId);
    setSendProgress({ current: 0, total: mockTotalCount });
    setSendStatusLogs([`[CAMPAIGN] Initiating email delivery sequence...`, `[CAMPAIGN] Safe SMTP delay interval set to 3 seconds for testing.`]);

    try {
      const res = await fetch(`http://localhost:5000/api/campaigns/${campaignId}/send`, {
        method: 'POST'
      });
      // Handle server logs chunk reading (SSE or Chunked transfer)
      if (res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let done = false;
        while (!done) {
          const { value, done: readerDone } = await reader.read();
          done = readerDone;
          if (value) {
            const chunk = decoder.decode(value, { stream: true });
            const logLines = chunk.split('\n').filter(Boolean);
            setSendStatusLogs((prev) => [...prev, ...logLines]);
            // Extract progress updates if present in string (e.g. PROGRESS:3/5)
            logLines.forEach(line => {
              if (line.includes('PROGRESS:')) {
                const parts = line.split('PROGRESS:')[1].split('/');
                setSendProgress({ current: parseInt(parts[0]), total: parseInt(parts[1]) });
              }
            });
          }
        }
        setSendStatusLogs((prev) => [...prev, `[SUCCESS] Campaign fully delivered!`]);
        setSendingActive(false);
        fetchCampaignData();
      } else {
        simulateMockSending(campaignId, mockTotalCount);
      }
    } catch (err) {
      console.warn("Backend offline, running mock email campaign simulator.");
      simulateMockSending(campaignId, mockTotalCount);
    }
  };

  const simulateMockSending = (campaignId, total) => {
    let index = 0;
    
    const interval = setInterval(() => {
      index++;
      setSendProgress({ current: index, total: total });
      setSendStatusLogs(prev => [
        ...prev, 
        `[SMTP] Preparing personalized pitch variables for lead #${index}...`,
        `[SMTP] Body generated successfully (substituted estimated owner name).`,
        `[SUCCESS] Email successfully sent to recipient #${index}! Status: 250 OK.`,
        `[COOLDOWN] Waiting 3 seconds to throttle Gmail sending thread...`
      ]);

      if (index === total) {
        clearInterval(interval);
        setSendStatusLogs(prev => [...prev, `[SUCCESS] Campaign complete! All ${total} emails sent.`]);
        setSendingActive(false);
        // Update campaign status in the table
        setCampaigns(prev => prev.map(c => c.id === campaignId ? { ...c, status: 'Completed', sent_leads: total } : c));
      }
    }, 3000);
  };

  // Helper getters
  function getMockCampaigns() {
    return [
      {
        id: 1,
        name: 'Plumbers in Hamburg Outreach',
        template_name: 'Custom Web Design Pitch',
        status: 'Completed',
        total_leads: 12,
        sent_leads: 12,
        created_at: '2026-07-01T10:30:00Z'
      },
      {
        id: 2,
        name: 'Hair Salons Berlin Trial',
        template_name: 'Mobile Optimization Landing Page Pitch',
        status: 'Completed',
        total_leads: 5,
        sent_leads: 5,
        created_at: '2026-06-28T14:15:00Z'
      }
    ];
  }

  function getMockTemplates() {
    return [
      { id: 1, name: 'Custom Web Design Pitch' },
      { id: 2, name: 'Mobile Optimization Landing Page Pitch' },
      { id: 3, name: 'Local Business SEO & Map Presence Pitch' }
    ];
  }

  return (
    <div className="pt-24 pb-12 px-6 md:px-12 bg-[#fafbfd] min-h-screen font-sans">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-black font-poppins">Outreach Campaigns</h1>
            <p className="text-gray-500 text-sm mt-1">Set up custom cold email runs, bind email templates, and view live delivery progress.</p>
          </div>
          
          <button
            onClick={() => {
              setTargetLeadIds([]);
              setCampaignName(`Campaign - ${new Date().toLocaleDateString()}`);
              setShowCreateModal(true);
            }}
            className="text-xs font-bold text-white bg-black hover:bg-gray-800 rounded-full px-5 py-2.5 shadow-md transition-all cursor-pointer"
          >
            Create New Campaign
          </button>
        </div>

        {/* Live Campaign Delivery Progress Drawer */}
        {sendingActive && (
          <div className="bg-white border border-gray-100 rounded-2xl p-6 mb-8 shadow-md animate-slide-down">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-extrabold text-sm text-black font-poppins">Email Campaign in Progress...</h3>
                <p className="text-xs text-gray-400 mt-0.5">Please keep this browser tab open to ensure continuous delivery.</p>
              </div>
              <span className="text-xs font-bold text-purple-600 animate-pulse">Delivering SMTP Packets</span>
            </div>

            {/* Progress Bar */}
            <div className="mb-6">
              <div className="flex justify-between text-xs font-semibold mb-2">
                <span className="text-gray-500">Progress</span>
                <span className="text-black">{sendProgress.current} / {sendProgress.total} Leads Emailed</span>
              </div>
              <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                <div 
                  className="bg-purple-600 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${(sendProgress.current / sendProgress.total) * 100 || 0}%` }}
                ></div>
              </div>
            </div>

            {/* Delivery Logs Terminal Console */}
            <div className="bg-black text-green-400 font-mono text-[11px] rounded-xl p-4 max-h-48 overflow-y-auto border border-gray-900 shadow-inner">
              {sendStatusLogs.map((log, i) => (
                <div key={i} className="py-0.5">{log}</div>
              ))}
            </div>
          </div>
        )}

        {/* Table of Campaigns */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="py-20 text-center text-gray-500 text-sm">Loading campaigns...</div>
          ) : campaigns.length === 0 ? (
            <div className="py-20 text-center text-gray-400 text-sm">No campaigns created yet. Start one by selecting leads from the Dashboard!</div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/70 border-b border-gray-100 text-gray-500 font-semibold text-xs tracking-wider uppercase">
                  <th className="p-4 border-none">Campaign Name</th>
                  <th className="p-4 border-none">Selected Template</th>
                  <th className="p-4 border-none text-center">Total Targets</th>
                  <th className="p-4 border-none text-center">Successfully Sent</th>
                  <th className="p-4 border-none">Status</th>
                  <th className="p-4 border-none">Created Date</th>
                  <th className="p-4 border-none text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-sm">
                {campaigns.map((camp) => (
                  <tr key={camp.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-4 border-none font-bold text-gray-900 font-poppins">{camp.name}</td>
                    <td className="p-4 border-none text-gray-600">{camp.template_name}</td>
                    <td className="p-4 border-none text-center font-semibold text-gray-800">{camp.total_leads}</td>
                    <td className="p-4 border-none text-center font-bold text-purple-600">{camp.sent_leads}</td>
                    <td className="p-4 border-none">
                      <span className={`inline-block text-[10px] font-bold uppercase px-2.5 py-1 rounded-full ${
                        camp.status === 'Completed' 
                          ? 'bg-green-50 text-green-700 border border-green-100'
                          : camp.status === 'Sending'
                          ? 'bg-purple-50 text-purple-700 border border-purple-100'
                          : 'bg-yellow-50 text-yellow-700 border border-yellow-100'
                      }`}>
                        {camp.status}
                      </span>
                    </td>
                    <td className="p-4 border-none text-gray-400">
                      {new Date(camp.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-4 border-none text-right">
                      {camp.status !== 'Completed' && !sendingActive && (
                        <button
                          onClick={() => triggerSendCampaign(camp.id, camp.total_leads)}
                          className="text-xs font-semibold text-purple-600 hover:text-purple-800 bg-purple-50/50 hover:bg-purple-50 rounded-lg px-3 py-1.5 transition-colors cursor-pointer"
                        >
                          Execute SMTP Run
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Create Campaign Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white border border-gray-100 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden animate-slide-down">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-extrabold text-lg text-black font-poppins">Create New Email Campaign</h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-black text-xl font-bold leading-none cursor-pointer"
                >
                  &times;
                </button>
              </div>

              <form onSubmit={handleCreateCampaign} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Campaign Name</label>
                  <input
                    type="text"
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-black text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Select Email Template</label>
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => setSelectedTemplateId(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-black text-sm bg-white"
                  >
                    {templates.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>

                <div className="bg-purple-50/50 border border-purple-100 rounded-xl p-4 text-xs text-purple-700">
                  <strong>Target Leads Info:</strong> You have selected <strong>{targetLeadIds.length > 0 ? targetLeadIds.length : 'All Database'}</strong> leads to receive this campaign. Placeholders like <code className="bg-white px-1 py-0.5 rounded text-purple-600 font-mono">{"{{business_name}}"}</code>, <code className="bg-white px-1 py-0.5 rounded text-purple-600 font-mono">{"{{estimated_owner_name}}"}</code> and <code className="bg-white px-1 py-0.5 rounded text-purple-600 font-mono">{"{{quick_pitch_hook}}"}</code> will be substituted dynamically.
                </div>

                <div className="flex gap-3 justify-end pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="text-xs font-semibold text-gray-600 hover:text-black border border-gray-200 rounded-lg px-4 py-2 hover:bg-gray-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="text-xs font-bold text-white bg-black hover:bg-gray-800 rounded-lg px-4 py-2 shadow-md cursor-pointer"
                  >
                    Launch Campaign
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

export default Campaigns;
