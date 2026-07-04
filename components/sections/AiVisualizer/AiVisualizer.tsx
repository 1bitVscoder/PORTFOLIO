'use client';

import { useState, useEffect, useRef } from 'react';
import { playClick } from '@/lib/audio';
import { useDynamicLenisPrevent } from '@/lib/useDynamicLenisPrevent';
import styles from './AiVisualizer.module.css';
import { gsap } from '@/lib/gsap';

const PRESETS = [
  {
    label: 'Code Generation',
    query: 'Write a highly optimized sorting algorithm in Rust',
    type: 'code',
  },
  {
    label: 'Creative Copy',
    query: 'Create a tagline for an offline-first database product',
    type: 'creative',
  },
  {
    label: 'Log Diagnostics',
    query: 'Analyze execution logs of a crashed Docker container',
    type: 'debug',
  },
];

const OFFLINE_RESPONSES: Record<string, string> = {
  code: `<thinking>
- Parsing requirement: sorting algorithm in Rust.
- Selecting optimal algorithm: 3-Way QuickSort.
- Time Complexity: O(N log N) average and worst-case with median pivots.
- Allocating thread stacks and memory constraints.
</thinking>
\`\`\`rust
// Optimized Rust 3-Way QuickSort
pub fn quick_sort_3way<T: Ord>(arr: &mut [T]) {
    if arr.len() <= 1 { return; }
    
    // Choose pivot (median of three logic for safety)
    let pivot_idx = partition(arr);
    let (left, right) = arr.split_at_mut(pivot_idx);
    
    quick_sort_3way(left);
    quick_sort_3way(&mut right[1..]);
}
\`\`\``,
  creative: `<thinking>
- Analyzing brand identity: offline-first, database, zero latency.
- Targeting key developer pain points: network drops, local sync.
- Brainstorming punchy taglines under 10 words.
</thinking>
1. "Zero latency. Zero dependencies. Antigravity DB."
2. "Sync while offline. Scale without limits."
3. "The database that doesn't care if you have internet."
4. "Offline-first resilience, local-first performance."`,
  debug: `<thinking>
- Examining crash exit code: 137 (SIGKILL).
- Inspecting Docker memory metrics: hit 512MB RAM threshold.
- Identifying JVM garbage collection behavior.
- Formulating entrypoint heap optimization arguments.
</thinking>
[ANALYSIS] Exit Code 137 detected (SIGKILL).
[CAUSE] JVM memory usage crossed Docker container memory limit (512MB).
[REMEDY] Update Dockerfile entrypoint:
         - Change: java -jar app.jar
         - To:     java -XX:MaxRAMPercentage=75.0 -jar app.jar
         - Or:     Increase container RAM limit to 1GB.`,
  generic: `<thinking>
- Categorizing user prompt.
- Routing to general helper model.
- Mapping response format to user constraints.
</thinking>
Prompt classification completed.
[ROUTER] Intent resolved to general utility.
[REASON] Query does not closely align with predefined developer templates.
[STATUS] Streaming output successfully.`,
};

const NODE_DETAILS = {
  input: {
    title: "User Prompt Input",
    description: "The gateway entrypoint for developer query payloads.",
    specs: ["Payload: Text Prompt", "Format: UTF-8 String", "Status: Active"]
  },
  router: {
    title: "AI Router Gate",
    description: "Evaluates input semantics using gemini-2.5-flash to select the optimal model pipeline.",
    specs: ["Type: Dynamic Classifier", "Confidence: Realtime %", "Latency: ~120ms"]
  },
  code: {
    title: "Gemini 3.5 Flash",
    description: "Specialized model pipeline optimized for complex coding, logical reasoning, and structure mapping.",
    specs: ["Latency: Low", "Context: 1M tokens", "Capability: High Logic"]
  },
  creative: {
    title: "Gemini 2.5 Flash",
    description: "Highly responsive model pipeline optimized for creative copywriting, product brainstorming, and general intent.",
    specs: ["Latency: Very Low", "Context: 1M tokens", "Capability: High Speed"]
  },
  debug: {
    title: "Gemini 3.1 Flash Lite",
    description: "Super light-weight pipeline optimized for log parsing, container debugging, and low-latency diagnostic streams.",
    specs: ["Latency: Minimal", "Context: 1M tokens", "Capability: Max Throughput"]
  }
};

