'use client';

import { useState, useEffect, useRef } from 'react';
import { TransitionLink } from '@/components/transitions';
import { playClick, playSweep } from '@/lib/audio';
import { useDynamicLenisPrevent } from '@/lib/useDynamicLenisPrevent';
import styles from './CircuitBoard.module.css';

interface ComponentNode {
  id: string;
  type: 'switch' | 'and' | 'or' | 'not' | 'xor' | 'nand' | 'nor' | 'led';
  label: string;
  x: number;
  y: number;
  inputs: boolean[];
  output: boolean;
}

interface Wire {
  id: string;
  fromNodeId: string;
  fromPin: number; // Always 0 for 1-output nodes
  toNodeId: string;
  toPin: number;   // 0 or 1 for inputs
}

export function CircuitBoard() {
  const [mounted, setMounted] = useState(false);
  const [nodes, setNodes] = useState<ComponentNode[]>([]);
  const [wires, setWires] = useState<Wire[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [activePin, setActivePin] = useState<{ nodeId: string; isOutput: boolean; pinIndex: number } | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const workbenchRef = useRef<HTMLDivElement>(null);
  const logsBodyRef = useRef<HTMLDivElement>(null);
  // Stable ID counter — replaces Date.now() in render, which is impure and
  // can produce non-deterministic IDs across concurrent renders.
  const idCounterRef = useRef(0);
  const nextId = (prefix: string) => `${prefix}-${++idCounterRef.current}`;

  useDynamicLenisPrevent(logsBodyRef);

  const addLog = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString().split(' ')[0];
    setLogs((prev) => [...prev, `[${timestamp}] ${msg}`].slice(-25));
  };

  // Auto-scroll logs
  useEffect(() => {
    if (logsBodyRef.current) {
      logsBodyRef.current.scrollTop = logsBodyRef.current.scrollHeight;
    }
  }, [logs]);

  // Presets seeding — declared before the mount useEffect that calls
  // loadHalfAdderPreset, so the function is defined when the effect runs.
  const loadHalfAdderPreset = () => {
    playSweep();
    const adderNodes: ComponentNode[] = [
      { id: 'sw-a', type: 'switch', label: 'SWITCH_A', x: 80, y: 100, inputs: [], output: false },
      { id: 'sw-b', type: 'switch', label: 'SWITCH_B', x: 80, y: 220, inputs: [], output: false },
      { id: 'xor-sum', type: 'xor', label: 'XOR_SUM', x: 260, y: 90, inputs: [false, false], output: false },
      { id: 'and-carry', type: 'and', label: 'AND_CARRY', x: 260, y: 230, inputs: [false, false], output: false },
      { id: 'led-sum', type: 'led', label: 'LED_SUM', x: 440, y: 90, inputs: [false], output: false },
      { id: 'led-carry', type: 'led', label: 'LED_CARRY', x: 440, y: 230, inputs: [false], output: false },
    ];

    const adderWires: Wire[] = [
      { id: 'w1', fromNodeId: 'sw-a', fromPin: 0, toNodeId: 'xor-sum', toPin: 0 },
      { id: 'w2', fromNodeId: 'sw-b', fromPin: 0, toNodeId: 'xor-sum', toPin: 1 },
      { id: 'w3', fromNodeId: 'sw-a', fromPin: 0, toNodeId: 'and-carry', toPin: 0 },
      { id: 'w4', fromNodeId: 'sw-b', fromPin: 0, toNodeId: 'and-carry', toPin: 1 },
      { id: 'w5', fromNodeId: 'xor-sum', fromPin: 0, toNodeId: 'led-sum', toPin: 0 },
      { id: 'w6', fromNodeId: 'and-carry', fromPin: 0, toNodeId: 'led-carry', toPin: 0 },
    ];

    setNodes(adderNodes);
    setWires(adderWires);
    setSelectedNodeId(null);
    addLog(`[SYSTEM] Loaded Half Adder Preset.`);
  };

  const loadSrLatchPreset = () => {
    playSweep();
    const latchNodes: ComponentNode[] = [
      { id: 'sw-s', type: 'switch', label: 'SWITCH_SET', x: 80, y: 80, inputs: [], output: false },
      { id: 'sw-r', type: 'switch', label: 'SWITCH_RESET', x: 80, y: 240, inputs: [], output: false },
      { id: 'nor-q', type: 'nor', label: 'NOR_Q', x: 260, y: 90, inputs: [false, false], output: true },
      { id: 'nor-qb', type: 'nor', label: 'NOR_Q_BAR', x: 260, y: 230, inputs: [false, false], output: false },
      { id: 'led-q', type: 'led', label: 'LED_Q', x: 440, y: 90, inputs: [false], output: true },
      { id: 'led-qb', type: 'led', label: 'LED_Q_BAR', x: 440, y: 230, inputs: [false], output: false },
    ];

    const latchWires: Wire[] = [
      { id: 'lw1', fromNodeId: 'sw-s', fromPin: 0, toNodeId: 'nor-q', toPin: 0 },
      { id: 'lw2', fromNodeId: 'sw-r', fromPin: 0, toNodeId: 'nor-qb', toPin: 1 },
      { id: 'lw3', fromNodeId: 'nor-q', fromPin: 0, toNodeId: 'nor-qb', toPin: 0 },
      { id: 'lw4', fromNodeId: 'nor-qb', fromPin: 0, toNodeId: 'nor-q', toPin: 1 },
      { id: 'lw5', fromNodeId: 'nor-q', fromPin: 0, toNodeId: 'led-q', toPin: 0 },
      { id: 'lw6', fromNodeId: 'nor-qb', fromPin: 0, toNodeId: 'led-qb', toPin: 0 },
    ];

    setNodes(latchNodes);
    setWires(latchWires);
    setSelectedNodeId(null);
    addLog(`[SYSTEM] Loaded SR Latch Memory Preset.`);
  };

  // Initial Logs + default preset seed
  useEffect(() => {
    setMounted(true);
    setLogs([
      `[SYSTEM] Logic Board Simulation Engine v2.5 loaded.`,
      `[SYSTEM] Workbench grid initialized. Dynamic propagation active.`,
      `[TUTORIAL] Drag gates from toolbox, click output pins, and link them to input pins.`
    ]);
    loadHalfAdderPreset(); // Default seed

    return () => {
      window.dispatchEvent(new CustomEvent('canvas-hover-leave'));
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Real-Time Propagation Loop
  useEffect(() => {
    if (nodes.length === 0) return;

    const currentNodes = JSON.parse(JSON.stringify(nodes)) as ComponentNode[];
    let changed = true;
    let iterations = 0;
    const maxIterations = 35;

    // Fixed-point iteration loop to allow feedback loops (latches) to resolve
    while (changed && iterations < maxIterations) {
      changed = false;
      iterations++;

      // 1. Resolve inputs for each node based on wires
      for (const node of currentNodes) {
        if (node.type === 'switch') continue; // Inputs are toggled manually

        const originalInputs = [...node.inputs];
        
        // Clear inputs first
        node.inputs = node.inputs.map(() => false);

        // Find incoming connections
        const incomingWires = wires.filter((w) => w.toNodeId === node.id);
        for (const wire of incomingWires) {
          const sourceNode = currentNodes.find((n) => n.id === wire.fromNodeId);
          if (sourceNode) {
            node.inputs[wire.toPin] = sourceNode.output;
          }
        }

        // Check if inputs actually changed
        if (node.inputs.some((val, idx) => val !== originalInputs[idx])) {
          changed = true;
        }
      }

      // 2. Compute outputs based on gate logic
      for (const node of currentNodes) {
        const originalOutput = node.output;

        switch (node.type) {
          case 'and':
            node.output = node.inputs[0] && node.inputs[1];
            break;
          case 'or':
            node.output = node.inputs[0] || node.inputs[1];
            break;
          case 'not':
            node.output = !node.inputs[0];
            break;
          case 'xor':
            node.output = node.inputs[0] !== node.inputs[1];
            break;
          case 'nand':
            node.output = !(node.inputs[0] && node.inputs[1]);
            break;
          case 'nor':
            node.output = !(node.inputs[0] || node.inputs[1]);
            break;
          case 'led':
            node.output = node.inputs[0]; // LED state mirrors input
            break;
          default:
            break;
        }

        if (node.output !== originalOutput) {
          changed = true;
        }
      }
    }

    // Check for changes to apply to state
    const nodesChanged = JSON.stringify(nodes) !== JSON.stringify(currentNodes);
    if (nodesChanged) {
      setNodes(currentNodes);
      
      if (iterations >= maxIterations) {
        addLog(`[WARNING] Oscillatory feedback loop detected! Halted propagation.`);
      } else {
        // Log LED activations
        currentNodes.forEach((n) => {
          const oldNode = nodes.find((prevNode) => prevNode.id === n.id);
          if (n.type === 'led' && oldNode && n.output !== oldNode.output) {
            addLog(`[LED] Output '${n.label}' state changed: ${n.output ? 'HIGH (1)' : 'LOW (0)'}`);
          }
        });
      }
    }
  }, [wires, nodes]);

  // Create component node helper
  const addComponent = (type: ComponentNode['type']) => {
    playClick();
    const id = nextId('node');
    const x = 120 + Math.random() * 80;
    const y = 120 + Math.random() * 80;
    let inputCount = 2;
    if (type === 'switch') inputCount = 0;
    if (type === 'not' || type === 'led') inputCount = 1;

    const newNode: ComponentNode = {
      id,
      type,
      label: `${type.toUpperCase()}_${nodes.length + 1}`,
      x,
      y,
      inputs: Array(inputCount).fill(false),
      output: type === 'not' ? true : false,
    };

    setNodes((prev) => [...prev, newNode]);
    addLog(`[SPAWN] Added component: ${newNode.label}`);
  };

  // Toggle Switch state
  const handleToggleSwitch = (nodeId: string) => {
    playClick();
    setNodes((prev) =>
      prev.map((n) => {
        if (n.id === nodeId && n.type === 'switch') {
          const nextVal = !n.output;
          addLog(`[INPUT] Switch '${n.label}' toggled: ${nextVal ? '1' : '0'}`);
          return { ...n, output: nextVal };
        }
        return n;
      })
    );
  };

  // Handle Pin Click (Connections creation)
  const handlePinClick = (nodeId: string, isOutput: boolean, pinIndex: number) => {
    playClick();

    if (!activePin) {
      // First click: Must start from an output pin to follow direction flow
      if (!isOutput) {
        addLog(`[ERROR] Connections must start from an OUTPUT pin.`);
        return;
      }
      setActivePin({ nodeId, isOutput, pinIndex });
      addLog(`[CONNECT] Selected output pin from node... click input pin to connect.`);
    } else {
      // Second click: Must end on an input pin
      if (isOutput) {
        setActivePin(null);
        addLog(`[CONNECT] Connection cancelled (cannot link output to output).`);
        return;
      }
      
      if (nodeId === activePin.nodeId) {
        setActivePin(null);
        addLog(`[CONNECT] Connection cancelled (cannot connect a node to itself).`);
        return;
      }

      // Check if connection already exists
      const exists = wires.some((w) => w.toNodeId === nodeId && w.toPin === pinIndex);
      if (exists) {
        addLog(`[CONNECT] Input pin already has a connection. Remove first.`);
        setActivePin(null);
        return;
      }

      const newWire: Wire = {
        id: nextId('wire'),
        fromNodeId: activePin.nodeId,
        fromPin: activePin.pinIndex,
        toNodeId: nodeId,
        toPin: pinIndex,
      };

      setWires((prev) => [...prev, newWire]);
      setActivePin(null);
      addLog(`[CONNECT] Wire established successfully.`);
    }
  };

  // Drag and Drop handlers
  const handleNodeMouseDown = (e: React.MouseEvent, id: string) => {
    if (e.target instanceof HTMLButtonElement || e.target instanceof SVGCircleElement) return;
    
    const node = nodes.find((n) => n.id === id);
    if (!node) return;

    setDraggingNodeId(id);
    setSelectedNodeId(id);
    
    const rect = workbenchRef.current?.getBoundingClientRect();
    if (rect) {
      setDragOffset({
        x: e.clientX - rect.left - node.x,
        y: e.clientY - rect.top - node.y,
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggingNodeId || !workbenchRef.current) return;

    const rect = workbenchRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - dragOffset.x;
    const y = e.clientY - rect.top - dragOffset.y;

    // Constrain to workbench bounds
    const boundedX = Math.max(20, Math.min(rect.width - 120, x));
    const boundedY = Math.max(20, Math.min(rect.height - 80, y));

    setNodes((prev) =>
      prev.map((n) => (n.id === draggingNodeId ? { ...n, x: boundedX, y: boundedY } : n))
    );
  };

  const handleMouseUp = () => {
    setDraggingNodeId(null);
  };

  const deleteSelectedNode = () => {
    if (!selectedNodeId) return;
    playClick();

    const node = nodes.find((n) => n.id === selectedNodeId);
    if (!node) return;

    // Delete node
    setNodes((prev) => prev.filter((n) => n.id !== selectedNodeId));
    // Delete wires connected to node
    setWires((prev) => prev.filter((w) => w.fromNodeId !== selectedNodeId && w.toNodeId !== selectedNodeId));
    setSelectedNodeId(null);
    addLog(`[DELETE] Removed component: ${node.label}`);
  };

  const clearBoard = () => {
    playSweep();
    setNodes([]);
    setWires([]);
    setSelectedNodeId(null);
    setActivePin(null);
    addLog(`[SYSTEM] Workbench cleared.`);
  };

  // Presets are now declared above the mount useEffect (see lines above).

  return (
    <main className={styles.boardContainer}>
      {/* Top Header Controls */}
      <div className={styles.header}>
        <div className={styles.headerTitleGroup}>
          <TransitionLink 
            href="/arcade" 
            className={styles.backBtn} 
            onBeforeTransition={playClick}
            payload={{ accent: '#62B6CB' }}
          >
            ← BACK TO LIST
          </TransitionLink>
          <h1 className={styles.title}>LOGIC BOARD CIRCUIT DESIGNER</h1>
        </div>
        <p className={styles.subtitle}>
          Build, connect, and simulate active logic gate telemetry on a digital workbench canvas.
        </p>
      </div>

      <div className={styles.designerGrid}>
        {/* Toolbox column */}
        <div className={styles.toolboxPanel}>
          <h2 className={styles.panelTitle}>Toolbox</h2>
          <div className={styles.toolboxGroup}>
            <span className={styles.groupLabel}>Inputs & Outputs</span>
            <button type="button" className={styles.toolBtn} onClick={() => addComponent('switch')}>
              + TOGGLE SWITCH
            </button>
            <button type="button" className={styles.toolBtn} onClick={() => addComponent('led')}>
              + OUTPUT LED
            </button>
          </div>
          
          <div className={styles.toolboxGroup}>
            <span className={styles.groupLabel}>Logic Gates</span>
            <button type="button" className={styles.toolBtn} onClick={() => addComponent('not')}>
              + NOT GATE
            </button>
            <button type="button" className={styles.toolBtn} onClick={() => addComponent('and')}>
              + AND GATE
            </button>
            <button type="button" className={styles.toolBtn} onClick={() => addComponent('or')}>
              + OR GATE
            </button>
            <button type="button" className={styles.toolBtn} onClick={() => addComponent('xor')}>
              + XOR GATE
            </button>
            <button type="button" className={styles.toolBtn} onClick={() => addComponent('nand')}>
              + NAND GATE
            </button>
            <button type="button" className={styles.toolBtn} onClick={() => addComponent('nor')}>
              + NOR GATE
            </button>
          </div>

          <div className={styles.toolboxFooter}>
            {selectedNodeId && (
              <button type="button" className={styles.deleteBtn} onClick={deleteSelectedNode}>
                DELETE SELECTED
              </button>
            )}
            <button type="button" className={styles.clearBtn} onClick={clearBoard}>
              CLEAR CANVAS
            </button>
          </div>
        </div>

        {/* Workbench central column */}
        <div 
          ref={workbenchRef}
          className={styles.workbenchPanel}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseEnter={() => {
            window.dispatchEvent(new CustomEvent('canvas-hover-enter'));
          }}
          onMouseLeave={() => {
            handleMouseUp();
            window.dispatchEvent(new CustomEvent('canvas-hover-leave'));
          }}
        >
          {/* SVG canvas connections and grids */}
          <svg className={styles.svgCanvas}>
            {/* Grid Pattern */}
            <defs>
              <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
                <path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(255, 255, 255, 0.04)" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />

            {/* SVG Wires (Curved lines) */}
            {mounted && wires.map((wire) => {
              const fromNode = nodes.find((n) => n.id === wire.fromNodeId);
              const toNode = nodes.find((n) => n.id === wire.toNodeId);
              if (!fromNode || !toNode) return null;

              // Node pinout coordinate calculations
              const startX = fromNode.x + 85; 
              const startY = fromNode.y + 25; 

              const endX = toNode.x - 5;
              // If node has 2 inputs, split them vertically
              const toPinCount = toNode.inputs.length;
              const inputSpacing = toPinCount > 1 ? 16 : 0;
              const endY = toNode.y + 25 + (wire.toPin === 0 ? -inputSpacing/2 : inputSpacing/2);

              // Control points for cubic bezier curves
              const cp1X = startX + 50;
              const cp1Y = startY;
              const cp2X = endX - 50;
              const cp2Y = endY;

              const isHigh = fromNode.output;
              const pathData = `M ${startX} ${startY} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${endX} ${endY}`;

              return (
                <g key={wire.id}>
                  {/* Background thicker line for click hit-box / shadow glow */}
                  <path 
                    d={pathData} 
                    fill="none" 
                    stroke={isHigh ? 'rgba(98, 182, 203, 0.3)' : 'rgba(255, 255, 255, 0.02)'} 
                    strokeWidth="8"
                    className={styles.wireGlow}
                  />
                  {/* Active telemetry wire */}
                  <path 
                    d={pathData} 
                    fill="none" 
                    stroke={isHigh ? '#62B6CB' : '#333333'} 
                    strokeWidth="2.5"
                    strokeDasharray={isHigh ? '5,5' : 'none'}
                    className={isHigh ? styles.wireActive : ''}
                  />
                </g>
              );
            })}
          </svg>

          {/* Render draggable Component Nodes */}
          {mounted && nodes.map((node) => {
            const isSelected = selectedNodeId === node.id;
            const hasOutputs = node.type !== 'led';
            const inputCount = node.inputs.length;

            return (
              <div
                key={node.id}
                className={`${styles.componentNode} ${isSelected ? styles.nodeSelected : ''} ${node.type === 'switch' ? styles.nodeTypeSwitch : ''} ${node.type === 'led' ? styles.nodeTypeLed : ''}`}
                style={{ left: node.x, top: node.y }}
                onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
              >
                {/* Node Inputs pins */}
                <div className={styles.inputContainer}>
                  {Array.from({ length: inputCount }).map((_, idx) => {
                    const isConnected = wires.some((w) => w.toNodeId === node.id && w.toPin === idx);
                    const isActiveInput = node.inputs[idx];
                    return (
                      <button
                        key={idx}
                        type="button"
                        className={`${styles.pin} ${styles.inputPin} ${isActiveInput ? styles.pinActive : ''} ${isConnected ? styles.pinConnected : ''}`}
                        onClick={() => handlePinClick(node.id, false, idx)}
                        aria-label={`Connect Input Pin ${idx}`}
                      />
                    );
                  })}
                </div>

                {/* Node Center Label */}
                <div className={styles.nodeBody}>
                  {node.type === 'switch' ? (
                    <button 
                      type="button" 
                      className={`${styles.switchBtn} ${node.output ? styles.switchBtnHigh : ''}`}
                      onClick={() => handleToggleSwitch(node.id)}
                    >
                      {node.output ? 'HIGH (1)' : 'LOW (0)'}
                    </button>
                  ) : node.type === 'led' ? (
                    <div className={`${styles.ledIndicator} ${node.output ? styles.ledIndicatorOn : ''}`} />
                  ) : (
                    <span className={styles.gateLabel}>{node.type.toUpperCase()}</span>
                  )}
                  <span className={styles.nodeTitle}>{node.label}</span>
                </div>

                {/* Node Output pin */}
                {hasOutputs && (
                  <button
                    type="button"
                    className={`${styles.pin} ${styles.outputPin} ${node.output ? styles.pinActive : ''} ${
                      activePin?.nodeId === node.id && activePin.isOutput ? styles.pinConnecting : ''
                    }`}
                    onClick={() => handlePinClick(node.id, true, 0)}
                    aria-label="Connect Output Pin"
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Presets and Logs right panel */}
        <div className={styles.telemetryPanel}>
          {/* Preset Buttons */}
          <div className={styles.presetGroup}>
            <h2 className={styles.panelTitle}>Load Circuit Presets</h2>
            <div className={styles.presetsList}>
              <button type="button" className={styles.presetBtn} onClick={loadHalfAdderPreset}>
                HALF ADDER
              </button>
              <button type="button" className={styles.presetBtn} onClick={loadSrLatchPreset}>
                SR LATCH (MEMORY)
              </button>
            </div>
          </div>

          {/* Telemetry Simulator Log */}
          <div className={styles.logsFooter}>
            <div className={styles.logsHeader}>
              <div className={styles.dotGroup}>
                <span className={styles.redDot}></span>
                <span className={styles.yellowDot}></span>
                <span className={styles.greenDot}></span>
              </div>
              <span className={styles.logsTitle}>logic_telemetry_serial.log</span>
            </div>
            <div ref={logsBodyRef} className={styles.logsBody}>
              {logs.map((log, index) => {
                let colorClass = styles.logInfo;
                if (log.includes('[INPUT]')) colorClass = styles.logInput;
                if (log.includes('[LED]')) colorClass = styles.logLed;
                if (log.includes('[SYSTEM]')) colorClass = styles.logSystem;
                if (log.includes('[WARNING]')) colorClass = styles.logWarning;
                
                return (
                  <div key={index} className={`${styles.logLine} ${colorClass}`}>
                    {log}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
