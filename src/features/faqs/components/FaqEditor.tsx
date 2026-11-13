import React, { useEffect, useState, useMemo } from 'react';
import { useLocation }  from 'react-router-dom';
import '../faqs.css';
import { useFaq }       from '../hooks/useFaq';
import { Button }       from '../../../shared/components/ui/Button';
import { Input }        from '../../../shared/components/ui/Input';
import { Skeleton }     from '../../../shared/components/ui/Skeleton';
import { TagsInput }    from '../../articles/components/TagsInput';
import { FaqHelpfulButtons } from './FaqHelpfulButtons';
import { FaqHistoryPanel }   from './FaqHistoryPanel';
import { formatRelative }    from '../../../shared/lib/formatDate';
import { apiClient, ApiError } from '../../../shared/lib/apiClient';
import { useToast }     from '../../../shared/lib/useToast';
import { cn }           from '../../../shared/lib/cn';
import type { FaqVisibility } from '../types';
import { ArrowLeft } from 'lucide-react';
import { Alert } from '../../../shared/components/ui/Alert';

interface Category {
  id:       string;
  name:     string;
  children: Category[];
}

function flattenCategories(cats: Category[], depth = 0): { id: string; name: string; depth: number }[] {
  return cats.flatMap(c => [
    { id: c.id, name: c.name, depth },
    ...flattenCategories(c.children, depth + 1),
  ]);
}

interface FaqEditorProps {
  /** undefined = mode création, sinon mode édition */
  faqId?:        string;
  /** Pré-remplir la question (utile pour le suggesteur depuis Analytics — P1) */
  initialQuestion?: string;
  onSaved:  (id: string) => void;
  onCancel: () => void;
}

const QUESTION_MAX = 200;
const ANSWER_MAX   = 2000;
const ANSWER_SOFT  = 500;

