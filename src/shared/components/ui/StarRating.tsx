import React from 'react';
import { Star } from 'lucide-react';
import './StarRating.css';

interface StarRatingProps {
  /** Note de 0 à `max`. */
  value: number;
  max?:  number;
}

/** Note en étoiles (CSAT) : pictos Lucide au trait, jamais remplis ; les
 *  étoiles obtenues sont en --accent, les autres en --line. */
export function StarRating({ value, max = 5 }: StarRatingProps) {
  return (
    <span className="star-rating" role="img" aria-label={`${value} sur ${max}`}>
      {Array.from({ length: max }, (_, i) => (
        <Star key={i} size={16} className={i < value ? 'star-rating__on' : 'star-rating__off'} />
      ))}
    </span>
  );
}
