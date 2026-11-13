import React, { useCallback, useEffect, useState } from 'react';
import { learningApi } from '../api/learningApi';
import { apiClient, ApiError } from '../../../shared/lib/apiClient';
import { Button }   from '../../../shared/components/ui/Button';
import { Skeleton } from '../../../shared/components/ui/Skeleton';
import { sanitizeArticleHtml } from '../../../shared/lib/sanitize';
import { useToast } from '../../../shared/lib/useToast';
import type { LearningModuleResource, LearningQuiz, LearningResourceType } from '../types';
import '../learning.css';
import { ArrowLeft, ArrowRight, PartyPopper } from 'lucide-react';

interface LearningPlayerProps {
  moduleId: string;
  onBack: () => void;
}

interface ResourceContent {
  type:    LearningResourceType;
  id:      string;
  title:   string;
  /** HTML pour articles, plain text pour FAQs (sanitized côté affichage). */
  body:    string;
}

/**
 * Player linéaire d'un module : on parcourt les ressources une par
 * une, puis on passe au quiz si présent, puis on affiche le résultat.
 *
 * State machine simple :
 *  - idle  : pas démarré
 *  - res:N : on lit la ressource N (0-indexed)
 *  - quiz  : on répond au quiz
 *  - done  : résultat affiché (passed ou retry)
 */
type PlayerStep = { kind: 'res'; idx: number } | { kind: 'quiz' } | { kind: 'done'; score: number | null; passed: boolean };