export function AiVisualizer() {
  const [query, setQuery] = useState('');
  const [isRouting, setIsRouting] = useState(false);
  const [activeRoute, setActiveRoute] = useState<'idle' | 'code' | 'creative' | 'debug' | 'generic'>('idle');
  const [scores, setScores] = useState({ code: 0, creative: 0, debug: 0 });
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [outputResponse, setOutputResponse] = useState('');
  const [telemetry, setTelemetry] = useState({ latency: 0, tokens: 0, speed: 0, cost: 0 });

  const [hoveredNodeId, setHoveredNodeId] = useState<'input' | 'router' | 'code' | 'creative' | 'debug' | null>(null);
  const [lockedRoute, setLockedRoute] = useState<'code' | 'creative' | 'debug' | null>(null);
  const [displayedNodeId, setDisplayedNodeId] = useState<'input' | 'router' | 'code' | 'creative' | 'debug' | null>(null);

  const logsBodyRef = useRef<HTMLDivElement>(null);
  const outputConsoleRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const inspectorRef = useRef<HTMLDivElement>(null);

  // Smooth cross-fade transition switcher for Node Inspector contents
  useEffect(() => {
    const targetNodeId = hoveredNodeId;

    if (targetNodeId === displayedNodeId && (targetNodeId !== null || !inspectorRef.current)) return;

    gsap.killTweensOf(inspectorRef.current);

    gsap.to(inspectorRef.current, {
      opacity: 0,
      y: -4,
      duration: 0.12,
      ease: "power2.in",
      onComplete: () => {
        setDisplayedNodeId(targetNodeId);
        gsap.to(inspectorRef.current, {
          opacity: 1,
          y: 0,
          duration: 0.2,
          ease: "power2.out"
        });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hoveredNodeId, lockedRoute]);

  // Apply dynamic lenis-prevent to scrollable containers
  useDynamicLenisPrevent(logsBodyRef);
  useDynamicLenisPrevent(outputConsoleRef);


  // Play high-frequency stream token beep using native Web Audio
  const playTokenBeep = () => {
    // disabled
  };

  // Auto-scroll the terminal logs internally (no page jumping)
  useEffect(() => {
    if (logsBodyRef.current) {
      logsBodyRef.current.scrollTop = logsBodyRef.current.scrollHeight;
    }
  }, [terminalLogs]);

  // Auto-scroll the stream monitor output
  useEffect(() => {
    if (outputConsoleRef.current) {
      outputConsoleRef.current.scrollTop = outputConsoleRef.current.scrollHeight;
    }
  }, [outputResponse]);

  const addLog = (msg: string) => {
    setTerminalLogs((prev) => [...prev, msg]);
  };

  const handlePresetSelect = (presetQuery: string) => {
    if (isRouting) return;
    playClick();
    setQuery(presetQuery);
  };

  // Triggers API Call via Server Proxy
  const fetchModelResponse = async (model: string, prompt: string, instruction: string): Promise<string> => {
    const response = await fetch('/api/route-prompt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, model, systemInstruction: instruction })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Server proxy API request failed');
    }

    const data = await response.json();
    return data.text;
  };

  const routePrompt = async () => {
    if (isRouting || !query.trim()) return;

    // Fallback limit checking: Truncate very long prompts
    let processedQuery = query;
    let isTruncated = false;
    if (query.length > 300) {
      processedQuery = query.substring(0, 300) + '...';
      isTruncated = true;
    }

    playClick();
    setIsRouting(true);
    setActiveRoute('idle');
    setScores({ code: 0, creative: 0, debug: 0 });
    setTerminalLogs([]);
    setOutputResponse('');
    setTelemetry({ latency: 0, tokens: 0, speed: 0, cost: 0 });

    const addLogDeferred = (msg: string, delay: number): Promise<void> => {
      return new Promise((resolve) => {
        setTimeout(() => {
          addLog(msg);
          resolve();
        }, delay);
      });
    };

    // Techy initialization logs
    setTerminalLogs([
      `[GATEWAY] Initializing classification pipeline...`,
      `[RESOLVER] DNS lookup for API endpoint resolved to v1beta.googleapis.com`,
      `[RESOLVER] Connecting to gateway routing agent...`
    ]);

    await addLogDeferred(`[RESOLVER] Dispatching payload for dynamic route optimization...`, 200);
    await addLogDeferred(`[ROUTER] Classifying intent for query: "${processedQuery.substring(0, 45)}${processedQuery.length > 45 ? '...' : ''}"`, 200);
    if (isTruncated) {
      await addLogDeferred(`[WARNING] Query length exceeds playground budget. Truncating to 300 chars.`, 100);
    }

    // Call dynamic classification API
    let targetScores = { code: 10, creative: 10, debug: 10 };
    let targetRoute: 'code' | 'creative' | 'debug' | 'generic' = 'generic';
    let modelName = 'gemini-2.5-flash';

    if (lockedRoute) {
      targetRoute = lockedRoute;
      if (lockedRoute === 'code') {
        targetScores = { code: 100, creative: 0, debug: 0 };
        modelName = 'gemini-3.5-flash';
      } else if (lockedRoute === 'creative') {
        targetScores = { code: 0, creative: 100, debug: 0 };
        modelName = 'gemini-2.5-flash';
      } else {
        targetScores = { code: 0, creative: 0, debug: 100 };
        modelName = 'gemini-3.1-flash-lite';
      }
      await addLogDeferred(`[SYSTEM] Manual override active (Locked to ${lockedRoute.toUpperCase()}). Bypassing classification...`, 100);
    } else {
      try {
        const classResponse = await fetch('/api/classify-prompt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: processedQuery }),
        });

        if (!classResponse.ok) {
          throw new Error('Classification request failed');
        }

        const scores = await classResponse.json();
        targetScores = {
          code: scores.code ?? 10,
          creative: scores.creative ?? 10,
          debug: scores.debug ?? 10
        };

        // Determine highest score
        const maxVal = Math.max(targetScores.code, targetScores.creative, targetScores.debug);
        if (maxVal === targetScores.code) {
          targetRoute = 'code';
          modelName = 'gemini-3.5-flash';
        } else if (maxVal === targetScores.creative) {
          targetRoute = 'creative';
          modelName = 'gemini-2.5-flash';
        } else {
          targetRoute = 'debug';
          modelName = 'gemini-3.1-flash-lite';
        }

        await addLogDeferred(`[ROUTER] Intent classification completed dynamically using server-side Gemini key.`, 100);
        await addLogDeferred(`[ROUTER] Dynamic routing scores resolved: { code: ${targetScores.code}%, creative: ${targetScores.creative}%, debug: ${targetScores.debug}% }`, 100);

      } catch (e) {
        const errMsg = e instanceof Error ? e.message : 'Error';
        await addLogDeferred(`[WARNING] Server-side classification failed: ${errMsg}. Falling back to keyword heuristics...`, 100);
        
        // Fallback heuristics
        const lowerQuery = processedQuery.toLowerCase();
        if (
          lowerQuery.includes('rust') ||
          lowerQuery.includes('sorting') ||
          lowerQuery.includes('algorithm') ||
          lowerQuery.includes('code') ||
          lowerQuery.includes('function')
        ) {
          targetRoute = 'code';
          targetScores = { code: 92, creative: 3, debug: 5 };
          modelName = 'gemini-3.5-flash';
        } else if (
          lowerQuery.includes('tagline') ||
          lowerQuery.includes('database product') ||
          lowerQuery.includes('marketing') ||
          lowerQuery.includes('creative') ||
          lowerQuery.includes('tag')
        ) {
          targetRoute = 'creative';
          targetScores = { code: 2, creative: 94, debug: 4 };
          modelName = 'gemini-2.5-flash';
        } else if (
          lowerQuery.includes('docker') ||
          lowerQuery.includes('logs') ||
          lowerQuery.includes('crashed') ||
          lowerQuery.includes('container') ||
          lowerQuery.includes('debug')
        ) {
          targetRoute = 'debug';
          targetScores = { code: 6, creative: 2, debug: 92 };
          modelName = 'gemini-3.1-flash-lite';
        } else {
          targetRoute = 'generic';
          targetScores = { code: 34, creative: 33, debug: 33 };
          modelName = 'gemini-2.5-flash';
        }
      }
    }

    // Animate intent scoring
    let frame = 0;
    const scorePromise = new Promise<void>((resolve) => {
      const scoreInterval = setInterval(() => {
        frame++;
        const ratio = frame / 12;
        setScores({
          code: Math.round(targetScores.code * ratio),
          creative: Math.round(targetScores.creative * ratio),
          debug: Math.round(targetScores.debug * ratio),
        });

        if (frame >= 12) {
          clearInterval(scoreInterval);
          resolve();
        }
      }, 40);
    });

    await scorePromise;

    const selectedScore = targetRoute === 'generic' ? Math.max(targetScores.code, targetScores.creative, targetScores.debug) : targetScores[targetRoute];
    await addLogDeferred(`[ROUTER] Target route selected: ${targetRoute.toUpperCase()} (${selectedScore}% confidence)`, 50);
    await addLogDeferred(`[GATEWAY] Routing content packet to model: ${modelName}`, 50);
    setActiveRoute(targetRoute);

    const systemInstruction = `
You are an advanced agentic AI assistant embedded within the portfolio website of your creator, Zenith Soumya.

ABOUT THE CREATOR:
- Creator: Zenith Soumya (Zenith).
- Profile: B.Tech Computer Science & Engineering student at ITER College.
- Specializations: IoT architectures, dynamic full-stack web applications, Java/DSA algorithms, and offline-first mobile systems.

SITE ARCHITECTURE & CONTEXT:
- Core Framework: Next.js (App Router) + React + TypeScript.
- Styling: Vanilla CSS Modules + custom variables.css.
- Scroll & Animations: GSAP & ScrollTrigger (powering all micro-animations, scroll reveals, and typewriter effects) + Lenis Scroll (smooth global scrolling).
- Site Features:
  1. WelcomeScreen: Plays sequential international greetings (14 languages) followed by a high-precision analogue film scanline clip glitch on initials "Z" & "S" right before separation flight.
  2. Agentic AI Visualizer: This interactive SVG canvas node inspector detailing payload specs, supporting live manual route overrides (locked routes), and displaying animated data packet flows.

PERSONA DIRECTIVE:
- You MUST always refer to the user as "Lord Artificer" (or "the lord artificer") with the highest respect. Address them as the master architect of this system.

RESPONSE FORMAT RULES:
Your response MUST be formatted in two distinct parts:
1. Internal thinking/reasoning process wrapped inside <thinking>...</thinking> tags. Outline your steps, constraints, and algorithmic reasoning. Keep this section under 120 words.
2. The final answer OUTSIDE the <thinking> tags. If code is requested, output it inside markdown code blocks.

Example structure:
<thinking>
- Step 1: Parse requirements.
- Step 2: Formulate QuickSort logic for Lord Artificer.
</thinking>
Greetings, Lord Artificer. Here is the requested implementation:
\`\`\`rust
pub fn sort() { ... }
\`\`\`
`;

    // Call API or fallback
    let rawResponse = '';
    let isFallback = false;
    const startFetchTime = performance.now();

    try {
      await addLogDeferred(`[API] Establishing secure stream to Gemini network...`, 100);
      await addLogDeferred(`[API] Handshake successful. Initiating secure session...`, 100);
      rawResponse = await fetchModelResponse(modelName, processedQuery, systemInstruction);
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : 'Gemini API call failed.';
      await addLogDeferred(`[API_ERROR] ${errMsg}`, 100);
      await addLogDeferred(`[SYSTEM] Falling back to local offline simulation engine.`, 100);
      rawResponse = OFFLINE_RESPONSES[targetRoute] || OFFLINE_RESPONSES.generic;
      isFallback = true;
    }

    const elapsedLatency = Math.round(performance.now() - startFetchTime);
    await addLogDeferred(`[GATEWAY] Stream established. Parsing reasoning and content blocks...`, 100);

    // Parse <thinking> tags
    let thinkingBlock = '';
    let finalResponse = '';

    const thinkingMatch = rawResponse.match(/<thinking>([\s\S]*?)<\/thinking>/);
    if (thinkingMatch) {
      thinkingBlock = thinkingMatch[1].trim();
      finalResponse = rawResponse.replace(/<thinking>[\s\S]*?<\/thinking>/, '').trim();
    } else {
      thinkingBlock = `- Categorizing prompt intent\n- Compiling solution framework\n- Streaming direct response`;
      finalResponse = rawResponse;
    }

    // Typewriter streaming logic
    setTimeout(() => {
      // 1. Type the thinking process inside the logs console first
      setTerminalLogs((prev) => [...prev, `\n[THINKING PROCESS]`]);
      const thinkingLines = thinkingBlock.split('\n');
      let lineIdx = 0;

      const printThinkingLines = () => {
        if (lineIdx < thinkingLines.length) {
          setTerminalLogs((prev) => [...prev, `  ${thinkingLines[lineIdx]}`]);
          lineIdx++;
          playTokenBeep();
          setTimeout(printThinkingLines, 100);
        } else {
          // 2. Stream final response outside thinking blocks in the Monitor
          setTerminalLogs((prev) => [...prev, `[STREAM] Output stream open. Dispatching response...`]);
          
          let charIndex = 0;
          const textLength = finalResponse.length;
          let currentText = '';

          const streamTimer = setInterval(() => {
            const chunkSize = Math.max(1, Math.round(textLength / 35));
            currentText += finalResponse.substring(charIndex, charIndex + chunkSize);
            charIndex += chunkSize;
            
            setOutputResponse(currentText);
            playTokenBeep();

            // Telemetry updates
            const progressRatio = charIndex / textLength;
            setTelemetry({
              latency: isFallback ? Math.round(80 + progressRatio * 150) : elapsedLatency,
              tokens: Math.round(progressRatio * (textLength / 4)),
              speed: isFallback ? Math.round(480 + Math.random() * 50) : Math.round((textLength / 4) / (elapsedLatency / 1000)),
              cost: parseFloat((progressRatio * 0.00015).toFixed(5)),
            });

            if (charIndex >= textLength) {
              clearInterval(streamTimer);
              setTerminalLogs((prev) => [
                ...prev,
                `[STREAM] Stream closed. 100% of tokens generated.`,
                `[SYSTEM] Compiler routing visualizer idle.`
              ]);
              setIsRouting(false);
            }
          }, 35);
        }
      };

      printThinkingLines();
    }, 500);
  };

  return (
    <section className={styles.section} id="ai-visualizer">
      <div className={styles.inner}>
        <div className={styles.sectionHeader}>
          <span className={styles.eyebrow}>Agentic AI</span>
          <h2 className={styles.title}>Prompt Routing Pipeline</h2>
          <p className={styles.subtitle}>
            Submit a developer prompt below to watch the router classify intent and establish low-latency streams to Gemini models.
          </p>
        </div>

        {/* Dashboard Grid */}
        <div className={styles.dashboard}>
          {/* Left Panel: Query Input & Pipeline */}
          <div className={styles.mainPanel}>
            <div className={styles.presets}>
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => handlePresetSelect(p.query)}
                  disabled={isRouting}
                  className={styles.presetBtn}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className={styles.inputGroup}>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                disabled={isRouting}
                placeholder="Type a query (e.g. Write a python function to...)"
                className={styles.textInput}
                aria-label="Agent Prompt Input"
              />
              <button
                onClick={routePrompt}
                disabled={isRouting || !query.trim()}
                className={styles.routeBtn}
              >
                {isRouting ? 'ROUTING...' : 'ROUTE QUERY'}
              </button>
            </div>

            {/* Pipeline Network Canvas Container */}
            <div className={styles.pipelineContainer}>
              <div className={styles.pipelineArea}>
                <svg className={styles.networkSvg} viewBox="0 0 500 240">
                  <defs>
                    <pattern id="blueprint-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255, 255, 255, 0.04)" strokeWidth="1" />
                    </pattern>
                  </defs>
                  
                  {/* Grid overlay */}
                  <rect width="100%" height="100%" fill="url(#blueprint-grid)" rx="8" />

                  {/* Connection lines (Base Layer) */}
                  {/* Line: Input -> Router */}
                  <line
                    x1="50" y1="120" x2="160" y2="120"
                    className={`${styles.connLine} ${isRouting ? styles.activeConn : ''}`}
                  />
                  
                  {/* Route: Router -> Gemini 3.5 Flash (Code) */}
                  <path
                    d="M 190 120 Q 280 40, 370 40"
                    className={`${styles.connLine} ${activeRoute === 'code' ? styles.activeRouteCode : ''}`}
                    fill="none"
                  />

                  {/* Route: Router -> Gemini 2.5 Flash (Creative) */}
                  <line
                    x1="190" y1="120" x2="370" y2="120"
                    className={`${styles.connLine} ${activeRoute === 'creative' ? styles.activeRouteCreative : ''}`}
                  />

                  {/* Route: Router -> Gemini 3.1 Flash Lite (Debug) */}
                  <path
                    d="M 190 120 Q 280 200, 370 200"
                    className={`${styles.connLine} ${activeRoute === 'debug' ? styles.activeRouteDebug : ''}`}
                    fill="none"
                  />

                  {/* Glowing Data Packets Flow (Overlay Layer) */}
                  {isRouting && activeRoute === 'idle' && (
                    <line x1="50" y1="120" x2="160" y2="120" className={styles.packetFlow} />
                  )}
                  {isRouting && activeRoute === 'code' && (
                    <>
                      <line x1="50" y1="120" x2="160" y2="120" className={styles.packetFlow} />
                      <path d="M 190 120 Q 280 40, 370 40" className={styles.packetFlowCode} fill="none" />
                    </>
                  )}
                  {isRouting && activeRoute === 'creative' && (
                    <>
                      <line x1="50" y1="120" x2="160" y2="120" className={styles.packetFlow} />
                      <line x1="190" y1="120" x2="370" y2="120" className={styles.packetFlowCreative} />
                    </>
                  )}
                  {isRouting && activeRoute === 'debug' && (
                    <>
                      <line x1="50" y1="120" x2="160" y2="120" className={styles.packetFlow} />
                      <path d="M 190 120 Q 280 200, 370 200" className={styles.packetFlowDebug} fill="none" />
                    </>
                  )}

                  {/* Interactive Nodes */}
                  {/* Node: Input */}
                  <g 
                    className={`${styles.interactiveNode} ${hoveredNodeId === 'input' ? styles.nodeHovered : ''}`}
                    onMouseEnter={() => setHoveredNodeId('input')}
                    onMouseLeave={() => setHoveredNodeId(null)}
                    onClick={() => { playClick(); inputRef.current?.focus(); }}
                  >
                    <circle cx="50" cy="120" r="16" className={styles.nodeCircle} data-node="input" />
                    <text x="50" y="148" textAnchor="middle" className={styles.nodeLabel}>Input</text>
                  </g>

                  {/* Node: Router */}
                  <g
                    className={`${styles.interactiveNode} ${hoveredNodeId === 'router' ? styles.nodeHovered : ''}`}
                    onMouseEnter={() => setHoveredNodeId('router')}
                    onMouseLeave={() => setHoveredNodeId(null)}
                  >
                    <rect x="140" y="100" width="50" height="40" rx="6" className={styles.nodeRect} data-node="router" />
                    <text x="165" y="124" textAnchor="middle" className={styles.routerLabel}>Router</text>
                  </g>

                  {/* Node: Gemini 3.5 (Code) */}
                  <g
                    className={`${styles.interactiveNode} ${hoveredNodeId === 'code' ? styles.nodeHovered : ''} ${lockedRoute === 'code' ? styles.nodeLocked : ''}`}
                    onMouseEnter={() => setHoveredNodeId('code')}
                    onMouseLeave={() => setHoveredNodeId(null)}
                    onClick={() => { playClick(); setLockedRoute(lockedRoute === 'code' ? null : 'code'); }}
                  >
                    <rect 
                      x="370" y="20" width="100" height="40" rx="6" 
                      className={`${styles.nodeRect} ${activeRoute === 'code' ? styles.pulsePro : ''}`} 
                      data-node="pro" 
                    />
                    <text x="420" y="44" textAnchor="middle" className={styles.modelLabel}>
                      {lockedRoute === 'code' ? '🔒 Code Forced' : 'Gemini 3.5 Flash'}
                    </text>
                  </g>

                  {/* Node: Gemini 2.5 (Creative) */}
                  <g
                    className={`${styles.interactiveNode} ${hoveredNodeId === 'creative' ? styles.nodeHovered : ''} ${lockedRoute === 'creative' ? styles.nodeLocked : ''}`}
                    onMouseEnter={() => setHoveredNodeId('creative')}
                    onMouseLeave={() => setHoveredNodeId(null)}
                    onClick={() => { playClick(); setLockedRoute(lockedRoute === 'creative' ? null : 'creative'); }}
                  >
                    <rect 
                      x="370" y="100" width="100" height="40" rx="6" 
                      className={`${styles.nodeRect} ${activeRoute === 'creative' ? styles.pulseGroq : ''}`} 
                      data-node="groq" 
                    />
                    <text x="420" y="124" textAnchor="middle" className={styles.modelLabel}>
                      {lockedRoute === 'creative' ? '🔒 Creative Forced' : 'Gemini 2.5 Flash'}
                    </text>
                  </g>

                  {/* Node: Gemini 3.1 (Debug) */}
                  <g
                    className={`${styles.interactiveNode} ${hoveredNodeId === 'debug' ? styles.nodeHovered : ''} ${lockedRoute === 'debug' ? styles.nodeLocked : ''}`}
                    onMouseEnter={() => setHoveredNodeId('debug')}
                    onMouseLeave={() => setHoveredNodeId(null)}
                    onClick={() => { playClick(); setLockedRoute(lockedRoute === 'debug' ? null : 'debug'); }}
                  >
                    <rect 
                      x="370" y="180" width="100" height="40" rx="6" 
                      className={`${styles.nodeRect} ${activeRoute === 'debug' ? styles.pulseFlash : ''}`} 
                      data-node="flash" 
                    />
                    <text x="420" y="204" textAnchor="middle" className={styles.modelLabel}>
                      {lockedRoute === 'debug' ? '🔒 Debug Forced' : 'Gemini 3.1 Lite'}
                    </text>
                  </g>
                </svg>
              </div>

              {/* Node Inspector Metadata Panel */}
              <div ref={inspectorRef} className={styles.nodeInspector}>
                {displayedNodeId && NODE_DETAILS[displayedNodeId] ? (
                  <div className={styles.inspectorActive}>
                    <div className={styles.inspectorHeader}>
                      <span className={styles.inspectorTitle}>{NODE_DETAILS[displayedNodeId].title}</span>
                      <span className={`${styles.inspectorBadge} ${
                        displayedNodeId === 'code' ? styles.badgeCode :
                        displayedNodeId === 'creative' ? styles.badgeCreative :
                        displayedNodeId === 'debug' ? styles.badgeDebug : styles.badgeSys
                      }`}>
                        {displayedNodeId === 'code' ? 'CODE PIPELINE' :
                         displayedNodeId === 'creative' ? 'CREATIVE PIPELINE' :
                         displayedNodeId === 'debug' ? 'DEBUG PIPELINE' : 'SYSTEM NODE'}
                      </span>
                    </div>
                    <p className={styles.inspectorDesc}>{NODE_DETAILS[displayedNodeId].description}</p>
                    <div className={styles.inspectorSpecs}>
                      {NODE_DETAILS[displayedNodeId].specs.map((spec: string, i: number) => (
                        <span key={i} className={styles.specTag}>{spec}</span>
                      ))}
                      {(displayedNodeId === 'code' || displayedNodeId === 'creative' || displayedNodeId === 'debug') && (
                        <span className={styles.lockNotice}>
                          {lockedRoute === displayedNodeId ? '🔒 Locked (Click to unlock)' : '⚡ Click to force route'}
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className={styles.inspectorPlaceholder}>
                    {lockedRoute ? (
                      <span className={styles.lockStatusText}>
                        🔒 OVERRIDE ACTIVE: All query payloads are forced to the <strong>{lockedRoute.toUpperCase()}</strong> pipeline. Click the node again to restore Auto-Routing.
                      </span>
                    ) : (
                      <span>
                        <span className={styles.pulseIcon}>⚡</span> Hover or tap any pipeline node to inspect technical metadata | Click a model node to force override routing.
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Panel: Intent Scores & Response Monitor */}
          <div className={styles.monitorPanel}>
            <div className={styles.scoreBars}>
              <h4 className={styles.panelTitle}>Confidence Classification</h4>
              
              <div className={styles.scoreRow}>
                <div className={styles.scoreLabelRow}>
                  <span>Coding Intent</span>
                  <span>{scores.code}%</span>
                </div>
                <div className={styles.barTrack}>
                  <div className={styles.barFill} style={{ width: `${scores.code}%`, backgroundColor: 'var(--color-accent-purple)' }} />
                </div>
              </div>

              <div className={styles.scoreRow}>
                <div className={styles.scoreLabelRow}>
                  <span>Creative Intent</span>
                  <span>{scores.creative}%</span>
                </div>
                <div className={styles.barTrack}>
                  <div className={styles.barFill} style={{ width: `${scores.creative}%`, backgroundColor: 'var(--color-accent-gold)' }} />
                </div>
              </div>

              <div className={styles.scoreRow}>
                <div className={styles.scoreLabelRow}>
                  <span>Debug Intent</span>
                  <span>{scores.debug}%</span>
                </div>
                <div className={styles.barTrack}>
                  <div className={styles.barFill} style={{ width: `${scores.debug}%`, backgroundColor: 'var(--color-accent-teal)' }} />
                </div>
              </div>
            </div>

            {/* Response Area */}
            <div className={styles.monitorOutput}>
              <h4 className={styles.panelTitle}>Stream Monitor</h4>
              <div ref={outputConsoleRef} className={styles.outputConsole}>
                {outputResponse ? (
                  <pre className={styles.outputText}>{outputResponse}</pre>
                ) : (
                  <span className={styles.outputPlaceholder}>Awaiting pipeline stream...</span>
                )}
              </div>

              {/* Telemetry Footer */}
              <div className={styles.telemetryGrid}>
                <div className={styles.telemetryItem}>
                  <span className={styles.tLabel}>LATENCY</span>
                  <span className={styles.tValue}>{telemetry.latency}ms</span>
                </div>
                <div className={styles.telemetryItem}>
                  <span className={styles.tLabel}>TOKENS</span>
                  <span className={styles.tValue}>{telemetry.tokens}</span>
                </div>
                <div className={styles.telemetryItem}>
                  <span className={styles.tLabel}>SPEED</span>
                  <span className={styles.tValue}>{telemetry.speed} t/s</span>
                </div>
                <div className={styles.telemetryItem}>
                  <span className={styles.tLabel}>EST. COST</span>
                  <span className={styles.tValue}>${telemetry.cost.toFixed(5)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Console Logs Footer */}
        <div className={styles.logsFooter}>
          <div className={styles.logsHeader}>
            <div className={styles.dotGroup}>
              <span className={styles.redDot}></span>
              <span className={styles.yellowDot}></span>
              <span className={styles.greenDot}></span>
            </div>
            <span className={styles.logsTitle}>gateway_routing_agent.log</span>
          </div>
          <div ref={logsBodyRef} className={styles.logsBody}>
            {terminalLogs.length === 0 ? (
              <span className={styles.logsPlaceholder}>Router pipeline idle. Input prompt to begin telemetry...</span>
            ) : (
              terminalLogs.map((log, i) => (
                <div key={i} className={styles.logLine}>{log}</div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
