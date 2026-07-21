"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "@/lib/gsap";
import { leetcodeStats } from "@/data";
import { SectionLabel } from "@/components/sections/case-study/SectionLabel";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { useTransition } from "@/components/transitions";
import { playSweep } from "@/lib/audio";
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
  const reducedMotion = useReducedMotion();
  const { hasEntered } = useTransition();

  // Math for SVG circle path
  const solvedPercent = (totalSolved / totalQuestions) * 100;
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (solvedPercent / 100) * circumference;

  useGSAP(() => {
    if (!hasEntered) return;
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
          once: true,
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
            once: true,
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
          once: true,
        }
      }
    );

    // 4. Counter ticking numbers animation
    const startRanking = Math.max(0, ranking - 150);
    const countTarget = { 
      solved: 0, 
      ranking: startRanking, 
      acceptance: 0,
      streakCurrent: 0,
      streakMax: 0
    };
    gsap.to(countTarget, {
      solved: totalSolved,
      ranking: ranking,
      acceptance: acceptanceRate,
      streakCurrent: leetcodeStats.streakCurrent || 0,
      streakMax: leetcodeStats.streakMax || 0,
      duration: 1.8,
      ease: "power2.out",
      scrollTrigger: {
        trigger: sectionRef.current,
        start: "top 85%",
        once: true,
      },
      onUpdate: () => {
        const solvedEl = sectionRef.current?.querySelector(`.${styles.radialNumber}`);
        const rankEl = sectionRef.current?.querySelectorAll(`.${styles.vitalValue}`)[0];
        const acceptEl = sectionRef.current?.querySelectorAll(`.${styles.vitalValue}`)[1];
        const streakCurEl = sectionRef.current?.querySelectorAll(`.${styles.vitalValue}`)[2];
        const streakMaxEl = sectionRef.current?.querySelectorAll(`.${styles.vitalValue}`)[3];
        
        if (solvedEl) solvedEl.textContent = String(Math.floor(countTarget.solved));
        if (rankEl) rankEl.textContent = Math.floor(countTarget.ranking).toLocaleString('en-US');
        if (acceptEl) acceptEl.textContent = countTarget.acceptance.toFixed(1) + "%";
        if (streakCurEl) streakCurEl.textContent = String(Math.floor(countTarget.streakCurrent));
        if (streakMaxEl) streakMaxEl.textContent = String(Math.floor(countTarget.streakMax));
      },
      onComplete: () => {
        const solvedEl = sectionRef.current?.querySelector(`.${styles.radialNumber}`);
        const rankEl = sectionRef.current?.querySelectorAll(`.${styles.vitalValue}`)[0];
        const acceptEl = sectionRef.current?.querySelectorAll(`.${styles.vitalValue}`)[1];
        const streakCurEl = sectionRef.current?.querySelectorAll(`.${styles.vitalValue}`)[2];
        const streakMaxEl = sectionRef.current?.querySelectorAll(`.${styles.vitalValue}`)[3];
        
        if (solvedEl) solvedEl.textContent = String(totalSolved);
        if (rankEl) rankEl.textContent = ranking.toLocaleString('en-US');
        if (acceptEl) acceptEl.textContent = acceptanceRate.toFixed(1) + "%";
        if (streakCurEl) streakCurEl.textContent = String(leetcodeStats.streakCurrent || 0);
        if (streakMaxEl) streakMaxEl.textContent = String(leetcodeStats.streakMax || 0);
      }
    });


    // 5. 3D Tilt Hover effect on cardMain and cardBars
    const listeners: { element: HTMLElement; type: string; fn: EventListenerOrEventListenerObject }[] = [];
    
    if (!reducedMotion) {
      const cards = [
        sectionRef.current.querySelector<HTMLElement>(`.${styles.cardMain}`),
        sectionRef.current.querySelector<HTMLElement>(`.${styles.cardBars}`)
      ];
      
      cards.forEach((card) => {
        if (!card) return;
        
        gsap.set(card, { transformPerspective: 1000, transformStyle: "preserve-3d" });
        
        const handleMouseMove = (e: Event) => {
          const mouseEvent = e as unknown as MouseEvent;
          const rect = card.getBoundingClientRect();
          const x = mouseEvent.clientX - rect.left;
          const y = mouseEvent.clientY - rect.top;
          const normX = (x / rect.width) - 0.5;
          const normY = (y / rect.height) - 0.5;
          const rotateX = -normY * 10;
          const rotateY = normX * 10;
          
          gsap.to(card, {
            rotateX: rotateX,
            rotateY: rotateY,
            x: normX * 6,
            y: normY * 6,
            duration: 0.3,
            ease: "power2.out",
            overwrite: "auto",
          });
        };
        
        const handleMouseEnter = () => {
          playSweep();
        };
        
        const handleMouseLeave = () => {
          gsap.to(card, {
            rotateX: 0,
            rotateY: 0,
            x: 0,
            y: 0,
            duration: 0.5,
            ease: "power2.out",
            overwrite: "auto",
          });
        };
        
        card.addEventListener("mousemove", handleMouseMove);
        card.addEventListener("mouseenter", handleMouseEnter);
        card.addEventListener("mouseleave", handleMouseLeave);
        
        listeners.push(
          { element: card, type: "mousemove", fn: handleMouseMove },
          { element: card, type: "mouseenter", fn: handleMouseEnter },
          { element: card, type: "mouseleave", fn: handleMouseLeave }
        );
      });
    }

    return () => {
      listeners.forEach(({ element, type, fn }) => {
        element.removeEventListener(type, fn);
      });
    };
  }, { scope: sectionRef, dependencies: [reducedMotion, hasEntered] });

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

            <div className={styles.vitalsRow} style={{ marginTop: "12px", borderTop: "none", paddingTop: 0 }}>
              <div className={styles.vitalItem}>
                <span className={styles.vitalValue}>{leetcodeStats.streakCurrent || 0}</span>
                <span className={styles.vitalLabel}>Active Streak</span>
              </div>
              <div className={styles.vitalItem}>
                <span className={styles.vitalValue}>{leetcodeStats.streakMax || 0}</span>
                <span className={styles.vitalLabel}>Max Streak</span>
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
