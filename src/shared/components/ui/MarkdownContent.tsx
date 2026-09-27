import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import './MarkdownContent.css';

interface MarkdownContentProps {
  text: string;
}

/** Rend du markdown (titres, listes, **gras**, *italique*, code, tableaux,
 *  liens, citations `[1]`) en HTML safe. Utilisé pour les réponses brutes
 *  Mistral / Perplexity du brand monitoring et le rendu de la fiche de
 *  cadrage de l'onboarding, sans passer par TipTap (lecture seule).
 *
 *  Sécurité : react-markdown ne rend pas le raw HTML par défaut, donc
 *  même un contenu malveillant inséré par un LLM ne peut pas injecter
 *  de script. Les liens sont rendus avec target="_blank" + rel safe. */
export function MarkdownContent({ text }: MarkdownContentProps) {
  return (
    <div className="markdown-content">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ ...props }) => (
            <a {...props} target="_blank" rel="noopener noreferrer" />
          ),
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
