import React, { createContext, useContext } from 'react';
import { UNNAMED } from '../../lib/correction';

/**
 * L'identifiant de l'utilisateur courant, fourni par la page du projet (`useAuthStore`) ; null
 * hors d'elle. Un contexte plutôt que le store ici, pour que les écrans se testent seuls.
 */
export const CurrentUserContext = createContext<string | null>(null);

/**
 * Un nom d'auteur tel que le back le donne (relu dans le profil, jamais une adresse). Quand c'est
 * l'utilisateur courant et que son nom manque, un lien l'invite à le renseigner (plan v4, point 11).
 */
export function AuthorName({ name, authorId }: { name: string; authorId?: string | null }) {
  const me = useContext(CurrentUserContext);
  return (
    <>
      {name}
      {authorId && authorId === me && name === UNNAMED && (
        <> (<a className="obp-link" href="/account">Ajoutez votre nom à votre profil</a>)</>
      )}
    </>
  );
}
