import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BaseLines } from './BaseLines';
import type { Block } from '../../lib/baseDocument';

/** L'image agrandie se referme (rejeu v6) : « Fermer », Échap, clic sur le fond ; le focus revient à l'image. */
const blocks: Block[] = [{ op: 'equal', line: { type: 'image', text: '![Grille des garanties](image:img_1)' } }];

function open() {
  render(<BaseLines blocks={blocks} />);
  const image = screen.getByRole('button', { name: 'Agrandir l\'image' });
  fireEvent.click(image);
  expect(screen.getByRole('dialog', { name: 'Grille des garanties' })).toBeTruthy();
  return image;
}

async function closed(image: HTMLElement) {
  expect(screen.queryByRole('dialog')).toBeNull();
  await waitFor(() => expect(document.activeElement).toBe(image));
}

describe('Image de la base agrandie', () => {
  it('se referme par le bouton « Fermer », visible', async () => {
    const image = open();
    fireEvent.click(screen.getByRole('button', { name: 'Fermer' }));
    await closed(image);
  });

  it('se referme par Échap', async () => {
    const image = open();
    fireEvent.keyDown(document, { key: 'Escape' });
    await closed(image);
  });

  it('se referme par un clic sur le fond, pas sur l\'image', async () => {
    const image = open();
    const dialog = screen.getByRole('dialog');
    fireEvent.click(dialog.querySelector('.obp-base-zoom')!);
    expect(screen.getByRole('dialog')).toBeTruthy();
    fireEvent.click(dialog);
    await closed(image);
  });
});
