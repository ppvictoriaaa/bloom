import type { IconDef } from './SvgIcon';
import WarningIcon from './icons/warning.svg?react';
import EditIcon from './icons/edit.svg?react';
import PlusIcon from './icons/plus.svg?react';
import MinusIcon from './icons/minus.svg?react';
import LeafIcon from './icons/leaf.svg?react';
import SeedlingIcon from './icons/seedling.svg?react';
import GardinumIcon from './icons/logo.svg?react';

export const icons = {
  // ui
  warning: WarningIcon as IconDef,
  edit: EditIcon as IconDef,
  plus: PlusIcon as IconDef,
  minus: MinusIcon as IconDef,
  leaf: LeafIcon as IconDef,
  gardinum: GardinumIcon as IconDef,
  // Plants
  seedling: SeedlingIcon as IconDef,
} as const;

export type IconName = keyof typeof icons;
