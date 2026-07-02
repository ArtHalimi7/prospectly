import { useState, useEffect } from 'react';

const Templates = () => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/templates');
      if (res.ok) {
        const data = await res.json();
        setTemplates(data);
      } else {
        setTemplates(getMockTemplates());
      }
    } catch (err) {
      console.warn("Backend offline, using mock templates.");
      setTemplates(getMockTemplates());
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name || !subject || !body) return;

    const payload = { name, subject, body };
    try {
      const res = await fetch('http://localhost:5000/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const newTemp = await res.json();
        setTemplates([...templates, newTemp]);
      } else {
        setTemplates([...templates, { id: Date.now(), ...payload }]);
      }
    } catch (err) {
      setTemplates([...templates, { id: Date.now(), ...payload }]);
    }
    setShowCreateModal(false);
    setName('');
    setSubject('');
    setBody('');
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`http://localhost:5000/api/templates/${editingTemplate.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingTemplate)
      });
      if (res.ok) {
        setTemplates(templates.map(t => t.id === editingTemplate.id ? editingTemplate : t));
      } else {
        setTemplates(templates.map(t => t.id === editingTemplate.id ? editingTemplate : t));
      }
    } catch (err) {
      setTemplates(templates.map(t => t.id === editingTemplate.id ? editingTemplate : t));
    }
    setEditingTemplate(null);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this template?")) return;
    try {
      const res = await fetch(`http://localhost:5000/api/templates/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setTemplates(templates.filter(t => t.id !== id));
      } else {
        setTemplates(templates.filter(t => t.id !== id));
      }
    } catch (err) {
      setTemplates(templates.filter(t => t.id !== id));
    }
  };

  function getMockTemplates() {
    return [
      {
        id: 1,
        name: 'Custom Web Design Pitch',
        subject: '💡 Website idea for {{business_name}}',
        body: `Hi {{estimated_owner_name}},\n\nI was looking up some highly rated local businesses in the area and noticed your excellent services at {{business_name}} (loved your Google review rating!).\n\nHowever, I noticed that your business currently doesn't have an active website. In today's digital market, having a strong web presence is key to getting new leads without middle-man fees.\n\n{{quick_pitch_hook}}\n\nI designed a quick mockup of how your website could look, featuring direct online booking and customer review testimonials. Would you be open to a 5-minute chat sometime this week to take a look?\n\nBest regards,\nYour Name\nYour Agency`
      },
      {
        id: 2,
        name: 'Mobile Optimization Landing Page Pitch',
        subject: '📱 Quick suggestion for {{business_name}}',
        body: `Dear {{estimated_owner_name}},\n\nI hope this email finds you well.\n\nMy name is Your Name, and I am a local web developer. I recently found {{business_name}} while looking for services in your area. While you have amazing reviews on Google Maps, it looks like you don't have a website to convert those visitors into direct customers.\n\n{{quick_pitch_hook}}\n\nHaving a simple, fast-loading, mobile-optimized landing page can increase your direct client calls by up to 40%.\n\nWould you be open to seeing a free custom visual concept I drafted for you?\n\nKind regards,\nYour Name`
      }
    ];
  }

  return (
    <div className="pt-24 pb-12 px-6 md:px-12 bg-[#fafbfd] min-h-screen font-sans">
      <div className="max-w-5xl mx-auto">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-black font-poppins">Email Templates</h1>
            <p className="text-gray-500 text-sm mt-1">Design cold outreach emails, insert AI variables, and template your custom pitches.</p>
          </div>
          
          <button
            onClick={() => setShowCreateModal(true)}
            className="text-xs font-bold text-white bg-black hover:bg-gray-800 rounded-full px-5 py-2.5 shadow-md transition-all cursor-pointer"
          >
            Create Template
          </button>
        </div>

        {/* Placeholders Help Box */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 mb-8 shadow-sm">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Available Variables</h3>
          <p className="text-xs text-gray-500 leading-normal mb-3">Copy and paste these variable tokens into your subject or body. They will be replaced automatically for each lead during delivery:</p>
          <div className="flex flex-wrap gap-2">
            <code className="text-xs bg-purple-50 text-purple-600 border border-purple-100 px-2.5 py-1 rounded-lg">{"{{business_name}}"}</code>
            <code className="text-xs bg-purple-50 text-purple-600 border border-purple-100 px-2.5 py-1 rounded-lg">{"{{estimated_owner_name}}"}</code>
            <code className="text-xs bg-purple-50 text-purple-600 border border-purple-100 px-2.5 py-1 rounded-lg">{"{{quick_pitch_hook}}"}</code>
            <code className="text-xs bg-purple-50 text-purple-600 border border-purple-100 px-2.5 py-1 rounded-lg">{"{{phone_number}}"}</code>
            <code className="text-xs bg-purple-50 text-purple-600 border border-purple-100 px-2.5 py-1 rounded-lg">{"{{location}}"}</code>
          </div>
        </div>

        {/* Templates Grid List */}
        {loading ? (
          <div className="py-20 text-center text-gray-500 text-sm">Loading templates...</div>
        ) : templates.length === 0 ? (
          <div className="py-20 text-center text-gray-400 text-sm">No templates found. Click 'Create Template' to start!</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {templates.map((temp) => (
              <div key={temp.id} className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                <div>
                  <div className="flex justify-between items-start gap-4 mb-3">
                    <h3 className="font-extrabold text-base text-gray-900 font-poppins">{temp.name}</h3>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setEditingTemplate(temp)}
                        className="text-xs font-semibold text-gray-500 hover:text-black border border-gray-200 hover:border-gray-300 bg-white rounded-lg px-2 py-1 transition-colors cursor-pointer"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(temp.id)}
                        className="text-xs font-semibold text-red-500 hover:text-red-700 bg-white border border-red-100 hover:border-red-200 rounded-lg px-2 py-1 transition-colors cursor-pointer"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 mb-4 text-xs font-mono text-gray-600 whitespace-nowrap overflow-hidden text-ellipsis">
                    <span className="font-bold text-gray-800">Subject:</span> {temp.subject}
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed line-clamp-6 whitespace-pre-wrap">{temp.body}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white border border-gray-100 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden animate-slide-down">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-extrabold text-lg text-black font-poppins">Create New Template</h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-black text-xl font-bold leading-none cursor-pointer"
                >
                  &times;
                </button>
              </div>

              <form onSubmit={handleCreate} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Template Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="e.g., Plumber Pitch Template"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-black text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Subject Line</label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    required
                    placeholder="e.g., Question about {{business_name}}"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-black text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Email Body</label>
                  <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    required
                    rows="10"
                    placeholder="Write your email here. Use variables like {{business_name}} and {{estimated_owner_name}}."
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-black text-sm font-sans"
                  ></textarea>
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
                    Create Template
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {editingTemplate && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white border border-gray-100 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden animate-slide-down">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-extrabold text-lg text-black font-poppins">Edit Template</h3>
                <button
                  onClick={() => setEditingTemplate(null)}
                  className="text-gray-400 hover:text-black text-xl font-bold leading-none cursor-pointer"
                >
                  &times;
                </button>
              </div>

              <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Template Name</label>
                  <input
                    type="text"
                    value={editingTemplate.name}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-black text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Subject Line</label>
                  <input
                    type="text"
                    value={editingTemplate.subject}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, subject: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-black text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Email Body</label>
                  <textarea
                    value={editingTemplate.body}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, body: e.target.value })}
                    required
                    rows="10"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-black text-sm font-sans"
                  ></textarea>
                </div>

                <div className="flex gap-3 justify-end pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setEditingTemplate(null)}
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

export default Templates;
