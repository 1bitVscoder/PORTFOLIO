"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "@/lib/gsap";
import { leetcodeStats } from "@/data";
import { SectionLabel } from "@/components/sections/case-study/SectionLabel";
import styles from "./LeetCodeStats.module.css";

export function AboutPageLeetCodeStats() {
  const {
    username,
    totalSolved,
    totalQuestions,
    easySolved,
    totalEasy,
    mediumSolved,
    totalMedium,
    hardSolved,
    totalHard,
    acceptanceRate,
    ranking
  } = leetcodeStats;

  const sectionRef = useRef<HTMLElement>(null);

  // Math for SVG circle path
  const solvedPercent = (totalSolved / totalQuestions) * 100;
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (solvedPercent / 100) * circumference;

  useGSAP(() => {
    if (!sectionRef.current) return;

    // 1. Animate radial progress ring
    gsap.fromTo(
      sectionRef.current.querySelector(`.${styles.radialIndicator}`),
      { strokeDashoffset: circumference },
      {
        strokeDashoffset,
        duration: 1.8,
        ease: "power2.out",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 85%",
          toggleActions: "play none none none",
        }
      }
    );

    // 2. Animate progress bars widths
    const bars = sectionRef.current.querySelectorAll(`.${styles.progressBar}`);
    bars.forEach((bar) => {
      const targetWidth = (bar as HTMLElement).style.width || "0%";
      gsap.fromTo(
        bar,
        { width: "0%" },
        {
          width: targetWidth,
          duration: 1.5,
          ease: "power2.out",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 85%",
            toggleActions: "play none none none",
          }
        }
      );
    });

    // 3. Fade/slide in grid cards
    gsap.fromTo(
      [
        sectionRef.current.querySelector(`.${styles.cardMain}`),
        sectionRef.current.querySelector(`.${styles.cardBars}`)
      ],
      { opacity: 0, y: 30 },
      {
        opacity: 1,
        y: 0,
        duration: 0.8,
        stagger: 0.15,
        ease: "power2.out",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 85%",
          toggleActions: "play none none none",
        }
      }
    );

    // 4. Counter ticking numbers animation
    const startRanking = Math.max(0, ranking - 150);
    const countTarget = { solved: 0, ranking: startRanking, acceptance: 0 };
    gsap.to(countTarget, {
      solved: totalSolved,
      ranking: ranking,
      acceptance: acceptanceRate,
      duration: 1.8,
      ease: "power2.out",
      scrollTrigger: {
        trigger: sectionRef.current,
        start: "top 85%",
        toggleActions: "play none none none",
      },
      onUpdate: () => {
        const solvedEl = sectionRef.current?.querySelector(`.${styles.radialNumber}`);
        const rankEl = sectionRef.current?.querySelectorAll(`.${styles.vitalValue}`)[0];
        const acceptEl = sectionRef.current?.querySelectorAll(`.${styles.vitalValue}`)[1];
        
        if (solvedEl) solvedEl.textContent = String(Math.floor(countTarget.solved));
        if (rankEl) rankEl.textContent = Math.floor(countTarget.ranking).toLocaleString('en-US');
        if (acceptEl) acceptEl.textContent = countTarget.acceptance.toFixed(1) + "%";
      }
    });
  }, { scope: sectionRef });

  return (
    <section
      ref={sectionRef}
      className={styles.section}
      aria-labelledby="leetcode-label"
    >
      <div className={styles.inner}>
        <div className={styles.head}>
          <SectionLabel id="leetcode-label" className={styles.eyebrow}>
            LeetCode Stats
          </SectionLabel>
          <span className={styles.count}>{totalSolved} / {totalQuestions} Solved</span>
        </div>

        <div className={styles.contentGrid}>
          {/* Left Column: Radial progress & overall ranking */}
          <div className={styles.cardMain}>
            <div className={styles.radialContainer}>
              <svg className={styles.radialSvg} viewBox="0 0 120 120">
                <circle
                  className={styles.radialTrack}
                  cx="60"
                  cy="60"
                  r={radius}
                />
                <circle
                  className={styles.radialIndicator}
                  cx="60"
                  cy="60"
                  r={radius}
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                />
              </svg>
              <div className={styles.radialText}>
                <span className={styles.radialNumber}>{totalSolved}</span>
                <span className={styles.radialLabel}>Solved</span>
              </div>
            </div>
            
            <div className={styles.vitalsRow}>
              <div className={styles.vitalItem}>
                <span className={styles.vitalValue}>{ranking.toLocaleString('en-US')}</span>
                <span className={styles.vitalLabel}>Global Rank</span>
              </div>
              <div className={styles.vitalItem}>
                <span className={styles.vitalValue}>{acceptanceRate}%</span>
                <span className={styles.vitalLabel}>Acceptance</span>
              </div>
            </div>
          </div>

          {/* Right Column: Easy, Medium, Hard breakdown bars */}
          <div className={styles.cardBars}>
            <div className={styles.barGroup} data-difficulty="easy">
              <div className={styles.barHead}>
                <span className={styles.barLabel}>Easy</span>
                <span className={styles.barValue}>{easySolved} <span className={styles.barMax}>/ {totalEasy}</span></span>
              </div>
              <div className={styles.progressTrack}>
                <div 
                  className={`${styles.progressBar} ${styles.easyColor}`} 
                  style={{ width: `${(easySolved / totalEasy) * 100}%` }}
                />
              </div>
            </div>

            <div className={styles.barGroup} data-difficulty="medium">
              <div className={styles.barHead}>
                <span className={styles.barLabel}>Medium</span>
                <span className={styles.barValue}>{mediumSolved} <span className={styles.barMax}>/ {totalMedium}</span></span>
              </div>
              <div className={styles.progressTrack}>
                <div 
                  className={`${styles.progressBar} ${styles.mediumColor}`} 
                  style={{ width: `${(mediumSolved / totalMedium) * 100}%` }}
                />
              </div>
            </div>

            <div className={styles.barGroup} data-difficulty="hard">
              <div className={styles.barHead}>
                <span className={styles.barLabel}>Hard</span>
                <span className={styles.barValue}>{hardSolved} <span className={styles.barMax}>/ {totalHard}</span></span>
              </div>
              <div className={styles.progressTrack}>
                <div 
                  className={`${styles.progressBar} ${styles.hardColor}`} 
                  style={{ width: `${(hardSolved / totalHard) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className={styles.footer}>
          <span className={styles.legend}>Data synced automatically</span>
          <a
            href={`https://leetcode.com/u/${username}`}
            target="_blank"
            rel="noreferrer"
            className={styles.cta}
          >
            View on LeetCode
          </a>
        </div>
      </div>
    </section>
  );
}
