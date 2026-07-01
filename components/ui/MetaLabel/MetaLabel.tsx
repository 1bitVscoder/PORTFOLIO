import { type HTMLAttributes, type ReactNode, type Ref } from 'react';
import { StarIcon } from '@/components/sections/Hero/StarIcon';
import styles from './MetaLabel.module.css';

interface MetaLabelProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /** Section-specific class layered on top of the base meta-label styles. */
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

/**
 * Section eyebrow: the brand ✦ followed by a short uppercase tracked label.
 * Shared across the home, case-study, and Workflow sections. Forwards `ref`
 * (for GSAP entrance animations) and spreads remaining props (`id`,
 * `aria-hidden`, etc.) onto the wrapper.
 */
export function MetaLabel({ className, children, ref, ...rest }: MetaLabelProps) {
  return (
    <div
      ref={ref}
      className={`${styles.metaLabel}${className ? ` ${className}` : ''}`}
      {...rest}
    >
      <StarIcon variant="outline" baseClassName={styles.starIcon} />
      {children}
    </div>
  );
}
