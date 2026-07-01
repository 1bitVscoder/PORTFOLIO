import styles from './SkillsBar.module.css';

interface StarIconProps {
  variant?: 'outline' | 'filled';
  className?: string;
  /**
   * Base class applied to the <svg>. Defaults to the SkillsBar starIcon style
   * (clamp sizing + accent color). Pass a different module class to opt this
   * icon out of the SkillsBar sizing/color and let the caller's own styles win
   * (e.g. the 1.2em, color-inheriting stars in Philosophy/Projects meta-labels).
   */
  baseClassName?: string;
}

export function StarIcon({
  variant = 'filled',
  className = '',
  baseClassName = styles.starIcon,
}: StarIconProps) {
  // 4-pointed star path - diamond/star shape
  const starPath = 'M12 0C12 0 14.5 9.5 24 12C14.5 14.5 12 24 12 24C12 24 9.5 14.5 0 12C9.5 9.5 12 0 12 0Z';
  const svgClassName = `${baseClassName} ${className}`.trim();

  if (variant === 'outline') {
    return (
      <svg
        className={svgClassName}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d={starPath}
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    );
  }

  return (
    <svg
      className={svgClassName}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path d={starPath} />
    </svg>
  );
}
