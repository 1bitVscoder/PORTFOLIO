"use client";

import React, { useState, useEffect } from 'react';
import styles from './MobileBlockOverlay.module.css';

// Telemetry check steps
const telemetrySteps = [
  { pending: "Initiating hardware handshake...", done: "Hardware handshake successful." },
  { pending: "Analyzing matrix scale...", done: "Touch scale matches human profile." },
  { pending: "Locating desktop proxy...", done: "Proxy identified. Redirection authorized." },
  { pending: "Executing safe navigation...", done: "Safe redirect route prepared." }
];

export function MobileBlockOverlay() {
  const [showCaptcha, setShowCaptcha] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [step, setStep] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    if (isChecked && step < telemetrySteps.length) {
      const timer = setTimeout(() => {
        // Add the completed log and push next pending log in a single callback
        setLogs(prev => {
          const updated = [...prev, `✓ ${telemetrySteps[step].done}`];
          if (step + 1 < telemetrySteps.length) {
            updated.push(`⌛ ${telemetrySteps[step + 1].pending}`);
          }
          return updated;
        });
        setStep(prev => {
          const next = prev + 1;
          if (next === telemetrySteps.length) {
            setIsVerified(true);
          }
          return next;
        });
      }, 950); // Paced telemetry step intervals

      return () => clearTimeout(timer);
    }
  }, [isChecked, step]);

  const handleCheckboxClick = () => {
    if (isChecked) return;
    setIsChecked(true);
    setLogs([`⌛ ${telemetrySteps[0].pending}`]);
  };

  return (
    <div className={styles.mobileBlockOverlay} aria-hidden="false">
      {/* Background ambient glows */}
      <div className={styles.ambientGlowTeal} />
      <div className={styles.ambientGlowPurple} />

      {/* Dynamic scanlines for CRT monitor texture */}
      <div className={styles.scanlines} />

      {/* Floating telemetry headers */}
      <div className={styles.cornerStatsTopLeft}>
        SYS.STATUS: <span className={styles.blinkText}>BLOCKED</span>
      </div>
      <div className={styles.cornerStatsTopRight}>
        DEV.PORT: 3000 // LOC: 127.0.0.1
      </div>

      {!showCaptcha ? (
        <div className={styles.consoleCard}>
          <div className={styles.consoleHeader}>
            <span className={styles.pulseDot} />
            <span className={styles.consoleTitle}>SYSTEM COMPATIBILITY DIAGNOSTIC</span>
          </div>
          
          <div className={styles.consoleContent}>
            <p className={styles.warningMessage}>
              &quot;the lord Artificer is fu*ked up making the site responsive for mobile, please open the site on a desktop -thank you&quot;
            </p>
            
            <div className={styles.divider} />
            
            <p className={styles.hintMessage}>
              If you don&apos;t have a desktop setup yet, please consider this alternative route:
            </p>
            
            <div className={styles.arrowGuideline}>
              <div className={styles.arrowLine} />
              <div className={styles.arrowHead} />
            </div>
            
            <button 
              onClick={() => setShowCaptcha(true)}
              className={styles.actionButton}
            >
              Click Here
            </button>
          </div>
        </div>
      ) : (
        <div className={styles.captchaCard}>
          <div className={styles.captchaHeader}>
            <div className={styles.shieldWrapper}>
              <svg className={styles.shieldSvg} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <div>
              <h4 className={styles.captchaTitle}>Verification Protocol</h4>
              <p className={styles.captchaSubtitle}>Ensure client compatibility matrix.</p>
            </div>
          </div>

          <div className={styles.captchaBody}>
            {!isChecked ? (
              <button 
                onClick={handleCheckboxClick}
                className={styles.checkboxWrapper}
              >
                <div className={styles.checkboxSquare} />
                <span className={styles.checkboxLabel}>I am not a robot</span>
              </button>
            ) : (
              <div className={styles.telemetryLogs}>
                {logs.map((log, idx) => (
                  <div 
                    key={idx} 
                    className={
                      log.startsWith('✓') 
                        ? styles.logSuccess 
                        : styles.logPending
                    }
                  >
                    {log}
                  </div>
                ))}
                
                {step < telemetrySteps.length && (
                  <div className={styles.loaderRow}>
                    <div className={styles.spinnerInline} />
                    <span className={styles.loadingText}>Running checks...</span>
                  </div>
                )}

                {isVerified && (
                  <div className={styles.successWrapper}>
                    <a 
                      href="https://www.google.com/search?q=budget+friendly+laptops" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className={styles.proceedButton}
                      onClick={() => {
                        // Reset captcha state after short delay on click
                        setTimeout(() => {
                          setShowCaptcha(false);
                          setIsChecked(false);
                          setIsVerified(false);
                          setStep(0);
                          setLogs([]);
                        }, 800);
                      }}
                    >
                      PROCEED TO ROUTE
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {!isVerified && (
            <button 
              onClick={() => {
                setShowCaptcha(false);
                setIsChecked(false);
                setIsVerified(false);
                setStep(0);
                setLogs([]);
              }}
              className={styles.captchaCancel}
            >
              Abort Protocol
            </button>
          )}
        </div>
      )}
    </div>
  );
}
