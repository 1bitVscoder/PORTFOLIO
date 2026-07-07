"use client";

import React, { useState, useEffect } from 'react';
import styles from './MobileBlockOverlay.module.css';

export function MobileBlockOverlay() {
  const [showCaptcha, setShowCaptcha] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [step, setStep] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);

  // Telemetry check steps
  const telemetrySteps = [
    { pending: "Initiating hardware handshake...", done: "Hardware handshake successful." },
    { pending: "Analyzing matrix scale...", done: "Touch scale matches human profile." },
    { pending: "Locating desktop proxy...", done: "Proxy identified. Redirection authorized." },
    { pending: "Executing safe navigation...", done: "Opening budget hardware directory..." }
  ];

  useEffect(() => {
    if (isChecked && step < telemetrySteps.length) {
      const timer = setTimeout(() => {
        // Add the completed log
        setLogs(prev => [...prev, `✓ ${telemetrySteps[step].done}`]);
        setStep(prev => prev + 1);
      }, 950); // Paced telemetry step intervals

      return () => clearTimeout(timer);
    } else if (isChecked && step === telemetrySteps.length) {
      // All steps completed! Redirect after a short delay
      const redirectTimer = setTimeout(() => {
        window.open("https://www.google.com/search?q=budget+friendly+laptops", "_blank");
        // Reset states
        setShowCaptcha(false);
        setIsChecked(false);
        setStep(0);
        setLogs([]);
      }, 1200);

      return () => clearTimeout(redirectTimer);
    }
  }, [isChecked, step]);

  const handleCheckboxClick = () => {
    if (isChecked) return;
    setIsChecked(true);
    setLogs([`⌛ ${telemetrySteps[0].pending}`]);
  };

  // When step updates, push the next pending step into logs
  useEffect(() => {
    if (isChecked && step > 0 && step < telemetrySteps.length) {
      setLogs(prev => [...prev, `⌛ ${telemetrySteps[step].pending}`]);
    }
  }, [step, isChecked]);

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
              "the lord Artificer is fu*ked up making the site responsive for mobile, please open the site on a desktop -thank you"
            </p>
            
            <div className={styles.divider} />
            
            <p className={styles.hintMessage}>
              If you don't have a desktop setup yet, please consider this alternative route:
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
              </div>
            )}
          </div>
          
          <button 
            onClick={() => {
              setShowCaptcha(false);
              setIsChecked(false);
              setStep(0);
              setLogs([]);
            }}
            className={styles.captchaCancel}
          >
            Abort Protocol
          </button>
        </div>
      )}
    </div>
  );
}
