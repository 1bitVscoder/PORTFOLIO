'use client';

import { useState, useEffect, useRef } from 'react';
import { playClick, playSweep } from '@/lib/audio';
import { useDynamicLenisPrevent } from '@/lib/useDynamicLenisPrevent';
import styles from './MemoryVisualizer.module.css';

interface StackFrame {
  id: string;
  name: string;
  variable: string;
  value: string;
  refAddress: string | null;
}

interface HeapBlock {
  address: string;
  name: string;
  size: number; // in bytes
  refCount: number;
  isStale: boolean;
}

const JAVA_CODE = [
  "public void runEngine() {",
  "  solve(3);",
  "}",
  "",
  "private void solve(int step) {",
  "  if (step <= 0) return;",
  "  Node node = new Node(step);",
  "  solve(step - 1);",
  "}"
];

export function MemoryVisualizer() {
  const [currentLine, setCurrentLine] = useState(0);
  const [stack, setStack] = useState<StackFrame[]>([]);
  const [heap, setHeap] = useState<HeapBlock[]>([
    { address: '0x002A', name: 'ClassLoader', size: 1024, refCount: 1, isStale: false },
    { address: '0x00F5', name: 'SystemConfig', size: 512, refCount: 1, isStale: false },
    { address: '0x01B2', name: 'ThreadLock', size: 128, refCount: 1, isStale: false },
  ]);
  const [stepCount, setStepCount] = useState(0);
  const [isGcRunning, setIsGcRunning] = useState(false);
  // Initial values set directly in useState to avoid cascading re-renders
  // from synchronous setState inside useEffect.
  const [logs, setLogs] = useState<string[]>([
    `[JVM] Virtual Machine initialized. Stack limit: 1024 frames.`,
    `[JVM] Heap structure aligned. Garbage collector: ZGC.`,
    `[SYSTEM] Code engine loaded. Click 'Step Code' to begin stack allocation.`
  ]);
  
  const logsBodyRef = useRef<HTMLDivElement>(null);
  const stackRef = useRef<HTMLDivElement>(null);
  const heapRef = useRef<HTMLDivElement>(null);

  useDynamicLenisPrevent(logsBodyRef);

  const addLog = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString().split(' ')[0];
    setLogs((prev) => [...prev, `[${timestamp}] ${msg}`].slice(-30));
  };

  // Log auto-scroll
  useEffect(() => {
    if (logsBodyRef.current) {
      logsBodyRef.current.scrollTop = logsBodyRef.current.scrollHeight;
    }
  }, [logs]);

  const handleStep = () => {
    playClick();
    const nextStep = stepCount + 1;
    setStepCount(nextStep);
    executeStep(nextStep);
  };

  const executeStep = (step: number) => {
    switch (step) {
      case 1:
        // Enter runEngine()
        setCurrentLine(1);
        setStack([
          { id: 'frame-0', name: 'runEngine()', variable: 'args', value: 'null', refAddress: null }
        ]);
        addLog("[STACK] Pushed frame: runEngine()");
        break;
      
      case 2:
        // Call solve(3)
        setCurrentLine(4);
        setStack((prev) => [
          ...prev,
          { id: 'frame-1', name: 'solve(step: 3)', variable: 'step', value: '3', refAddress: null }
        ]);
        addLog("[STACK] Pushed frame: solve(step: 3)");
        break;

      case 3:
        // Line: Node node = new Node(3)
        setCurrentLine(6);
        const addr3 = '0x10A3';
        setStack((prev) => 
          prev.map((f) => f.name.includes('step: 3') ? { ...f, refAddress: addr3, variable: 'node', value: addr3 } : f)
        );
        setHeap((prev) => [
          ...prev,
          { address: addr3, name: 'Node (step=3)', size: 48, refCount: 1, isStale: false }
        ]);
        addLog(`[HEAP] Allocated 48 bytes at ${addr3} (Node object with step=3).`);
        break;

      case 4:
        // Call solve(2)
        setCurrentLine(7);
        setStack((prev) => [
          ...prev,
          { id: 'frame-2', name: 'solve(step: 2)', variable: 'step', value: '2', refAddress: null }
        ]);
        addLog("[STACK] Pushed frame: solve(step: 2)");
        break;

      case 5:
        // Line: Node node = new Node(2)
        setCurrentLine(6);
        const addr2 = '0x20B2';
        setStack((prev) => 
          prev.map((f) => f.name.includes('step: 2') ? { ...f, refAddress: addr2, variable: 'node', value: addr2 } : f)
        );
        setHeap((prev) => [
          ...prev,
          { address: addr2, name: 'Node (step=2)', size: 48, refCount: 1, isStale: false }
        ]);
        addLog(`[HEAP] Allocated 48 bytes at ${addr2} (Node object with step=2).`);
        break;

      case 6:
        // Call solve(1)
        setCurrentLine(7);
        setStack((prev) => [
          ...prev,
          { id: 'frame-3', name: 'solve(step: 1)', variable: 'step', value: '1', refAddress: null }
        ]);
        addLog("[STACK] Pushed frame: solve(step: 1)");
        break;

      case 7:
        // Line: Node node = new Node(1)
        setCurrentLine(6);
        const addr1 = '0x30C1';
        setStack((prev) => 
          prev.map((f) => f.name.includes('step: 1') ? { ...f, refAddress: addr1, variable: 'node', value: addr1 } : f)
        );
        setHeap((prev) => [
          ...prev,
          { address: addr1, name: 'Node (step=1)', size: 48, refCount: 1, isStale: false }
        ]);
        addLog(`[HEAP] Allocated 48 bytes at ${addr1} (Node object with step=1).`);
        break;

      case 8:
        // Call solve(0)
        setCurrentLine(7);
        setStack((prev) => [
          ...prev,
          { id: 'frame-4', name: 'solve(step: 0)', variable: 'step', value: '0', refAddress: null }
        ]);
        addLog("[STACK] Pushed frame: solve(step: 0)");
        break;

      case 9:
        // step <= 0 check -> returns!
        setCurrentLine(5);
        addLog("[CPU] Condition step <= 0 met (0 <= 0). Initiating method return...");
        break;

      case 10:
        // Pop solve(0)
        setStack((prev) => prev.slice(0, -1));
        setCurrentLine(7);
        addLog("[STACK] Popped frame: solve(step: 0)");
        break;

      case 11:
        // Pop solve(1) -> local variable node goes out of scope! Heap object becomes unreferenced.
        setStack((prev) => prev.slice(0, -1));
        setHeap((prev) => 
          prev.map((h) => h.address === '0x30C1' ? { ...h, refCount: 0, isStale: true } : h)
        );
        addLog("[STACK] Popped frame: solve(step: 1)");
        addLog("[GC_WARN] Object at 0x30C1: Reference count dropped to 0 (Unreferenced Heap Memory).");
        break;

      case 12:
        // Pop solve(2)
        setStack((prev) => prev.slice(0, -1));
        setHeap((prev) => 
          prev.map((h) => h.address === '0x20B2' ? { ...h, refCount: 0, isStale: true } : h)
        );
        addLog("[STACK] Popped frame: solve(step: 2)");
        addLog("[GC_WARN] Object at 0x20B2: Reference count dropped to 0 (Unreferenced Heap Memory).");
        break;

      case 13:
        // Pop solve(3)
        setStack((prev) => prev.slice(0, -1));
        setHeap((prev) => 
          prev.map((h) => h.address === '0x10A3' ? { ...h, refCount: 0, isStale: true } : h)
        );
        addLog("[STACK] Popped frame: solve(step: 3)");
        addLog("[GC_WARN] Object at 0x10A3: Reference count dropped to 0 (Unreferenced Heap Memory).");
        break;

      case 14:
        // Pop runEngine()
        setStack([]);
        setCurrentLine(0);
        addLog("[STACK] Popped frame: runEngine(). Call stack empty.");
        break;

      default:
        // Reset simulation
        handleReset();
        break;
    }
  };

  const handleGc = async () => {
    if (isGcRunning) return;
    playSweep();
    setIsGcRunning(true);
    addLog("[ZGC] Garbage Collector initiated. Starting marking phase...");

    // Simulate sweeps
    await new Promise((r) => setTimeout(r, 600));
    addLog("[ZGC] Marking complete. Sweeping unreferenced memory slots...");
    
    await new Promise((r) => setTimeout(r, 600));
    setHeap((prev) => prev.filter((h) => !h.isStale));
    addLog("[ZGC] Compacting heap tables. Releasing cached addresses.");
    
    await new Promise((r) => setTimeout(r, 400));
    addLog("[ZGC] Garbage collection sweep finished. CPU core temperature cooled.");
    setIsGcRunning(false);
  };

  const handleReset = () => {
    playClick();
    setCurrentLine(0);
    setStack([]);
    setStepCount(0);
    setHeap([
      { address: '0x002A', name: 'ClassLoader', size: 1024, refCount: 1, isStale: false },
      { address: '0x00F5', name: 'SystemConfig', size: 512, refCount: 1, isStale: false },
      { address: '0x01B2', name: 'ThreadLock', size: 128, refCount: 1, isStale: false },
    ]);
    addLog("[SYSTEM] Memory registers cleared and reset.");
  };

  return (
    <div className={styles.sectionContainer}>
      <div className={styles.header}>
        <span className={styles.eyebrow}>JVM Internals</span>
        <h3 className={styles.title}>Stack & Heap Allocator</h3>
        <p className={styles.subtitle}>
          Visualize execution memory cycles. Watch recursive call frames push onto the Stack and reference structures initialize in Heap grids.
        </p>
      </div>

      <div className={styles.dashboard}>
        {/* Left Column: Java Code & Control Panel */}
        <div className={styles.controlPanel}>
          <h4 className={styles.panelTitle}>Java Recursion Engine</h4>
          
          {/* Code Viewer */}
          <div className={styles.codeBlock}>
            {JAVA_CODE.map((line, idx) => (
              <div 
                key={idx} 
                className={`${styles.codeLine} ${currentLine === idx ? styles.activeCodeLine : ''}`}
              >
                <span className={styles.lineNumber}>{idx + 1}</span>
                <span className={styles.lineContent}>{line}</span>
              </div>
            ))}
          </div>

          <div className={styles.actions}>
            <button 
              type="button" 
              className={`${styles.btn} ${styles.btnPrimary}`} 
              onClick={handleStep}
              disabled={isGcRunning}
            >
              {stepCount === 14 ? 'RESET CODE' : 'STEP CODE'}
            </button>
            <button 
              type="button" 
              className={`${styles.btn} ${styles.btnSecondary}`}
              onClick={handleGc}
              disabled={isGcRunning || !heap.some(h => h.isStale)}
            >
              {isGcRunning ? 'SWEEPING...' : 'RUN GARBAGE COLLECTOR'}
            </button>
            <button 
              type="button" 
              className={`${styles.btn} ${styles.btnReset}`}
              onClick={handleReset}
              disabled={isGcRunning}
            >
              RESET
            </button>
          </div>
        </div>

        {/* Right Column: Visual Stack and Heap representation */}
        <div className={styles.memoryGrid}>
          {/* Stack segment */}
          <div className={styles.stackSegment}>
            <div className={styles.segmentHeader}>
              <span>Call Stack (LIFO)</span>
              <span className={styles.segmentDetails}>{stack.length} frames</span>
            </div>
            
            <div ref={stackRef} className={styles.stackBody}>
              {stack.length === 0 ? (
                <span className={styles.placeholder}>Stack empty. Click &quot;Step Code&quot; to begin.</span>
              ) : (
                [...stack].reverse().map((frame) => (
                  <div key={frame.id} className={styles.stackFrame}>
                    <div className={styles.frameName}>{frame.name}</div>
                    <div className={styles.frameVariables}>
                      <span className={styles.varLabel}>{frame.variable}:</span>
                      <span className={styles.varVal}>{frame.value}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Heap segment */}
          <div className={styles.heapSegment}>
            <div className={styles.segmentHeader}>
              <span>Heap Allocation (GC Target)</span>
              <span className={styles.segmentDetails}>
                {heap.reduce((acc, h) => acc + (h.isStale ? 0 : h.size), 0)} bytes allocated
              </span>
            </div>
            
            <div ref={heapRef} className={styles.heapBody}>
              {heap.map((block) => (
                <div 
                  key={block.address} 
                  className={`${styles.heapBlock} ${block.isStale ? styles.heapBlockStale : ''}`}
                >
                  <div className={styles.blockAddress}>{block.address}</div>
                  <div className={styles.blockName}>{block.name}</div>
                  <div className={styles.blockDetails}>
                    <span>{block.size}B</span>
                    <span>Refs: {block.refCount}</span>
                  </div>
                  {block.isStale && (
                    <div className={styles.staleSweepOverlay}>GC Target</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Terminal log panel */}
      <div className={styles.logsFooter}>
        <div className={styles.logsHeader}>
          <div className={styles.dotGroup}>
            <span className={styles.redDot}></span>
            <span className={styles.yellowDot}></span>
            <span className={styles.greenDot}></span>
          </div>
          <span className={styles.logsTitle}>jvm_memory_telemetry.log</span>
        </div>
        <div ref={logsBodyRef} className={styles.logsBody}>
          {logs.map((log, index) => {
            let colorClass = styles.logInfo;
            if (log.includes('[JVM]')) colorClass = styles.logJvm;
            if (log.includes('[STACK]')) colorClass = styles.logStack;
            if (log.includes('[HEAP]')) colorClass = styles.logHeap;
            if (log.includes('[GC_WARN]')) colorClass = styles.logGcWarn;
            if (log.includes('[ZGC]')) colorClass = styles.logZgc;
            
            return (
              <div key={index} className={`${styles.logLine} ${colorClass}`}>
                {log}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
