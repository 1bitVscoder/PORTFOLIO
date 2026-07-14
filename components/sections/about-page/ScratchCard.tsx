'use client';

import React, { useRef, useEffect, useState } from 'react';
import { gsap } from '@/lib/gsap';

interface ScratchCardProps {
  children: React.ReactNode;
  onReveal?: () => void;
}

export function ScratchCard({ children, onReveal }: ScratchCardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [revealed, setRevealed] = useState(false);
  const [textOpacity, setTextOpacity] = useState(1);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const strokeCountRef = useRef(0);

  const revealedRef = useRef(false);

  useEffect(() => {
    revealedRef.current = revealed;
  }, [revealed]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const drawCover = (w: number, h: number, context: CanvasRenderingContext2D) => {
      const theme = document.documentElement.getAttribute('data-theme') || 'light';
      
      // Clear canvas
      context.globalCompositeOperation = 'source-over';
      context.clearRect(0, 0, w, h);

      // Cover background gradient
      const grad = context.createLinearGradient(0, 0, w, h);
      if (theme === 'dark') {
        grad.addColorStop(0, '#1c1e26');
        grad.addColorStop(1, '#0e0f14');
      } else {
        grad.addColorStop(0, '#ebdcd5');
        grad.addColorStop(1, '#ebdcd5');
      }
      context.fillStyle = grad;
      context.fillRect(0, 0, w, h);

      // Security terminal decorative lines
      context.strokeStyle = theme === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(27, 32, 40, 0.2)';
      context.lineWidth = 1.5;
      // Top-left corner mark
      context.beginPath();
      context.moveTo(12, 20);
      context.lineTo(12, 12);
      context.lineTo(20, 12);
      context.stroke();
      // Bottom-right corner mark
      context.beginPath();
      context.moveTo(w - 12, h - 20);
      context.lineTo(w - 12, h - 12);
      context.lineTo(w - 20, h - 12);
      context.stroke();
    };

    const resizeObserver = new ResizeObserver((entries) => {
      if (revealedRef.current) return;
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        if (width === 0 || height === 0) continue;
        
        const dpr = window.devicePixelRatio || 1;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        
        ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform matrix
        ctx.scale(dpr, dpr);

        drawCover(width, height, ctx);
      }
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  const getCoordinates = (e: MouseEvent | TouchEvent | React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;

    if ('touches' in e) {
      if (e.touches.length === 0) return null;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as MouseEvent).clientX;
      clientY = (e as MouseEvent).clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (revealed) return;
    isDrawingRef.current = true;
    setTextOpacity(0); // Fade text out immediately on start scratching
    const pt = getCoordinates(e);
    if (pt) {
      lastPointRef.current = pt;
      scratch(pt.x, pt.y);
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (revealed) return;
    
    // Stop drawing if the user released the click while dragging outside the canvas
    if ('buttons' in e && (e as any).buttons === 0) {
      isDrawingRef.current = false;
      lastPointRef.current = null;
      return;
    }

    if (!isDrawingRef.current) return;
    const pt = getCoordinates(e);
    if (pt && lastPointRef.current) {
      scratch(pt.x, pt.y, lastPointRef.current.x, lastPointRef.current.y);
      lastPointRef.current = pt;
      
      // Perform throttled calculations for real-time decryption completion
      strokeCountRef.current++;
      if (strokeCountRef.current % 10 === 0) {
        checkScratchPercentage();
      }
    }
  };

  const stopDrawing = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    lastPointRef.current = null;
    checkScratchPercentage();
  };

  const scratch = (x: number, y: number, startX?: number, startY?: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.globalCompositeOperation = 'destination-out';
    ctx.strokeStyle = 'rgba(0, 0, 0, 1)'; // Force solid opacity so it scratches off completely on the first pass
    ctx.lineWidth = 32;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    if (startX !== undefined && startY !== undefined) {
      ctx.moveTo(startX, startY);
      ctx.lineTo(x, y);
    } else {
      ctx.moveTo(x, y);
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  };

  const checkScratchPercentage = () => {
    const canvas = canvasRef.current;
    if (!canvas || revealed) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Read pixel data to compute transparent ratio
    const imageData = ctx.getImageData(0, 0, w, h);
    const data = imageData.data;
    let transparent = 0;

    // Sample every 4th pixel index for faster calculation
    for (let i = 3; i < data.length; i += 16) {
      if (data[i] === 0) {
        transparent++;
      }
    }

    const sampledTotal = data.length / 16;
    const percent = (transparent / sampledTotal) * 100;

    if (percent > 60) {
      revealAll();
    }
  };

  const revealAll = () => {
    setRevealed(true);
    const canvas = canvasRef.current;
    
    // Restore the custom cursor when the scratch layer is fully unlocked/revealed
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('scratchcard-hover-leave'));
    }

    if (!canvas) return;

    gsap.to(canvas, {
      opacity: 0,
      scale: 1.05,
      duration: 0.5,
      ease: 'power2.out',
      onComplete: () => {
        canvas.style.display = 'none';
        if (onReveal) onReveal();
      }
    });
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
    >
      {/* Hidden Content */}
      <div style={{ width: '100%', height: '100%' }}>
        {children}
      </div>

      {/* Scratch Layer */}
      <canvas
        ref={canvasRef}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseEnter={(e) => {
          if (!revealed && typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('scratchcard-hover-enter'));
          }
          if (e.buttons > 0 && !revealed) {
            isDrawingRef.current = true;
            setTextOpacity(0);
            const pt = getCoordinates(e);
            if (pt) {
              lastPointRef.current = pt;
              scratch(pt.x, pt.y);
            }
          }
        }}
        onMouseLeave={() => {
          stopDrawing();
          if (!revealed && typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('scratchcard-hover-leave'));
          }
        }}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          cursor: 'url(\'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>\'), pointer',
          zIndex: 5,
          touchAction: 'none',
        }}
      />

      {/* Decrypt Terminal Text Overlay */}
      {!revealed && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
            zIndex: 6,
            opacity: textOpacity,
            transition: 'opacity 0.4s ease',
          }}
        >
          <div
            style={{
              fontFamily: 'monospace',
              fontWeight: 700,
              fontSize: '12px',
              letterSpacing: '1.2px',
              color: 'var(--color-primary-text)',
              marginBottom: '6px',
              textTransform: 'uppercase',
            }}
          >
            [ DECRYPT_SYS ]
          </div>
          <div
            style={{
              fontFamily: 'monospace',
              fontWeight: 500,
              fontSize: '10px',
              letterSpacing: '0.5px',
              color: 'var(--color-text-muted-strong)',
              textTransform: 'uppercase',
            }}
          >
            SCRATCH TO ACCESS
          </div>
        </div>
      )}
    </div>
  );
}
