import { type ReactNode, type Ref } from "react";
import styles from "./SectionLabel.module.css";

interface SectionLabelProps {
  id?: string;
  className?: string;
  children: ReactNode;
  ref?: Ref<HTMLDivElement>;
}

export function SectionLabel({ id, className, children, ref }: SectionLabelProps) {
  return (
    <div
      ref={ref}
      id={id}
      className={`${styles.metaLabel}${className ? ` ${className}` : ""}`}
    >
      <svg
        className={styles.starIcon}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M12 0C12 0 14.5 9.5 24 12C14.5 14.5 12 24 12 24C12 24 9.5 14.5 0 12C9.5 9.5 12 0 12 0Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
      {children}
    </div>
  );
}
