'use client';

import { useState, useEffect, useRef } from 'react';
import { playClick, playSweep } from '@/lib/audio';
import { useDynamicLenisPrevent } from '@/lib/useDynamicLenisPrevent';
import styles from './IotVisualizer.module.css';

// Hardware Pin specifications and descriptive registry
const PIN_DETAILS: Record<string, { label: string; desc: string; type: 'power' | 'analog' | 'gpio' | 'gnd' }> = {
  '3V3': { label: '3.3V Power Out', desc: 'Regulated 3.3V hardware power rail output. Supplies sensors and peripherals.', type: 'power' },
  'EN': { label: 'EN (Reset Input)', desc: 'Hardware reset pin (Active LOW). Pulling this pin to ground reboots the Tensilica processors.', type: 'power' },
  'D36': { label: 'GPIO36 / SENSOR_VP', desc: 'Analog input channel 0 (ADC1_CH0). Internally routed to the TEMP_ADC thermal sensor.', type: 'analog' },
  'D39': { label: 'GPIO39 / SENSOR_VN', desc: 'Analog input channel 3 (ADC1_CH3). Commonly used for reference noise checks or Hall sensor.', type: 'analog' },
  'D34': { label: 'GPIO34 (Input-Only)', desc: 'General-purpose input-only GPIO (no software pullup/pulldown). Connected to raw telemetry.', type: 'gpio' },
  'D35': { label: 'GPIO35 (Input-Only)', desc: 'General-purpose input-only GPIO (no software pullup/pulldown). Read-only ADC channel.', type: 'gpio' },
  'D32': { label: 'GPIO32 / XTAL_32K_P', desc: 'General GPIO / Capacitive Touch 9. Connected to 32.768 kHz external crystal oscillator.', type: 'gpio' },
  'D33': { label: 'GPIO33 / XTAL_32K_N', desc: 'General GPIO / Capacitive Touch 8. Connected to 32.768 kHz external crystal oscillator.', type: 'gpio' },
  'D25': { label: 'GPIO25 / DAC_1', desc: 'General GPIO with true Digital-to-Analog Converter (8-bit hardware DAC output).', type: 'gpio' },
  
  'GND': { label: 'GND (Common Ground)', desc: 'Reference ground plane. Essential node for establishing unified signal return loops.', type: 'gnd' },
  'D23': { label: 'GPIO23 / SPI_MOSI', desc: 'General-purpose GPIO. Commonly routed to SPI Master Out Slave In lines for SD cards.', type: 'gpio' },
  'D22': { label: 'GPIO22 / I2C_SCL', desc: 'General-purpose GPIO. Configured as I2C clock reference for OLED/BMP sensors.', type: 'gpio' },
  'TX0': { label: 'TXD0 / GPIO1', desc: 'UART0 Transmit line. Used for hardware flashing and transmitting logs to local serial bus.', type: 'gpio' },
  'RX0': { label: 'RXD0 / GPIO3', desc: 'UART0 Receive line. Receives configuration commands and firmware payloads.', type: 'gpio' },
  'D21': { label: 'GPIO21 / I2C_SDA', desc: 'General-purpose GPIO. Configured as I2C data bus line.', type: 'gpio' },
  'D19': { label: 'GPIO19 / SPI_MISO', desc: 'General-purpose GPIO. Configured as SPI Master In Slave Out line.', type: 'gpio' },
  'D18': { label: 'GPIO18 / SPI_SCK', desc: 'General-purpose GPIO. Configured as hardware SPI Serial Clock reference line.', type: 'gpio' },
  'D5':  { label: 'GPIO5 / SPI_SS', desc: 'General-purpose GPIO. Configured as SPI Slave Select / Chip Select hardware line.', type: 'gpio' },

  // Special board elements
  'EN_BTN': { label: 'EN (Reset) Button', desc: 'Tactile push-button pulling the EN pin to GND to instantly restart the ESP32 CPU.', type: 'power' },
  'BOOT_BTN': { label: 'BOOT (GPIO0) Button', desc: 'Tactile button pulling GPIO0 LOW. Hold this button and tap EN to enter serial bootloader flash mode.', type: 'gpio' },
  'TEMP_ADC': { label: 'TEMP_ADC Sensor', desc: 'Edge thermal transistor circuit. Measures Ambient/CPU thermal ranges and feeds ADC1_CH0.', type: 'analog' },
  'ESP32_CHIP': { label: 'ESP32-WROOM-32 Module', desc: 'Espressif module containing the Tensilica Dual-Core 32-bit CPU, 4MB Flash, Wi-Fi, and Bluetooth.', type: 'gpio' },
  'D2_LED': { label: 'On-Board Blue LED', desc: 'User LED internally mapped to GPIO_02. Emits bright light when GPIO_02 is driven HIGH.', type: 'gpio' },
  'PWR_LED': { label: 'Red Power LED', desc: 'Hardware status LED. Emits bright light continuously while 3.3V reference voltage is supplied.', type: 'power' }
};

