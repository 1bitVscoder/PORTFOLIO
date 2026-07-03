'use client';

import { useState, useEffect, useRef } from 'react';
import { useReducedMotion } from '@/lib/useReducedMotion';
import { playClick, playSweep } from '@/lib/audio';
import { useDynamicLenisPrevent } from '@/lib/useDynamicLenisPrevent';
import { gsap } from '@/lib/gsap';
import styles from './DsaRaceTrack.module.css';

const N_VALUES = [10, 100, 1000, 10000, 100000];

interface LaneProgress {
  o1: number;
  ologn: number;
  on: number;
  on2: number;
}

export function DsaRaceTrack() {
  const [nValue, setNValue] = useState<number>(1000);
  const [sliderVal, setSliderVal] = useState<number>(2); // 2 is index of 1000
  const [raceState, setRaceState] = useState<'idle' | 'running' | 'completed' | 'crashed'>('idle');
  const [logs, setLogs] = useState<string[]>([]);
  const [progress, setProgress] = useState<LaneProgress>({ o1: 0, ologn: 0, on: 0, on2: 0 });
  const reducedMotion = useReducedMotion();
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const terminalBodyRef = useRef<HTMLDivElement>(null);

  // Apply dynamic lenis-prevent to scrollable terminal container
  useDynamicLenisPrevent(terminalBodyRef);

  // Auto-scroll the terminal logs internally (no page jumping)
  useEffect(() => {
    if (terminalBodyRef.current) {
      terminalBodyRef.current.scrollTop = terminalBodyRef.current.scrollHeight;
    }
  }, [logs]);

  // Keep sliderVal in sync with nValue (e.g. on reset)
  useEffect(() => {
    setSliderVal(N_VALUES.indexOf(nValue));
  }, [nValue]);

  // Cleanup animations on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  const addLog = (msg: string) => {
    setLogs((prev) => [...prev, msg]);
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (raceState === 'running') return;
    const val = parseFloat(e.target.value);
    setSliderVal(val);
    
    // Update target N value dynamically on crossing thresholds
    const nearestIndex = Math.round(val);
    const nearestN = N_VALUES[nearestIndex];
    if (nearestN !== nValue) {
      setNValue(nearestN);
      playClick();
    }
  };

  const handleSliderRelease = () => {
    if (raceState === 'running') return;
    const nearestIndex = Math.round(sliderVal);
    
    // Snappy bouncy transition to the nearest discrete step
    const obj = { val: sliderVal };
    gsap.to(obj, {
      val: nearestIndex,
      duration: 0.25,
      ease: 'back.out(1.6)',
      onUpdate: () => {
        setSliderVal(obj.val);
      }
    });
  };

  const startRace = () => {
    if (raceState === 'running') return;

    playClick();
    setRaceState('running');
    setProgress({ o1: 0, ologn: 0, on: 0, on2: 0 });
    setLogs([]);

    // Instant execution for reduced motion users
    if (reducedMotion) {
      const isCrash = nValue >= 10000;
      setProgress({
        o1: 100,
        ologn: 100,
        on: 100,
        on2: isCrash ? 35 : 100,
      });
      setRaceState(isCrash ? 'crashed' : 'completed');
      setLogs([
        `[COMPILER] Initializing loop race for N = ${nValue.toLocaleString()}`,
        `[SUCCESS] O(1) constant search finished in 0.01ms`,
        `[SUCCESS] O(log N) binary search finished in 0.05ms`,
        `[SUCCESS] O(N) linear sweep finished in 1.2ms`,
        isCrash 
          ? `[FATAL] O(N²) quadratic sort exceeded execution budget! Execution halted.`
          : `[SUCCESS] O(N²) quadratic sort finished in ${Math.round(nValue * nValue * 0.0001)}ms`,
      ]);
      playSweep();
      return;
    }

    addLog(`[COMPILER] Instantiating loop race for N = ${nValue.toLocaleString()}...`);
    startTimeRef.current = performance.now();
    
    // Set up timings based on N (slower durations for smooth pacing)
    const o1Duration = 1200; // ms
    const olognDuration = 1800; // ms
    let onDuration = 2800; // ms
    let on2Duration = 5000; // ms

    if (nValue === 10) {
      onDuration = 2200;
      on2Duration = 3000;
    } else if (nValue === 100) {
      onDuration = 2400;
      on2Duration = 3800;
    } else if (nValue === 1000) {
      onDuration = 2800;
      on2Duration = 5000;
    } else if (nValue === 10000) {
      onDuration = 3500;
      on2Duration = 6000;
    } else if (nValue === 100000) {
      onDuration = 4500;
      on2Duration = 6000;
    }

    const loggedRef = {
      o1: false,
      ologn: false,
      onHalf: false,
      on: false,
      on2Warn: false,
      on2Fatal: false,
    };

    const animate = (now: number) => {
      const elapsed = now - startTimeRef.current;

      const pO1 = Math.min(100, (elapsed / o1Duration) * 100);
      const pOlogn = Math.min(100, (elapsed / olognDuration) * 100);
      const pOn = Math.min(100, (elapsed / onDuration) * 100);
      
      let pOn2 = 0;
      let crashTriggered = false;

      if (nValue < 10000) {
        // Normal completion path for small N
        pOn2 = Math.min(100, (elapsed / on2Duration) * 100);
      } else if (nValue === 10000) {
        // Stalls at 45% and crashes (around 4.2s out of 6.0s duration)
        if (elapsed < 4200) {
          pOn2 = (elapsed / 4200) * 45;
        } else {
          pOn2 = 45;
          if (!loggedRef.on2Fatal) {
            loggedRef.on2Fatal = true;
            crashTriggered = true;
          }
        }
      } else {
        // N = 100,000: Stalls at 12% and crashes quickly (around 2.0s)
        if (elapsed < 2000) {
          pOn2 = (elapsed / 2000) * 12;
        } else {
          pOn2 = 12;
          if (!loggedRef.on2Fatal) {
            loggedRef.on2Fatal = true;
            crashTriggered = true;
          }
        }
      }

      // Update progress bars
      setProgress({
        o1: pO1,
        ologn: pOlogn,
        on: pOn,
        on2: pOn2,
      });

      // Sequential Logging Updates
      if (pO1 >= 100 && !loggedRef.o1) {
        loggedRef.o1 = true;
        addLog(`[RUNNING] O(1) constant time check: 1 operation completed in 0.02ms.`);
      }

      if (pOlogn >= 100 && !loggedRef.ologn) {
        loggedRef.ologn = true;
        const ops = Math.round(Math.log2(nValue));
        addLog(`[RUNNING] O(log N) binary search: ${ops} operations completed in 0.06ms.`);
      }

      if (pOn >= 50 && !loggedRef.onHalf && nValue >= 1000) {
        loggedRef.onHalf = true;
        addLog(`[RUNNING] O(N) linear sweep: ${(nValue / 2).toLocaleString()} operations processed...`);
      }

      if (pOn >= 100 && !loggedRef.on) {
        loggedRef.on = true;
        addLog(`[SUCCESS] O(N) linear sweep finished in ${Math.round(onDuration)}ms.`);
      }

      // O(N2) Stalling Logs
      if (nValue >= 10000 && elapsed > 1500 && !loggedRef.on2Warn) {
        loggedRef.on2Warn = true;
        addLog(`[WARNING] O(N²) quadratic sort: Cache line thrashing detected. CPU usage 100%.`);
      }

      if (crashTriggered) {
        addLog(`[FATAL] O(N²) Heap Allocation Limit Exceeded! Thread pool blocked.`);
        addLog(`[SYSTEM] Halting compilation to protect system resources.`);
        setRaceState('crashed');
        playSweep();
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
        return;
      }

      // Check for normal completion
      if (pO1 >= 100 && pOlogn >= 100 && pOn >= 100 && pOn2 >= 100) {
        addLog(`[SUCCESS] O(N²) quadratic sort completed in ${Math.round(on2Duration)}ms.`);
        addLog(`[SYSTEM] Loop race finished. CPU temperature nominal.`);
        setRaceState('completed');
        playSweep();
        return;
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
  };

  const resetRace = () => {
    if (raceState === 'running') return;
    playClick();
    setProgress({ o1: 0, ologn: 0, on: 0, on2: 0 });
    setLogs([]);
    setRaceState('idle');
  };


  return (
    <div className={styles.raceContainer}>
      <div className={styles.header}>
        <h3 className={styles.title}>Complexity Race Arena</h3>
        <p className={styles.subtitle}>
          Visualizing loop cycles and time complexity growth relative to input size (N).
        </p>
      </div>

      <div className={styles.arenaLayout}>
        {/* Left Column: Tracks and Controls */}
        <div className={styles.mainControls}>
          <div className={styles.controlRow}>
            <div className={styles.sliderLabelGroup}>
              <span className={styles.label}>Input Size (N)</span>
              <span className={styles.sliderValue}>{nValue.toLocaleString()}</span>
            </div>
            <input
              type="range"
              min="0"
              max={N_VALUES.length - 1}
              step="0.01"
              value={sliderVal}
              onChange={handleSliderChange}
              onMouseUp={handleSliderRelease}
              onTouchEnd={handleSliderRelease}
              disabled={raceState === 'running'}
              className={styles.sliderInput}
              aria-label="Select Input Size N"
            />
            <div className={styles.sliderTicks}>
              {N_VALUES.map((val) => (
                <span key={val} className={styles.tickLabel}>
                  {val >= 1000 ? `${val / 1000}k` : val}
                </span>
              ))}
            </div>
          </div>

          <div className={styles.tracksGroup}>
            {/* O(1) Lane */}
            <div className={styles.lane} data-complexity="o1">
              <div className={styles.laneHeader}>
                <span className={styles.complexityBadge} data-complexity="o1">O(1)</span>
                <span className={styles.complexityName}>Constant Time</span>
              </div>
              <div className={styles.track}>
                <div 
                  className={styles.progressIndicator} 
                  style={{ width: `${progress.o1}%` }}
                />
                <span className={styles.finishLine}>🏁</span>
              </div>
            </div>

            {/* O(log N) Lane */}
            <div className={styles.lane} data-complexity="ologn">
              <div className={styles.laneHeader}>
                <span className={styles.complexityBadge} data-complexity="ologn">O(log N)</span>
                <span className={styles.complexityName}>Logarithmic Time</span>
              </div>
              <div className={styles.track}>
                <div 
                  className={styles.progressIndicator} 
                  style={{ width: `${progress.ologn}%` }}
                />
                <span className={styles.finishLine}>🏁</span>
              </div>
            </div>

            {/* O(N) Lane */}
            <div className={styles.lane} data-complexity="on">
              <div className={styles.laneHeader}>
                <span className={styles.complexityBadge} data-complexity="on">O(N)</span>
                <span className={styles.complexityName}>Linear Time</span>
              </div>
              <div className={styles.track}>
                <div 
                  className={styles.progressIndicator} 
                  style={{ width: `${progress.on}%` }}
                />
                <span className={styles.finishLine}>🏁</span>
              </div>
            </div>

            {/* O(N^2) Lane */}
            <div 
              className={`${styles.lane} ${raceState === 'crashed' && nValue >= 10000 ? styles.stalledLane : ''}`} 
              data-complexity="on2"
            >
              <div className={styles.laneHeader}>
                <span className={styles.complexityBadge} data-complexity="on2">O(N²)</span>
                <span className={styles.complexityName}>Quadratic Time</span>
              </div>
              <div className={styles.track}>
                <div 
                  className={`${styles.progressIndicator} ${raceState === 'crashed' && nValue >= 10000 ? styles.crashColor : ''}`} 
                  style={{ width: `${progress.on2}%` }}
                />
                {raceState === 'crashed' && nValue >= 10000 ? (
                  <span className={styles.crashWarning}>⚠️ CRASHED</span>
                ) : (
                  <span className={styles.finishLine}>🏁</span>
                )}
              </div>
            </div>
          </div>

          <div className={styles.actions}>
            <button
              onClick={startRace}
              disabled={raceState === 'running'}
              className={`${styles.btn} ${styles.btnPrimary}`}
            >
              {raceState === 'running' ? 'COMPILING...' : 'RUN SIMULATION'}
            </button>
            <button
              onClick={resetRace}
              disabled={raceState === 'running' || raceState === 'idle'}
              className={`${styles.btn} ${styles.btnSecondary}`}
            >
              RESET
            </button>
          </div>
        </div>

        {/* Right Column: Logging Terminal */}
        <div className={styles.terminalContainer}>
          <div className={styles.terminalHeader}>
            <div className={styles.dotGroup}>
              <span className={styles.redDot}></span>
              <span className={styles.yellowDot}></span>
              <span className={styles.greenDot}></span>
            </div>
            <span className={styles.terminalTitle}>system_telemetry.log</span>
          </div>
          <div ref={terminalBodyRef} className={styles.terminalBody}>
            {logs.length === 0 ? (
              <span className={styles.terminalPlaceholder}>Terminal idle. Click "Run Simulation" to execute complexity check...</span>
            ) : (
              logs.map((log, index) => {
                let colorClass = styles.logInfo;
                if (log.startsWith('[SUCCESS]')) colorClass = styles.logSuccess;
                if (log.startsWith('[WARNING]')) colorClass = styles.logWarning;
                if (log.startsWith('[FATAL]')) colorClass = styles.logFatal;
                if (log.startsWith('[SYSTEM]')) colorClass = styles.logSystem;
                
                return (
                  <div key={index} className={`${styles.logLine} ${colorClass}`}>
                    {log}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
