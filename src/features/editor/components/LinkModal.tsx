import React, { useState, useEffect, useCallback } from 'react';
import { Button }     from '../../../shared/components/ui/Button';
import '../editor.css';
import { Input }      from '../../../shared/components/ui/Input';
import { Modal }      from '../../../shared/components/ui/Modal';
import { apiClient }  from '../../../shared/lib/apiClient';
import { Check, FileText, Link } from 'lucide-react';

interface LinkModalProps {
  onInsert: (url: string, text: string, isInternal: boolean, articleId?: string) => void;
  onClose:  () => void;
  selectedText?: string;
}

interface ArticleResult {
  id:    string;
  title: string;
}

export function LinkModal({ onInsert, onClose, selectedText }: LinkModalProps) {
  const [tab,         setTab]         = useState<'external' | 'internal'>('external');
  const [url,         setUrl]         = useState('https://');
  const [text,        setText]        = useState(selectedText ?? '');
  const [query,       setQuery]       = useState('');
  const [results,     setResults]     = useState<ArticleResult[]>([]);
  const [searching,   setSearching]   = useState(false);
  const [selectedArt, setSelectedArt] = useState<ArticleResult | null>(null);
  const [urlError,    setUrlError]    = useState('');

  // Recherche d'articles internes
  useEffect(() => {
    if (tab !== 'internal' || query.trim().length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const data = await apiClient.get<{ data: ArticleResult[] }>(
          `/articles?status=published&q=${encodeURIComponent(query)}`
        );
        setResults((data.data ?? []).slice(0, 8));
      } catch {
        setResults([]);
      }
      setSearching(false);
    }, 300);
    return () => clearTimeout(t);
  }, [query, tab]);

  const handleInsert = useCallback(() => {
    if (tab === 'external') {
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        setUrlError('L\'URL doit commencer par http:// ou https://');
        return;
      }
      onInsert(url, text || url, false);
    } else {
      if (!selectedArt) return;
      onInsert(`knowdesk://article/${selectedArt.id}`, text || selectedArt.title, true, selectedArt.id);
    }
  }, [tab, url, text, selectedArt, onInsert]);

  return (
    <Modal
      title="Insérer un lien"
      onClose={onClose}
      size="lg"
      asForm
      onSubmit={handleInsert}
      footer={
        <>
          <Button type="button" variant="ghost" size="md" onClick={onClose}>Annuler</Button>
          <Button
            type="submit"
            variant="primary" size="md"
            disabled={tab === 'external' ? !url || url === 'https://' : !selectedArt}
          >
            Insérer
          </Button>
        </>
      }
    >
      {/* Tabs */}
      <div className="link-modal__tabs">
        <button
          type="button"
          className={`link-modal__tab ${tab === 'external' ? 'link-modal__tab--active' : ''}`}
          onClick={() => setTab('external')}
        >
          <Link size={16} />Lien externe
        </button>
        <button
          type="button"
          className={`link-modal__tab ${tab === 'internal' ? 'link-modal__tab--active' : ''}`}
          onClick={() => setTab('internal')}
        >
          <FileText size={16} />Article KnowDesk
        </button>
      </div>

      {tab === 'external' ? (
        <>
          <Input
            id="link-url"
            type="url"
            label="URL"
            placeholder="https://exemple.fr"
            value={url}
            onChange={e => { setUrl(e.target.value); setUrlError(''); }}
            error={urlError}
            autoFocus
          />
          <Input
            id="link-text"
            type="text"
            label="Texte affiché (optionnel)"
            placeholder={url}
            value={text}
            onChange={e => setText(e.target.value)}
          />
        </>
      ) : (
        <>
          <Input
            id="link-search"
            type="search"
            label="Rechercher un article"
            placeholder="Titre de l'article…"
            value={query}
            onChange={e => { setQuery(e.target.value); setSelectedArt(null); }}
            autoFocus
          />
          {searching && <p className="link-modal__searching">Recherche…</p>}
          {results.length > 0 && (
            <ul className="link-modal__results">
              {results.map(a => (
                <li key={a.id}>
                  <button
                    type="button"
                    className={`link-modal__result ${selectedArt?.id === a.id ? 'link-modal__result--selected' : ''}`}
                    onClick={() => { setSelectedArt(a); setText(text || a.title); }}
                  >
                    {a.title}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {selectedArt && (
            <p className="link-modal__selected icon-label"><Check size={16} />Sélectionné : <strong>{selectedArt.title}</strong></p>
          )}
          <Input
            id="link-text-internal"
            type="text"
            label="Texte affiché (optionnel)"
            placeholder={selectedArt?.title ?? 'Texte du lien'}
            value={text}
            onChange={e => setText(e.target.value)}
          />
        </>
      )}
    </Modal>
  );
}