export function IotVisualizer() {
  const [temperature, setTemperature] = useState(28); // Celsius
  const [voltage, setVoltage] = useState(3.3); // Volts
  const [ledActive, setLedActive] = useState(false);
  const [signalStrength, setSignalStrength] = useState(-52); // dBm
  const [cpuTemp, setCpuTemp] = useState(37.4);
  const [resetting, setResetting] = useState(false);
  
  const [pinsState, setPinsState] = useState<Record<string, boolean>>({});
  const [hoveredPin, setHoveredPin] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  // Initial boot logs are set directly in useState to avoid a cascading
  // re-render from synchronous setState inside useEffect.
  const [logs, setLogs] = useState<string[]>([
    `[SYSTEM] Booting IoT Telemetry Subsystem...`,
    `[ESP32] Core 0 initialized. Clock speed: 240MHz.`,
    `[ESP32] Core 1 initialized. RTOS scheduler active.`,
    `[ADC] Calibrating channel ADC1_CH0 (Pin 36)...`,
    `[WIFI] Connected to local gateway (RSSI: -52dBm).`,
    `[SYSTEM] Telemetry streams established.`
  ]);
  const logsBodyRef = useRef<HTMLDivElement>(null);

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

  // Simulate WIFI signal variation and CPU temperature changes
  useEffect(() => {
    if (resetting) return;
    const interval = setInterval(() => {
      setSignalStrength((prev) => {
        const delta = Math.floor(Math.random() * 5) - 2;
        const next = Math.max(-85, Math.min(-30, prev + delta));
        return next;
      });

      setCpuTemp(() => {
        const baseTemp = 33 + (temperature * 0.22) + (ledActive ? 3.5 : 0);
        const jitter = (Math.random() * 0.8) - 0.4;
        return parseFloat((baseTemp + jitter).toFixed(1));
      });
    }, 1500);

    return () => clearInterval(interval);
  }, [temperature, ledActive, resetting]);

  // ESP32 Hardware Reset Emulation
  const triggerReset = () => {
    if (resetting) return;
    playSweep();
    setResetting(true);
    setLedActive(false);
    setPinsState({});
    setLogs([]);
    addLog(`[SYSTEM] Reset button pressed (EN pulled LOW)...`);
    
    setTimeout(() => {
      addLog(`rst:0x1 (POWERON_RESET),boot:0x13 (SPI_FAST_FLASH_BOOT)`);
    }, 150);

    setTimeout(() => {
      addLog(`configsip: 0, SPI_WP:0xee, clk_drv:0x00, cs0_drv:0x00`);
    }, 300);

    setTimeout(() => {
      addLog(`load:0x3fff0030,len:1216 | entry 0x4008061c`);
    }, 450);

    setTimeout(() => {
      addLog(`[ESP32] CPU cores rebooted at 240MHz. Heap size: 288KB.`);
    }, 650);

    setTimeout(() => {
      addLog(`[WIFI] Connecting to SSID 'Lord_Artificer_IoT'...`);
    }, 850);

    setTimeout(() => {
      addLog(`[WIFI] Connected gateway! IP: 192.168.4.1 (RSSI: ${signalStrength} dBm)`);
    }, 1050);

    setTimeout(() => {
      addLog(`[SYSTEM] Dynamic serial telemetry active.`);
      setResetting(false);
    }, 1250);
  };

  // BOOT button toggle
  const triggerBoot = () => {
    playClick();
    addLog(`[ESP32] Boot button pressed (GPIO_00: LOW).`);
    addLog(`[ESP32] Tip: Hold BOOT and tap EN to start serial flash mode.`);
  };

  // Header Pin click toggling
  const handlePinClick = (pinName: string) => {
    if (resetting) return;
    playClick();
    const details = PIN_DETAILS[pinName];
    if (!details) return;

    if (details.type === 'gpio') {
      setPinsState((prev) => {
        const nextState = !prev[pinName];
        addLog(`[GPIO] Pin ${pinName} driven ${nextState ? 'HIGH (3.3V)' : 'LOW (0V)'}`);
        return { ...prev, [pinName]: nextState };
      });
    } else if (details.type === 'analog') {
      if (pinName === 'D36') {
        addLog(`[ADC] Channel ADC1_CH0 (Pin D36) sampled. Temperature: ${temperature}°C.`);
      } else {
        const fakeAdc = Math.round(1800 + Math.random() * 600);
        addLog(`[ADC] Channel ADC1_CH3 (Pin D39) sampled. Raw: ${fakeAdc} (Voltage: ${((fakeAdc / 4095) * 3.3).toFixed(2)}V)`);
      }
    } else if (details.type === 'power') {
      if (pinName === '3V3') {
        addLog(`[POWER] Measured 3.3V rail. Potentiometer shows ${voltage.toFixed(2)}V output.`);
      } else if (pinName === 'EN') {
        triggerReset();
      }
    } else if (details.type === 'gnd') {
      addLog(`[GND] Shared system reference ground. Voltage difference: 0.00V.`);
    }
  };

  // Canvas Oscilloscope Animation Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let offset = 0;

    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      if (canvas.width !== rect.width || canvas.height !== rect.height) {
        canvas.width = rect.width;
        canvas.height = rect.height;
      }

      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);

      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      const gridColor = isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.04)';
      const waveColor = '#62B6CB'; // Cyan/Teal accent
      const centerLineColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)';

      // 1. Draw Grid
      ctx.strokeStyle = gridColor;
      ctx.lineWidth = 1;
      
      const gridSpacing = 30;
      for (let x = 0; x < width; x += gridSpacing) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSpacing) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // 2. Draw Center Axis
      ctx.strokeStyle = centerLineColor;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();

      // 3. Draw Telemetry Wave (Sine + Noise)
      ctx.strokeStyle = waveColor;
      ctx.lineWidth = 2.5;
      ctx.beginPath();

      // Flatline during hardware reset
      const amp = resetting ? 0 : (temperature * 1.4) + 12;
      const freq = resetting ? 0 : (voltage * 0.028) + 0.012;
      const midY = height / 2;

      for (let x = 0; x < width; x++) {
        const angle = x * freq + offset;
        let y = Math.sin(angle) * amp;

        // Jitter simulation
        if (!resetting) {
          const noise = (Math.sin(x * 0.08 + offset * 4.5) * 1.8) + ((Math.random() - 0.5) * 1.2);
          y += noise;
        }

        const finalY = midY + y;
        if (x === 0) {
          ctx.moveTo(x, finalY);
        } else {
          ctx.lineTo(x, finalY);
        }
      }

      ctx.stroke();
      offset += resetting ? 0.02 : 0.08;
      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [temperature, voltage, resetting]);

  const handleLedToggle = () => {
    if (resetting) return;
    playClick();
    setLedActive((prev) => {
      const next = !prev;
      addLog(next ? '[GPIO] Pin 2 driven HIGH (LED ON)' : '[GPIO] Pin 2 driven LOW (LED OFF)');
      return next;
    });
  };

  const handleTempChange = (val: number) => {
    setTemperature(val);
    if (Math.random() < 0.12 && !resetting) {
      addLog(`[SENSOR] Temperature reading: ${val}°C (Thermistor calibration active).`);
    }
  };

  const handleVoltageChange = (val: number) => {
    setVoltage(val);
    if (Math.random() < 0.12 && !resetting) {
      addLog(`[ADC] Voltage drift: ${val.toFixed(2)}V (Calibrating internal reference voltage).`);
    }
  };

  return (
    <div ref={containerRef} className={styles.sectionContainer}>
      <div className={styles.header}>
        <span className={styles.eyebrow}>Embedded Systems</span>
        <h3 className={styles.title}>IoT Telemetry Visualizer</h3>
        <p className={styles.subtitle}>
          Simulate a real-time ESP32 edge microcontroller. Tweak physical inputs, toggle GPIO registers, and inspect core telemetry waves.
        </p>
      </div>

      <div className={styles.dashboard}>
        {/* Left Column: ESP32 Hardware Schematic */}
        <div className={styles.schematicPanel}>
          <h4 className={styles.panelTitle}>ESP32 Device Node (Pinout Map)</h4>
          <div className={styles.schematicWrapper}>
            <svg className={styles.espSvg} viewBox="0 0 420 320" xmlns="http://www.w3.org/2000/svg">
              <defs>
                {/* Silver metal gradient for ESP32 casing */}
                <linearGradient id="silverMetal" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#f3f4f6" />
                  <stop offset="35%" stopColor="#e5e7eb" />
                  <stop offset="50%" stopColor="#d1d5db" />
                  <stop offset="70%" stopColor="#9ca3af" />
                  <stop offset="100%" stopColor="#f3f4f6" />
                </linearGradient>

                {/* USB connector metal gradient */}
                <linearGradient id="usbMetal" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#4b5563" />
                  <stop offset="50%" stopColor="#9ca3af" />
                  <stop offset="100%" stopColor="#4b5563" />
                </linearGradient>
              </defs>

              {/* Circuit board substrate */}
              <rect x="30" y="20" width="360" height="280" rx="8" className={styles.boardBg} />
              
              {/* Golden PCB edge border (adds realism) */}
              <rect x="34" y="24" width="352" height="272" rx="6" fill="none" stroke="#D4AF37" strokeWidth="1" opacity="0.6" />
              
              {/* Copper tracing lines routing from ESP32 to pins, buttons, sensor */}
              <path d="M 90 100 L 150 100" fill="none" className={`${styles.wireLine} ${ledActive ? styles.wireActive : ''}`} />
              <path d="M 330 215 L 270 215" fill="none" className={`${styles.wireLine} ${resetting ? '' : styles.wireSensorActive}`} />
              
              {/* Tactile button traces */}
              <path d="M 110 245 L 110 215" fill="none" className={styles.wireLine} />
              <path d="M 310 245 L 310 215" fill="none" className={styles.wireLine} />
              
              {/* Antenna block at the top */}
              <rect x="160" y="24" width="100" height="35" fill="#0d0e12" rx="2" stroke="#222" />
              {/* Gold zigzag microstrip antenna */}
              <path d="M 170 30 L 250 30 L 250 34 L 170 34 L 170 38 L 250 38 L 250 42 L 170 42 L 170 46 L 250 46 M 210 46 L 210 59" 
                    fill="none" stroke="#D4AF37" strokeWidth="1.5" />
              
              {/* ESP32 core module shield */}
              <g className={styles.interactiveChip} 
                 onMouseEnter={() => setHoveredPin('ESP32_CHIP')} 
                 onMouseLeave={() => setHoveredPin(null)}>
                <rect x="150" y="70" width="120" height="135" rx="4" fill="url(#silverMetal)" stroke="#8F9499" strokeWidth="1.5" />
                <text x="210" y="115" textAnchor="middle" className={styles.chipBrand}>ESPRESSIF</text>
                <text x="210" y="135" textAnchor="middle" className={styles.chipTitle}>ESP32-WROOM-32</text>
                <text x="210" y="150" textAnchor="middle" className={styles.chipSubtitle}>FCC ID: 2AC7Z-ESP32WROOM32</text>
                <text x="210" y="165" textAnchor="middle" className={styles.chipDetails}>K408D56</text>
                
                {/* Solder castellations (Left and Right edges of module) */}
                {Array.from({ length: 8 }).map((_, i) => (
                  <g key={`cast-l-${i}`}>
                    <rect x="145" y={80 + i * 14} width="6" height="5" fill="#D4AF37" rx="0.5" />
                    <circle cx="147.5" cy={82.5 + i * 14} r="1" fill="#777" />
                  </g>
                ))}
                {Array.from({ length: 8 }).map((_, i) => (
                  <g key={`cast-r-${i}`}>
                    <rect x="269" y={80 + i * 14} width="6" height="5" fill="#D4AF37" rx="0.5" />
                    <circle cx="271.5" cy={82.5 + i * 14} r="1" fill="#777" />
                  </g>
                ))}
              </g>
              
              {/* On-board Blue Status LED (GPIO_02) */}
              <g className={styles.interactiveComponent}
                 onMouseEnter={() => setHoveredPin('D2_LED')}
                 onMouseLeave={() => setHoveredPin(null)}
                 onClick={handleLedToggle}>
                <rect x="280" y="222" width="10" height="8" rx="1" fill="#222" stroke="#444" strokeWidth="0.5" />
                <circle cx="285" cy="226" r="3" className={`${styles.boardLed} ${ledActive ? styles.boardLedActive : ''}`} />
                <text x="285" y="240" textAnchor="middle" className={styles.schematicTinyLabel}>GPIO2</text>
              </g>
              
              {/* On-board Red Power LED */}
              <g className={styles.interactiveComponent}
                 onMouseEnter={() => setHoveredPin('PWR_LED')}
                 onMouseLeave={() => setHoveredPin(null)}>
                <rect x="130" y="222" width="10" height="8" rx="1" fill="#222" stroke="#444" strokeWidth="0.5" />
                <circle cx="135" cy="226" r="3" className={`${styles.powerLed} ${!resetting ? styles.powerLedActive : ''}`} />
                <text x="135" y="240" textAnchor="middle" className={styles.schematicTinyLabel}>PWR</text>
              </g>
              
              {/* USB-C Connector Port */}
              <rect x="185" y="275" width="50" height="20" rx="3" fill="url(#usbMetal)" stroke="#333" strokeWidth="1" />
              <rect x="192" y="278" width="36" height="14" rx="2" fill="#111" />
              
              {/* EN (Reset) Tactile Push Button */}
              <g className={styles.tactileBtn} 
                 onClick={triggerReset}
                 onMouseEnter={() => setHoveredPin('EN_BTN')}
                 onMouseLeave={() => setHoveredPin(null)}>
                <rect x="95" y="245" width="22" height="22" rx="2" fill="#e5e7eb" stroke="#9ca3af" strokeWidth="1" />
                <circle cx="106" cy="256" r="7" fill="#374151" stroke="#1f2937" strokeWidth="0.5" />
                <rect x="91" y="254" width="4" height="4" fill="#9ca3af" />
                <rect x="117" y="254" width="4" height="4" fill="#9ca3af" />
                <text x="106" y="280" textAnchor="middle" className={styles.schematicTinyLabel}>EN</text>
              </g>
              
              {/* BOOT (GPIO0) Tactile Push Button */}
              <g className={styles.tactileBtn}
                 onClick={triggerBoot}
                 onMouseEnter={() => setHoveredPin('BOOT_BTN')}
                 onMouseLeave={() => setHoveredPin(null)}>
                <rect x="303" y="245" width="22" height="22" rx="2" fill="#e5e7eb" stroke="#9ca3af" strokeWidth="1" />
                <circle cx="314" cy="256" r="7" fill="#374151" stroke="#1f2937" strokeWidth="0.5" />
                <rect x="299" y="254" width="4" height="4" fill="#9ca3af" />
                <rect x="325" y="254" width="4" height="4" fill="#9ca3af" />
                <text x="314" y="280" textAnchor="middle" className={styles.schematicTinyLabel}>BOOT</text>
              </g>
              
              {/* Left Header Socket & Pins */}
              <rect x="58" y="60" width="10" height="170" rx="2" fill="#111" stroke="#333" />
              {Array.from({ length: 9 }).map((_, i) => {
                const pinName = ['3V3', 'EN', 'D36', 'D39', 'D34', 'D35', 'D32', 'D33', 'D25'][i];
                return (
                  <g key={`pin-l-${i}`} 
                     className={styles.pinInteractive}
                     onMouseEnter={() => setHoveredPin(pinName)}
                     onMouseLeave={() => setHoveredPin(null)}
                     onClick={() => handlePinClick(pinName)}>
                    <rect x="60" y={65 + i * 18} width="6" height="6" rx="0.5" fill="#D4AF37" stroke="#9E7815" strokeWidth="0.5" />
                    {/* Active pin glow indicator */}
                    {pinsState[pinName] && <circle cx="63" cy={68 + i * 18} r="4" className={styles.pinGlowActive} />}
                    {/* Tiny text label */}
                    <text x="50" y={71 + i * 18} textAnchor="end" className={styles.pinText}>{pinName}</text>
                  </g>
                );
              })}
              
              {/* Right Header Socket & Pins */}
              <rect x="352" y="60" width="10" height="170" rx="2" fill="#111" stroke="#333" />
              {Array.from({ length: 9 }).map((_, i) => {
                const pinName = ['GND', 'D23', 'D22', 'TX0', 'RX0', 'D21', 'D19', 'D18', 'D5'][i];
                return (
                  <g key={`pin-r-${i}`}
                     className={styles.pinInteractive}
                     onMouseEnter={() => setHoveredPin(pinName)}
                     onMouseLeave={() => setHoveredPin(null)}
                     onClick={() => handlePinClick(pinName)}>
                    <rect x="354" y={65 + i * 18} width="6" height="6" rx="0.5" fill="#D4AF37" stroke="#9E7815" strokeWidth="0.5" />
                    {/* Active pin glow indicator */}
                    {pinsState[pinName] && <circle cx="357" cy={68 + i * 18} r="4" className={styles.pinGlowActive} />}
                    {/* Tiny text label */}
                    <text x="368" y={71 + i * 18} textAnchor="start" className={styles.pinText}>{pinName}</text>
                  </g>
                );
              })}
              
              {/* TEMP_ADC sensor chip */}
              <g className={styles.interactiveSensor}
                 onClick={() => {
                   playClick();
                   addLog(`[SENSOR] Calibration requested. Slide 'Thermal Sensor Input' to tweak temperature.`);
                 }}
                 onMouseEnter={() => setHoveredPin('TEMP_ADC')}
                 onMouseLeave={() => setHoveredPin(null)}>
                <rect x="330" y="200" width="16" height="16" rx="2" fill="#222" stroke="#444" strokeWidth="0.5" />
                <rect x="332" y="202" width="12" height="12" fill="#333" />
                {/* Chip pins */}
                <rect x="327" y="203" width="3" height="2" fill="#9ca3af" />
                <rect x="327" y="207" width="3" height="2" fill="#9ca3af" />
                <rect x="327" y="211" width="3" height="2" fill="#9ca3af" />
                <rect x="346" y="203" width="3" height="2" fill="#9ca3af" />
                <rect x="346" y="207" width="3" height="2" fill="#9ca3af" />
                <rect x="346" y="211" width="3" height="2" fill="#9ca3af" />
                <circle cx="338" cy="208" r="2" fill="#111" />
                <text x="338" y="195" textAnchor="middle" className={styles.schematicTinyLabel}>TEMP_ADC</text>
              </g>
            </svg>
          </div>

          <div className={styles.schematicControls}>
            <div className={styles.controlButtonsRow}>
              <button
                type="button"
                className={`${styles.ledBtn} ${ledActive ? styles.ledBtnActive : ''}`}
                onClick={handleLedToggle}
                disabled={resetting}
              >
                TOGGLE GPIO_02 LED
              </button>
              <button
                type="button"
                className={styles.resetBtn}
                onClick={triggerReset}
                disabled={resetting}
              >
                {resetting ? 'RESETTING...' : 'RESET BOARD (EN)'}
              </button>
            </div>
            
            <div className={styles.inspectorContainer}>
              {hoveredPin ? (
                <div className={styles.pinInspector}>
                  <div className={styles.inspectorHeader}>
                    <span className={styles.inspectorLabel}>{PIN_DETAILS[hoveredPin]?.label || hoveredPin}</span>
                    <span className={`${styles.inspectorBadge} ${styles[PIN_DETAILS[hoveredPin]?.type || 'gnd']}`}>
                      {PIN_DETAILS[hoveredPin]?.type?.toUpperCase() || 'HARDWARE'}
                    </span>
                  </div>
                  <p className={styles.inspectorDesc}>{PIN_DETAILS[hoveredPin]?.desc || ''}</p>
                </div>
              ) : (
                <div className={styles.pinInspectorPlaceholder}>
                  💡 Hover over any header pin, tactile button, or sensor chip on the ESP32 board to inspect hardware registers.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Physical Controls & Oscilloscope */}
        <div className={styles.telemetryPanel}>
          {/* Controls */}
          <div className={styles.controlsGroup}>
            <h4 className={styles.panelTitle}>Input Sensor Parameters</h4>
            
            <div className={styles.controlRow}>
              <div className={styles.labelRow}>
                <span>Thermal Sensor Input</span>
                <span>{temperature}°C</span>
              </div>
              <input
                type="range"
                min="0"
                max="80"
                value={temperature}
                onChange={(e) => handleTempChange(parseInt(e.target.value))}
                className={styles.rangeInput}
                aria-label="Sensor Temperature Slider"
              />
            </div>

            <div className={styles.controlRow}>
              <div className={styles.labelRow}>
                <span>Reference Voltage</span>
                <span>{voltage.toFixed(2)} V</span>
              </div>
              <input
                type="range"
                min="1.2"
                max="3.6"
                step="0.1"
                value={voltage}
                onChange={(e) => handleVoltageChange(parseFloat(e.target.value))}
                className={styles.rangeInput}
                aria-label="ADC Reference Voltage Slider"
              />
            </div>
          </div>

          {/* Oscilloscope canvas */}
          <div className={styles.scopeWrapper}>
            <div className={styles.scopeHeader}>
              <span>ADC_1 TELEMETRY WAVEFORM</span>
              <span className={styles.scopeLiveDot}>LIVE FEED</span>
            </div>
            <div className={styles.canvasContainer}>
              <canvas ref={canvasRef} className={styles.oscilloscopeCanvas} />
            </div>
            <div className={styles.telemetryGrid}>
              <div className={styles.telemetryItem}>
                <span className={styles.tLabel}>FREQ</span>
                <span className={styles.tValue}>{resetting ? '0.0' : (voltage * 8).toFixed(1)} Hz</span>
              </div>
              <div className={styles.telemetryItem}>
                <span className={styles.tLabel}>AMP</span>
                <span className={styles.tValue}>{resetting ? '0.00' : (temperature * 0.04).toFixed(2)} V</span>
              </div>
              <div className={styles.telemetryItem}>
                <span className={styles.tLabel}>RSSI</span>
                <span className={styles.tValue}>{resetting ? '-99' : signalStrength} dBm</span>
              </div>
              <div className={styles.telemetryItem}>
                <span className={styles.tLabel}>CPU TEMP</span>
                <span className={styles.tValue}>{resetting ? '0.0' : cpuTemp}°C</span>
              </div>
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
          <span className={styles.logsTitle}>esp32_serial_telemetry.log</span>
        </div>
        <div ref={logsBodyRef} className={styles.logsBody}>
          {logs.map((log, index) => {
            let colorClass = styles.logInfo;
            if (log.includes('[GPIO]')) colorClass = styles.logGpio;
            if (log.includes('[SENSOR]')) colorClass = styles.logSensor;
            if (log.includes('[SYSTEM]')) colorClass = styles.logSystem;
            if (log.includes('[ADC]')) colorClass = styles.logAdc;
            
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
