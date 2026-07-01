'use client';

import { useRef, useEffect } from 'react';
import { content } from '@/data';
import { StarIcon } from './StarIcon';
import styles from './SkillsBar.module.css';

// Build repeating skills array from base items.
// Duplicate the whole base list so the marquee tail is derived generically
// (no hardcoded indices) and stays well-defined for any data size. The render
// then duplicates `skills` once more, so the content is laid out twice and the
// seam-accurate loop distance is exactly scrollWidth / 2.
const baseSkills = content.skills.marqueeItems;
const skills = [...baseSkills, ...baseSkills];

export function SkillsBar() {
  const contentRef = useRef<HTMLDivElement>(null);

  // Write --scroll-width as a CSS variable directly instead of going through
  // setState — measurement has no UI consequence other than the var update,
  // and resize-driven setState re-renders the whole component including the
  // 2× skills list.
  useEffect(() => {
    const measureWidth = () => {
      const node = contentRef.current;
      if (!node) return;
      // The loop distance is the offset from the first item to its duplicate
      // (the first child of the second half). We CANNOT use scrollWidth / 2:
      // flexbox `gap` adds no trailing gap, so N items have only N-1 gaps and
      // scrollWidth / 2 lands half a gap short of the seam, snapping the
      // marquee back on every cycle. The left-edge delta below includes the
      // seam gap exactly and is invariant to the running transform (both items
      // share the same transformed parent), so it's sub-pixel seam-accurate.
      const kids = node.children;
      if (kids.length < 2) return;
      const seam = kids[kids.length / 2];
      const distance =
        seam.getBoundingClientRect().left - kids[0].getBoundingClientRect().left;
      node.style.setProperty('--scroll-width', `${distance}px`);
    };

    measureWidth();
    window.addEventListener('resize', measureWidth);
    return () => window.removeEventListener('resize', measureWidth);
  }, []);

  // Render a skill item with alternating star separator
  const renderSkillItem = (skill: string, index: number, keyPrefix: string = '') => (
    <div key={`${keyPrefix}${index}`} className={styles.skillItem}>
      <span className={styles.skillText}>{skill}</span>
      <span className={styles.separator}>
        <StarIcon variant={index % 2 === 0 ? 'outline' : 'filled'} />
      </span>
    </div>
  );

  return (
    <div data-skills className={styles.skillsBar} aria-hidden="true">
      <div className={styles.skillsBarInner}>
        <div className={styles.skillsWrapper}>
          <div ref={contentRef} className={styles.skillsContent}>
            {skills.map((skill, index) => renderSkillItem(skill, index))}
            {/* Duplicate for seamless loop */}
            {skills.map((skill, index) => renderSkillItem(skill, index, 'dup-'))}
          </div>
        </div>
      </div>
    </div>
  );
}
