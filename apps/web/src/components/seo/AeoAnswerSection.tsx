import React from 'react';
import { HelpCircle } from 'lucide-react';
import { JsonLd } from './JsonLd';
import { generateFaqSchema, FaqItem } from '@/lib/seo';

interface AeoAnswerSectionProps {
  title?: string;
  subtitle?: string;
  items: FaqItem[];
  className?: string;
}

/**
 * AEO (Answer Engine Optimization) & GEO structured Q&A block
 * Embeds clear question-and-answer semantic text with FAQPage JSON-LD schema
 */
export const AeoAnswerSection: React.FC<AeoAnswerSectionProps> = ({
  title = 'Frequently Asked Questions & Community Insights',
  subtitle = 'Quick answers about this topic, group, or local category on Tolee',
  items,
  className = '',
}) => {
  if (!items || items.length === 0) return null;

  const schema = generateFaqSchema(items);

  return (
    <section className={`my-8 p-6 rounded-3xl bg-[#080d18] border border-[#16243a] ${className}`}>
      <JsonLd data={schema} />
      <div className="flex items-center gap-2.5 mb-2">
        <div className="w-8 h-8 rounded-xl bg-emerald-950/80 border border-emerald-700/50 flex items-center justify-center text-emerald-400">
          <HelpCircle className="w-4 h-4" />
        </div>
        <div>
          <h2 className="text-base font-bold text-white tracking-tight">{title}</h2>
          {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
        </div>
      </div>

      <div className="space-y-4 mt-5">
        {items.map((item, idx) => (
          <article
            key={idx}
            className="p-4 rounded-2xl bg-[#0b1424] border border-[#1a2d48] text-left"
          >
            <h3 className="text-sm font-semibold text-emerald-300 mb-1.5 flex items-start gap-2">
              <span className="text-emerald-500 font-bold">Q:</span>
              <span>{item.question}</span>
            </h3>
            <p className="text-xs text-gray-300 leading-relaxed pl-5">
              {item.answer}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
};
