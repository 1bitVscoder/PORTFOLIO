'use client';

import { useState, useEffect, useRef } from 'react';
import { useReducedMotion } from '@/lib/useReducedMotion';
import { playClick } from '@/lib/audio';
import { gsap } from '@/lib/gsap';
import styles from './AiVisualizer.module.css';

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

export function AiVisualizer() {
  const [query, setQuery] = useState('');
  const [isRouting, setIsRouting] = useState(false);
  const [activeRoute, setActiveRoute] = useState<'idle' | 'code' | 'creative' | 'debug' | 'generic'>('idle');
  const [scores, setScores] = useState({ code: 0, creative: 0, debug: 0 });
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [outputResponse, setOutputResponse] = useState('');
  const [telemetry, setTelemetry] = useState({ latency: 0, tokens: 0, speed: 0, cost: 0 });
  
  // API Key local state
  const [apiKey, setApiKey] = useState('');
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);

  const reducedMotion = useReducedMotion();
  const logsBodyRef = useRef<HTMLDivElement>(null);
  const outputConsoleRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Load API Key from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setApiKey(localStorage.getItem('user-gemini-key') || '');
    }
  }, []);

  const saveApiKey = (key: string) => {
    setApiKey(key);
    if (typeof window !== 'undefined') {
      localStorage.setItem('user-gemini-key', key);
    }
  };

  // Play high-frequency stream token beep using native Web Audio
  const playTokenBeep = () => {
    if (typeof window === 'undefined') return;
    const muted = localStorage.getItem('site-muted') === 'true';
    if (muted) return;

    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200 + Math.random() * 300, ctx.currentTime);
      gain.gain.setValueAtTime(0.006, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.03);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.03);
    } catch (e) {
      // Fallback silently if audio context is blocked
    }
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

  // Triggers API Call (Client-direct OR Server Proxy OR Offline Fallback)
  const fetchModelResponse = async (model: string, prompt: string, instruction: string): Promise<string> => {
    // 1. Client-side direct call if user configured a client API key
    if (apiKey.trim()) {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          systemInstruction: { parts: [{ text: instruction }] },
          generationConfig: { maxOutputTokens: 1024, temperature: 0.7 }
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || 'Client direct API request failed');
      }

      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    }

    // 2. Server-side proxy call
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

    const lowerQuery = processedQuery.toLowerCase();
    let targetRoute: 'code' | 'creative' | 'debug' | 'generic' = 'generic';
    let targetScores = { code: 10, creative: 10, debug: 10 };
    let modelName = 'gemini-2.5-flash';

    if (
      lowerQuery.includes('rust') ||
      lowerQuery.includes('sorting') ||
      lowerQuery.includes('algorithm') ||
      lowerQuery.includes('code') ||
      lowerQuery.includes('function')
    ) {
      targetRoute = 'code';
      targetScores = { code: 92, creative: 3, debug: 5 };
      modelName = 'gemini-2.5-pro'; // Pro for coding
    } else if (
      lowerQuery.includes('tagline') ||
      lowerQuery.includes('database product') ||
      lowerQuery.includes('marketing') ||
      lowerQuery.includes('creative') ||
      lowerQuery.includes('tag')
    ) {
      targetRoute = 'creative';
      targetScores = { code: 2, creative: 94, debug: 4 };
      modelName = 'gemini-2.5-flash'; // Flash for creative/speed
    } else if (
      lowerQuery.includes('docker') ||
      lowerQuery.includes('logs') ||
      lowerQuery.includes('crashed') ||
      lowerQuery.includes('container') ||
      lowerQuery.includes('debug')
    ) {
      targetRoute = 'debug';
      targetScores = { code: 6, creative: 2, debug: 92 };
      modelName = 'gemini-1.5-flash'; // 1.5 Flash for fast diagnostics
    } else {
      targetRoute = 'generic';
      targetScores = { code: 34, creative: 33, debug: 33 };
      modelName = 'gemini-2.5-flash';
    }

    const systemInstruction = `
You are an advanced agentic AI assistant on zenith's portfolio.
Your response MUST be formatted in two distinct parts:
1. Internal thinking/reasoning process wrapped inside <thinking>...</thinking> tags. Outline your steps, constraints, and algorithmic reasoning. Keep this section under 120 words.
2. The final answer OUTSIDE the <thinking> tags. If code is requested, output it inside markdown code blocks.

Example structure:
<thinking>
- Step 1: Parse requirements.
- Step 2: Formulate QuickSort logic.
</thinking>
\`\`\`rust
pub fn sort() { ... }
\`\`\`
`;

    // Step 1: Animate intent scoring
    addLog(`[ROUTER] Classifying intent for query: "${processedQuery.substring(0, 45)}${processedQuery.length > 45 ? '...' : ''}"`);
    if (isTruncated) {
      addLog(`[WARNING] Query length exceeds playground budget. Truncating to 300 chars.`);
    }

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

    addLog(`[ROUTER] Target route selected: ${targetRoute.toUpperCase()} (${targetScores[targetRoute === 'generic' ? 'code' : targetRoute]}% confidence)`);
    addLog(`[GATEWAY] Routing content to model: ${modelName}`);
    setActiveRoute(targetRoute);

    // Call API or fallback
    let rawResponse = '';
    let isFallback = false;
    const startFetchTime = performance.now();

    try {
      addLog(`[API] Establishing secure stream to Gemini network...`);
      rawResponse = await fetchModelResponse(modelName, processedQuery, systemInstruction);
    } catch (e: any) {
      addLog(`[API_ERROR] ${e.message || 'Gemini API call failed.'}`);
      addLog(`[SYSTEM] Falling back to local offline simulation engine.`);
      rawResponse = OFFLINE_RESPONSES[targetRoute] || OFFLINE_RESPONSES.generic;
      isFallback = true;
    }

    const elapsedLatency = Math.round(performance.now() - startFetchTime);
    addLog(`[GATEWAY] Stream established. Parsing reasoning and content blocks...`);

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
      addLog(`\n[THINKING PROCESS]`);
      const thinkingLines = thinkingBlock.split('\n');
      let lineIdx = 0;

      const printThinkingLines = () => {
        if (lineIdx < thinkingLines.length) {
          addLog(`  ${thinkingLines[lineIdx]}`);
          lineIdx++;
          playTokenBeep();
          setTimeout(printThinkingLines, 100);
        } else {
          // 2. Stream final response outside thinking blocks in the Monitor
          addLog(`[STREAM] Output stream open. Dispatching response...`);
          
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
              addLog(`[STREAM] Stream closed. 100% of tokens generated.`);
              addLog(`[SYSTEM] Compiler routing visualizer idle.`);
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
              <button 
                className={styles.settingsBtn} 
                onClick={() => setShowApiKeyInput(!showApiKeyInput)}
                title="Configure Gemini API Key"
                disabled={isRouting}
              >
                {apiKey ? '🔑' : '⚙️'}
              </button>
            </div>

            {showApiKeyInput && (
              <div className={styles.apiKeyPanel}>
                <span className={styles.panelLabel}>Gemini API Key (Local Browser Storage)</span>
                <div className={styles.keyInputRow}>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => saveApiKey(e.target.value)}
                    placeholder="Enter your AIzaSy... API key"
                    className={styles.keyInput}
                  />
                  {apiKey && (
                    <button className={styles.clearKeyBtn} onClick={() => saveApiKey('')}>
                      Clear
                    </button>
                  )}
                </div>
                <p className={styles.keyNotice}>
                  Your key is saved locally in localStorage for direct client-side requests. If empty, the system will use your server-side key or fallback to local simulations.
                </p>
              </div>
            )}

            {/* Pipeline Network Canvas */}
            <div className={styles.pipelineArea}>
              <svg className={styles.networkSvg} viewBox="0 0 500 240">
                {/* Connection lines */}
                {/* Line: Input -> Router */}
                <line
                  x1="50" y1="120" x2="160" y2="120"
                  className={`${styles.connLine} ${isRouting ? styles.activeConn : ''}`}
                />
                
                {/* Route: Router -> Gemini 2.5 Pro (Code) */}
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

                {/* Route: Router -> Gemini 1.5 Flash (Debug) */}
                <path
                  d="M 190 120 Q 280 200, 370 200"
                  className={`${styles.connLine} ${activeRoute === 'debug' ? styles.activeRouteDebug : ''}`}
                  fill="none"
                />

                {/* Nodes */}
                {/* Node: Input */}
                <circle cx="50" cy="120" r="16" className={styles.nodeCircle} data-node="input" />
                <text x="50" y="148" textAnchor="middle" className={styles.nodeLabel}>Input</text>

                {/* Node: Router */}
                <rect x="140" y="100" width="50" height="40" rx="6" className={styles.nodeRect} data-node="router" />
                <text x="165" y="124" textAnchor="middle" className={styles.routerLabel}>Router</text>

                {/* Node: Gemini Pro */}
                <rect 
                  x="370" y="20" width="100" height="40" rx="6" 
                  className={`${styles.nodeRect} ${activeRoute === 'code' ? styles.pulsePro : ''}`} 
                  data-node="pro" 
                />
                <text x="420" y="44" textAnchor="middle" className={styles.modelLabel}>Gemini 2.5 Pro</text>

                {/* Node: Gemini 2.5 Flash */}
                <rect 
                  x="370" y="100" width="100" height="40" rx="6" 
                  className={`${styles.nodeRect} ${activeRoute === 'creative' ? styles.pulseGroq : ''}`} 
                  data-node="groq" 
                />
                <text x="420" y="124" textAnchor="middle" className={styles.modelLabel}>Gemini 2.5 Flash</text>

                {/* Node: Gemini 1.5 Flash */}
                <rect 
                  x="370" y="180" width="100" height="40" rx="6" 
                  className={`${styles.nodeRect} ${activeRoute === 'debug' ? styles.pulseFlash : ''}`} 
                  data-node="flash" 
                />
                <text x="420" y="204" textAnchor="middle" className={styles.modelLabel}>Gemini 1.5 Flash</text>
              </svg>
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
              <div ref={outputConsoleRef} className={styles.outputConsole} data-lenis-prevent>
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
          <div ref={logsBodyRef} className={styles.logsBody} data-lenis-prevent>
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
