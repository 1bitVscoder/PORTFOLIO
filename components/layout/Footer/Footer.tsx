'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './Footer.module.css';

const DIRECTORY_LINKS = [
  { label: 'Work', href: '#projects' },
  { label: 'About', href: '/about' },
  { label: 'Services', href: '#services' },
  { label: 'Arcade', href: '/arcade' },
  { label: 'Contact', href: '#contact' },
];

const SOCIAL_LINKS = [
  { label: 'GitHub', href: 'https://github.com/byteWizard-zero' },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/soumya-ranjan-jana-414586370' },
  { label: 'LeetCode', href: 'https://leetcode.com/u/byteWizard-zero/' },
  { label: 'Twitter / X', href: 'https://x.com/byte_wizard1' },
  { label: 'Instagram', href: 'https://www.instagram.com/zenith.soumya' },
];

const TECH_TAGS = [
  'Next.js 14',
  'TypeScript',
  'GSAP & ScrollTrigger',
  'Lenis Scroll',
  'Java / DSA',
  'IoT Architecture',
  'Gemini AI',
];

export function Footer() {
  const [timeString, setTimeString] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const formatted = now.toLocaleTimeString('en-US', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });
      setTimeString(formatted);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <footer className={styles.footer} role="contentinfo">
      <div className={styles.inner}>
        {/* Top Telemetry Bar */}
        <div className={styles.topBar}>
          <div className={styles.clockContainer}>
            <span>Bhubaneswar, IN</span>
            <span className={styles.clock}>{timeString ? `${timeString} IST` : '--:--:-- IST'}</span>
          </div>

          <div className={styles.location}>
            <span>UTC+05:30 · 0.1ms Latency</span>
          </div>
        </div>

        {/* Main 4-Column Grid */}
        <div className={styles.grid}>
          {/* Col 1: Brand & Creator Identity */}
          <div className={styles.col}>
            <h2 className={styles.brandName}>Zenith Soumya</h2>
            <p className={styles.brandTitle}>IoT & AI Developer · CSE Engineer</p>
            <p className={styles.brandDesc}>
              Architecting resilient IoT frameworks, dynamic full-stack web applications, and agentic AI systems with precision.
            </p>
          </div>

          {/* Col 2: Directory Matrix */}
          <div className={styles.col}>
            <div className={styles.colHeading}>Directory</div>
            <ul className={styles.linkList}>
              {DIRECTORY_LINKS.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className={styles.linkItem}>
                    <span>{link.label}</span>
                    <span className={styles.arrowIcon} aria-hidden="true">↗</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 3: Social Protocols */}
          <div className={styles.col}>
            <div className={styles.colHeading}>Social Protocol</div>
            <ul className={styles.linkList}>
              {SOCIAL_LINKS.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.linkItem}
                  >
                    <span>{link.label}</span>
                    <span className={styles.arrowIcon} aria-hidden="true">↗</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 4: Engineering Telemetry */}
          <div className={styles.col}>
            <div className={styles.colHeading}>Engineered With</div>
            <div className={styles.tagGroup}>
              {TECH_TAGS.map((tag) => (
                <span key={tag} className={styles.tag}>
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className={styles.bottomBar}>
          <p className={styles.copyright}>
            © {new Date().getFullYear()} Zenith Soumya · All Rights Reserved
          </p>
        </div>
      </div>
    </footer>
  );
}
