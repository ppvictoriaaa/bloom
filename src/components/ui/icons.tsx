import type { IconDef } from './SvgIcon';
import WarningIcon from './icons/warning.svg?react';
import EditIcon from './icons/edit.svg?react';
import PlusIcon from './icons/plus.svg?react';
import MinusIcon from './icons/minus.svg?react';
import LeafIcon from './icons/leaf.svg?react';
import SeedlingIcon from './icons/seedling.svg?react';
import CarrotIcon from './icons/carrot.svg?react';
import PepperIcon from './icons/pepper.svg?react';
import PotatoIcon from './icons/potato.svg?react';

export const icons = {
  // ui
  warning: WarningIcon as IconDef,
  edit: EditIcon as IconDef,
  plus: PlusIcon as IconDef,
  minus: MinusIcon as IconDef,
  leaf: LeafIcon as IconDef,
  // Plants
  seedling: SeedlingIcon as IconDef,
  carrot: CarrotIcon as IconDef,
  pepper: PepperIcon as IconDef,
  potato: PotatoIcon as IconDef,
} as const;

export type IconName = keyof typeof icons;

export const plantIconBySlug: Record<string, IconName> = {
  carrot: 'carrot',
  pepper: 'pepper',
  potato: 'potato',
  tomato: 'seedling',
};
