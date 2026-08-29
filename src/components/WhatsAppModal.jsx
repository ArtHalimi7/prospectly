import { useState, useEffect } from 'react';

// Helper to format international phone number for WhatsApp wa.me link
export const cleanPhoneForWhatsApp = (phone, location = '') => {
  if (!phone) return '';
  let cleaned = phone.replace(/\D/g, '');
  
  // Strip leading 00
  if (cleaned.startsWith('00')) {
    cleaned = cleaned.substring(2);
  }
  
  // Handle local formats starting with single 0
  if (cleaned.startsWith('0') && !cleaned.startsWith('49') && !cleaned.startsWith('355') && !cleaned.startsWith('383') && !cleaned.startsWith('43') && !cleaned.startsWith('41')) {
    const loc = (location || '').toLowerCase();
    if (loc.includes('kosovo') || loc.includes('prishtin') || loc.includes('gjilan') || loc.includes('prizren') || loc.includes('pej')) {
      cleaned = '383' + cleaned.substring(1);
    } else if (loc.includes('albania') || loc.includes('tiran') || loc.includes('durres') || loc.includes('vlore')) {
      cleaned = '355' + cleaned.substring(1);
    } else if (loc.includes('austria') || loc.includes('österreich') || loc.includes('wien')) {
      cleaned = '43' + cleaned.substring(1);
    } else if (loc.includes('switzerland') || loc.includes('schweiz') || loc.includes('zürich')) {
      cleaned = '41' + cleaned.substring(1);
    } else {
      // Default to Germany +49
      cleaned = '49' + cleaned.substring(1);
    }
  }

  // If no prefix at all and looks like Kosovo mobile (e.g. 44xxxxxx, 49xxxxxx, 45xxxxxx)
  if (/^4[34589]\d{6}$/.test(cleaned)) {
    cleaned = '383' + cleaned;
  }
  
  return cleaned;
};

