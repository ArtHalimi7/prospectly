import ComingSoon from '../components/ComingSoon';

const Campaigns = () => {
  return (
    <ComingSoon
      badge="IN ACTIVE DEVELOPMENT"
      eta="COMING SOON"
      icon={
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
        </svg>
      }
      title="Automated Outreach Campaigns"
      subtitle="Multi-channel cold outreach engine built for web developers. Queue high-intent local businesses, automate follow-up cadences, and protect inbox deliverability."
      features={[
        {
          icon: '⚡',
          title: 'Automated Multi-Step Drips',
          description: 'Schedule smart follow-up sequences with customizable day intervals (Day 1 email, Day 3 WhatsApp nudge, Day 7 mockup preview).'
        },
        {
          icon: '🛡️',
          title: 'Inbox Deliverability Guard',
          description: 'Configurable SMTP rate-limiting, sender cooldown periods, and randomized dispatch timing to keep Gmail and Workspace domains safe.'
        },
        {
          icon: '🎯',
          title: 'WhatsApp + Email Orchestration',
          description: 'Run coordinated outreach across both channels from a single unified prospect pipeline without duplicate contacts.'
        },
        {
          icon: '📊',
          title: 'Response & Meeting Tracker',
          description: 'Live status tracking across leads with automatic status updates when a business owner replies or books a consultation call.'
        }
      ]}
    />
  );
};

export default Campaigns;
