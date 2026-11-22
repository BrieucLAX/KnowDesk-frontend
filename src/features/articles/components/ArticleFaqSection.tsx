import React, { useState } from 'react';
import type { ArticleFaq } from '../types';
import { InternalCard } from '../../../shared/components/ui/Origin';

interface ArticleFaqSectionProps {
  faqs: ArticleFaq[];
}

/**
 * Expandable FAQ section shown at the bottom of an article.
 * Each FAQ can be expanded individually (accordion pattern).
 */
export function ArticleFaqSection({ faqs }: ArticleFaqSectionProps) {
  const [openId, setOpenId] = useState<string | null>(null);

  if (!faqs || faqs.length === 0) return null;

  return (
    <section className="faq-section" aria-label="Questions fréquentes">
      <h2 className="faq-section__title">Questions fréquentes</h2>
      <dl className="faq-section__list">
        {faqs.map(faq => {
          const isOpen = openId === faq.id;
          const answerId = `faq-answer-${faq.id}`;

          return (
            <div key={faq.id} className={`faq-item ${isOpen ? 'faq-item--open' : ''}`}>
              <dt>
                <button
                  className="faq-item__question"
                  aria-expanded={isOpen}
                  aria-controls={answerId}
                  onClick={() => setOpenId(isOpen ? null : faq.id)}
                >
                  <span>{faq.question}</span>
                  <span className="faq-item__chevron" aria-hidden="true">{isOpen ? '−' : '+'}</span>
                </button>
              </dt>
              <dd
                id={answerId}
                className="faq-item__answer"
                hidden={!isOpen}
                aria-hidden={!isOpen}
              >
                <p>{faq.answer}</p>

                {faq.followUpQuestions && faq.followUpQuestions.length > 0 && (
                  <InternalCard className="faq-item__followups">
                    <p className="faq-item__followups-label">Questions à poser au client :</p>
                    <ul>
                      {faq.followUpQuestions.map((q, i) => (
                        <li key={i} className="faq-item__followup">{q}</li>
                      ))}
                    </ul>
                  </InternalCard>
                )}
              </dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}
