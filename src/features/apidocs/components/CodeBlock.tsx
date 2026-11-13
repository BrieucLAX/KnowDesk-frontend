import React, { useState, useCallback } from 'react';
import { cn } from '../../../shared/lib/cn';
import { Check } from 'lucide-react';

interface CodeBlockProps {
  code:       string;
  /** Variante visuelle pour différencier exemples vs réponses. */
  variant?:   'request' | 'response';
  /** Cache le bouton de copie (utile pour les snippets très courts). */
  hideCopy?:  boolean;
}

export function CodeBlock({ code, variant = 'request', hideCopy }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    if (!navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard refusé : on échoue silencieusement (rare) */
    }
  }, [code]);

  return (
    <div className="apidoc-code-block">
      <pre className={cn('apidoc-code', variant === 'response' && 'apidoc-code--response')}>
        <code>{code}</code>
      </pre>
      {!hideCopy && (
        <button
          type="button"
          className="apidoc-code-block__copy"
          onClick={handleCopy}
          aria-label={copied ? 'Code copié' : 'Copier le code'}
        >
          {copied ? <><Check size={16} />Copié</> : 'Copier'}
        </button>
      )}
    </div>
  );
}
