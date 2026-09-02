import ComingSoon from '../components/ComingSoon';

const Templates = () => {
  return (
    <ComingSoon
      badge="IN ACTIVE DEVELOPMENT"
      eta="COMING SOON"
      icon={
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      }
      title="Dynamic Pitch Template Vault"
      subtitle="High-converting cold outreach angles crafted specifically for web developers. Inject dynamic lead tags, switch tone styles, and generate native multi-language variations."
      features={[
        {
          icon: '🏷️',
          title: 'Smart Variable Tags',
          description: 'Seamlessly inject dynamic data points like {{business_name}}, {{owner_name}}, {{rating}}, and {{location}} into any template.'
        },
        {
          icon: '🌐',
          title: 'Multi-Language Angle Library',
          description: 'Battle-tested pitch templates in native German, Albanian, and English — strictly adhering to casual, non-robotic human messaging.'
        },
        {
          icon: '📱',
          title: 'WhatsApp & Email Dual Formats',
          description: 'Ready-to-send copy formatted specifically for fast mobile reading with zero corporate jargon and high reply rates.'
        },
        {
          icon: '✨',
          title: '1-Click AI Angle Polisher',
          description: 'Adapt any template instantly to specific local niches (e.g., auto dealerships, plumbers, dentists, beauty salons) using Gemini 2.5 Flash.'
        }
      ]}
    />
  );
};

export default Templates;
