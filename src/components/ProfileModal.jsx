import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, User, Briefcase, Globe, Check, Sparkles, MessageSquare } from 'lucide-react';

const ProfileModal = ({ isOpen, onClose }) => {
  const { user, updateProfile } = useAuth();
  
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [profession, setProfession] = useState(user?.profession || 'Web Developer');
  const [portfolioUrl, setPortfolioUrl] = useState(user?.portfolio_url || '');
  
  const [status, setStatus] = useState({ type: '', message: '' });
  const [saving, setSaving] = useState(false);

  // Sync state whenever user object updates or modal is opened
  useEffect(() => {
    if (user) {
      setFullName(user.full_name || '');
      setProfession(user.profession || 'Web Developer');
      setPortfolioUrl(user.portfolio_url || '');
    }
  }, [user, isOpen]);

  if (!isOpen) return null;

  const handleSave = async (e) => {
    e.preventDefault();
    setStatus({ type: '', message: '' });
    setSaving(true);

    try {
      await updateProfile({
        full_name: fullName,
        profession,
        portfolio_url: portfolioUrl
      });
      setStatus({ type: 'success', message: 'Outreach identity updated successfully!' });
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err) {
      setStatus({ type: 'error', message: err.message || 'Failed to update profile.' });
    } finally {
      setSaving(false);
    }
  };

  const previewName = fullName.trim() || 'Your Name';
  const previewFirstName = previewName.split(' ')[0] || 'You';
  const previewPortfolio = portfolioUrl.trim() ? ` (${portfolioUrl.trim()})` : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg bg-[#0E0E14] border border-white/10 rounded-2xl shadow-2xl p-6 overflow-hidden">
        {/* Ambient glow */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/[0.03] rounded-full blur-2xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center">
              <User className="w-5 h-5 text-white/80" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Outreach Identity & Profile</h2>
              <p className="text-xs text-neutral-400">Configure how your name and agency appear in AI messages</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-white/[0.05] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {status.message && (
          <div
            className={`mt-4 p-3 rounded-xl text-xs flex items-center gap-2 ${
              status.type === 'success'
                ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
                : 'bg-red-500/10 border border-red-500/20 text-red-300'
            }`}
          >
            <Check className="w-4 h-4 shrink-0" />
            <span>{status.message}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1">
              Full Name
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. John Doe"
                className="w-full bg-[#15151D] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-white/30"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">
                Profession / Title
              </label>
              <div className="relative">
                <Briefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                <input
                  type="text"
                  value={profession}
                  onChange={(e) => setProfession(e.target.value)}
                  placeholder="Web Developer"
                  className="w-full bg-[#15151D] border border-white/10 rounded-xl pl-10 pr-3 py-2.5 text-sm text-white focus:outline-none focus:border-white/30"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">
                Website / Portfolio
              </label>
              <div className="relative">
                <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                <input
                  type="text"
                  value={portfolioUrl}
                  onChange={(e) => setPortfolioUrl(e.target.value)}
                  placeholder="myportfolio.com"
                  className="w-full bg-[#15151D] border border-white/10 rounded-xl pl-10 pr-3 py-2.5 text-sm text-white focus:outline-none focus:border-white/30"
                />
              </div>
            </div>
          </div>

          {/* Live Pitch Preview */}
          <div className="mt-5 p-3.5 bg-neutral-900/90 border border-white/[0.06] rounded-xl">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-neutral-400 mb-2 uppercase tracking-wider">
              <MessageSquare className="w-3.5 h-3.5 text-white/70" />
              <span>Live Pitch Preview (Albanian & English)</span>
            </div>
            <p className="text-xs text-neutral-300 italic font-mono leading-relaxed bg-[#0A0A0F] p-3 rounded-lg border border-white/[0.04]">
              "Pershendetje, une jam <span className="text-emerald-400 font-semibold not-italic">{previewName}</span>...<br />
              Jam <span className="text-emerald-400 font-semibold not-italic">{profession}</span>, pra me profesion krijoj website per biznese te ndryshme...<br />
              ...Faleminderit, <span className="text-emerald-400 font-semibold not-italic">{previewFirstName}</span>"
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/[0.08]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-neutral-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 bg-white text-black font-semibold text-xs rounded-xl hover:bg-neutral-200 transition-all disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Identity'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfileModal;