const WhatsAppModal = ({ lead, isOpen, onClose, onSaveLead, onNextLead, hasNextLead }) => {
  if (!isOpen || !lead) return null;

  const [phone, setPhone] = useState(lead.phone_number || '');
  const [message, setMessage] = useState(lead.personalized_whatsapp || lead.personalized_body || '');
  const [language, setLanguage] = useState(() => {
    const loc = (lead.location || '').toLowerCase();
    const ph = (lead.phone_number || '').replace(/\D/g, '');
    if (ph.startsWith('383') || ph.startsWith('355') || loc.includes('kosovo') || loc.includes('albania') || loc.includes('prishtin')) {
      return 'Albanian';
    }
    if (ph.startsWith('49') || loc.includes('germany') || loc.includes('deutschland') || /\b\d{5}\b/.test(loc)) {
      return 'German';
    }
    return 'German';
  });
  const [tone, setTone] = useState('Professional & Friendly');
  const [customInstructions, setCustomInstructions] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [status, setStatus] = useState(lead.status || 'Enriched');
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    setPhone(lead.phone_number || '');
    setMessage(lead.personalized_whatsapp || lead.personalized_body || '');
    setStatus(lead.status || 'Enriched');
  }, [lead]);

  const cleanedPhone = cleanPhoneForWhatsApp(phone, lead.location);

  // Trigger AI generation
  const handleGenerateAI = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch(`http://localhost:5000/api/leads/${lead.id}/generate-whatsapp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language,
          tone,
          customInstructions
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.message || data.personalized_whatsapp) {
          const newMsg = data.message || data.personalized_whatsapp;
          setMessage(newMsg);
          if (onSaveLead) {
            onSaveLead({ ...lead, personalized_whatsapp: newMsg, phone_number: phone });
          }
        }
      } else {
        // Fallback generator directly
        const fallbackRes = await fetch('http://localhost:5000/api/generate-whatsapp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            business_name: lead.business_name,
            category: lead.category,
            location: lead.location,
            phone_number: phone,
            rating: lead.rating,
            reviews_count: lead.reviews_count,
            estimated_owner_name: lead.estimated_owner_name,
            language,
            tone,
            customInstructions
          })
        });
        if (fallbackRes.ok) {
          const d = await fallbackRes.json();
          setMessage(d.message);
        }
      }
    } catch (err) {
      console.warn('AI generation API failed, applying local template:', err);
      const defaultGreeting = language === 'German'
        ? `Hallo ${lead.estimated_owner_name && lead.estimated_owner_name !== 'Unknown' ? lead.estimated_owner_name : lead.business_name}-Team 👋\n\nIch bin Art Halimi, Webentwickler (arthalimi.com).\n\nIch habe Ihr Unternehmen auf Google Maps entdeckt – Glückwunsch zu den hervorragenden ${lead.rating || '5.0'} ⭐ (${lead.reviews_count || 'vielen'} Bewertungen)!\n\nMir ist aufgefallen, dass Sie trotz Ihres tollen Rufs noch keine eigene Website haben. Ich habe einen unverbindlichen Design-Entwurf für ${lead.business_name} vorbereitet.\n\nHätten Sie kurz Zeit für ein 5-Minuten-Gespräch, damit ich Ihnen den Entwurf zeige?\n\nBeste Grüße,\nArt Halimi\narthalimi.com`
        : `Pershendetje ${lead.business_name} 👋\n\nUne jam Art Halimi, web developer (arthalimi.com).\n\nPashe biznesin tuaj ne Google Maps me vleresime te shkelqyera ${lead.rating || '5.0'} ⭐ (${lead.reviews_count || 0} vleresime)!\n\nVura re qe nuk keni ende nje uebfaqe aktive per te marre kliente direkt online. Kam pergatitur nje koncept/dizajn modern fillestar falas per ${lead.business_name}.\n\nA keni kohe per nje bisede te shkurter 5-minuteshe kete jave per ta shikuar bashke?\n\nMe respekt,\nArt Halimi\narthalimi.com`;
      setMessage(defaultGreeting);
    }
    setIsGenerating(false);
  };

  // Launch WhatsApp directly
  const handleSendWhatsApp = async () => {
    if (!cleanedPhone) {
      alert('Please provide a valid phone number with country code.');
      return;
    }

    // Save lead changes and update status to 'WhatsApp Sent'
    try {
      await fetch(`http://localhost:5000/api/leads/${lead.id}/whatsapp-sent`, { method: 'POST' });
      await fetch(`http://localhost:5000/api/leads/${lead.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...lead,
          phone_number: phone,
          personalized_whatsapp: message,
          status: 'WhatsApp Sent'
        })
      });
    } catch (e) {
      // Local fallback
    }

    setStatus('WhatsApp Sent');
    if (onSaveLead) {
      onSaveLead({
        ...lead,
        phone_number: phone,
        personalized_whatsapp: message,
        status: 'WhatsApp Sent'
      });
    }

    // Open WhatsApp
    const waUrl = `https://wa.me/${cleanedPhone}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyPhone = () => {
    navigator.clipboard.writeText(cleanedPhone ? `+${cleanedPhone}` : phone);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  const handleSave = async () => {
    try {
      await fetch(`http://localhost:5000/api/leads/${lead.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...lead,
          phone_number: phone,
          personalized_whatsapp: message,
          status
        })
      });
    } catch (e) {
      // ignore
    }

    if (onSaveLead) {
      onSaveLead({
        ...lead,
        phone_number: phone,
        personalized_whatsapp: message,
        status
      });
    }
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-3 md:p-6 overflow-y-auto animate-fade-in">
      <div className="bg-white border border-gray-100 rounded-3xl max-w-4xl w-full shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        
        {/* Modal Top Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-gray-900 via-gray-800 to-black text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-green-500/20 border border-green-400/30 flex items-center justify-center text-green-400 text-xl font-bold">
              💬
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-lg text-white font-poppins">{lead.business_name}</h3>
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                  status === 'WhatsApp Sent'
                    ? 'bg-green-500 text-white'
                    : 'bg-yellow-500/20 text-yellow-300 border border-yellow-400/30'
                }`}>
                  {status}
                </span>
              </div>
              <p className="text-xs text-gray-300 flex items-center gap-2 mt-0.5">
                <span>{lead.category || 'Local Business'}</span>
                <span>•</span>
                <span>{lead.location || 'Location'}</span>
                <span>•</span>
                <span className="text-amber-300 font-semibold">{lead.rating ? `${lead.rating} ⭐` : '5.0 ⭐'} ({lead.reviews_count || 0} reviews)</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl font-bold leading-none p-1 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
          >
            &times;
          </button>
        </div>

        {/* Modal Main Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-[#f8fafc]">
          
          {/* Phone Number Bar */}
          <div className="bg-white border border-gray-200/80 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex-1">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                Recipient WhatsApp Number
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+49 176 1234567 or +383 49 123456"
                  className="w-full font-mono text-sm px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:bg-white font-semibold text-gray-900"
                />
                <button
                  onClick={handleCopyPhone}
                  title="Copy formatted phone number"
                  className="px-3 py-2 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer whitespace-nowrap"
                >
                  {copiedPhone ? '✓ Copied' : '📋 Copy'}
                </button>
              </div>
            </div>

            <div className="bg-green-50/80 border border-green-200/60 rounded-xl px-4 py-2 text-xs text-green-900 flex items-center gap-2.5">
              <span className="text-base">📱</span>
              <div>
                <div className="font-bold">WhatsApp International Format:</div>
                <div className="font-mono text-green-700 font-semibold">
                  {cleanedPhone ? `+${cleanedPhone}` : '⚠️ Enter valid phone'}
                </div>
              </div>
            </div>
          </div>

          {/* AI Generator Controls Bar */}
          <div className="bg-white border border-gray-200/80 rounded-2xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-gray-800 font-poppins flex items-center gap-1.5">
                  <span className="text-purple-600">✨</span> AI Copywriter Engine (Gemini)
                </span>
                <span className="text-[10px] bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-full font-bold">
                  Starts with &quot;Ich bin Art Halimi...&quot;
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">Language</label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full text-xs font-semibold bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-black cursor-pointer"
                >
                  <option value="German">🇩🇪 German (Deutsch)</option>
                  <option value="Albanian">🇦🇱 Albanian (Shqip)</option>
                  <option value="English">🇬🇧 English</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">Pitch Angle / Tone</label>
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  className="w-full text-xs font-semibold bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-black cursor-pointer"
                >
                  <option value="Professional & Friendly">Professional & Friendly</option>
                  <option value="Free Website Mockup / Preview">Free Website Mockup / Preview</option>
                  <option value="Leverage High Google Reviews">Leverage High Google Reviews</option>
                  <option value="Short & Punchy Direct Pitch">Short & Punchy Direct Pitch</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">Custom Prompt / Focus (Optional)</label>
                <input
                  type="text"
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  placeholder="e.g. mention direct appointments"
                  className="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-black"
                />
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={handleGenerateAI}
                disabled={isGenerating}
                className="text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 rounded-xl px-4 py-2 shadow-md flex items-center gap-2 transition-all cursor-pointer"
              >
                {isGenerating ? (
                  <>
                    <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                    </svg>
                    Generating Custom Pitch...
                  </>
                ) : (
                  <>
                    <span>✨</span> Regenerate with Gemini AI
                  </>
                )}
              </button>
            </div>
          </div>

          {/* WhatsApp Live Preview & Editor */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            
            {/* Editor Box */}
            <div className="lg:col-span-6 flex flex-col">
              <label className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center justify-between">
                <span>Message Editor</span>
                <span className="text-[10px] font-normal text-gray-400">Markdown & Emojis supported</span>
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={11}
                className="w-full flex-1 p-3.5 text-sm bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-500 font-sans leading-relaxed text-gray-800 shadow-sm resize-none"
                placeholder="Type or generate WhatsApp message..."
              ></textarea>
            </div>

            {/* Realistic WhatsApp Chat Bubble Preview */}
            <div className="lg:col-span-6 flex flex-col">
              <label className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center justify-between">
                <span>Live WhatsApp Chat Preview</span>
                <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Mobile View</span>
              </label>
              
              <div className="flex-1 bg-[#efeae2] border border-gray-200 rounded-2xl p-4 relative flex flex-col justify-end shadow-inner min-h-[260px] overflow-hidden"
                style={{
                  backgroundImage: 'radial-gradient(#d1d7db 1px, transparent 1px)',
                  backgroundSize: '16px 16px'
                }}
              >
                {/* Chat Top Bar Simulation */}
                <div className="absolute top-0 left-0 right-0 bg-[#008069] text-white px-3.5 py-2 flex items-center gap-2.5 shadow-sm">
                  <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">
                    👤
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold truncate leading-tight">{lead.business_name}</div>
                    <div className="text-[9px] text-green-100 leading-tight">online</div>
                  </div>
                </div>

                {/* WhatsApp Chat Message Bubble */}
                <div className="mt-8 mb-2 self-end max-w-[92%] bg-[#d9fdd3] text-gray-900 rounded-2xl rounded-tr-xs p-3.5 shadow-sm relative text-xs leading-relaxed whitespace-pre-wrap font-sans border border-green-200/50">
                  {message || 'No message content...'}
                  <div className="text-[9px] text-gray-500 text-right mt-1.5 flex items-center justify-end gap-1 font-sans">
                    <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <span className="text-[#53bdeb] font-bold">✓✓</span>
                  </div>
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* Modal Bottom Footer Actions */}
        <div className="px-6 py-4 bg-white border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyMessage}
              className="text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl px-3.5 py-2 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              {copied ? '✓ Message Copied!' : '📋 Copy Message'}
            </button>
            <button
              onClick={handleSave}
              className="text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl px-3.5 py-2 transition-colors cursor-pointer"
            >
              {saveSuccess ? '✓ Saved!' : '💾 Save Draft'}
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            {hasNextLead && onNextLead && (
              <button
                onClick={onNextLead}
                className="text-xs font-bold text-gray-600 hover:text-black bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl px-4 py-2.5 transition-colors cursor-pointer"
              >
                Skip to Next ➔
              </button>
            )}

            <button
              onClick={handleSendWhatsApp}
              disabled={!cleanedPhone}
              className="text-xs font-bold text-white bg-[#25D366] hover:bg-[#1EBE5D] disabled:opacity-50 disabled:hover:bg-[#25D366] rounded-xl px-5 py-2.5 shadow-md shadow-green-200 flex items-center gap-2 transition-all cursor-pointer"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
              </svg>
              <span>Send via WhatsApp</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default WhatsAppModal;
