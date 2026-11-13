import React, { useState, useMemo, useCallback } from 'react';
import { MemberRow }     from './MemberRow';
import '../members.css';
import { InviteModal }   from './InviteModal';
import { EmptyState }    from '../../../shared/components/ui/EmptyState';
import { Skeleton }      from '../../../shared/components/ui/Skeleton';
import { Button }        from '../../../shared/components/ui/Button';
import { PageHeader }    from '../../../shared/components/layout/PageHeader';
import { PageToolbar, PageToolbarSearch } from '../../../shared/components/layout/PageToolbar';
import { useMembers }    from '../hooks/useMembers';
import { useAuthStore }  from '../../../store/authStore';
import type { Member }   from '../types';
import type { UserRole } from '../../../shared/types';
import { ArrowRight, Plus } from 'lucide-react';
import { Alert } from '../../../shared/components/ui/Alert';

type FilterTab = 'all' | 'active' | 'pending' | 'disabled';

const PLAN_LIMIT = 3; // free plan limit

/**
 * MembersPage — team management for admins.
 *
 * Features:
 *   - Member list with status filters
 *   - Role change inline (select)
 *   - Disable / resend invite actions
 *   - Invite modal with email + role picker
 *   - Plan limit warning for Free plan
 */
export function MembersPage() {
  const session      = useAuthStore(s => s.session);
  const plan         = session?.organization.plan ?? 'free';
  const currentUserId = session?.user.id ?? '';

  const { members, loading, error, mutating, invite, changeRole, disable, reactivate, resend } = useMembers();

  const [filter,      setFilter]      = useState<FilterTab>('all');
  const [showInvite,  setShowInvite]  = useState(false);
  const [isInviting,  setIsInviting]  = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const activeCount  = members.filter(m => m.status === 'active').length;
  const atLimit      = plan === 'free' && activeCount >= PLAN_LIMIT;

  const filteredMembers = useMemo(() => {
    let list = members;

    // Tab filter
    if (filter === 'active')   list = list.filter(m => m.status === 'active');
    if (filter === 'pending')  list = list.filter(m => m.status === 'invited' || m.status === 'expired');
    if (filter === 'disabled') list = list.filter(m => m.status === 'disabled');

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(m =>
        m.firstName.toLowerCase().includes(q) ||
        m.lastName.toLowerCase().includes(q)  ||
        m.email.toLowerCase().includes(q)
      );
    }

    return list;
  }, [members, filter, searchQuery]);

  const handleInvite = useCallback(async (form: Parameters<typeof invite>[0]) => {
    setIsInviting(true);
    try {
      await invite(form);
    } finally {
      setIsInviting(false);
    }
  }, [invite]);

  return (
    <div className="members-page">

      <PageHeader
        title="Équipe"
        subtitle={(
          <>
            {activeCount} membre{activeCount !== 1 ? 's' : ''} actif{activeCount !== 1 ? 's' : ''}
            {plan === 'free' && ` · ${activeCount} / ${PLAN_LIMIT} (plan gratuit)`}
          </>
        )}
        actions={(
          <Button
            variant="primary"
            size="md"
            onClick={() => setShowInvite(true)}
            disabled={atLimit}
            title={atLimit ? `Vous avez atteint la limite de ${PLAN_LIMIT} membres. Passez au plan Pro pour en inviter d'autres.` : undefined}
          >
            <Plus size={20} />Inviter un membre
          </Button>
        )}
      />

      {/* Plan limit banner */}
      {atLimit && (
        <div className="members-page__limit-banner" role="alert">
          <span>
            Vous avez atteint la limite de <strong>{PLAN_LIMIT} membres</strong> du plan gratuit.
          </span>
          <a href="/settings/billing" className="members-page__upgrade-link icon-label">
            Passer au plan Pro<ArrowRight size={16} />
          </a>
        </div>
      )}

      {/* Error */}
      {error && (
        <Alert tone="danger" className="members-page__error">
          L'équipe n'a pas pu être chargée. Rechargez la page. {error}
        </Alert>
      )}

      {/* Toolbar: search + filter tabs */}
      {!loading && members.length > 0 && (
        <PageToolbar
          left={(
            <div className="members-page__tabs" role="tablist" aria-label="Filtrer les membres">
              {(['all', 'active', 'pending', 'disabled'] as FilterTab[]).map(tab => (
                <button
                  key={tab}
                  role="tab"
                  aria-selected={filter === tab}
                  className={`members-tab ${filter === tab ? 'members-tab--active' : ''}`}
                  onClick={() => setFilter(tab)}
                >
                  {tab === 'all'      ? 'Tous'
                  : tab === 'active'  ? 'Actifs'
                  : tab === 'pending' ? 'En attente'
                  : 'Désactivés'}
                </button>
              ))}
            </div>
          )}
          right={(
            <PageToolbarSearch
              id="members-search"
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Rechercher un membre…"
              ariaLabel="Rechercher dans l'équipe"
            />
          )}
        />
      )}

      {/* Loading skeletons */}
      {loading && (
        <div className="members-table-wrap" aria-busy="true" aria-label="Chargement des membres">
          <table className="members-table">
            <thead><tr>
              <th className="members-th">Membre</th>
              <th className="members-th">Rôle</th>
              <th className="members-th">Statut</th>
              <th className="members-th">Rejoint</th>
              <th className="members-th"></th>
            </tr></thead>
            <tbody>
              {[1,2,3,4].map(i => (
                <tr key={i} className="member-row">
                  <td className="member-row__cell member-row__identity">
                    <Skeleton className="member-sk-avatar" />
                    <div className="member-row__name-skeleton">
                      <Skeleton className="member-sk-name" />
                      <Skeleton className="member-sk-email" />
                    </div>
                  </td>
                  <td><Skeleton className="member-sk-role" /></td>
                  <td><Skeleton className="member-sk-status" /></td>
                  <td><Skeleton className="member-sk-date" /></td>
                  <td></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty state */}
      {!loading && filteredMembers.length === 0 && (
        <EmptyState
          title={searchQuery ? 'Aucun résultat' : 'Aucun membre pour ce filtre'}
          description={searchQuery
            ? `Aucun membre ne correspond à « ${searchQuery} ».`
            : 'Invitez des collègues pour qu\'ils rejoignent votre organisation.'}
          ctaLabel={!searchQuery ? 'Inviter un membre' : undefined}
          ctaHref={undefined}
        />
      )}

      {/* Member table */}
      {!loading && filteredMembers.length > 0 && (
        <div className="members-table-wrap">
          <table className="members-table" aria-label="Liste des membres">
            <thead>
              <tr>
                <th className="members-th" scope="col">Membre</th>
                <th className="members-th" scope="col">Rôle</th>
                <th className="members-th" scope="col">Statut</th>
                <th className="members-th" scope="col">Rejoint</th>
                <th className="members-th" scope="col"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {filteredMembers.map(member => (
                <MemberRow
                  key={member.id}
                  member={member}
                  isMutating={mutating === member.id}
                  currentUserId={currentUserId}
                  onChangeRole={changeRole}
                  onDisable={disable}
                  onReactivate={reactivate}
                  onResend={resend}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Invite modal */}
      {showInvite && (
        <InviteModal
          onInvite={handleInvite}
          onClose={() => setShowInvite(false)}
          isLoading={isInviting}
        />
      )}

    </div>
  );
}
