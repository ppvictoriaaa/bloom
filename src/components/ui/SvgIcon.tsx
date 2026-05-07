import type { SVGProps, FC } from 'react';

export type IconDef = FC<SVGProps<SVGSVGElement>>;

interface SvgIconProps {
  icon: IconDef;
  size?: number;
  color?: string;
  className?: string;
  'aria-label'?: string;
}

export const SvgIcon = ({
  icon: Icon,
  size = 24,
  color = 'currentColor',
  className,
  'aria-label': ariaLabel,
}: SvgIconProps) => (
  <Icon
    width={size}
    height={size}
    style={{ color, flexShrink: 0, display: 'block' }}
    className={className}
    aria-label={ariaLabel}
    aria-hidden={ariaLabel ? undefined : true}
  />
);
