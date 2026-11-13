import { useEffect, useRef, useState } from 'react';
import { trackEvent } from '../../../shared/lib/trackEvent';

export interface AiSource {
  id:    string;
  type:  'article' | 'faq' | 'tree';
  title: string;
}

export type AiStatus = 'idle' | 'streaming' | 'unsure' | 'done' | 'error' | 'disabled';

export interface AiState {
  status:  AiStatus;
  sources: AiSource[];
  answer:  string;
  error?:  string;
}

const INITIAL: AiState = { status: 'idle', sources: [], answer: '' };

// 1200ms — pause typique entre deux mots pour un humain qui cherche.
// Avant : 600ms générait un appel + un event analytics dès qu'on
// soufflait entre deux mots, polluant le top "Questions sans réponse"
// avec des préfixes intermédiaires (« comment résilier », « comment
// résilier mon », etc.). Backend dédupe désormais ces préfixes mais on
// limite aussi à la source pour économiser des appels Mistral.
const DEBOUNCE_MS = 1200;
const MIN_QUERY   = 3;

/**
 * useAiAnswer — déclenche /api/v1/ai-answer en streaming SSE quand `enabled`.
 *
 * - Debounce 600ms après la dernière frappe avant l'appel.
 * - AbortController : la requête en vol est tuée si la query change.
 * - Tracker `ai_answer.shown` (event analytics) une fois la réponse complète.
 */
export function useAiAnswer(query: string, enabled: boolean): AiState {
  const [state, setState] = useState<AiState>(INITIAL);
  const abortRef    = useRef<AbortController | null>(null);
  /** Pour ne pas tracker shown plusieurs fois sur la même réponse (re-render). */
  const trackedRef  = useRef<string | null>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (!enabled || trimmed.length < MIN_QUERY) {
      abortRef.current?.abort();
      setState(INITIAL);
      trackedRef.current = null;
      return;
    }

    const controller = new AbortController();
    abortRef.current?.abort();
    abortRef.current = controller;
    trackedRef.current = null;   // nouvelle query → nouveau tracking possible

    const handle = setTimeout(() => {
      runAiStream(trimmed, controller.signal, setState);
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(handle);
      controller.abort();
    };
  }, [query, enabled]);

  // Tracker `ai_answer.shown` quand la génération se termine (done/unsure).
  // Une seule fois par query — clé = query + status pour idempotence.
  useEffect(() => {
    if (state.status !== 'done' && state.status !== 'unsure') return;
    const key = `${query}:${state.status}`;
    if (trackedRef.current === key) return;
    trackedRef.current = key;
    trackEvent('ai_answer.shown', {
      payload: {
        query:        query.toLowerCase().slice(0, 200),
        status:       state.status,
        sourcesCount: state.sources.length,
        answerLength: state.answer.length,
      },
    });
  }, [state.status, state.sources.length, state.answer.length, query]);

  return state;
}

async function runAiStream(
  query: string,
  signal: AbortSignal,
  setState: (updater: (prev: AiState) => AiState) => void,
): Promise<void> {
  setState(() => ({ status: 'streaming', sources: [], answer: '' }));

  try {
    const apiBase = import.meta.env.VITE_API_URL ?? '/api/v1';
    const resp = await fetch(`${apiBase}/ai-answer`, {
      method:      'POST',
      headers:     { 'Content-Type': 'application/json' },
      credentials: 'include',
      body:        JSON.stringify({ q: query }),
      signal,
    });

    if (!resp.ok || !resp.body) {
      throw new Error(`AI HTTP ${resp.status}`);
    }

    const reader  = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split('\n\n');
      buffer = events.pop() ?? '';

      for (const raw of events) {
        const eventMatch = raw.match(/^event:\s*(\w+)/m);
        const dataMatch  = raw.match(/^data:\s*(.+)$/m);
        if (!eventMatch || !dataMatch) continue;
        const eventName = eventMatch[1];
        let data: any = {};
        try { data = JSON.parse(dataMatch[1]); } catch { continue; }

        if (eventName === 'sources') {
          setState(s => ({ ...s, sources: data.sources ?? [] }));
        } else if (eventName === 'token') {
          setState(s => ({ ...s, answer: s.answer + (data.text ?? '') }));
        } else if (eventName === 'unsure') {
          setState(s => ({ ...s, status: 'unsure' }));
        } else if (eventName === 'disabled') {
          setState(s => ({ ...s, status: 'disabled' }));
        } else if (eventName === 'error') {
          setState(s => ({ ...s, status: 'error', error: data.message ?? 'La réponse de l\'IA n\'a pas pu être générée. Réessayez dans un instant.' }));
        } else if (eventName === 'done') {
          setState(s => ({
            ...s,
            // Conserve un éventuel statut terminal déjà posé (unsure/error/disabled)
            status: s.status === 'unsure'   ? 'unsure'
                  : s.status === 'error'    ? 'error'
                  : s.status === 'disabled' ? 'disabled'
                  : 'done',
          }));
          return;
        }
      }
    }
  } catch (err) {
    if ((err as { name?: string })?.name === 'AbortError') return;
    setState(() => ({
      status:  'error',
      sources: [],
      answer:  '',
      error:   err instanceof Error ? err.message : 'La réponse de l\'IA n\'a pas pu être générée. Réessayez dans un instant.',
    }));
  }
}
