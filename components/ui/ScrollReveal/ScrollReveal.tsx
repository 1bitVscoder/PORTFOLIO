import React, { useEffect, useRef, useMemo, useCallback, ReactNode, RefObject } from 'react';
import { gsap, ScrollTrigger } from '@/lib/gsap';
import { triggerPortalLoop } from '@/lib/portalAnimation';
import './ScrollReveal.css';

interface ScrollRevealProps {
  children: ReactNode;
  scrollContainerRef?: RefObject<HTMLElement>;
  enableBlur?: boolean;
  baseOpacity?: number;
  baseRotation?: number;
  blurStrength?: number;
  containerClassName?: string;
  textClassName?: string;
  rotationEnd?: string;
  wordAnimationEnd?: string;
}

const ScrollReveal: React.FC<ScrollRevealProps> = ({
  children,
  scrollContainerRef,
  enableBlur = true,
  baseOpacity = 0.1,
  baseRotation = 3,
  blurStrength = 4,
  containerClassName = '',
  textClassName = '',
  rotationEnd = 'bottom bottom',
  wordAnimationEnd = 'bottom bottom'
}) => {
  const containerRef = useRef<HTMLHeadingElement>(null);

  // Handle letter portal animation on hover
  const handleLetterHover = useCallback((e: React.MouseEvent<HTMLSpanElement>) => {
    // Check for reduced motion preference
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const portalLetter = e.currentTarget.querySelector('.portal-letter') as HTMLElement;
    if (portalLetter) {
      triggerPortalLoop(portalLetter);
    }
  }, []);

  const splitLines = useMemo(() => {
    const text = typeof children === 'string' ? children : '';
    
    // 1. Try splitting by preserved newlines first
    let rawLines = text
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    // 2. Fallback: If JSX stripped the newlines into a single collapsed line, 
    // split dynamically using sentence boundaries (. / ! / ? / ...) followed by an uppercase letter or slash.
    if (rawLines.length <= 1) {
      rawLines = text
        .split(/(?<=\.|\.\.\.|!|\?)\s+(?=[A-Z/])/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
    }

    return rawLines.map((lineText, lineIdx) => {
      const isGlitchLine = lineText.startsWith('//');
      
      if (isGlitchLine) {
        // Split entire glitch line into individual characters for typewriter stagger
        const chars = lineText.split('').map((char, charIdx) => {
          // Identify highlight letters in the glitched word ("DΔMAGE") to preserve hover animations
          const isHighlightLetter = ['d', 'Δ', 'a', 'm', 'g', 'e'].includes(char.toLowerCase());
          
          if (isHighlightLetter) {
            return (
              <span className="typewriter-char highlight-word" key={charIdx}>
                <span className="portal-mask" onMouseEnter={handleLetterHover}>
                  <span className="portal-letter">{char}</span>
                </span>
              </span>
            );
          }
          
          return (
            <span className="typewriter-char" key={charIdx}>
              {char}
            </span>
          );
        });

        return (
          <div className="reveal-line glitch-line" key={lineIdx}>
            {chars}
            <span className="terminal-cursor">█</span>
          </div>
        );
      }

      // Split normal line into words
      const words = lineText.split(/(\s+)/).map((word, wordIdx) => {
        if (word.match(/^\s+$/)) return word;

        const clean = word.toLowerCase();
        // Check if the word is forgotten or matches developer, bug, system
        if (
          clean.includes('forgotten') ||
          clean.includes('developer') ||
          clean.includes('bug') ||
          clean.includes('system')
        ) {
          return (
            <span className="word highlight-word" key={wordIdx}>
              {word.split('').map((char, charIdx) => (
                <span
                  key={charIdx}
                  className="portal-mask"
                  onMouseEnter={handleLetterHover}
                >
                  <span className="portal-letter">{char}</span>
                </span>
              ))}
            </span>
          );
        }

        return (
          <span className="word" key={wordIdx}>
            {word}
          </span>
        );
      });

      return (
        <div className="reveal-line" key={lineIdx}>
          {words}
        </div>
      );
    });
  }, [children, handleLetterHover]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const scroller = scrollContainerRef && scrollContainerRef.current ? scrollContainerRef.current : window;

    // 1. Rotate reveal container scrub
    gsap.fromTo(
      el,
      { transformOrigin: '0% 50%', rotate: baseRotation },
      {
        ease: 'none',
        rotate: 0,
        scrollTrigger: {
          trigger: el,
          scroller,
          start: 'top bottom',
          end: rotationEnd,
          scrub: true
        }
      }
    );

    // 2. Normal words fade-in scrub
    const wordElements = el.querySelectorAll<HTMLElement>('.word');

    gsap.fromTo(
      wordElements,
      { opacity: baseOpacity, willChange: 'opacity' },
      {
        ease: 'none',
        opacity: 1,
        stagger: 0.05,
        scrollTrigger: {
          trigger: el,
          scroller,
          start: 'top bottom-=20%',
          end: wordAnimationEnd,
          scrub: true
        }
      }
    );

    // 3. Normal words blur-out scrub
    if (enableBlur) {
      gsap.fromTo(
        wordElements,
        { filter: `blur(${blurStrength}px)` },
        {
          ease: 'none',
          filter: 'blur(0px)',
          stagger: 0.05,
          scrollTrigger: {
            trigger: el,
            scroller,
            start: 'top bottom-=20%',
            end: wordAnimationEnd,
            scrub: true
          }
        }
      );
    }

    // 4. Glitch typewriter effect (one-shot, time-based)
    const typewriterChars = el.querySelectorAll<HTMLElement>('.typewriter-char');
    const cursor = el.querySelector<HTMLElement>('.terminal-cursor');
    const glitchLine = el.querySelector<HTMLElement>('.glitch-line');
    
    if (typewriterChars.length > 0 && glitchLine) {
      gsap.set(typewriterChars, { opacity: 0 });
      if (cursor) gsap.set(cursor, { opacity: 0 });

      gsap.timeline({
        scrollTrigger: {
          trigger: glitchLine,
          scroller,
          start: 'top bottom-=10%',
          toggleActions: 'play none none none'
        }
      })
      .set(cursor, { opacity: 1 })
      .to(typewriterChars, {
        opacity: 1,
        duration: 0.01,
        stagger: 0.035, // Typer keypress interval
        ease: 'none'
      });
    }

    return () => {
      ScrollTrigger.getAll().forEach(trigger => trigger.kill());
    };
  }, [scrollContainerRef, enableBlur, baseRotation, baseOpacity, rotationEnd, wordAnimationEnd, blurStrength]);

  return (
    <h2 ref={containerRef} className={`scroll-reveal ${containerClassName}`}>
      <div className={`scroll-reveal-text ${textClassName}`}>{splitLines}</div>
    </h2>
  );
};

export default ScrollReveal;
