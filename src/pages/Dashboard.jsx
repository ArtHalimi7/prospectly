import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import WhatsAppModal, { cleanPhoneForWhatsApp, classifyPhoneNumber } from '../components/WhatsAppModal';

const Dashboard = () => {
  const { user, token } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('All');
  const [selectedLeads, setSelectedLeads] = useState([]);
  const [editingLead, setEditingLead] = useState(null);
  
  // WhatsApp Modal state
  const [activeWhatsAppLead, setActiveWhatsAppLead] = useState(null);
  const [isWhatsAppOpen, setIsWhatsAppOpen] = useState(false);

  // Custom Scrape Modal state
  const [isScrapeModalOpen, setIsScrapeModalOpen] = useState(false);
  const [modalScrapeQuery, setModalScrapeQuery] = useState('');
  const [modalMinRating, setModalMinRating] = useState(4.0);
  const [modalMaxLeads, setModalMaxLeads] = useState(10);
  const [modalShowAdvanced, setModalShowAdvanced] = useState(false);

  // Scraper status states
  const [scrapingActive, setScrapingActive] = useState(false);
  const [scrapeLogs, setScrapeLogs] = useState([]);
  const [scrapeQuery, setScrapeQuery] = useState('');
  const abortControllerRef = useRef(null);

  // Inspector and search filter states
  const [activeLeadId, setActiveLeadId] = useState(null);
  const [searchFilter, setSearchFilter] = useState('');
  
  // Inline Inspector outreach states
  const [inspectorMessage, setInspectorMessage] = useState('');
  const [inspectorLanguage, setInspectorLanguage] = useState('German');
  const [inspectorTone, setInspectorTone] = useState('Professional & Friendly');
  const [inspectorGenerating, setInspectorGenerating] = useState(false);
  const [inspectorCopied, setInspectorCopied] = useState(false);
  const [inspectorSaved, setInspectorSaved] = useState(false);

  // Ref for terminal auto-scroll
  const terminalLogsEndRef = useRef(null);

  // Auto-scroll terminal on every new log line
  useEffect(() => {
    if (scrapeLogs.length > 0) {
      terminalLogsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [scrapeLogs]);

  // Close scrape modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isScrapeModalOpen) {
        setIsScrapeModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isScrapeModalOpen]);

  // Ref guard to prevent React StrictMode from double-firing the scrape
  const scrapeTriggeredRef = useRef(false);
  
  // Fetch Leads from Backend MySQL Database / JSON fallback
  const fetchLeads = async () => {
    setLoading(true);
    try {
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch('http://localhost:5000/api/leads', { headers });
      if (res.ok) {
        const data = await res.json();
        setLeads(data);
      } else {
        setLeads([]);
      }
    } catch (err) {
      console.warn("Backend not running or unreachable:", err);
      setLeads([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLeads();

    // Check if redirecting from landing page search
    const scrapeParam = searchParams.get('scrape');
    const queryParam = searchParams.get('q');
    if (scrapeParam === 'true' && queryParam && !scrapeTriggeredRef.current) {
      scrapeTriggeredRef.current = true; // Prevent double-fire from React StrictMode
      const rating = parseFloat(searchParams.get('rating') || '4.0');
      const limit = parseInt(searchParams.get('limit') || '10');
      setScrapeQuery(queryParam);
      setSearchParams({});
      triggerScraping(queryParam, rating, limit);
    }
  }, [token]);

  const handleStopScraping = async () => {
    if (abortControllerRef.current) {
      try {
        abortControllerRef.current.abort();
      } catch (e) {}
    }
    try {
      await fetch('http://localhost:5000/api/scrape/stop', { method: 'POST' });
    } catch (e) {}
    setScrapingActive(false);
    setScrapeLogs((prev) => [...prev, '[STOPPED] Scraping stopped by user.']);
    fetchLeads();
  };

  const triggerScraping = async (queryStr, minRating, maxLeads) => {
    setScrapingActive(true);
    setScrapeLogs([`[INFO] Starting Google Maps Scraper for: "${queryStr}"...`, `[INFO] Minimum rating filter: ${minRating} ⭐`, `[INFO] Max target results: ${maxLeads}`]);
    
    abortControllerRef.current = new AbortController();

    try {
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch('http://localhost:5000/api/scrape', {
        method: 'POST',
        headers,
        body: JSON.stringify({ query: queryStr, minRating, limit: maxLeads }),
        signal: abortControllerRef.current.signal
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
        setScrapingActive(false);
        fetchLeads();
      } else {
        simulateMockScraping(queryStr);
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        console.log('Scrape aborted by user.');
        return;
      }
      console.warn("Backend offline, running mock scraping simulation.");
      simulateMockScraping(queryStr);
    }
  };

  const handleModalScrapeSubmit = (e) => {
    if (e) e.preventDefault();
    if (!modalScrapeQuery.trim()) return;
    const q = modalScrapeQuery.trim();
    const minR = modalMinRating;
    const maxL = modalMaxLeads;
    setIsScrapeModalOpen(false);
    setScrapeQuery(q);
    triggerScraping(q, minR, maxL);
  };

  // Mock Scraping Simulation
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
        setScrapeLogs((prev) => [...prev, `[OSINT] Querying Google Search for "${queryStr.split(' ')[0] || 'Local'} email facebook instagram" to enrich leads...`]);
      } else if (step === 7) {
        setScrapeLogs((prev) => [...prev, `[GEMINI] Generating personalized WhatsApp pitch starting with "Ich bin Art Halimi, Webentwickler..."`]);
      } else if (step === 8) {
        setScrapeLogs((prev) => [...prev, `[DATABASE] Saved enriched leads to MySQL!`]);
        const newMockLeads = [
          {
            id: Date.now(),
            business_name: `${queryStr.split(' ')[0] || 'Local'} Services Ltd`,
            category: queryStr.split(' ')[0] || 'Service',
            location: queryStr.split('in ')[1] || 'Hamburg',
            phone_number: '+49 176 1234567',
            rating: 4.9,
            reviews_count: 38,
            status: 'Enriched',
            estimated_owner_name: 'Markus Weber',
            primary_contact_email: 'markus@weberservices.de',
            primary_social_pitch_url: 'https://facebook.com/weber-services',
            confidence_score: 'High',
            quick_pitch_hook: 'Loved your 4.9 star review from customers! Let\'s build a custom landing page to get you even more direct calls.',
            personalized_whatsapp: `Hallo Markus Weber 👋\n\nIch bin Art Halimi, Webentwickler (arthalimi.com).\n\nIch habe Ihr Unternehmen auf Google Maps entdeckt – Glückwunsch zu den hervorragenden 4.9 ⭐ (38 Bewertungen)! ⭐\n\nMir ist aufgefallen, dass Sie trotz Ihrer top Bewertungen noch keine eigene moderne Website haben. Ich habe einen unverbindlichen Design-Entwurf für ${queryStr.split(' ')[0] || 'Local'} Services Ltd vorbereitet.\n\nHätten Sie kurz Zeit für ein 5-Minuten-Gespräch, damit ich Ihnen den Entwurf zeige?\n\nBeste Grüße,\nArt Halimi\narthalimi.com`
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
        setLeads(leads.map(l => l.id === editingLead.id ? editingLead : l));
        setEditingLead(null);
      }
    } catch (err) {
      setLeads(leads.map(l => l.id === editingLead.id ? editingLead : l));
      setEditingLead(null);
    }
  };

  const handleDelete = async (id, e) => {
    if (e) e.stopPropagation();
    const leadToDelete = leads.find(l => l.id === id);
    const leadName = leadToDelete?.business_name || 'this lead';
    if (!window.confirm(`Are you sure you want to delete "${leadName}"?`)) return;

    // Determine next active lead if the deleted lead is currently active
    if (activeLeadId === id) {
      const remainingDisplayed = displayedLeads.filter(l => l.id !== id);
      if (remainingDisplayed.length > 0) {
        const currentIndex = displayedLeads.findIndex(l => l.id === id);
        const nextLead = remainingDisplayed[Math.min(currentIndex, remainingDisplayed.length - 1)];
        setActiveLeadId(nextLead?.id || null);
      } else {
        const remainingLeads = leads.filter(l => l.id !== id);
        setActiveLeadId(remainingLeads[0]?.id || null);
      }
    }

    // Remove from selectedLeads if selected
    setSelectedLeads(prev => prev.filter(lid => lid !== id));
    // Optimistic UI update
    setLeads(prev => prev.filter(l => l.id !== id));

    try {
      await fetch(`http://localhost:5000/api/leads/${id}`, { method: 'DELETE' });
    } catch (err) {
      console.warn("Error deleting lead from server:", err);
    }
  };

  const handleBatchDelete = async () => {
    if (selectedLeads.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedLeads.length} selected lead(s)?`)) return;

    const idsToDelete = [...selectedLeads];
    
    // Determine next active lead if activeLeadId is in selectedLeads
    if (selectedLeads.includes(activeLeadId)) {
      const remainingDisplayed = displayedLeads.filter(l => !idsToDelete.includes(l.id));
      if (remainingDisplayed.length > 0) {
        setActiveLeadId(remainingDisplayed[0].id);
      } else {
        const remainingLeads = leads.filter(l => !idsToDelete.includes(l.id));
        setActiveLeadId(remainingLeads[0]?.id || null);
      }
    }

    // Clear selection and remove from leads
    setSelectedLeads([]);
    setLeads(prev => prev.filter(l => !idsToDelete.includes(l.id)));

    try {
      await fetch('http://localhost:5000/api/leads/batch-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: idsToDelete })
      });
    } catch (err) {
      console.warn("Error batch deleting leads:", err);
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

  // WhatsApp Outreach Drawer triggers
  const openWhatsAppModal = (lead) => {
    setActiveWhatsAppLead(lead);
    setIsWhatsAppOpen(true);
  };

  const handleUpdateLeadFromModal = (updatedLead) => {
    setLeads(leads.map(l => l.id === updatedLead.id ? updatedLead : l));
    setActiveWhatsAppLead(updatedLead);
  };

  const handleNextWhatsAppLead = () => {
    const leadsWithPhone = filteredLeads.filter(l => l.phone_number);
    const currentIndex = leadsWithPhone.findIndex(l => l.id === activeWhatsAppLead?.id);
    if (currentIndex >= 0 && currentIndex < leadsWithPhone.length - 1) {
      setActiveWhatsAppLead(leadsWithPhone[currentIndex + 1]);
    }
  };

  // Launch campaign with selected leads
  const startCampaign = () => {
    if (selectedLeads.length === 0) {
      alert("Please select at least one lead to launch campaign.");
      return;
    }
    sessionStorage.setItem('preselectedLeads', JSON.stringify(selectedLeads));
    window.location.href = '/campaigns?new=true';
  };

  const isLeadContacted = (lead) => {
    if (!lead) return false;
    return (
      lead.status === 'WhatsApp Sent' ||
      lead.status === 'Emailed' ||
      lead.status === 'Sent' ||
      lead.status === 'Contacted' ||
      Boolean(lead.last_contacted_at)
    );
  };

  const getLeadContactedInfo = (lead) => {
    if (!lead || !isLeadContacted(lead)) return null;
    let channel = 'Direct';
    if (lead.status === 'WhatsApp Sent') channel = 'WhatsApp';
    else if (lead.status === 'Emailed') channel = 'Email';
    else if (lead.status === 'Sent') channel = 'Campaign';
    
    let timeFormatted = '';
    if (lead.last_contacted_at) {
      try {
        const date = new Date(lead.last_contacted_at);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) timeFormatted = 'Just now';
        else if (diffMins < 60) timeFormatted = `${diffMins}m ago`;
        else if (diffHours < 24) timeFormatted = `${diffHours}h ago`;
        else if (diffDays === 1) timeFormatted = 'Yesterday';
        else timeFormatted = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
      } catch (e) {
        timeFormatted = '';
      }
    }
    return { channel, timeFormatted };
  };

  const handleToggleLeadContacted = async (lead, e) => {
    if (e) e.stopPropagation();
    const currentlyContacted = isLeadContacted(lead);
    const newStatus = currentlyContacted 
      ? 'Enriched' 
      : (lead.phone_number ? 'WhatsApp Sent' : 'Emailed');
    const newTimestamp = currentlyContacted ? null : new Date().toISOString();

    const updated = {
      ...lead,
      status: newStatus,
      last_contacted_at: newTimestamp
    };

    setLeads(prev => prev.map(l => l.id === lead.id ? updated : l));

    try {
      await fetch(`http://localhost:5000/api/leads/${lead.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
    } catch (err) {
      console.warn("Status toggle offline update:", err);
    }
  };

  const calculateLeadIntent = (lead) => {
    if (!lead) return { score: 50, level: 'Moderate', color: 'text-zinc-300 bg-zinc-900 border-zinc-700', signals: [], pitchRecommendation: '' };
    
    let score = 35;
    const signals = [];

    const rating = parseFloat(lead.rating) || 0;
    const reviews = parseInt(lead.reviews_count) || 0;

    if (reviews >= 40 && rating >= 4.5) {
      score += 30;
      signals.push({
        type: 'high_demand',
        icon: '🚀',
        title: 'High Client Volume',
        desc: `${reviews} reviews (${rating.toFixed(1)}★) show established business cash flow.`
      });
    } else if (reviews >= 15 && rating >= 4.0) {
      score += 20;
      signals.push({
        type: 'steady_demand',
        icon: '⭐',
        title: 'Strong Local Reputation',
        desc: `${reviews} Google reviews (${rating.toFixed(1)}★). Ready for a direct landing page.`
      });
    } else if (reviews > 0) {
      score += 10;
      signals.push({
        type: 'local_active',
        icon: '📍',
        title: 'Active Google Listing',
        desc: `Verified on Google Maps with ${reviews} client review${reviews > 1 ? 's' : ''}.`
      });
    }

    if (lead.phone_number) {
      score += 15;
      signals.push({
        type: 'wa_direct',
        icon: '💬',
        title: 'WhatsApp Ready',
        desc: 'Direct mobile phone enables instant 1-on-1 visual preview.'
      });
    }

    if (lead.primary_social_pitch_url || (lead.quick_pitch_hook && lead.quick_pitch_hook.toLowerCase().includes('social'))) {
      score += 15;
      signals.push({
        type: 'social_active',
        icon: '📱',
        title: 'Social-Only Presence',
        desc: 'Active on social media without a dedicated landing page.'
      });
    }

    if (lead.estimated_owner_name && lead.estimated_owner_name !== 'Unknown') {
      score += 5;
      signals.push({
        type: 'owner_found',
        icon: '👤',
        title: `Owner: ${lead.estimated_owner_name}`,
        desc: 'Personalized outreach ready.'
      });
    }

    score = Math.min(score, 98);

    let level = 'Moderate';
    let color = 'text-zinc-300 bg-zinc-900/80 border-zinc-700/80';
    if (score >= 85) {
      level = 'Very High Intent';
      color = 'text-amber-300 bg-amber-950/40 border-amber-800/50';
    } else if (score >= 70) {
      level = 'High Intent';
      color = 'text-zinc-200 bg-zinc-800 border-zinc-700';
    }

    let pitchRecommendation = 'Showcase a clean visual landing page mockup with direct call and WhatsApp buttons.';
    if (signals.some(s => s.type === 'high_demand')) {
      pitchRecommendation = `Highlight their ${rating ? rating.toFixed(1) : '5.0'}★ rating: "With ${reviews} reviews, a dedicated landing page will convert map visitors into instant paying clients."`;
    } else if (signals.some(s => s.type === 'social_active')) {
      pitchRecommendation = 'Pitch turning social media followers into direct bookings with a fast mobile landing page.';
    }

    return { score, level, color, signals, pitchRecommendation };
  };

  const filteredLeads = leads.filter(lead => {
    const phoneInfo = classifyPhoneNumber(lead.phone_number, lead.location);
    if (filter === 'All') return true;
    if (filter === 'High Intent') return calculateLeadIntent(lead).score >= 75;
    if (filter === 'Uncontacted') return !isLeadContacted(lead);
    if (filter === 'Contacted') return isLeadContacted(lead);
    if (filter === 'WA Mobile' || filter === 'WhatsApp Ready') return phoneInfo.type === 'mobile';
    if (filter === 'Landlines' || filter === 'Landline') return phoneInfo.type === 'landline';
    if (filter === 'WhatsApp Sent') return lead.status === 'WhatsApp Sent';
    if (filter === 'Emailed') return lead.status === 'Emailed';
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
        quick_pitch_hook: 'I saw your excellent 4.7-star rating on Google Maps but noticed you do not have a website yet; I\'d love to build one to help you showcase your quality work.',
        personalized_whatsapp: `Hallo Andreas Schmitt 👋\n\nIch bin Art Halimi, Webentwickler (arthalimi.com).\n\nIch habe Schmitt Sanitär & Heizung auf Google Maps entdeckt – Glückwunsch zu den hervorragenden 4.7 ⭐ (54 Bewertungen)! ⭐\n\nMir ist aufgefallen, dass Sie trotz Ihres hervorragenden Rufs noch keine eigene Website haben, um Kunden direkt online zu gewinnen. Ich habe einen kostenlosen Design-Entwurf vorbereitet.\n\nHätten Sie diese Woche kurz Zeit für ein 5-Minuten-Gespräch?\n\nBeste Grüße,\nArt Halimi\narthalimi.com`
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
        quick_pitch_hook: 'Your client reviews show you are the top salon on the block! A premium, mobile-friendly landing page with booking integration would help secure more bookings directly.',
        personalized_whatsapp: `Hallo Sabine Fischer 👋\n\nIch bin Art Halimi, Webentwickler (arthalimi.com).\n\nIch habe Ihren Salon auf Google Maps entdeckt – 4.9 ⭐ bei 82 Bewertungen ist absolut erstklassig! ⭐\n\nIch habe gesehen, dass Sie noch keine moderne Website mit Online-Terminbuchung haben. Ich habe ein unverbindliches Konzept für Salon Beauté & Haar vorbereitet.\n\nWären Sie offen für ein kurzes 5-Minuten-Telefonat?\n\nBeste Grüße,\nArt Halimi\narthalimi.com`
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
        quick_pitch_hook: '',
        personalized_whatsapp: `Hallo Becker Auto-Werkstatt-Team 👋\n\nIch bin Art Halimi, Webentwickler (arthalimi.com).\n\nGlückwunsch zu den 4.5 ⭐ auf Google Maps! Ich habe einen kostenlosen Website-Entwurf für Ihre Werkstatt vorbereitet. Hätten Sie kurz Zeit für ein 5-Minuten-Gespräch?\n\nBeste Grüße,\nArt Halimi\narthalimi.com`
      }
    ];
  }

  const leadsWithPhone = filteredLeads.filter(l => l.phone_number);
  const currentWhatsAppIndex = activeWhatsAppLead ? leadsWithPhone.findIndex(l => l.id === activeWhatsAppLead.id) : -1;
  const hasNextWhatsAppLead = currentWhatsAppIndex >= 0 && currentWhatsAppIndex < leadsWithPhone.length - 1;

  // Active lead for inspector
  const activeLead = leads.find(l => l.id === activeLeadId) || null;

  // Combined search and status filter
  const displayedLeads = filteredLeads.filter(l => {
    if (!searchFilter.trim()) return true;
    const term = searchFilter.toLowerCase();
    return (
      l.business_name?.toLowerCase().includes(term) ||
      l.location?.toLowerCase().includes(term) ||
      l.category?.toLowerCase().includes(term) ||
      l.phone_number?.includes(term)
    );
  });

  // Synchronize inspector when active lead changes
  useEffect(() => {
    if (activeLead) {
      setInspectorMessage(activeLead.personalized_whatsapp || activeLead.personalized_body || '');
      
      const loc = (activeLead.location || '').toLowerCase();
      const ph = (activeLead.phone_number || '').replace(/\D/g, '');
      if (ph.startsWith('383') || ph.startsWith('355') || loc.includes('kosovo') || loc.includes('albania') || loc.includes('prishtin')) {
        setInspectorLanguage('Albanian');
      } else if (ph.startsWith('49') || loc.includes('germany') || loc.includes('deutschland') || /\b\d{5}\b/.test(loc)) {
        setInspectorLanguage('Deutsch');
      } else {
        setInspectorLanguage('Deutsch');
      }
    }
  }, [activeLead?.id]);

  // Inline AI Generator
  const handleInlineGenerateAI = async (langToUse = inspectorLanguage, toneToUse = inspectorTone) => {
    if (!activeLead) return;
    setInspectorGenerating(true);
    setInspectorLanguage(langToUse);

    const senderName = user?.full_name || 'Art Halimi';
    const senderProfession = user?.profession || 'Web Developer';
    const senderPortfolio = user?.portfolio_url || 'arthalimi.com';
    const senderFirstName = senderName.split(' ')[0] || 'Art';
    const portfolioSnippet = senderPortfolio ? ` (${senderPortfolio})` : '';

    try {
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`http://localhost:5000/api/leads/${activeLead.id}/generate-whatsapp`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          language: langToUse,
          tone: toneToUse,
          customInstructions: '',
          sender_name: senderName,
          sender_profession: senderProfession,
          sender_portfolio: senderPortfolio
        })
      });

      if (res.ok) {
        const data = await res.json();
        const msg = data.message || data.personalized_whatsapp;
        if (msg) {
          setInspectorMessage(msg);
          setLeads(leads.map(l => l.id === activeLead.id ? { ...l, personalized_whatsapp: msg } : l));
        }
      } else {
        const isGerman = (langToUse === 'Deutsch' || langToUse === 'German');
        const isAlbanian = langToUse === 'Albanian';
        const fallbackMsg = isGerman
          ? `Hallo, ich bin ${senderName}, ich mache Webseiten${portfolioSnippet}.\n\nHab ${activeLead.business_name} auf Google Maps gesehen - sieht gut aus. Mir ist aufgefallen dass ihr keine eigene Webseite habt.\n\nIch mach sowas beruflich und würde euch gerne mal nen kostenlosen Entwurf zeigen, einfach damit ihr seht wie das aussehen könnte. Kein Vertrag, kein Stress.\n\nFalls Interesse besteht einfach kurz antworten, dann können wir 5 Minuten telefonieren.\n\nGruss, ${senderFirstName}`
          : isAlbanian
          ? `Pershendetje, une jam ${senderName}...\n\nJam ${senderProfession}, pra me profesion krijoj website per biznese te ndryshme.\n\nE pashe ${activeLead.business_name} ne Google Maps, dhe e pashe qe keni kogja vlersime te mira.\n\nNese jeni te interesum, mundem me jau kriju nje dizajn koncept se qysh mundet mu dok nje faqe per biznesin tuj, pa asnje obligim, dhe nese ju pelqen mundemi me diskutu per detaje.\n\nFaleminderit, ${senderFirstName}`
          : `Hey, I'm ${senderName}, I build websites${portfolioSnippet}.\n\nFound ${activeLead.business_name} on Google Maps - looks solid. Noticed you don't have your own website though.\n\nI do this for a living and I'd be happy to put together a free draft for you, just so you can see what it could look like. No strings attached.\n\nIf you're interested just shoot me a quick reply and we can hop on a 5 min call.\n\nCheers, ${senderFirstName}`;
        setInspectorMessage(fallbackMsg);
        setLeads(leads.map(l => l.id === activeLead.id ? { ...l, personalized_whatsapp: fallbackMsg } : l));
      }
    } catch (err) {
      console.warn("AI generation failed, fallback applied.");
    }
    setInspectorGenerating(false);
  };

  // Direct Inline 1-Click WhatsApp Send
  const handleInlineSendWhatsApp = async () => {
    if (!activeLead || !activeLead.phone_number) return;
    const cleaned = cleanPhoneForWhatsApp(activeLead.phone_number, activeLead.location);
    if (!cleaned) {
      alert("Invalid phone number format for WhatsApp.");
      return;
    }

    try {
      await fetch(`http://localhost:5000/api/leads/${activeLead.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...activeLead,
          personalized_whatsapp: inspectorMessage,
          status: 'WhatsApp Sent'
        })
      });
    } catch (e) {
      // Local fallback
    }

    // Update state
    setLeads(leads.map(l => l.id === activeLead.id ? { ...l, personalized_whatsapp: inspectorMessage, status: 'WhatsApp Sent' } : l));

    // Open WhatsApp
    const waUrl = `https://wa.me/${cleaned}?text=${encodeURIComponent(inspectorMessage)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  // Direct Inline Save
  const handleInlineSaveDraft = async () => {
    if (!activeLead) return;
    try {
      await fetch(`http://localhost:5000/api/leads/${activeLead.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...activeLead,
          personalized_whatsapp: inspectorMessage
        })
      });
    } catch (e) {
      // Ignore
    }
    setLeads(leads.map(l => l.id === activeLead.id ? { ...l, personalized_whatsapp: inspectorMessage } : l));
    setInspectorSaved(true);
    setTimeout(() => setInspectorSaved(false), 2000);
  };

  // Direct Inline Copy
  const handleInlineCopy = () => {
    navigator.clipboard.writeText(inspectorMessage);
    setInspectorCopied(true);
    setTimeout(() => setInspectorCopied(false), 2000);
  };

  // Quick navigation
  const currentLeadIndex = displayedLeads.findIndex(l => l.id === activeLeadId);
  const handlePrevLead = () => {
    if (currentLeadIndex > 0) {
      setActiveLeadId(displayedLeads[currentLeadIndex - 1].id);
    }
  };
  const handleNextLeadNav = () => {
    if (currentLeadIndex >= 0 && currentLeadIndex < displayedLeads.length - 1) {
      setActiveLeadId(displayedLeads[currentLeadIndex + 1].id);
    }
  };

  const toggleLeadExpand = (id) => {
    setActiveLeadId(prev => prev === id ? null : id);
  };

  return (
    <div className="pt-28 pb-20 px-4 sm:px-8 md:px-12 bg-[#050507] min-h-screen text-white font-sans relative overflow-hidden selection:bg-white/20 selection:text-white">
      
      {/* 1. Seamless Top-Down Radial Ambient Glow matching Hero.jsx */}
      <div className="absolute top-0 left-0 right-0 h-[600px] bg-[radial-gradient(ellipse_100%_80%_at_50%_0%,rgba(140,130,255,0.09),rgba(255,255,255,0.02)_40%,transparent_70%)] pointer-events-none z-0"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_50%,#050507_100%)] pointer-events-none z-0"></div>

      <div className="max-w-5xl mx-auto relative z-10">
        
        {/* Subtle Top Tagline */}
        <div className="flex items-center gap-2 mb-2 text-zinc-500 text-xs font-mono-accent uppercase tracking-[0.25em]">
          <span className="w-1 h-1 rounded-full bg-zinc-400"></span>
          <span>Lead Intelligence & Direct Outreach</span>
          <span className="w-1 h-1 rounded-full bg-zinc-400"></span>
        </div>

        {/* Action & Telemetry Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-zinc-800/80">
          
          {/* Main Title & Premium Live Status Indicator */}
          <div className="flex items-center gap-3.5 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-display">
              Outreach Workspace
            </h1>
            
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900/80 border border-zinc-800/80 shadow-[0_2px_12px_rgba(0,0,0,0.4)] backdrop-blur-md">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]"></span>
              </span>
              <span className="text-xs font-mono-accent font-medium text-zinc-200">
                {leads.length} <span className="text-zinc-500 font-normal">leads</span>
              </span>
            </div>
          </div>

          {/* Action Pills & Contextual Selection Toolbar */}
          <div className="flex flex-wrap items-center gap-2.5">
            
            {/* Quick Metrics Capsule (when no selection) */}
            {selectedLeads.length === 0 && (
              <div className="hidden md:flex items-center gap-2 bg-zinc-950/80 border border-zinc-800/80 rounded-full px-3.5 py-1.5 text-[11px] font-mono-accent text-zinc-400 shadow-sm">
                <span className="text-emerald-400 font-medium">
                  {leads.filter(isLeadContacted).length} Contacted
                </span>
                <span className="text-zinc-700">·</span>
                <span className="text-zinc-300">
                  {leads.filter(l => !isLeadContacted(l)).length} Pending
                </span>
                <span className="text-zinc-700">·</span>
                <span className="text-zinc-400">
                  {leads.filter(l => l.phone_number).length} WhatsApp
                </span>
              </div>
            )}

            {/* Contextual Batch Actions Bar (when leads are selected) */}
            {selectedLeads.length > 0 && (
              <div className="flex items-center gap-1.5 p-1 bg-zinc-900/95 border border-zinc-700/80 rounded-full shadow-[0_4px_20px_rgba(0,0,0,0.6)] backdrop-blur-xl animate-fadeIn">
                <span className="text-xs font-mono-accent text-zinc-200 font-semibold px-2.5">
                  {selectedLeads.length} selected
                </span>
                
                <button
                  type="button"
                  onClick={startCampaign}
                  className="h-7 px-3 bg-white hover:bg-zinc-200 text-black text-[11px] font-semibold font-mono-accent rounded-full transition-all cursor-pointer flex items-center gap-1 shadow-sm"
                  title="Create email campaign with selected leads"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span>Email</span>
                </button>

                <button
                  type="button"
                  onClick={handleBatchDelete}
                  className="h-7 px-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:border-rose-500/50 text-[11px] font-mono-accent rounded-full transition-all cursor-pointer flex items-center gap-1"
                  title="Delete selected leads"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <span>Delete</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedLeads([])}
                  className="h-7 w-7 flex items-center justify-center text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800 transition-colors text-xs cursor-pointer ml-0.5"
                  title="Clear selection"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Scrape Trigger / Stop Buttons */}
            {scrapingActive ? (
              <button
                type="button"
                onClick={handleStopScraping}
                className="h-9 px-4 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-full transition-all duration-200 shadow-[0_0_20px_rgba(244,63,94,0.3)] hover:shadow-[0_0_25px_rgba(244,63,94,0.5)] flex items-center gap-1.5 cursor-pointer font-mono-accent uppercase tracking-wider shrink-0"
              >
                <span className="w-2.5 h-2.5 rounded-xs bg-white inline-block"></span>
                <span>Stop Scraping</span>
              </button>
            ) : (
              <button
                onClick={() => setIsScrapeModalOpen(true)}
                className="h-9 px-4 bg-white hover:bg-zinc-200 text-black text-xs font-semibold rounded-full transition-all duration-200 shadow-[0_0_20px_rgba(255,255,255,0.18)] hover:shadow-[0_0_25px_rgba(255,255,255,0.35)] flex items-center gap-1.5 cursor-pointer font-mono-accent uppercase tracking-wider shrink-0"
              >
                <span>+ New Scrape</span>
              </button>
            )}

          </div>
        </div>

        {/* Live Scraper Terminal (Sleek macOS dark styling) */}
        {scrapingActive && (
          <div className="bg-zinc-950/90 border border-zinc-800 rounded-2xl mb-6 shadow-2xl overflow-hidden font-mono text-xs animate-slide-down backdrop-blur-2xl">
            <div className="bg-zinc-900/90 border-b border-zinc-800 px-4 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#ff5f56] inline-block"></span>
                <span className="w-3 h-3 rounded-full bg-[#ffbd2e] inline-block"></span>
                <span className="w-3 h-3 rounded-full bg-[#27c93f] inline-block"></span>
              </div>
              <div className="text-[11px] text-zinc-400 font-mono flex items-center gap-2">
                <span>maps-enricher</span>
                <span>—</span>
                <span className="text-zinc-300 font-semibold">{scrapeQuery || 'live stream'}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest font-mono">ACTIVE</span>
                </div>
                <button
                  type="button"
                  onClick={handleStopScraping}
                  className="h-6 px-2.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 hover:border-rose-500/60 rounded-full text-[10px] font-mono font-semibold flex items-center gap-1 transition-all cursor-pointer shadow-[0_0_10px_rgba(244,63,94,0.15)]"
                  title="Stop active scraping immediately"
                >
                  <span className="w-2 h-2 rounded-xs bg-rose-400 inline-block"></span>
                  <span>Stop</span>
                </button>
              </div>
            </div>

            <div className="p-4 max-h-48 overflow-y-auto font-mono text-xs leading-relaxed space-y-1 bg-[#050507]/95">
              {scrapeLogs.map((log, index) => {
                const match = log.match(/^(\[[A-Z]+\])(.*)$/);
                const tag = match ? match[1] : '';
                const rest = match ? match[2] : log;

                let tagColor = 'text-sky-400';
                if (tag === '[SCRAPER]') tagColor = 'text-emerald-400';
                else if (tag === '[FILTER]') tagColor = 'text-amber-400';
                else if (tag === '[OSINT]') tagColor = 'text-indigo-400';
                else if (tag === '[GEMINI]') tagColor = 'text-purple-400';
                else if (tag === '[DATABASE]' || tag === '[SUCCESS]') tagColor = 'text-emerald-400';
                else if (tag === '[ERROR]') tagColor = 'text-rose-400';

                return (
                  <div key={index} className="flex items-start gap-2 py-0.5 px-1 rounded hover:bg-white/[0.02] transition-colors">
                    <span className="text-zinc-600 select-none text-[10px] w-5 text-right shrink-0">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className="text-zinc-700 select-none">│</span>
                    <div className="flex-1 break-words">
                      {tag && <span className={`${tagColor} font-bold mr-1.5`}>{tag}</span>}
                      <span className="text-zinc-300">{rest}</span>
                    </div>
                  </div>
                );
              })}
              <div ref={terminalLogsEndRef} />
            </div>
          </div>
        )}

        {/* Pill Search & Preset Filter Bar */}
        <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3.5 mb-6">
          
          {/* Pill Search Input */}
          <div className="w-full xl:w-80 relative group shrink-0">
            <div className="relative rounded-full bg-zinc-950/80 border border-zinc-800 hover:border-zinc-700 focus-within:border-zinc-500 backdrop-blur-2xl px-3.5 py-2 transition-all duration-300 shadow-[0_10px_30px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.06)] flex items-center gap-2.5">
              <div className="text-zinc-500 group-focus-within:text-zinc-300 transition-colors shrink-0">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search leads, city, niche..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full bg-transparent border-none text-white placeholder-zinc-500 focus:outline-none focus:ring-0 text-xs font-normal font-mono-accent"
              />
              {searchFilter && (
                  <button
                  type="button"
                  onClick={() => setSearchFilter('')}
                  className="text-zinc-500 hover:text-zinc-300 text-xs px-1"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Preset Filter Tabs (Clean, Minimalist, No Emojis, No Scrollbars) */}
          <div className="flex flex-wrap items-center gap-1.5 no-scrollbar">
            {[
              { id: 'All', label: 'All', count: leads.length },
              { id: 'WA Mobile', label: 'WA Mobile', count: leads.filter(l => classifyPhoneNumber(l.phone_number, l.location).type === 'mobile').length },
              { id: 'Landlines', label: 'Landlines', count: leads.filter(l => classifyPhoneNumber(l.phone_number, l.location).type === 'landline').length },
              { id: 'High Intent', label: 'High Intent', count: leads.filter(l => calculateLeadIntent(l).score >= 75).length },
              { id: 'Uncontacted', label: 'Uncontacted', count: leads.filter(l => !isLeadContacted(l)).length },
              { id: 'Contacted', label: 'Contacted', count: leads.filter(isLeadContacted).length },
              { id: 'WhatsApp Sent', label: 'WA Sent', count: leads.filter(l => l.status === 'WhatsApp Sent').length },
              { id: 'Emailed', label: 'Emailed', count: leads.filter(l => l.status === 'Emailed').length }
            ].map(({ id, label, count }) => {
              const isActive = filter === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setFilter(id)}
                  className={`text-xs px-3 py-1.5 rounded-full transition-all duration-200 cursor-pointer whitespace-nowrap font-mono-accent flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-white text-black font-semibold shadow-[0_0_15px_rgba(255,255,255,0.2)]'
                      : 'text-zinc-400 hover:text-zinc-200 bg-zinc-950/70 hover:bg-zinc-900 border border-zinc-800/80 hover:border-zinc-700'
                  }`}
                >
                  <span>{label}</span>
                  {count !== undefined && count > 0 && (
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full leading-none transition-colors ${
                        isActive
                          ? 'bg-black/15 text-black font-bold'
                          : 'bg-zinc-800 text-zinc-400 border border-zinc-700/50'
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

        </div>

        {/* Extracted Leads Stream with Inline Expandable Outreach Accordion */}
        <div className="space-y-3">
          
          {/* Header Bar */}
          <div className="px-5 py-2.5 bg-zinc-950/80 border border-zinc-800/80 rounded-2xl flex items-center justify-between text-xs font-mono-accent text-zinc-400">
            <div className="flex items-center gap-2.5">
              <input
                type="checkbox"
                onChange={handleSelectAll}
                checked={selectedLeads.length === displayedLeads.length && displayedLeads.length > 0}
                className="rounded bg-zinc-900 border-zinc-700 accent-white cursor-pointer w-4 h-4"
              />
              <span className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold">
                Extracted Businesses ({displayedLeads.length})
              </span>
            </div>
            <span className="text-[10px] text-zinc-500 uppercase tracking-widest hidden sm:inline">
              Click any lead to expand outreach studio
            </span>
          </div>

          {/* Leads List */}
          {loading ? (
            <div className="py-24 text-center text-zinc-500 text-xs font-mono-accent flex flex-col items-center justify-center gap-3">
              <svg className="animate-spin h-6 w-6 text-zinc-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
              </svg>
              <div>Loading businesses...</div>
            </div>
          ) : displayedLeads.length === 0 ? (
            <div className="text-center py-16 px-4 bg-zinc-950/60 border border-zinc-800/80 rounded-3xl backdrop-blur-xl">
              <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto mb-3 text-zinc-500">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-white font-mono-accent uppercase tracking-wider mb-1">
                No matching leads found
              </h3>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto font-mono-accent mb-4">
                Try switching the filter or launch a new scrape across another area.
              </p>
              <button
                type="button"
                onClick={() => {
                  setFilter('All');
                  setSearchFilter('');
                }}
                className="text-xs font-mono-accent text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 rounded-full px-4 py-1.5 cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            displayedLeads.map((lead) => {
              const isExpanded = activeLeadId === lead.id;
              const isChecked = selectedLeads.includes(lead.id);
              const isContacted = isLeadContacted(lead);
              const contactedInfo = getLeadContactedInfo(lead);
              const leadIntent = calculateLeadIntent(lead);

              return (
                <div
                  key={lead.id}
                  className={`bg-zinc-950/80 border rounded-2xl overflow-hidden backdrop-blur-2xl card-hover-lift transition-all duration-300 ${
                    isExpanded
                      ? 'border-zinc-500 shadow-[0_20px_50px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.12)]'
                      : 'border-zinc-800/80 hover:border-zinc-700 shadow-md'
                  }`}
                >
                  {/* Lead Summary Row (Clickable Accordion Header) */}
                  <div
                    onClick={() => toggleLeadExpand(lead.id)}
                    className={`px-5 py-4 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors duration-200 ${
                      isExpanded ? 'bg-zinc-900/70' : 'hover:bg-zinc-900/40'
                    }`}
                  >
                    {/* Left details */}
                    <div className="flex items-center gap-3.5 min-w-0">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleSelectLead(lead.id);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="rounded bg-zinc-900 border-zinc-700 accent-white cursor-pointer w-4 h-4 shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="font-semibold text-sm sm:text-base text-white truncate font-display">
                            {lead.business_name}
                          </span>

                          {leadIntent.score >= 75 && (
                            <span className="text-[10px] text-amber-400 font-mono-accent bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-800/40" title={`Website Intent: ${leadIntent.score}%`}>
                              {leadIntent.score}% Intent
                            </span>
                          )}

                          {contactedInfo && (
                            <span className="text-[10px] text-emerald-400 font-mono-accent bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/30">
                              {contactedInfo.channel === 'WhatsApp' ? 'WA Sent' : contactedInfo.channel} {contactedInfo.timeFormatted ? `· ${contactedInfo.timeFormatted}` : ''}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-xs text-zinc-400 font-mono-accent mt-0.5">
                          <span>{lead.category || 'Business'}</span>
                          <span>·</span>
                          <span>{lead.location}</span>
                          {lead.phone_number && (
                            <>
                              <span>·</span>
                              <span className="text-zinc-500">{lead.phone_number}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right side badges & actions */}
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      
                      {/* Rating chip */}
                      <div className="inline-flex items-center gap-1 font-mono-accent text-xs font-medium text-white bg-zinc-900/90 px-2.5 py-1 rounded-full border border-zinc-800">
                        <span>{lead.rating ? Number(lead.rating).toFixed(1) : '5.0'}</span>
                        <svg className="w-3 h-3 text-amber-400 fill-amber-400" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      </div>

                      {/* WhatsApp / Landline Status Badge */}
                      {(() => {
                        const pInfo = classifyPhoneNumber(lead.phone_number, lead.location);
                        if (pInfo.type === 'mobile') {
                          return (
                            <span className="text-[11px] text-emerald-400 font-mono-accent font-medium bg-emerald-950/50 px-2.5 py-0.5 rounded-full border border-emerald-500/40 shadow-[0_0_10px_rgba(52,211,153,0.15)]">
                              WA Ready
                            </span>
                          );
                        }
                        if (pInfo.type === 'landline') {
                          return (
                            <span className="text-[11px] text-zinc-400 font-mono-accent font-medium bg-zinc-900 px-2.5 py-0.5 rounded-full border border-zinc-800" title="Fixed Landline (Festnetz)">
                              Landline
                            </span>
                          );
                        }
                        return null;
                      })()}

                      {/* 1-Click Status Toggle Checkmark */}
                      <button
                        type="button"
                        onClick={(e) => handleToggleLeadContacted(lead, e)}
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer border ${
                          isContacted
                            ? 'text-emerald-400 bg-emerald-950/60 border-emerald-500/40'
                            : 'text-zinc-600 hover:text-emerald-400 bg-zinc-900 border-zinc-800 hover:border-emerald-800'
                        }`}
                        title={isContacted ? "Contacted ✓ (Click to mark unsent)" : "Mark as Contacted"}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                        </svg>
                      </button>

                      {/* Delete Lead Button */}
                      <button
                        type="button"
                        onClick={(e) => handleDelete(lead.id, e)}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-600 hover:text-rose-400 bg-zinc-900 hover:bg-rose-950/40 border border-zinc-800 hover:border-rose-900/40 transition-colors cursor-pointer"
                        title="Delete lead"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>

                      {/* Accordion Chevron */}
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-zinc-900 border border-zinc-800 text-zinc-400 transition-transform duration-200 ${
                        isExpanded ? 'rotate-180 text-white bg-zinc-800' : ''
                      }`}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>

                    </div>
                  </div>

                  {/* Inline Expanded Outreach Drawer */}
                  {isExpanded && (
                    <div className="p-6 border-t border-zinc-800/80 bg-zinc-950/90 animate-slide-down space-y-5">
                      
                      {/* Intelligence & Pitch Strategy Strip */}
                      <div className="bg-zinc-900/60 border border-zinc-800/70 rounded-2xl p-4 font-mono-accent space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="text-zinc-500 uppercase text-[10px]">Phone:</span>
                            <span className="text-white font-medium">{lead.phone_number || 'No phone'}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-zinc-500 uppercase text-[10px]">Website Audit:</span>
                            <span className="text-rose-400 font-medium">No Website Detected</span>
                          </div>

                          {lead.estimated_owner_name && lead.estimated_owner_name !== 'Unknown' && (
                            <div className="flex items-center gap-2">
                              <span className="text-zinc-500 uppercase text-[10px]">Owner:</span>
                              <span className="text-zinc-300 font-medium">{lead.estimated_owner_name}</span>
                            </div>
                          )}

                          <div className="flex items-center gap-2 ml-auto">
                            <button
                              type="button"
                              onClick={() => setEditingLead(lead)}
                              className="px-3 py-1 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs font-mono-accent border border-zinc-800 transition-colors cursor-pointer"
                            >
                              Edit Details
                            </button>
                          </div>
                        </div>

                        {/* Pitch Strategy Hook */}
                        <div className="pt-2 border-t border-zinc-800/60 flex items-start gap-2 text-xs">
                          <span className="text-amber-400 shrink-0">💡</span>
                          <p className="text-zinc-300 leading-relaxed font-sans text-xs">
                            {leadIntent.pitchRecommendation}
                          </p>
                        </div>
                      </div>

                      {/* Outreach Message Studio */}
                      <div className="space-y-3">
                        
                        {/* Controls: Language, Tone, Regenerate */}
                        <div className="flex flex-wrap items-center justify-between gap-2.5">
                          
                          {/* Language Selector: Albanian, Deutsch, English (NO EMOJIS) */}
                          <div className="flex items-center gap-1 bg-zinc-950/80 p-1 rounded-full border border-zinc-800">
                            {['Albanian', 'Deutsch', 'English'].map((lang) => {
                              const isSelected = inspectorLanguage === lang || (lang === 'Deutsch' && inspectorLanguage === 'German');
                              return (
                                <button
                                  key={lang}
                                  type="button"
                                  onClick={() => {
                                    setInspectorLanguage(lang);
                                    handleInlineGenerateAI(lang, inspectorTone);
                                  }}
                                  className={`text-xs px-3.5 py-1 rounded-full transition-all cursor-pointer font-mono-accent ${
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

                          {/* Tone Dropdown */}
                          <select
                            value={inspectorTone}
                            onChange={(e) => {
                              const newTone = e.target.value;
                              setInspectorTone(newTone);
                              handleInlineGenerateAI(inspectorLanguage, newTone);
                            }}
                            className="text-xs bg-zinc-900 border border-zinc-800 rounded-full px-3.5 py-1.5 text-zinc-300 focus:outline-none focus:border-zinc-500 cursor-pointer font-mono-accent"
                          >
                            <option value="Professional & Friendly">Professional & Friendly</option>
                            <option value="Free Website Mockup / Preview">Free Website Mockup</option>
                            <option value="Leverage High Google Reviews">Leverage 4.5+ Rating</option>
                            <option value="Short & Punchy Direct Pitch">Direct & Punchy</option>
                          </select>

                          {/* Regenerate AI Button */}
                          <button
                            type="button"
                            onClick={handleInlineGenerateAI}
                            disabled={inspectorGenerating}
                            className="text-xs font-mono-accent text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 border border-zinc-800 rounded-full px-4 py-1.5 flex items-center gap-1.5 cursor-pointer transition-colors"
                          >
                            {inspectorGenerating ? (
                              <>
                                <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                                </svg>
                                <span>Generating...</span>
                              </>
                            ) : (
                              <>
                                <span>✨</span>
                                <span>Regenerate Pitch</span>
                              </>
                            )}
                          </button>
                        </div>

                        {/* Textarea */}
                        <textarea
                          value={inspectorMessage}
                          onChange={(e) => setInspectorMessage(e.target.value)}
                          rows={6}
                          className="w-full p-4 text-xs bg-zinc-950 border border-zinc-800 rounded-2xl focus:outline-none focus:border-zinc-500 font-sans leading-relaxed text-zinc-200 resize-none shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]"
                          placeholder="Type or generate message..."
                        ></textarea>

                        {/* Footer Action Ribbon */}
                        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                          
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={handleInlineCopy}
                              className="text-xs font-mono-accent text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-full px-4 py-2 transition-colors cursor-pointer"
                            >
                              {inspectorCopied ? '✓ Copied' : 'Copy'}
                            </button>

                            <button
                              type="button"
                              onClick={handleInlineSaveDraft}
                              className="text-xs font-mono-accent text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-full px-4 py-2 transition-colors cursor-pointer"
                            >
                              {inspectorSaved ? '✓ Saved' : 'Save Draft'}
                            </button>

                            <button
                              type="button"
                              onClick={() => openWhatsAppModal(lead)}
                              className="text-xs font-mono-accent text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-full px-4 py-2 transition-colors cursor-pointer"
                            >
                              Expanded View
                            </button>
                          </div>

                          {/* Primary Hero Send Button */}
                          <button
                            type="button"
                            onClick={handleInlineSendWhatsApp}
                            disabled={!lead.phone_number}
                            className={`h-9 px-6 text-xs font-semibold rounded-full flex items-center gap-2 transition-all cursor-pointer font-mono-accent uppercase tracking-wider ${
                              isLeadContacted(lead)
                                ? 'text-emerald-300 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/50 shadow-[0_0_15px_rgba(52,211,153,0.2)]'
                                : 'text-black bg-emerald-400 hover:bg-emerald-300 shadow-[0_0_20px_rgba(52,211,153,0.3)] hover:shadow-[0_0_25px_rgba(52,211,153,0.5)]'
                            }`}
                          >
                            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                            </svg>
                            <span>{isLeadContacted(lead) ? 'Re-send WhatsApp' : 'Send WhatsApp'}</span>
                          </button>

                        </div>

                      </div>

                    </div>
                  )}

                </div>
              );
            })
          )}

        </div>

        {/* WhatsApp Modal */}
        <WhatsAppModal
          lead={activeWhatsAppLead}
          isOpen={isWhatsAppOpen}
          onClose={() => setIsWhatsAppOpen(false)}
          onSaveLead={handleUpdateLeadFromModal}
          onNextLead={handleNextWhatsAppLead}
          hasNextLead={hasNextWhatsAppLead}
        />

        {/* Lead Editing Modal */}
        {editingLead && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-xl flex items-center justify-center z-[60] p-4 pt-16 pb-8">
            <div className="bg-zinc-950 border border-zinc-800 rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden animate-slide-down max-h-[82vh] flex flex-col">
              <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
                <h3 className="font-bold text-base text-white font-mono-accent uppercase tracking-wider">
                  Edit Lead Details
                </h3>
                <button
                  onClick={() => setEditingLead(null)}
                  className="text-zinc-500 hover:text-white text-xl font-bold leading-none cursor-pointer"
                >
                  &times;
                </button>
              </div>

              <form onSubmit={handleEditSave} className="p-6 space-y-4 overflow-y-auto flex-1 font-mono-accent">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Business Name</label>
                    <input
                      type="text"
                      value={editingLead.business_name}
                      onChange={(e) => setEditingLead({ ...editingLead, business_name: e.target.value })}
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl focus:outline-none focus:border-zinc-500 text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Estimated Owner Name</label>
                    <input
                      type="text"
                      value={editingLead.estimated_owner_name || ''}
                      onChange={(e) => setEditingLead({ ...editingLead, estimated_owner_name: e.target.value })}
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl focus:outline-none focus:border-zinc-500 text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Phone Number</label>
                    <input
                      type="text"
                      value={editingLead.phone_number || ''}
                      onChange={(e) => setEditingLead({ ...editingLead, phone_number: e.target.value })}
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl focus:outline-none focus:border-zinc-500 text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Primary Contact Email</label>
                    <input
                      type="email"
                      value={editingLead.primary_contact_email || ''}
                      onChange={(e) => setEditingLead({ ...editingLead, primary_contact_email: e.target.value })}
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl focus:outline-none focus:border-zinc-500 text-white text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-zinc-400 mb-1">AI WhatsApp Pitch (Custom)</label>
                  <textarea
                    value={editingLead.personalized_whatsapp || ''}
                    onChange={(e) => setEditingLead({ ...editingLead, personalized_whatsapp: e.target.value })}
                    rows="4"
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl focus:outline-none focus:border-zinc-500 text-white text-sm"
                    placeholder="Hallo, ich bin Art Halimi..."
                  ></textarea>
                </div>

                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Quick AI Pitch Hook</label>
                  <textarea
                    value={editingLead.quick_pitch_hook || ''}
                    onChange={(e) => setEditingLead({ ...editingLead, quick_pitch_hook: e.target.value })}
                    rows="2"
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl focus:outline-none focus:border-zinc-500 text-white text-sm"
                  ></textarea>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
                  <button
                    type="button"
                    onClick={() => {
                      const id = editingLead.id;
                      setEditingLead(null);
                      handleDelete(id);
                    }}
                    className="text-xs font-semibold text-rose-400 hover:text-rose-300 bg-rose-950/30 hover:bg-rose-950/60 border border-rose-900/40 rounded-full px-4 py-2 transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    <span>Delete Lead</span>
                  </button>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setEditingLead(null)}
                      className="text-xs font-semibold text-zinc-400 hover:text-white border border-zinc-800 rounded-full px-4 py-2 hover:bg-zinc-900 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="text-xs font-semibold text-black bg-white hover:bg-zinc-200 rounded-full px-5 py-2 shadow-md cursor-pointer uppercase tracking-wider"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}
        
        {/* Custom Hero-Style Scrape Studio Modal */}
        {isScrapeModalOpen && (
          <div 
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 pt-16 pb-8 bg-black/85 backdrop-blur-xl animate-fadeIn"
            onClick={(e) => {
              if (e.target === e.currentTarget) setIsScrapeModalOpen(false);
            }}
          >
            <div className="relative w-full max-w-xl bg-zinc-950 border border-zinc-800/90 rounded-3xl p-6 sm:p-7 shadow-[0_25px_70px_rgba(0,0,0,0.95),inset_0_1px_0_rgba(255,255,255,0.1)] overflow-hidden backdrop-blur-2xl max-h-[84vh] overflow-y-auto animate-scaleUp">
              
              {/* Radial Top Ambient Glow Accent */}
              <div className="absolute top-0 left-0 right-0 h-44 bg-[radial-gradient(ellipse_100%_80%_at_50%_0%,rgba(140,130,255,0.16),rgba(255,255,255,0.03)_40%,transparent_70%)] pointer-events-none"></div>

              {/* Modal Header */}
              <div className="relative z-10 flex items-start justify-between mb-4">
                <div>

                  <h3 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white font-display">
                    Launch New Extraction
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() => setIsScrapeModalOpen(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                  title="Close (Esc)"
                >
                  ✕
                </button>
              </div>

              {/* Subtitle */}
              <p className="relative z-10 text-zinc-400 text-xs sm:text-sm font-light leading-relaxed mb-6">
                Search any city or industry. Extract verified Google Maps leads with high star ratings and no website.
              </p>

              {/* Hero-Styled Search Bar & Form */}
              <form onSubmit={handleModalScrapeSubmit} className="relative z-10 space-y-4">
                
                {/* Pill Search Input Container */}
                <div className="relative rounded-full bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700 focus-within:border-zinc-500 backdrop-blur-2xl p-2 pl-4 pr-2 transition-all duration-300 shadow-[0_10px_30px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.06)] flex items-center gap-2.5">
                  <div className="text-zinc-500 group-focus-within:text-zinc-300 transition-colors shrink-0">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                    </svg>
                  </div>

                  <input
                    type="text"
                    autoFocus
                    placeholder="e.g. Autohandel Zürich, Dachdecker Hamburg..."
                    value={modalScrapeQuery}
                    onChange={(e) => setModalScrapeQuery(e.target.value)}
                    className="w-full bg-transparent border-none text-white placeholder-zinc-500 focus:outline-none focus:ring-0 text-xs sm:text-sm font-normal py-1"
                  />

                  {/* Filter Toggle Chip */}
                  <button
                    type="button"
                    onClick={() => setModalShowAdvanced(!modalShowAdvanced)}
                    className={`px-3 py-1.5 rounded-full text-[11px] font-mono-accent uppercase tracking-wider transition-all duration-200 flex items-center gap-1.5 shrink-0 ${
                      modalShowAdvanced 
                        ? 'bg-zinc-800 text-white border border-zinc-600 shadow-[0_0_15px_rgba(255,255,255,0.1)]' 
                        : 'text-zinc-400 hover:text-zinc-200 bg-zinc-950/60 hover:bg-zinc-900 border border-zinc-800/80'
                    }`}
                    title="Toggle extraction parameters"
                  >
                    <div className="flex items-center gap-1">
                      <span>{modalMinRating.toFixed(1)}</span>
                      <svg className="w-3 h-3 text-amber-400 fill-amber-400" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    </div>
                    <svg className={`w-2.5 h-2.5 text-zinc-500 transition-transform duration-200 ${modalShowAdvanced ? 'rotate-180 text-white' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={!modalScrapeQuery.trim()}
                    className="h-9 px-4 bg-white hover:bg-zinc-200 disabled:opacity-40 text-black text-xs font-semibold rounded-full transition-all duration-200 shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:shadow-[0_0_25px_rgba(255,255,255,0.4)] shrink-0 flex items-center gap-1.5 cursor-pointer font-mono-accent uppercase tracking-wider"
                  >
                    <span>Extract</span>
                    <span className="text-[10px] text-zinc-500">↵</span>
                  </button>
                </div>

                {/* Quick Search Preset Pills */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[11px] font-mono-accent text-zinc-500 mr-1">Presets:</span>
                  {[
                    { label: 'Dachdecker Hamburg', q: 'Dachdecker Hamburg' },
                    { label: 'Autohandel Zürich', q: 'Autohandel Zürich' },
                    { label: 'Autosallon Prishtinë', q: 'Autosallon Prishtinë' },
                    { label: 'Sanitär Wien', q: 'Sanitär Wien' },
                    { label: 'Zahnarzt Frankfurt', q: 'Zahnarzt Frankfurt' },
                  ].map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => setModalScrapeQuery(item.q)}
                      className="text-[11px] px-3 py-1 rounded-full bg-zinc-900/70 hover:bg-zinc-800 border border-zinc-800/80 hover:border-zinc-700 text-zinc-400 hover:text-white transition-all font-mono-accent cursor-pointer"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                {/* Extraction Parameters / Filters Drawer */}
                {modalShowAdvanced && (
                  <div className="bg-zinc-900/70 rounded-2xl p-4 text-left border border-zinc-800/80 shadow-lg animate-slide-down backdrop-blur-xl space-y-4">
                    <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                      <span className="text-[11px] font-mono-accent font-semibold tracking-[0.15em] uppercase text-zinc-400">
                        Extraction Parameters
                      </span>
                      <span className="text-[10px] text-zinc-500 font-mono-accent">Custom thresholds</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-xs font-mono-accent text-zinc-400">Minimum Rating</span>
                          <span className="text-xs font-mono-accent font-bold text-white bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800 flex items-center gap-1">
                            <span>{modalMinRating.toFixed(1)}</span>
                            <svg className="w-3 h-3 text-amber-400 fill-amber-400" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          </span>
                        </div>
                        <input
                          type="range"
                          min="3.0"
                          max="5.0"
                          step="0.1"
                          value={modalMinRating}
                          onChange={(e) => setModalMinRating(parseFloat(e.target.value))}
                          className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-white"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-xs font-mono-accent text-zinc-400">Batch Limit</span>
                          <span className="text-xs font-mono-accent font-bold text-white bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800">
                            {modalMaxLeads} Leads
                          </span>
                        </div>
                        <input
                          type="range"
                          min="5"
                          max="50"
                          step="5"
                          value={modalMaxLeads}
                          onChange={(e) => setModalMaxLeads(parseInt(e.target.value))}
                          className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-white"
                        />
                      </div>
                    </div>
                  </div>
                )}

              </form>

            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default Dashboard;
