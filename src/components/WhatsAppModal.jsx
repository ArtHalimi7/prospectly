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

export function classifyPhoneNumber(phone = '', location = '') {
  if (!phone || typeof phone !== 'string') {
    return { type: 'none', whatsapp_status: 'none', formatted: '', label: 'No Phone' };
  }

  const rawDigits = phone.replace(/\D/g, '');
  if (!rawDigits || rawDigits.length < 5) {
    return { type: 'none', whatsapp_status: 'none', formatted: phone, label: 'Invalid' };
  }

  // Germany (015x, 016x, 017x or 4915x, 4916x, 4917x)
  if (/^(?:49)?0?1[567]\d{7,9}$/.test(rawDigits) || /^(?:49)?1[567]\d{7,9}$/.test(rawDigits)) {
    return { type: 'mobile', whatsapp_status: 'ready', formatted: phone, label: 'WA Ready' };
  }

  // Switzerland (075, 076, 077, 078, 079 or 4175..4179)
  if (/^(?:41)?0?7[56789]\d{7}$/.test(rawDigits) || /^(?:41)?7[56789]\d{7}$/.test(rawDigits)) {
    return { type: 'mobile', whatsapp_status: 'ready', formatted: phone, label: 'WA Ready' };
  }

  // Kosovo (383 43..49 or 043..049)
  if (/^(?:383)?0?4[3456789]\d{6}$/.test(rawDigits) || /^(?:383)?4[3456789]\d{6}$/.test(rawDigits)) {
    return { type: 'mobile', whatsapp_status: 'ready', formatted: phone, label: 'WA Ready' };
  }

  // Albania (355 67..69 or 067..069)
  if (/^(?:355)?0?6[789]\d{7}$/.test(rawDigits) || /^(?:355)?6[789]\d{7}$/.test(rawDigits)) {
    return { type: 'mobile', whatsapp_status: 'ready', formatted: phone, label: 'WA Ready' };
  }

  // Austria (43 650..699 or 0650..0699)
  if (/^(?:43)?0?6(?:50|60|64|76|80|99)\d{5,8}$/.test(rawDigits)) {
    return { type: 'mobile', whatsapp_status: 'ready', formatted: phone, label: 'WA Ready' };
  }

  // UK (44 7xxx or 07xxx)
  if (/^(?:44)?0?7\d{9}$/.test(rawDigits)) {
    return { type: 'mobile', whatsapp_status: 'ready', formatted: phone, label: 'WA Ready' };
  }

  // Regional Landlines:
  if (/^(?:49|41|43|383|355)?0?[2345689]/.test(rawDigits)) {
    return { type: 'landline', whatsapp_status: 'landline', formatted: phone, label: 'Landline' };
  }

  return { type: 'unknown', whatsapp_status: 'unknown', formatted: phone, label: 'Unknown' };
}

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
      return 'Deutsch';
    }
    return 'Deutsch';
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

  // Handle Escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const cleanedPhone = cleanPhoneForWhatsApp(phone, lead.location);

  // Trigger AI generation
  const handleGenerateAI = async (langToUse = language, toneToUse = tone) => {
    setIsGenerating(true);
    setLanguage(langToUse);
    try {
      const res = await fetch(`http://localhost:5000/api/leads/${lead.id}/generate-whatsapp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language: langToUse,
          tone: toneToUse,
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
            language: langToUse,
            tone: toneToUse,
            customInstructions
          })
        });
        if (fallbackRes.ok) {
          const d = await fallbackRes.json();
          setMessage(d.message);
          if (onSaveLead) {
            onSaveLead({ ...lead, personalized_whatsapp: d.message, phone_number: phone });
          }
        } else {
          throw new Error('Fallback failed');
        }
      }
    } catch (err) {
      console.warn('AI generation API failed, applying local template:', err);
      const isGerman = (langToUse === 'Deutsch' || langToUse === 'German');
      const isAlbanian = langToUse === 'Albanian';
      const defaultGreeting = isGerman
        ? `Hallo, ich bin Art Halimi, ich mache Webseiten (arthalimi.com).\n\nHab ${lead.business_name} auf Google Maps gesehen - sieht gut aus. Mir ist aufgefallen dass ihr keine eigene Webseite habt.\n\nIch mach sowas beruflich und würde euch gerne mal nen kostenlosen Entwurf zeigen, einfach damit ihr seht wie das aussehen könnte. Kein Vertrag, kein Stress.\n\nFalls Interesse besteht einfach kurz antworten, dann können wir 5 Minuten telefonieren.\n\nGruss, Art`
        : isAlbanian
        ? `Pershendetje, une jam Art Halimi, merrem me web development (arthalimi.com).\n\nE pashe ${lead.business_name} ne Google Maps, duket mire. Vetem vura re qe nuk keni nje webfaqe tuajen.\n\nUne i boj webfaqe profesionale dhe doja me ju tregu nje draft falas, vetem me pa se si do te dukej. Pa asnje obligim.\n\nNese ju intereson, thjesht me kthy nje pergjigje te shkurter.\n\nFaleminderit, Art`
        : `Hey, I'm Art Halimi, I build websites (arthalimi.com).\n\nFound ${lead.business_name} on Google Maps - looks solid. Noticed you don't have your own website though.\n\nI do this for a living and I'd be happy to put together a free draft for you, just so you can see what it could look like. No strings attached.\n\nIf you're interested just shoot me a quick reply and we can hop on a 5 min call.\n\nCheers, Art`;
      setMessage(defaultGreeting);
      if (onSaveLead) {
        onSaveLead({ ...lead, personalized_whatsapp: defaultGreeting, phone_number: phone });
      }
    }
    setIsGenerating(false);
  };

  // Launch WhatsApp directly
  const handleSendWhatsApp = async () => {
    if (!cleanedPhone) {
      alert('Please provide a valid phone number with country code.');
      return;
    }

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
    <div 
      className="fixed inset-0 bg-black/85 backdrop-blur-xl flex items-center justify-center z-[60] p-4 pt-16 pb-8 overflow-y-auto animate-fadeIn font-sans"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative bg-zinc-950 border border-zinc-800/90 rounded-3xl max-w-3xl w-full shadow-[0_25px_70px_rgba(0,0,0,0.95),inset_0_1px_0_rgba(255,255,255,0.08)] overflow-hidden my-auto max-h-[84vh] flex flex-col text-white backdrop-blur-2xl animate-scaleUp">
        
        {/* Radial Ambient Glow Header Accent */}
        <div className="absolute top-0 left-0 right-0 h-32 bg-[radial-gradient(ellipse_100%_80%_at_50%_0%,rgba(140,130,255,0.12),transparent_70%)] pointer-events-none"></div>

        {/* Modal Top Header Bar */}
        <div className="relative z-10 px-5 py-3.5 border-b border-zinc-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-emerald-400 font-bold shrink-0 shadow-inner">
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
              </svg>
            </div>
            
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-sm sm:text-base text-white font-display truncate">
                  {lead.business_name}
                </h3>
                
                <span className={`text-[10px] font-mono-accent uppercase px-2 py-0.2 rounded-full border ${
                  status === 'WhatsApp Sent'
                    ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/30 font-medium'
                    : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                }`}>
                  {status === 'WhatsApp Sent' ? '✓ Sent' : status}
                </span>
              </div>
              
              <div className="text-[11px] text-zinc-400 flex items-center gap-1.5 font-mono-accent">
                <span>{lead.category || 'Business'}</span>
                <span>·</span>
                <span>{lead.location || 'Location'}</span>
                <span>·</span>
                <span className="text-white flex items-center gap-1 font-medium bg-zinc-900 px-1.5 py-0.2 rounded border border-zinc-800">
                  <span>{lead.rating ? Number(lead.rating).toFixed(1) : '5.0'}</span>
                  <svg className="w-2.5 h-2.5 text-amber-400 fill-amber-400" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <span className="text-zinc-500 font-normal">({lead.reviews_count || 0})</span>
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer shrink-0 ml-2 text-xs"
            title="Close (Esc)"
          >
            ✕
          </button>
        </div>

        {/* Modal Main Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3 flex-1 bg-zinc-950/80">
          
          {/* Top Intelligence & Phone Ribbon (Single Slim Row) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 font-mono-accent text-xs">
            
            {/* Phone Input Box */}
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-2.5 px-3 flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <span className="block text-[9px] uppercase text-zinc-500 font-medium">
                  {classifyPhoneNumber(phone, lead.location).type === 'landline' ? 'Landline Phone' : 'WhatsApp Number'}
                </span>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+49 176 1234567"
                  className="w-full bg-transparent border-none p-0 text-white font-medium text-xs focus:outline-none focus:ring-0"
                />
              </div>
              <button
                type="button"
                onClick={handleCopyPhone}
                className="px-2 py-0.5 text-[10px] font-mono-accent text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded transition-colors cursor-pointer shrink-0"
              >
                {copiedPhone ? '✓ Copied' : 'Copy'}
              </button>
            </div>

            {/* Intelligence Box */}
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-2.5 px-3 flex items-center justify-between gap-2">
              <div>
                <span className="block text-[9px] uppercase text-zinc-500 font-medium">
                  Discovery
                </span>
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-rose-400 font-medium">No Website</span>
                  {lead.estimated_owner_name && lead.estimated_owner_name !== 'Unknown' && (
                    <>
                      <span className="text-zinc-600">·</span>
                      <span className="text-zinc-300 font-medium truncate max-w-[130px]">{lead.estimated_owner_name}</span>
                    </>
                  )}
                </div>
              </div>

              {(() => {
                const pInfo = classifyPhoneNumber(phone, lead.location);
                if (pInfo.type === 'mobile') {
                  return (
                    <div className="text-[10px] text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded">
                      <span>{cleanedPhone ? `+${cleanedPhone}` : 'WA Ready'}</span>
                    </div>
                  );
                }
                if (pInfo.type === 'landline') {
                  return (
                    <div className="text-[10px] text-zinc-400 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded" title="Fixed Landline (Festnetz)">
                      <span>Landline</span>
                    </div>
                  );
                }
                return (
                  <div className="text-[10px] text-zinc-500 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded">
                    No valid prefix
                  </div>
                );
              })()}
            </div>

          </div>

          {/* AI Generator Controls Bar */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-3 space-y-2.5 font-mono-accent">
            
            <div className="flex flex-wrap items-center justify-between gap-2">
              
              {/* Language Selection: Albanian, Deutsch, English (NO EMOJIS) */}
              <div className="flex items-center gap-1 bg-zinc-950/90 p-0.5 rounded-full border border-zinc-800">
                {['Albanian', 'Deutsch', 'English'].map((lang) => {
                  const isSelected = language === lang || (lang === 'Deutsch' && language === 'German');
                  return (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => {
                        setLanguage(lang);
                        handleGenerateAI(lang, tone);
                      }}
                      className={`text-[11px] px-3 py-1 rounded-full transition-all cursor-pointer font-mono-accent ${
                        isSelected
                          ? 'bg-white text-black font-semibold shadow-sm'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {lang}
                    </button>
                  );
                })}
              </div>

              {/* Pitch Tone Selector */}
              <select
                value={tone}
                onChange={(e) => {
                  const newTone = e.target.value;
                  setTone(newTone);
                  handleGenerateAI(language, newTone);
                }}
                className="text-[11px] bg-zinc-950/90 border border-zinc-800 rounded-full px-3 py-1 text-zinc-300 focus:outline-none focus:border-zinc-500 cursor-pointer font-mono-accent"
              >
                <option value="Professional & Friendly">Professional & Friendly</option>
                <option value="Free Website Mockup / Preview">Free Website Mockup</option>
                <option value="Leverage High Google Reviews">Leverage 4.5+ Rating</option>
                <option value="Short & Punchy Direct Pitch">Direct & Punchy</option>
              </select>

              {/* Regenerate AI Button */}
              <button
                type="button"
                onClick={handleGenerateAI}
                disabled={isGenerating}
                className="text-[11px] font-mono-accent text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 border border-zinc-700 rounded-full px-3.5 py-1 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                {isGenerating ? (
                  <>
                    <svg className="animate-spin h-3 w-3 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                    </svg>
                    <span>Generating...</span>
                  </>
                ) : (
                  <span>Regenerate Pitch</span>
                )}
              </button>

            </div>

            {/* Custom Instructions Input */}
            <input
              type="text"
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              placeholder="Custom instructions (optional, e.g. emphasize next-day delivery)..."
              className="w-full text-[11px] bg-zinc-950/80 border border-zinc-800 rounded-lg px-2.5 py-1 text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 font-mono-accent"
            />

          </div>

          {/* Dual Message Studio & WhatsApp Simulation */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
            
            {/* Editor Workspace */}
            <div className="lg:col-span-6 flex flex-col font-mono-accent">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">
                  Pitch Editor
                </span>
                <span className="text-[10px] text-zinc-500">
                  {message.length} chars
                </span>
              </div>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full flex-1 p-3.5 text-xs bg-zinc-950 border border-zinc-800 rounded-2xl focus:outline-none focus:border-zinc-500 font-sans leading-relaxed text-zinc-200 resize-none shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)] min-h-[260px]"
                placeholder="Type or generate message..."
              ></textarea>
            </div>

            {/* WhatsApp Chat Simulation — Authentic WhatsApp Web Dark Mode */}
            <div className="lg:col-span-6 flex flex-col font-mono-accent">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">
                  WhatsApp Web Preview
                </span>
                <span className="text-[9px] text-[#00a884] font-medium bg-[#00a884]/10 border border-[#00a884]/30 px-2 py-0.2 rounded-full">
                  Live View
                </span>
              </div>
              
              {/* WhatsApp Window Shell */}
              <div className="flex-1 bg-[#0b141a] border border-[#222d34] rounded-2xl overflow-hidden flex flex-col shadow-2xl min-h-[260px] max-h-[300px] relative font-sans">
                
                {/* 1. WhatsApp Top App Bar */}
                <div className="bg-[#202c33] text-[#e9edef] px-3.5 py-2 flex items-center justify-between border-b border-[#222d34] shrink-0 z-10">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-[#6b777f] flex items-center justify-center text-white text-xs font-bold shrink-0">
                      <svg className="w-4 h-4 text-white/80" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-[#e9edef] truncate leading-tight">
                        {phone ? (cleanedPhone ? `+${cleanedPhone}` : phone) : lead.business_name}
                      </div>
                      <div className="text-[10px] text-[#8696a0] truncate leading-tight mt-0.5">
                        click here for contact info
                      </div>
                    </div>
                  </div>

                  {/* Header Actions Icons */}
                  <div className="flex items-center gap-3 text-[#aebac1] shrink-0">
                    <svg className="w-3.5 h-3.5 cursor-pointer hover:text-white transition-colors" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
                    </svg>
                    <svg className="w-3.5 h-3.5 cursor-pointer hover:text-white transition-colors" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 00-1.01.24l-1.57 1.97c-2.83-1.44-5.15-3.75-6.59-6.59l1.97-1.57c.28-.28.36-.67.25-1.02A11.36 11.36 0 018.57 4c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1 0 9.39 7.61 17 17 17 .55 0 1-.45 1-1v-3.5c0-.55-.45-1-1-1z"/>
                    </svg>
                    <svg className="w-3.5 h-3.5 cursor-pointer hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M21 21l-4.35-4.35M17 10a7 7 0 11-14 0 7 7 0 0114 0z"/>
                    </svg>
                    <svg className="w-3.5 h-3.5 cursor-pointer hover:text-white transition-colors" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                    </svg>
                  </div>
                </div>

                {/* 2. WhatsApp Chat Scroll Area with Wallpaper Pattern */}
                <div 
                  className="flex-1 p-3.5 overflow-y-auto space-y-2 flex flex-col justify-end relative"
                  style={{
                    backgroundColor: '#0b141a',
                    backgroundImage: `radial-gradient(#202c33 0.75px, transparent 0.75px), radial-gradient(#202c33 0.75px, #0b141a 0.75px)`,
                    backgroundSize: '30px 30px',
                    backgroundPosition: '0 0, 15px 15px'
                  }}
                >
                  
                  {/* Date Badge */}
                  <div className="text-center my-1">
                    <span className="bg-[#182229] text-[#8696a0] text-[10px] font-medium px-2.5 py-1 rounded-md shadow-sm uppercase tracking-wider">
                      Today
                    </span>
                  </div>

                  {/* End-to-End Encryption Banner */}
                  <div className="bg-[#182229]/95 border border-[#222e35]/80 text-[#ffd279] text-[9.5px] px-3 py-1.5 rounded-lg text-center leading-tight max-w-[92%] mx-auto my-1 shadow-sm flex items-center justify-center gap-1.5">
                    <svg className="w-2.5 h-2.5 fill-current shrink-0 text-[#ffd279]" viewBox="0 0 24 24">
                      <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
                    </svg>
                    <span>Messages and calls are end-to-end encrypted. Only people in this chat can read, listen to, or share them. Click to learn more</span>
                  </div>

                  {/* Green Outgoing WhatsApp Message Bubble */}
                  <div className="self-end max-w-[92%] bg-[#005c4b] text-[#e9edef] rounded-lg rounded-tr-none px-3 py-2 shadow-md relative text-xs leading-[18px] whitespace-pre-wrap font-sans mt-2">
                    
                    {/* SVG Bubble Top-Right Corner Tail */}
                    <svg className="absolute -top-[1px] -right-2 w-2 h-3 text-[#005c4b] fill-current pointer-events-none" viewBox="0 0 8 13">
                      <path d="M0 0v13c2.5-3.5 5.5-8.5 8-13H0z"/>
                    </svg>

                    {/* Message Body with link styling */}
                    <div className="text-[12px] text-[#e9edef]">
                      {message || 'Type or generate message...'}
                    </div>

                    {/* Message Metadata: Timestamp & Blue Double Checkmarks */}
                    <div className="text-[9px] text-[#8696a0] text-right mt-1 flex items-center justify-end gap-1 select-none font-sans float-right ml-2 -mb-0.5">
                      <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      <svg className="w-3.5 h-3.5 text-[#53bdeb] fill-current" viewBox="0 0 24 24">
                        <path d="M0.85 12.35l4.8 4.8 1.4-1.4-4.8-4.8-1.4 1.4zm5.8 4.8l10.8-10.8-1.4-1.4-10.8 10.8 1.4 1.4zm10.4-10.8l-1.4-1.4-6.4 6.4 1.4 1.4 6.4-6.4zm5.4 0l-10.8 10.8-1.4-1.4 10.8-10.8 1.4 1.4z"/>
                      </svg>
                    </div>
                  </div>

                </div>

                {/* 3. WhatsApp Bottom Input Bar */}
                <div className="bg-[#202c33] px-3 py-2 flex items-center gap-2.5 border-t border-[#222d34] shrink-0">
                  <button type="button" className="text-[#8696a0] hover:text-[#aebac1] transition-colors cursor-pointer text-base leading-none">
                    +
                  </button>
                  <button type="button" className="text-[#8696a0] hover:text-[#aebac1] transition-colors cursor-pointer text-sm leading-none">
                    😊
                  </button>
                  
                  <div className="flex-1 bg-[#2a3942] rounded-lg px-3 py-1.5 text-[11px] text-[#8696a0] font-sans select-none truncate">
                    Type a message
                  </div>

                  <button type="button" className="text-[#8696a0] hover:text-[#aebac1] transition-colors cursor-pointer">
                    <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                      <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/>
                    </svg>
                  </button>
                </div>

              </div>
            </div>

          </div>

        </div>

        {/* Modal Bottom Footer Actions */}
        <div className="px-5 py-3 bg-zinc-950 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-2.5 font-mono-accent">
          
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyMessage}
              className="text-xs text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-full px-3.5 py-1.5 transition-colors cursor-pointer"
            >
              {copied ? '✓ Copied' : 'Copy Pitch'}
            </button>
            
            <button
              type="button"
              onClick={handleSave}
              className="text-xs text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-full px-3.5 py-1.5 transition-colors cursor-pointer"
            >
              {saveSuccess ? '✓ Saved' : 'Save Draft'}
            </button>
          </div>

          <div className="flex items-center gap-2">
            {hasNextLead && onNextLead && (
              <button
                type="button"
                onClick={onNextLead}
                className="text-xs text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-full px-3.5 py-1.5 transition-colors cursor-pointer"
              >
                Next Lead ➔
              </button>
            )}

            {phone && (
              <a
                href={`tel:${phone}`}
                className="h-8 px-3 text-xs font-semibold rounded-full flex items-center gap-1.5 transition-all text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800"
                title="Direct phone call"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
                </svg>
                <span>Call</span>
              </a>
            )}

            <button
              type="button"
              onClick={handleSendWhatsApp}
              disabled={!cleanedPhone}
              className={`h-8 px-4 text-xs font-semibold rounded-full flex items-center gap-1.5 transition-all cursor-pointer font-mono-accent uppercase tracking-wider ${
                status === 'WhatsApp Sent'
                  ? 'text-emerald-300 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/50 shadow-[0_0_15px_rgba(52,211,153,0.2)]'
                  : 'text-black bg-emerald-400 hover:bg-emerald-300 disabled:opacity-40 shadow-[0_0_15px_rgba(52,211,153,0.25)]'
              }`}
            >
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
              </svg>
              <span>{status === 'WhatsApp Sent' ? 'Re-send' : 'Send WhatsApp'}</span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};

export default WhatsAppModal;
