import { useReducer, useEffect, useCallback } from 'react';
import { apiClient }     from '../../../shared/lib/apiClient';
import { useToast }     from '../../../shared/lib/useToast';
import type { Member }   from '../types';
import type { UserRole } from '../../../shared/types';

interface State {
  members:  Member[];
  loading:  boolean;
  error:    string | null;
  mutating: string | null;
}

type Action =
  | { type: 'LOADED';    members: Member[] }
  | { type: 'ERROR';     message: string   }
  | { type: 'MUTATING';  id: string | null }
  | { type: 'ADD';       member: Member    }
  | { type: 'UPDATE';    id: string; patch: Partial<Member> }
  | { type: 'REMOVE';    id: string        };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'LOADED':  return { ...state, loading: false, members: action.members };
    case 'ERROR':   return { ...state, loading: false, error: action.message };
    case 'MUTATING': return { ...state, mutating: action.id };
    case 'ADD':     return { ...state, members: [action.member, ...state.members], mutating: null };
    case 'UPDATE':  return {
      ...state, mutating: null,
      members: state.members.map(m => m.id === action.id ? { ...m, ...action.patch } : m),
    };
    case 'REMOVE':  return {
      ...state, mutating: null,
      members: state.members.map(m => m.id === action.id ? { ...m, status: 'disabled' as const } : m),
    };
  }
}

// Adapte le format API → format frontend. Utilise les vrais first_name /
// last_name retournés par /members (snake_case). Fallback sur l'email parsé
// pour la rétro-compat avec les anciennes données (parts avant @ split sur
// le « . »).
function adaptMember(raw: any): Member {
  const cleanFirst = typeof raw.first_name === 'string' && raw.first_name.trim() ? raw.first_name.trim() : '';
  const cleanLast  = typeof raw.last_name  === 'string' && raw.last_name.trim()  ? raw.last_name.trim()  : '';
  const fallbackParts = String(raw.email ?? '').split('@')[0].split('.');
  return {
    id:         raw.id,
    firstName:  cleanFirst || fallbackParts[0] || '',
    lastName:   cleanLast  || fallbackParts[1] || '',
    email:      raw.email,
    role:       raw.role,
    status:     raw.status,
    joinedAt:   raw.created_at,
    invitedAt:  raw.created_at,
  };
}

export function useMembers() {
  const toast = useToast();
  const [state, dispatch] = useReducer(reducer, {
    members: [], loading: true, error: null, mutating: null,
  });

  useEffect(() => {
    apiClient.get<any[]>('/members')
      .then(data => dispatch({ type: 'LOADED', members: data.map(adaptMember) }))
      .catch(err  => dispatch({ type: 'ERROR',  message: err.message }));
  }, []);

  const invite = useCallback(async ({ email, role }: { email: string; role: UserRole }) => {
    dispatch({ type: 'MUTATING', id: 'new' });
    try {
      await apiClient.post('/members/invite', { email, role });
      // Ajoute un membre "invited" optimiste
      const optimistic: Member = {
        id:        `pending-${Date.now()}`,
        firstName: email.split('@')[0].split('.')[0] ?? '',
        lastName:  email.split('@')[0].split('.')[1] ?? '',
        email,
        role,
        status:    'invited',
        invitedAt: new Date().toISOString(),
      };
      dispatch({ type: "ADD", member: optimistic }); toast.success("Invitation envoyée.");
    } catch (err) {
      dispatch({ type: 'MUTATING', id: null });
      throw err;
    }
  }, []);

  const changeRole = useCallback(async (id: string, role: UserRole) => {
    dispatch({ type: 'MUTATING', id });
    try {
      await apiClient.patch(`/members/${id}/role`, { role });
      dispatch({ type: "UPDATE", id, patch: { role } }); toast.success("Rôle mis à jour.");
    } catch (err) {
      dispatch({ type: 'MUTATING', id: null });
      throw err;
    }
  }, []);

  const disable = useCallback(async (id: string) => {
    dispatch({ type: 'MUTATING', id });
    try {
      await apiClient.delete(`/members/${id}`);
      dispatch({ type: "REMOVE", id }); toast.success("Membre désactivé.");
    } catch (err) {
      dispatch({ type: 'MUTATING', id: null });
      throw err;
    }
  }, []);

  const reactivate = useCallback(async (id: string) => {
    dispatch({ type: 'MUTATING', id });
    try {
      await apiClient.post(`/members/${id}/reactivate`, {});
      dispatch({ type: 'UPDATE', id, patch: { status: 'active' } });
      toast.success('Membre réactivé.');
    } catch (err) {
      dispatch({ type: 'MUTATING', id: null });
      throw err;
    }
  }, []);

  const resend = useCallback(async (id: string) => {
    dispatch({ type: 'MUTATING', id });
    // En production : appel API pour renvoyer l'email
    await new Promise(r => setTimeout(r, 300));
    dispatch({ type: 'UPDATE', id, patch: { invitedAt: new Date().toISOString() } });
  }, []);

  return { ...state, invite, changeRole, disable, reactivate, resend };
}
