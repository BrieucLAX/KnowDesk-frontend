import React, { useState, useCallback } from 'react';
import { cn }              from '../../../shared/lib/cn';
import { formatRelative }  from '../../../shared/lib/formatDate';
import { computeInitials } from '../../../shared/lib/initials';
import type { Member }     from '../types';
import type { UserRole }   from '../../../shared/types';
import { Badge, type BadgeTone } from '../../../shared/components/ui/StatusBadge';

interface MemberRowProps {
  member:     Member;
  isMutating: boolean;
  currentUserId: string;
  onChangeRole:  (id: string, role: UserRole) => void;
  onDisable:     (id: string) => void;
  onReactivate:  (id: string) => void;
  onResend:      (id: string) => void;
}

const STATUS_CONFIG: Record<string, { label: string; tone: BadgeTone }> = {
  active:   { label: 'Actif',             tone: 'success' },
  invited:  { label: 'Invitation envoyée', tone: 'info'    },
  expired:  { label: 'Invitation expirée', tone: 'danger'  },
  disabled: { label: 'Désactivé',          tone: 'neutral' },
};

const ROLE_LABELS: Record<UserRole, string> = {
  admin:   'Administrateur',
  manager: 'Manager',
  advisor: 'Conseiller',
};

export function MemberRow({
  member, isMutating, currentUserId,
  onChangeRole, onDisable, onReactivate, onResend,
}: MemberRowProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const isCurrentUser = member.id === currentUserId;
  const statusCfg     = STATUS_CONFIG[member.status];
  const displayInitials = computeInitials(member);

  const handleRoleChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    onChangeRole(member.id, e.target.value as UserRole);
  }, [member.id, onChangeRole]);

  return (
    <tr className={cn('member-row', isMutating && 'member-row--mutating', member.status === 'disabled' && 'member-row--disabled')}>

      {/* Identity */}
      <td className="member-row__cell member-row__identity">
        <div className="member-avatar" aria-hidden="true">
          {displayInitials}
        </div>
        <div className="member-row__name-wrap">
          <span className="member-row__name">
            {member.firstName} {member.lastName}
            {isCurrentUser && (
              <span className="member-row__you" aria-label="Vous"> (vous)</span>
            )}
          </span>
          <span className="member-row__email">{member.email}</span>
        </div>
      </td>

      {/* Role selector */}
      <td className="member-row__cell">
        {isCurrentUser || member.status === 'disabled' ? (
          <span className="member-row__role-static">
            {ROLE_LABELS[member.role]}
          </span>
        ) : (
          <select
            className="member-row__role-select"
            value={member.role}
            onChange={handleRoleChange}
            disabled={isMutating}
            aria-label={`Rôle de ${member.firstName}`}
          >
            <option value="advisor">Conseiller</option>
            <option value="manager">Manager</option>
            <option value="admin">Administrateur</option>
          </select>
        )}
      </td>

      {/* Status */}
      <td className="member-row__cell">
        <Badge tone={statusCfg.tone}>
          {statusCfg.label}
        </Badge>
      </td>

      {/* Joined / Invited date */}
      <td className="member-row__cell member-row__date">
        {member.status === 'active' && member.joinedAt ? (
          <time dateTime={member.joinedAt}>
            {formatRelative(member.joinedAt)}
          </time>
        ) : (
          <time dateTime={member.invitedAt} className="member-row__invited-at">
            Invité {formatRelative(member.invitedAt)}
          </time>
        )}
      </td>

      {/* Actions */}
      <td className="member-row__cell member-row__actions">
        {isMutating ? (
          <span className="member-row__spinner" aria-label="En cours…" />
        ) : (
          <>
            {(member.status === 'invited' || member.status === 'expired') && (
              <button
                type="button"
                className="member-action member-action--resend"
                onClick={() => onResend(member.id)}
                aria-label={`Renvoyer l'invitation à ${member.firstName}`}
              >
                Renvoyer
              </button>
            )}
            {member.status === 'active' && !isCurrentUser && (
              <button
                type="button"
                className="member-action member-action--danger"
                onClick={() => onDisable(member.id)}
                aria-label={`Désactiver le compte de ${member.firstName} ${member.lastName}`}
              >
                Désactiver
              </button>
            )}
            {member.status === 'disabled' && !isCurrentUser && (
              <button
                type="button"
                className="member-action member-action--reactivate"
                onClick={() => onReactivate(member.id)}
                aria-label={`Réactiver le compte de ${member.firstName} ${member.lastName}`}
              >
                Réactiver
              </button>
            )}
          </>
        )}
      </td>
    </tr>
  );
}
