import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import WhatsAppModal, { cleanPhoneForWhatsApp } from '../components/WhatsAppModal';

const Dashboard = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('All');
  const [selectedLeads, setSelectedLeads] = useState([]);
  const [editingLead, setEditingLead] = useState(null);
  
  // WhatsApp Modal state
  const [activeWhatsAppLead, setActiveWhatsAppLead] = useState(null);
  const [isWhatsAppOpen, setIsWhatsAppOpen] = useState(false);

  // Scraper status states
  const [scrapingActive, setScrapingActive] = useState(false);
  const [scrapeLogs, setScrapeLogs] = useState([]);
  const [scrapeQuery, setScrapeQuery] = useState('');

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

  // Ref guard to prevent React StrictMode from double-firing the scrape
  const scrapeTriggeredRef = useRef(false);
  
  // Fetch Leads from Backend MySQL Database / JSON fallback
  const fetchLeads = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/leads');
      if (res.ok) {
        const data = await res.json();
        setLeads(data);
      } else {
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
    if (scrapeParam === 'true' && queryParam && !scrapeTriggeredRef.current) {
      scrapeTriggeredRef.current = true; // Prevent double-fire from React StrictMode
      const rating = parseFloat(searchParams.get('rating') || '4.0');
      const limit = parseInt(searchParams.get('limit') || '10');
      setScrapeQuery(queryParam);
      setSearchParams({});
      triggerScraping(queryParam, rating, limit);
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
        simulateMockScraping(queryStr);
      }
    } catch (err) {
      console.warn("Backend offline, running mock scraping simulation.");
      simulateMockScraping(queryStr);
    }
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
    if (!lead) return { score: 50, level: 'Moderate', color: 'text-sky-400 bg-sky-950/40 border-sky-500/30', signals: [], pitchRecommendation: '' };
    
    let score = 35; // Base score for having no official website on Google Maps
    const signals = [];

    const rating = parseFloat(lead.rating) || 0;
    const reviews = parseInt(lead.reviews_count) || 0;

    // 1. Review volume & rating (Proven Cash Flow & Demand)
    if (reviews >= 40 && rating >= 4.5) {
      score += 30;
      signals.push({
        type: 'high_demand',
        icon: '🚀',
        title: 'High Customer Volume & Cash Flow',
        desc: `${reviews} Google reviews (${rating.toFixed(1)}★) prove steady foot traffic and active paying clients.`
      });
    } else if (reviews >= 15 && rating >= 4.0) {
      score += 20;
      signals.push({
        type: 'steady_demand',
        icon: '⭐',
        title: 'Strong Local Reputation',
        desc: `${reviews} positive Google reviews (${rating.toFixed(1)}★). Ready to convert map searches into booked clients.`
      });
    } else if (reviews > 0) {
      score += 10;
      signals.push({
        type: 'local_active',
        icon: '📍',
        title: 'Active Local Business',
        desc: `Verified listing on Google Maps with ${reviews} client review${reviews > 1 ? 's' : ''}.`
      });
    }

    // 2. Direct Outreach Reachability
    if (lead.phone_number) {
      score += 15;
      signals.push({
        type: 'wa_direct',
        icon: '💬',
        title: 'Direct WhatsApp Contact Ready',
        desc: 'Direct mobile phone enables sending a personalized 1-on-1 visual website mockup instantly.'
      });
    }

    // 3. Social Media Presence Without Website
    if (lead.primary_social_pitch_url || (lead.quick_pitch_hook && lead.quick_pitch_hook.toLowerCase().includes('social'))) {
      score += 15;
      signals.push({
        type: 'social_active',
        icon: '📱',
        title: 'Social-Only Web Presence',
        desc: 'Markets on Instagram/Facebook without a dedicated booking landing page to capture organic web traffic.'
      });
    }

    // 4. Decision Maker Identified
    if (lead.estimated_owner_name && lead.estimated_owner_name !== 'Unknown') {
      score += 5;
      signals.push({
        type: 'owner_found',
        icon: '👤',
        title: `Owner Name Identified (${lead.estimated_owner_name})`,
        desc: 'Direct name enables high-response personalized first contact.'
      });
    }

    score = Math.min(score, 98);

    let level = 'Moderate';
    let color = 'text-sky-400 bg-sky-950/40 border-sky-500/30';
    if (score >= 85) {
      level = 'Very High Intent';
      color = 'text-rose-400 bg-rose-950/40 border-rose-500/30';
    } else if (score >= 70) {
      level = 'High Intent';
      color = 'text-amber-400 bg-amber-950/40 border-amber-500/30';
    }

    let pitchRecommendation = 'Showcase a clean visual landing page mockup with direct call and WhatsApp buttons.';
    if (signals.some(s => s.type === 'high_demand')) {
      pitchRecommendation = `Lead with their ${rating.toFixed(1)}★ rating: "You have ${reviews} top reviews—a modern landing page with direct booking will turn visitors into instant customers."`;
    } else if (signals.some(s => s.type === 'social_active')) {
      pitchRecommendation = 'Pitch converting their social media followers into direct bookings with a fast mobile landing page.';
    }

    return { score, level, color, signals, pitchRecommendation };
  };

  const filteredLeads = leads.filter(lead => {
    if (filter === 'All') return true;
    if (filter === 'High Intent') return calculateLeadIntent(lead).score >= 80;
    if (filter === 'Uncontacted') return !isLeadContacted(lead);
    if (filter === 'Contacted') return isLeadContacted(lead);
    if (filter === 'WhatsApp Ready') return Boolean(lead.phone_number);
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
  const activeLead = leads.find(l => l.id === activeLeadId) || filteredLeads[0] || null;

  // Auto-select first lead when leads load
  useEffect(() => {
    if (leads.length > 0 && !activeLeadId) {
      setActiveLeadId(leads[0].id);
    }
  }, [leads, activeLeadId]);

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
        setInspectorLanguage('German');
      } else {
        setInspectorLanguage('German');
      }
    }
  }, [activeLead?.id]);

  // Inline AI Generator
  const handleInlineGenerateAI = async () => {
    if (!activeLead) return;
    setInspectorGenerating(true);
    try {
      const res = await fetch(`http://localhost:5000/api/leads/${activeLead.id}/generate-whatsapp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language: inspectorLanguage,
          tone: inspectorTone,
          customInstructions: ''
        })
      });

      if (res.ok) {
        const data = await res.json();
        const msg = data.message || data.personalized_whatsapp;
        if (msg) {
          setInspectorMessage(msg);
          setLeads(leads.map(l => l.id === activeLead.id ? { ...l, personalized_whatsapp: msg } : l));
        }
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
  const currentLeadIndex = displayedLeads.findIndex(l => l.id === activeLead?.id);
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

  return (
    <div className="pt-36 pb-20 px-4 sm:px-8 md:px-12 bg-[#09090b] min-h-screen text-white font-sans relative overflow-hidden selection:bg-white/20 selection:text-white">
      
      {/* Subtle fine technical grid & ambient anthracite lighting */}
      <div className="absolute inset-0 subtle-grid opacity-15 pointer-events-none z-0"></div>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-6xl h-[400px] bg-[radial-gradient(ellipse_70%_50%_at_50%_0%,rgba(255,255,255,0.03),transparent_70%)] pointer-events-none z-0"></div>

      <div className="max-w-7xl mx-auto relative z-10">
        
        {/* Compact Telemetry & Action Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 pb-5 border-b border-white/[0.06]">
          
          {/* Left Title & Status */}
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white font-display tracking-tight">
                Outreach Workspace
              </h1>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse"></span>
              <span className="text-[11px] font-mono-accent uppercase tracking-[0.2em] text-zinc-500">
                {leads.length} LEADS EXTRACTED
              </span>
            </div>
          </div>

          {/* Right Compact Metric Ribbon & Actions */}
          <div className="flex flex-wrap items-center gap-3">
            
            {/* Inline Mini-Telemetry Chips */}
            <div className="hidden sm:flex items-center gap-2 bg-zinc-950/80 border border-white/[0.08] rounded-full px-3.5 py-1.5 text-[11px] font-mono-accent text-zinc-400">
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                {leads.filter(isLeadContacted).length}/{leads.length}
              </span>
              <span>Contacted</span>
              <span className="text-zinc-700">|</span>
              <span className="text-amber-400 font-bold">{leads.filter(l => !isLeadContacted(l)).length}</span>
              <span>Pending</span>
              <span className="text-zinc-700">|</span>
              <span className="text-white font-bold">{leads.filter(l => l.phone_number).length}</span>
              <span>WA Ready</span>
            </div>

            {/* Scrape Trigger Button */}
            <button
              onClick={() => {
                const q = prompt("Enter scraping search query (e.g. Autohandel Zürich, Dachdecker Hamburg):");
                if (q) triggerScraping(q, 4.0, 10);
              }}
              disabled={scrapingActive}
              className="text-xs font-semibold text-black bg-white hover:bg-zinc-200 disabled:opacity-50 rounded-full px-4 py-2 shadow-[0_0_20px_rgba(255,255,255,0.15)] flex items-center gap-1.5 transition-all cursor-pointer font-mono-accent uppercase tracking-wider shrink-0"
            >
              <span>{scrapingActive ? 'Scraping...' : '+ New Scrape'}</span>
            </button>

            {/* Email Selected */}
            <button
              onClick={startCampaign}
              disabled={selectedLeads.length === 0}
              className="text-xs font-semibold text-zinc-400 hover:text-white bg-zinc-900/60 hover:bg-zinc-800 disabled:opacity-30 rounded-full px-4 py-2 border border-white/[0.08] transition-all cursor-pointer font-mono-accent uppercase tracking-wider shrink-0"
            >
              Email ({selectedLeads.length})
            </button>

            {/* Delete Selected */}
            {selectedLeads.length > 0 && (
              <button
                onClick={handleBatchDelete}
                className="text-xs font-semibold text-rose-400 hover:text-rose-300 bg-rose-950/30 hover:bg-rose-950/60 border border-rose-800/40 rounded-full px-4 py-2 transition-all cursor-pointer font-mono-accent uppercase tracking-wider shrink-0 flex items-center gap-1.5 shadow-[0_0_15px_rgba(244,63,94,0.15)]"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span>Delete ({selectedLeads.length})</span>
              </button>
            )}

          </div>
        </div>

        {/* Live Scraper Output macOS Terminal Window */}
        {scrapingActive && (
          <div className="bg-[#0b0c10] border border-white/[0.12] rounded-2xl mb-6 shadow-[0_20px_50px_rgba(0,0,0,0.9)] overflow-hidden font-mono text-xs animate-slide-down backdrop-blur-2xl">
            
            {/* macOS Window Header Bar */}
            <div className="bg-zinc-900/90 border-b border-white/[0.08] px-4 py-2.5 flex items-center justify-between">
              
              {/* Traffic Light Dots */}
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#ff5f56] border border-[#e0443e] inline-block shadow-sm"></span>
                <span className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-[#dea123] inline-block shadow-sm"></span>
                <span className="w-3 h-3 rounded-full bg-[#27c93f] border border-[#1aab29] inline-block shadow-sm"></span>
              </div>

              {/* Window Title */}
              <div className="text-[11px] text-zinc-400 font-mono flex items-center gap-2">
                <span className="text-zinc-600">terminal</span>
                <span>—</span>
                <span className="text-zinc-300 font-semibold">maps-enricher.sh</span>
                <span className="text-[10px] text-zinc-600">--live</span>
              </div>

              {/* Status Indicator */}
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest font-mono">STREAM ACTIVE</span>
              </div>

            </div>

            {/* Terminal Body with Line Numbers and Auto-Scroll */}
            <div className="p-4 max-h-56 overflow-y-auto font-mono text-xs leading-relaxed space-y-1 bg-[#090a0d]/90 divide-y divide-transparent">
              {scrapeLogs.map((log, index) => {
                // Parse tag if present
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
                  <div key={index} className="flex items-start gap-2 py-0.5 hover:bg-white/[0.02] px-1 rounded transition-colors">
                    <span className="text-zinc-600 select-none text-[10px] w-5 text-right font-mono shrink-0">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className="text-zinc-700 select-none font-mono">│</span>
                    <div className="font-mono flex-1 break-words">
                      {tag && <span className={`${tagColor} font-bold mr-1.5`}>{tag}</span>}
                      <span className="text-zinc-300">{rest}</span>
                    </div>
                  </div>
                );
              })}
              
              {/* Pulsing Caret */}
              <div className="flex items-center gap-2 pt-1 text-emerald-400">
                <span className="text-zinc-600 select-none text-[10px] w-5 text-right font-mono shrink-0">
                  {String(scrapeLogs.length + 1).padStart(2, '0')}
                </span>
                <span className="text-zinc-700 select-none font-mono">│</span>
                <span className="inline-block w-2 h-4 bg-emerald-400 animate-pulse"></span>
              </div>

              <div ref={terminalLogsEndRef} />
            </div>

          </div>
        )}

        {/* Search & Filter Capsule Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-5">
          
          {/* Instant Search input */}
          <div className="relative w-full sm:w-80">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search leads, city, or niche..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full bg-zinc-950/70 border border-white/[0.08] hover:border-white/15 focus:border-zinc-500 rounded-full pl-9 pr-4 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none transition-colors font-mono-accent"
            />
          </div>

          {/* Filter Status Pills */}
          <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            {[
              { id: 'All', label: `All (${leads.length})` },
              { id: 'High Intent', label: `🔥 High Intent (${leads.filter(l => calculateLeadIntent(l).score >= 80).length})` },
              { id: 'Uncontacted', label: `💬 Uncontacted (${leads.filter(l => !isLeadContacted(l)).length})` },
              { id: 'Contacted', label: `✓ Contacted (${leads.filter(isLeadContacted).length})` },
              { id: 'WhatsApp Ready', label: 'WA Ready' },
              { id: 'WhatsApp Sent', label: 'WA Sent' },
              { id: 'Emailed', label: 'Emailed' },
              { id: 'Enriched', label: 'Enriched' }
            ].map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setFilter(id)}
                className={`text-[11px] font-mono-accent px-3 py-1 rounded-full transition-all duration-200 cursor-pointer whitespace-nowrap ${
                  filter === id
                    ? 'bg-zinc-800 text-white font-semibold border border-white/20 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

        </div>

        {/* Master-Detail Workspace Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          
          {/* Left Column: Leads Stream List */}
          <div className="lg:col-span-6 bg-zinc-950/70 border border-white/[0.08] rounded-2xl overflow-hidden shadow-2xl backdrop-blur-xl flex flex-col max-h-[720px]">
            
            {/* List Header */}
            <div className="p-3.5 border-b border-white/[0.06] bg-zinc-900/40 flex items-center justify-between text-xs font-mono-accent text-zinc-400">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  onChange={handleSelectAll}
                  checked={selectedLeads.length === displayedLeads.length && displayedLeads.length > 0}
                  className="rounded bg-zinc-900 border-zinc-700 accent-white cursor-pointer"
                />
                <span className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold">
                  Extracted Businesses ({displayedLeads.length})
                </span>
              </div>
              <span className="text-[10px] text-zinc-500">Instant select</span>
            </div>

            {/* List Body */}
            <div className="overflow-y-auto divide-y divide-white/[0.04] flex-1">
              {loading ? (
                <div className="py-20 text-center text-zinc-500 text-xs font-mono-accent">
                  <div className="inline-block w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin mb-2"></div>
                  <div>Loading workspace...</div>
                </div>
              ) : displayedLeads.length === 0 ? (
                <div className="py-20 text-center text-zinc-500 text-xs font-mono-accent">
                  No businesses found. Try a different search term or run a scrape.
                </div>
              ) : (
                displayedLeads.map((lead) => {
                  const isSelected = activeLead?.id === lead.id;
                  const isChecked = selectedLeads.includes(lead.id);
                  const isContacted = isLeadContacted(lead);
                  const contactedInfo = getLeadContactedInfo(lead);
                  const leadIntent = calculateLeadIntent(lead);

                  return (
                    <div
                      key={lead.id}
                      onClick={() => setActiveLeadId(lead.id)}
                      className={`p-3.5 transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'bg-zinc-900/90 border-l-2 border-white'
                          : 'hover:bg-zinc-900/40'
                      }`}
                    >
                      {/* Checkbox & Lead Overview */}
                      <div className="flex items-start gap-3 min-w-0">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleSelectLead(lead.id);
                          }}
                          className="mt-1 rounded bg-zinc-900 border-zinc-700 accent-white cursor-pointer"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm text-white truncate group-hover:text-white">
                              {lead.business_name}
                            </span>

                            {/* Intent Score Chip */}
                            <span className={`inline-flex items-center gap-1 text-[9px] font-mono-accent font-bold px-2 py-0.5 rounded-full border ${
                              leadIntent.score >= 85 
                                ? 'bg-rose-950/50 text-rose-300 border-rose-800/50' 
                                : leadIntent.score >= 70 
                                ? 'bg-amber-950/50 text-amber-300 border-amber-800/50' 
                                : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                            }`} title={`Website Buying Intent: ${leadIntent.score}% (${leadIntent.level})`}>
                              <span>🔥</span>
                              <span>{leadIntent.score}% Intent</span>
                            </span>
                            
                            {/* Sent Status Badge */}
                            {contactedInfo ? (
                              <span className={`inline-flex items-center gap-1 text-[10px] font-mono-accent font-bold px-2 py-0.5 rounded-full ${
                                lead.status === 'WhatsApp Sent'
                                  ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30'
                                  : lead.status === 'Emailed'
                                  ? 'bg-sky-950/60 text-sky-400 border border-sky-500/30'
                                  : 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30'
                              }`}>
                                <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                                <span>✓ {contactedInfo.channel === 'WhatsApp' ? 'WA Sent' : contactedInfo.channel}</span>
                                {contactedInfo.timeFormatted && (
                                  <span className="opacity-70 font-normal">· {contactedInfo.timeFormatted}</span>
                                )}
                              </span>
                            ) : null}
                          </div>
                          
                          <div className="flex items-center gap-2 text-xs text-zinc-500 font-mono-accent mt-0.5">
                            <span>{lead.category || 'Business'}</span>
                            <span>·</span>
                            <span>{lead.location}</span>
                            {leadIntent.signals[0] && (
                              <>
                                <span>·</span>
                                <span className="text-zinc-400 hidden sm:inline">{leadIntent.signals[0].icon} {leadIntent.signals[0].title}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right Badges & Actions: Rating, Phone, Toggle & Delete */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        
                        {/* Rating chip */}
                        <div className="inline-flex items-center gap-1 font-mono-accent text-xs font-medium text-white bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                          <span>{lead.rating ? Number(lead.rating).toFixed(1) : '—'}</span>
                          <svg className="w-2.5 h-2.5 text-amber-400 fill-amber-400" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        </div>

                        {/* Phone indicator badge */}
                        {lead.phone_number ? (
                          <span className="text-[11px] text-emerald-400 font-mono-accent bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40">
                            WA
                          </span>
                        ) : (
                          <span className="text-[10px] text-zinc-600 font-mono-accent">No Phone</span>
                        )}

                        {/* 1-Click Quick Toggle Contacted Status */}
                        <button
                          type="button"
                          onClick={(e) => handleToggleLeadContacted(lead, e)}
                          className={`p-1 rounded-lg border transition-all cursor-pointer ${
                            isContacted
                              ? 'text-emerald-400 bg-emerald-950/50 border-emerald-800/50 hover:bg-emerald-900/60'
                              : 'text-zinc-600 hover:text-emerald-400 hover:bg-emerald-950/30 border-transparent hover:border-emerald-800/30'
                          }`}
                          title={isContacted ? "Contacted ✓ (Click to mark as unsent)" : "Click to mark as Contacted / Sent"}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                          </svg>
                        </button>

                        {/* Direct Delete Row Button */}
                        <button
                          type="button"
                          onClick={(e) => handleDelete(lead.id, e)}
                          className="p-1 rounded-lg text-zinc-600 hover:text-rose-400 hover:bg-rose-950/40 border border-transparent hover:border-rose-900/40 transition-colors cursor-pointer"
                          title="Delete lead"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>

                      </div>
                    </div>
                  );
                })
              )}
            </div>

          </div>

          {/* Right Column: Instant Inline Lead Inspector & 1-Click Outreach Suite */}
          <div className="lg:col-span-6 bg-zinc-950/70 border border-white/[0.08] rounded-2xl p-5 shadow-2xl backdrop-blur-xl flex flex-col justify-between max-h-[720px] overflow-y-auto">
            {activeLead ? (
              <div className="space-y-4">
                
                {/* Header of Inspector & Quick Navigation */}
                <div className="flex items-start justify-between border-b border-white/[0.06] pb-3.5">
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-base sm:text-lg font-bold text-white font-display truncate">
                        {activeLead.business_name}
                      </h2>
                      <span className={`text-[10px] font-mono-accent font-semibold uppercase px-2.5 py-0.5 rounded-full shrink-0 ${
                        activeLead.status === 'WhatsApp Sent'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : activeLead.status === 'Emailed'
                          ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                          : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                      }`}>
                        {activeLead.status}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 font-mono-accent mt-0.5">
                      {activeLead.category || 'Local Business'} · {activeLead.location} · <span className="text-amber-400 font-bold">{activeLead.rating ? Number(activeLead.rating).toFixed(1) : '5.0'}★</span> ({activeLead.reviews_count || 0})
                    </p>
                  </div>

                  {/* Action Controls: Edit, Delete, Navigation Arrows */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setEditingLead(activeLead)}
                      className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white text-xs font-mono-accent border border-zinc-800 transition-colors cursor-pointer flex items-center gap-1"
                      title="Edit Lead Details"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                      <span className="hidden sm:inline">Edit</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => handleDelete(activeLead.id, e)}
                      className="px-2.5 py-1 rounded-lg bg-rose-950/20 hover:bg-rose-950/50 text-rose-400 hover:text-rose-300 text-xs font-mono-accent border border-rose-900/30 hover:border-rose-800/60 transition-colors cursor-pointer flex items-center gap-1"
                      title="Delete Lead"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      <span className="hidden sm:inline">Delete</span>
                    </button>

                    <div className="h-4 w-px bg-zinc-800 mx-0.5"></div>

                    <button
                      onClick={handlePrevLead}
                      disabled={currentLeadIndex <= 0}
                      className="px-2 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 disabled:opacity-30 text-zinc-300 text-xs font-mono-accent border border-zinc-800 cursor-pointer"
                      title="Previous Lead"
                    >
                      ◀
                    </button>
                    <button
                      onClick={handleNextLeadNav}
                      disabled={currentLeadIndex >= displayedLeads.length - 1}
                      className="px-2 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 disabled:opacity-30 text-zinc-300 text-xs font-mono-accent border border-zinc-800 cursor-pointer"
                      title="Next Lead"
                    >
                      ▶
                    </button>
                  </div>
                </div>

                {/* Prominent Contacted Notification Banner */}
                {isLeadContacted(activeLead) ? (
                  <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-3 flex items-center justify-between gap-3 text-xs font-mono-accent">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 font-bold shrink-0">
                        ✓
                      </div>
                      <div className="min-w-0">
                        <div className="text-emerald-300 font-bold flex items-center gap-2 flex-wrap">
                          <span>MESSAGE ALREADY SENT</span>
                          <span className="text-[10px] text-emerald-400 bg-emerald-900/50 px-2 py-0.5 rounded-full border border-emerald-700/50">
                            via {getLeadContactedInfo(activeLead)?.channel || 'Direct'}
                          </span>
                        </div>
                        <p className="text-[11px] text-emerald-400/80 mt-0.5">
                          {getLeadContactedInfo(activeLead)?.timeFormatted 
                            ? `Contacted ${getLeadContactedInfo(activeLead).timeFormatted}. You can review below or send a follow-up.`
                            : 'This business was marked as contacted.'}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => handleToggleLeadContacted(activeLead, e)}
                      className="text-[10px] font-semibold text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/60 rounded-lg px-2.5 py-1.5 transition-colors cursor-pointer shrink-0"
                    >
                      Mark Unsent
                    </button>
                  </div>
                ) : (
                  <div className="bg-zinc-900/40 border border-white/[0.04] rounded-xl px-3 py-2 flex items-center justify-between gap-2 text-xs font-mono-accent text-zinc-400">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                      <span>Outreach Status: <strong className="text-zinc-200 font-semibold">Not Sent Yet</strong></span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => handleToggleLeadContacted(activeLead, e)}
                      className="text-[10px] text-emerald-400 hover:text-emerald-300 bg-emerald-950/30 hover:bg-emerald-900/40 border border-emerald-800/40 rounded-lg px-2.5 py-1 transition-colors cursor-pointer"
                    >
                      ✓ Mark as Sent
                    </button>
                  </div>
                )}

                {/* Inline Telemetry Chips */}
                <div className="grid grid-cols-3 gap-2 text-xs font-mono-accent">
                  <div className="p-2 rounded-xl bg-zinc-900/60 border border-white/[0.04]">
                    <span className="text-[9px] text-zinc-500 uppercase block">Phone Contact</span>
                    <span className="text-white font-medium truncate block mt-0.5">
                      {activeLead.phone_number || 'No phone'}
                    </span>
                  </div>

                  <div className="p-2 rounded-xl bg-zinc-900/60 border border-white/[0.04]">
                    <span className="text-[9px] text-zinc-500 uppercase block">Website Audit</span>
                    <span className="text-red-400 font-semibold text-[11px] block mt-0.5">
                      No Website
                    </span>
                  </div>

                  <div className="p-2 rounded-xl bg-zinc-900/60 border border-white/[0.04]">
                    <span className="text-[9px] text-zinc-500 uppercase block">Owner Estimate</span>
                    <span className="text-zinc-300 font-medium truncate block mt-0.5">
                      {activeLead.estimated_owner_name && activeLead.estimated_owner_name !== 'Unknown' 
                        ? activeLead.estimated_owner_name 
                        : 'Local Owner'}
                    </span>
                  </div>
                </div>

                {/* Buying Signals & Website Intent Radar Widget */}
                {(() => {
                  const intent = calculateLeadIntent(activeLead);
                  return (
                    <div className="bg-zinc-900/70 border border-white/[0.08] rounded-xl p-3.5 space-y-3 font-mono-accent">
                      {/* Header with Gauge */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">🎯</span>
                          <span className="text-xs font-bold text-white uppercase tracking-wider">Website Intent Radar</span>
                        </div>
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${intent.color}`}>
                          🔥 {intent.score}% — {intent.level}
                        </span>
                      </div>

                      {/* Intent Meter Bar */}
                      <div className="w-full bg-zinc-950 rounded-full h-1.5 overflow-hidden border border-zinc-800">
                        <div 
                          className="h-full bg-gradient-to-r from-amber-500 via-rose-500 to-emerald-400 transition-all duration-500 rounded-full"
                          style={{ width: `${intent.score}%` }}
                        ></div>
                      </div>

                      {/* Signals Breakdown */}
                      <div className="space-y-1.5 pt-1">
                        {intent.signals.map((sig, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-[11px] bg-zinc-950/60 border border-white/[0.03] p-2 rounded-lg">
                            <span className="text-xs shrink-0">{sig.icon}</span>
                            <div className="min-w-0">
                              <span className="font-semibold text-zinc-200 block">{sig.title}</span>
                              <span className="text-[10px] text-zinc-400 leading-snug block mt-0.5">{sig.desc}</span>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Recommended Pitch Hook */}
                      <div className="bg-emerald-950/30 border border-emerald-500/20 rounded-lg p-2.5 text-[11px] flex items-start gap-2">
                        <span className="text-emerald-400 shrink-0 mt-0.5">💡</span>
                        <div className="min-w-0">
                          <span className="font-bold text-emerald-400 uppercase text-[9px] block tracking-wider">Recommended Pitch Strategy</span>
                          <span className="text-zinc-300 text-[11px] leading-relaxed block mt-0.5">{intent.pitchRecommendation}</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Instant Inline AI Controls Bar */}
                <div className="bg-zinc-900/60 border border-white/[0.06] rounded-xl p-3 space-y-2.5 font-mono-accent">
                  
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    {/* Language Switch Pills */}
                    <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-800">
                      {['German', 'Albanian', 'English'].map((lang) => (
                        <button
                          key={lang}
                          type="button"
                          onClick={() => setInspectorLanguage(lang)}
                          className={`text-[10px] px-2 py-0.5 rounded transition-all cursor-pointer ${
                            inspectorLanguage === lang
                              ? 'bg-zinc-800 text-white font-bold'
                              : 'text-zinc-500 hover:text-zinc-300'
                          }`}
                        >
                          {lang === 'German' ? '🇩🇪 DE' : lang === 'Albanian' ? '🇦🇱 SQ' : '🇬🇧 EN'}
                        </button>
                      ))}
                    </div>

                    {/* Angle / Tone Selector */}
                    <select
                      value={inspectorTone}
                      onChange={(e) => setInspectorTone(e.target.value)}
                      className="text-[11px] bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 text-zinc-300 focus:outline-none focus:border-zinc-500 cursor-pointer"
                    >
                      <option value="Professional & Friendly">Professional & Friendly</option>
                      <option value="Free Website Mockup / Preview">Free Website Mockup</option>
                      <option value="Leverage High Google Reviews">Leverage 4.5+ Rating</option>
                      <option value="Short & Punchy Direct Pitch">Direct & Punchy</option>
                    </select>

                    {/* Instant 1-Click Regenerate */}
                    <button
                      type="button"
                      onClick={handleInlineGenerateAI}
                      disabled={inspectorGenerating}
                      className="text-[11px] font-semibold text-white bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 border border-white/10 rounded-lg px-2.5 py-1 flex items-center gap-1.5 cursor-pointer"
                    >
                      {inspectorGenerating ? (
                        <>
                          <svg className="animate-spin h-3 w-3 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                          </svg>
                          <span>AI Drafting...</span>
                        </>
                      ) : (
                        <>
                          <span>✨</span>
                          <span>Regenerate</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Live Editable WhatsApp Message Body */}
                  <textarea
                    value={inspectorMessage}
                    onChange={(e) => setInspectorMessage(e.target.value)}
                    rows={7}
                    className="w-full p-3 text-xs bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-zinc-500 font-sans leading-relaxed text-zinc-200 resize-none shadow-inner"
                    placeholder="Type or generate message..."
                  ></textarea>

                  {/* Footer Action Ribbon */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={handleInlineCopy}
                        className="text-[11px] text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg px-2.5 py-1.5 transition-colors cursor-pointer"
                      >
                        {inspectorCopied ? '✓ Copied' : '📋 Copy'}
                      </button>

                      <button
                        type="button"
                        onClick={handleInlineSaveDraft}
                        className="text-[11px] text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg px-2.5 py-1.5 transition-colors cursor-pointer"
                      >
                        {inspectorSaved ? '✓ Saved' : '💾 Save'}
                      </button>

                      <button
                        type="button"
                        onClick={() => openWhatsAppModal(activeLead)}
                        className="text-[11px] text-purple-400 hover:text-purple-300 bg-purple-950/30 hover:bg-purple-900/40 border border-purple-800/40 rounded-lg px-2.5 py-1.5 transition-colors cursor-pointer"
                      >
                        Expanded View
                      </button>
                    </div>

                    {/* Primary Direct 1-Click Launch Button */}
                    <button
                      type="button"
                      onClick={handleInlineSendWhatsApp}
                      disabled={!activeLead.phone_number}
                      className={`text-xs font-semibold rounded-xl px-4 py-1.5 flex items-center gap-1.5 transition-all cursor-pointer uppercase tracking-wider ${
                        isLeadContacted(activeLead)
                          ? 'text-emerald-300 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/50 shadow-[0_0_15px_rgba(52,211,153,0.2)]'
                          : 'text-black bg-emerald-400 hover:bg-emerald-300 shadow-[0_0_20px_rgba(52,211,153,0.3)]'
                      }`}
                    >
                      <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                      </svg>
                      <span>{isLeadContacted(activeLead) ? 'Re-send WhatsApp' : 'Send WhatsApp'}</span>
                    </button>

                  </div>

                </div>

              </div>
            ) : (
              <div className="py-24 text-center text-zinc-500 text-xs font-mono-accent">
                Select a business to start outreach.
              </div>
            )}
          </div>

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
          <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="bg-zinc-950 border border-white/10 rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden animate-slide-down max-h-[90vh] flex flex-col">
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
                    placeholder="Hallo, ich bin Art Halimi, ich mache Webseiten..."
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
                    className="text-xs font-semibold text-rose-400 hover:text-rose-300 bg-rose-950/30 hover:bg-rose-950/60 border border-rose-900/40 rounded-xl px-4 py-2 transition-colors cursor-pointer flex items-center gap-1.5"
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
                      className="text-xs font-semibold text-zinc-400 hover:text-white border border-zinc-800 rounded-xl px-4 py-2 hover:bg-zinc-900 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="text-xs font-semibold text-black bg-white hover:bg-zinc-200 rounded-xl px-5 py-2 shadow-md cursor-pointer uppercase tracking-wider"
                    >
                      Save Changes
                    </button>
                  </div>
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
