'use client';

import { AlignCenter, AlignLeft, AlignRight } from 'lucide-react';

import {
  FONT_LABELS,
  FONT_WEIGHT_LABELS,
  type FontFamilyId,
  type FontWeight,
  type TextAlign,
} from '@/lib/types';

export const FAMILY_OPTIONS = (Object.keys(FONT_LABELS) as FontFamilyId[]).map(
  (id) => ({ value: id, label: FONT_LABELS[id] }),
);

export const WEIGHT_OPTIONS = (
  Object.keys(FONT_WEIGHT_LABELS) as FontWeight[]
).map((weight) => ({ value: weight, label: FONT_WEIGHT_LABELS[weight] }));

export const ALIGNMENTS: ReadonlyArray<{
  value: TextAlign;
  icon: React.ReactNode;
}> = [
  { value: 'left', icon: <AlignLeft size={15} /> },
  { value: 'center', icon: <AlignCenter size={15} /> },
  { value: 'right', icon: <AlignRight size={15} /> },
];