export function LearningPlayer({ moduleId, onBack }: LearningPlayerProps) {
  const toast = useToast();
  const [resources, setResources] = useState<ResourceContent[]>([]);
  const [quiz,      setQuiz]      = useState<LearningQuiz | null>(null);
  const [step,      setStep]      = useState<PlayerStep>({ kind: 'res', idx: 0 });
  const [loading,   setLoading]   = useState(true);
  const [moduleName,setModuleName]= useState('Module');
  const [answers,   setAnswers]   = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Charge ressources + quiz + démarre le tracking (in_progress)
  useEffect(() => {
    let alive = true;
    setLoading(true);

    const fetchResource = async (r: LearningModuleResource): Promise<ResourceContent | null> => {
      try {
        if (r.resource_type === 'article') {
          const a = await apiClient.get<any>(`/articles/${r.resource_id}`);
          const html = typeof a.content === 'object' && a.content !== null
            ? (a.content as Record<string, unknown>).html as string ?? ''
            : (a.content as unknown as string ?? '');
          return { type: 'article', id: a.id, title: a.title, body: html };
        }
        if (r.resource_type === 'faq') {
          const f = await apiClient.get<any>(`/faqs/${r.resource_id}`);
          return {
            type: 'faq', id: f.id, title: f.question,
            // FAQ : on combine question + réponse en HTML simple (la réponse peut déjà être du HTML)
            body: `<h2>${escapeHtml(f.question)}</h2>${f.answer ?? ''}`,
          };
        }
        if (r.resource_type === 'tree') {
          const t = await apiClient.get<any>(`/trees/${r.resource_id}`);
          const nodes = (t.nodes ?? []).map((n: any) => `<p><strong>${escapeHtml(n.type)} :</strong> ${n.content}</p>`).join('');
          return { type: 'tree', id: t.id, title: t.title, body: `<p>${escapeHtml(t.description ?? '')}</p>${nodes}` };
        }
      } catch { /* noop — ressource supprimée ou inaccessible, on saute */ }
      return null;
    };

    (async () => {
      try {
        const [resList, quizData] = await Promise.all([
          learningApi.listResources(moduleId),
          learningApi.getQuiz(moduleId),
        ]);
        if (!alive) return;

        const contents = (await Promise.all(resList
          .sort((a, b) => a.position - b.position)
          .map(fetchResource))).filter(Boolean) as ResourceContent[];
        if (!alive) return;

        setResources(contents);
        setQuiz(quizData);
        if (quizData) setAnswers(new Array(quizData.questions.length).fill(-1));

        // Tracking : marque le module in_progress
        learningApi.startModule(moduleId).catch(() => { /* noop, pas critique */ });

        // Nom du module : récupéré indirectement (pas d'endpoint dédié,
        // on l'affiche depuis le store /learning/my qui contient les modules)
        // Pour V1 simple, on affiche "Module" si pas dispo.
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : 'Erreur de chargement.');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [moduleId, toast]);

  const goToQuizOrDone = useCallback(() => {
    if (quiz && quiz.questions.length > 0) setStep({ kind: 'quiz' });
    else handleComplete();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quiz]);

  const handleNext = useCallback(() => {
    if (step.kind !== 'res') return;
    if (step.idx + 1 < resources.length) setStep({ kind: 'res', idx: step.idx + 1 });
    else goToQuizOrDone();
  }, [step, resources.length, goToQuizOrDone]);

  const handlePrev = useCallback(() => {
    if (step.kind === 'res' && step.idx > 0) setStep({ kind: 'res', idx: step.idx - 1 });
    if (step.kind === 'quiz' && resources.length > 0) setStep({ kind: 'res', idx: resources.length - 1 });
  }, [step, resources.length]);

  const handleComplete = useCallback(async () => {
    setSubmitting(true);
    try {
      const payload = quiz ? answers : undefined;
      const result: any = await learningApi.completeModule(moduleId, payload);
      const score = result?.score ?? null;
      const passed = result?.status === 'completed';
      setStep({ kind: 'done', score, passed });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Erreur.');
    } finally {
      setSubmitting(false);
    }
  }, [moduleId, quiz, answers, toast]);

  if (loading) {
    return (
      <div className="learning-player">
        <div className="learning-player__loading">
          <Skeleton className="sk-title" />
          <Skeleton className="sk-card" />
        </div>
      </div>
    );
  }

  return (
    <div className="learning-player">
      <header className="learning-player__topbar">
        <button type="button" className="learning-player__back icon-label" onClick={onBack}><ArrowLeft size={16} />Quitter</button>
        <div className="learning-player__progress">
          {step.kind === 'res' && resources.length > 0 && (
            <span>Ressource {step.idx + 1} / {resources.length}{quiz ? ' · Quiz à venir' : ''}</span>
          )}
          {step.kind === 'quiz' && <span>Quiz</span>}
          {step.kind === 'done' && <span>Terminé</span>}
        </div>
        <div />
      </header>

      <main className="learning-player__body">
        {step.kind === 'res' && resources[step.idx] && (
          <article className="learning-player__resource">
            <span className="learning-player__type">
              {resources[step.idx].type === 'article' ? 'Article' :
               resources[step.idx].type === 'faq'     ? 'FAQ' : 'Processus'}
            </span>
            <h1 className="learning-player__title">{resources[step.idx].title}</h1>
            <div
              className="article-content"
              dangerouslySetInnerHTML={{ __html: sanitizeArticleHtml(resources[step.idx].body) }}
            />
          </article>
        )}

        {step.kind === 'res' && resources.length === 0 && (
          <div className="learning-player__empty">
            <p>Ce module n'a pas encore de ressources.</p>
            {quiz && <Button variant="primary" onClick={() => setStep({ kind: 'quiz' })}>Passer au quiz</Button>}
          </div>
        )}

        {step.kind === 'quiz' && quiz && (
          <div className="learning-player__quiz">
            <h1 className="learning-player__title">Quiz</h1>
            <p className="learning-player__quiz-meta">
              {quiz.questions.length} questions · Réussite à {quiz.passing_score}%
            </p>
            <ol className="learning-player__quiz-list">
              {quiz.questions.map((q, qi) => (
                <li key={qi} className="learning-player__quiz-item">
                  <strong>{qi + 1}. {q.q}</strong>
                  <ul className="learning-player__quiz-choices">
                    {q.choices.map((c, ci) => (
                      <li key={ci}>
                        <label>
                          <input
                            type="radio"
                            name={`q-${qi}`}
                            value={ci}
                            checked={answers[qi] === ci}
                            onChange={() => setAnswers(prev => prev.map((a, idx) => idx === qi ? ci : a))}
                          />
                          <span>{c}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          </div>
        )}

        {step.kind === 'done' && (
          <div className={`learning-player__done ${step.passed ? 'learning-player__done--ok' : 'learning-player__done--ko'}`}>
            {step.passed ? (
              <>
                <h1 className="icon-label"><PartyPopper size={24} className="learning-player__done-icon" />Module complété !</h1>
                {step.score !== null && (
                  <p>Score : <strong>{step.score}%</strong></p>
                )}
              </>
            ) : (
              <>
                <h1>Pas encore validé</h1>
                {step.score !== null && (
                  <p>
                    Score : <strong>{step.score}%</strong> — seuil de réussite {quiz?.passing_score ?? 80}%
                  </p>
                )}
                <p>Vous pouvez retenter le module quand vous voulez.</p>
              </>
            )}
            <Button variant="primary" onClick={onBack}>Retour à mes formations</Button>
          </div>
        )}
      </main>

      {step.kind !== 'done' && (
        <footer className="learning-player__footer">
          {step.kind === 'res' && (
            <>
              <Button variant="ghost" disabled={step.idx === 0} onClick={handlePrev} leftIcon={<ArrowLeft size={20} />}>Précédent</Button>
              <Button variant="primary" onClick={handleNext}>
                {step.idx + 1 < resources.length
                  ? <>Suivant<ArrowRight size={20} /></>
                  : (quiz ? <>Passer au quiz<ArrowRight size={20} /></> : 'Terminer')}
              </Button>
            </>
          )}
          {step.kind === 'quiz' && (
            <>
              <Button variant="ghost" disabled={resources.length === 0} onClick={handlePrev} leftIcon={<ArrowLeft size={20} />}>Précédent</Button>
              <Button
                variant="primary"
                onClick={handleComplete}
                loading={submitting}
                disabled={answers.some(a => a < 0)}
              >
                Valider mes réponses
              </Button>
            </>
          )}
        </footer>
      )}
    </div>
  );
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