export function FaqEditor({ faqId, initialQuestion, onSaved, onCancel }: FaqEditorProps) {
  const { faq, loading, saving, create, update, setTags, markReviewed } = useFaq(faqId);
  const toast = useToast();
  const location = useLocation();

  // Pré-remplir la question depuis le query param ?question=… (suggesteur Analytics)
  const seededQuestion = useMemo(() => {
    if (initialQuestion) return initialQuestion;
    if (faqId) return '';   // mode édition — la valeur vient de l'API
    const fromUrl = new URLSearchParams(location.search).get('question');
    return fromUrl ?? '';
  }, [initialQuestion, faqId, location.search]);

  const [question,         setQuestion]         = useState(seededQuestion);
  const [answer,           setAnswer]           = useState('');
  const [categoryId,       setCategoryId]       = useState<string>('');
  const [linkedArticleId,  setLinkedArticleId]  = useState<string>('');
  const [visibility,       setVisibility]       = useState<FaqVisibility>('internal');
  const [tags,             setLocalTags]        = useState<string[]>([]);
  const [categories,       setCategories]       = useState<Category[]>([]);

  // Hydrate les champs quand la FAQ est chargée (mode édition)
  useEffect(() => {
    if (!faq) return;
    setQuestion(faq.question);
    setAnswer(faq.answer);
    setCategoryId(faq.category_id ?? '');
    setLinkedArticleId(faq.linked_article_id ?? '');
    setVisibility(faq.visibility);
    setLocalTags(faq.tags);
  }, [faq]);

  // Charge les catégories
  useEffect(() => {
    apiClient.get<Category[]>('/categories')
      .then(setCategories)
      .catch(err => toast.error(err instanceof ApiError ? err.message : 'Impossible de charger les catégories.'));
  }, [toast]);

  const flatCats = useMemo(() => flattenCategories(categories), [categories]);

  const isValid = question.trim().length > 0 && answer.trim().length > 0;
  const canPublish = isValid;
  const answerCharCount = answer.length;
  const answerOverSoft  = answerCharCount > ANSWER_SOFT;

  const buildPayload = (status: 'draft' | 'published') => ({
    question:        question.trim(),
    answer:          answer.trim(),
    status,
    visibility,
    categoryId:      categoryId       || null,
    linkedArticleId: linkedArticleId  || null,
  });

  const handleSave = async (status: 'draft' | 'published') => {
    if (!isValid) {
      toast.error('Question et réponse sont requises.');
      return;
    }
    if (faqId) {
      const updated = await update(faqId, buildPayload(status));
      if (updated) {
        await setTags(faqId, tags);
        onSaved(faqId);
      }
    } else {
      const created = await create({ ...buildPayload(status), tags });
      if (created) {
        onSaved(created.id);
      }
    }
  };

  if (faqId && loading) {
    return (
      <div className="faq-editor">
        <Skeleton className="sk-title" />
        <Skeleton className="sk-p" />
      </div>
    );
  }

  return (
    <div className="faq-editor">
      <div className="faq-editor__topbar">
        <button type="button" className="faq-editor__back icon-label" onClick={onCancel}><ArrowLeft size={16} />Annuler</button>
        <h1 className="faq-editor__heading">{faqId ? 'Modifier la FAQ' : 'Nouvelle FAQ'}</h1>
        <div className="faq-editor__topbar-actions">
          <Button variant="ghost" size="sm" onClick={() => handleSave('draft')} loading={saving}>
            Sauvegarder en brouillon
          </Button>
          <Button variant="primary" size="sm" onClick={() => handleSave('published')} loading={saving} disabled={!canPublish}>
            {faq?.status === 'published' ? 'Mettre à jour' : 'Publier'}
          </Button>
        </div>
      </div>

      <div className="faq-editor__body">
        {faq?.is_stale && (
          <Alert tone="warning" className="faq-editor__stale-banner">
            <div>
              <strong>Cette FAQ n'a pas été révisée depuis plus de 6 mois.</strong>
              <p>Vérifiez que la réponse est toujours d'actualité, puis relisez ou mettez à jour.</p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => markReviewed(faq.id)}
              loading={saving}
            >
              C'est à jour
            </Button>
          </Alert>
        )}

        {faq && (faq.views > 0 || (faq.helpful_yes + faq.helpful_no) > 0) && (
          <div className="faq-editor__stats">
            <span className="faq-editor__stat">
              <span className="faq-editor__stat-label">Vues</span>
              <span className="faq-editor__stat-value">{faq.views}</span>
            </span>
            <span className="faq-editor__stat">
              <span className="faq-editor__stat-label">Score helpful</span>
              <FaqHelpfulButtons
                faqId={faq.id}
                helpfulYes={faq.helpful_yes}
                helpfulNo={faq.helpful_no}
                readOnly
              />
            </span>
            <span className="faq-editor__stat">
              <span className="faq-editor__stat-label">Dernière révision</span>
              <span className="faq-editor__stat-value">
                {formatRelative(faq.last_reviewed_at ?? faq.updated_at)}
              </span>
            </span>
          </div>
        )}

        <Input
          id="faq-question"
          label="Question"
          required
          maxLength={QUESTION_MAX}
          placeholder="Comment retourner un produit ?"
          value={question}
          onChange={e => setQuestion(e.target.value)}
          helperText={`${question.length} / ${QUESTION_MAX} caractères`}
        />

        <div className="field">
          <label htmlFor="faq-answer" className="field-label">
            Réponse
            <span className="field-required" aria-hidden="true"> *</span>
          </label>
          <textarea
            id="faq-answer"
            className={cn('field-input', 'faq-editor__textarea', answerOverSoft && 'faq-editor__textarea--warning')}
            rows={6}
            maxLength={ANSWER_MAX}
            placeholder="Donnez la réponse la plus directe possible. Visez 1 à 3 phrases."
            value={answer}
            onChange={e => setAnswer(e.target.value)}
          />
          <p className={cn('field-helper', answerOverSoft && 'field-helper--warning')}>
            {answerCharCount} / {ANSWER_MAX} caractères
            {answerOverSoft && ` — au-delà de ${ANSWER_SOFT} caractères, envisagez plutôt un article complet`}
          </p>
        </div>

        <div className="field">
          <label htmlFor="faq-category" className="field-label">Catégorie</label>
          <select
            id="faq-category"
            className="field-input"
            value={categoryId}
            onChange={e => setCategoryId(e.target.value)}
          >
            <option value="">— Aucune —</option>
            {flatCats.map(c => (
              <option key={c.id} value={c.id}>
                {' '.repeat(c.depth * 2)}{c.depth > 0 ? '↳ ' : ''}{c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="faq-tags" className="field-label">Tags</label>
          <TagsInput id="faq-tags" describedBy="faq-tags-helper" value={tags} onChange={setLocalTags} max={10} />
          <p id="faq-tags-helper" className="field-helper">Tapez Entrée ou virgule après chaque tag (max 10).</p>
        </div>

        {faqId && <FaqHistoryPanel faqId={faqId} />}

        <div className="field">
          <label className="field-label">Visibilité</label>
          <div className="faq-editor__visibility">
            <label className={cn('faq-editor__radio', visibility === 'internal' && 'faq-editor__radio--active')}>
              <input
                type="radio"
                name="visibility"
                value="internal"
                checked={visibility === 'internal'}
                onChange={() => setVisibility('internal')}
              />
              <span className="faq-editor__radio-title">Interne</span>
              <span className="faq-editor__radio-desc">Visible par votre équipe seulement</span>
            </label>
            <label className={cn('faq-editor__radio', visibility === 'public' && 'faq-editor__radio--active')}>
              <input
                type="radio"
                name="visibility"
                value="public"
                checked={visibility === 'public'}
                onChange={() => setVisibility('public')}
              />
              <span className="faq-editor__radio-title">
                Public
                <span className="badge badge--info faq-editor__radio-badge">Bientôt</span>
              </span>
              <span className="faq-editor__radio-desc">Exportable sur le site web (à venir)</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
