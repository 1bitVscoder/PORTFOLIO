import { useState, useEffect } from 'react';

const MOBILE_BREAKPOINT = 768;

export function useStaticFallback() {
  const [isStatic, setIsStatic] = useState(true); // default to true for SSR safety

  useEffect(() => {
    const checkFallback = () => {
      const isCoarse = window.matchMedia('(pointer: coarse)').matches;
      const isSmall = window.innerWidth < MOBILE_BREAKPOINT;
      setIsStatic(isCoarse || isSmall);
    };

    checkFallback();
    window.addEventListener('resize', checkFallback);
    return () => window.removeEventListener('resize', checkFallback);
  }, []);

  return isStatic;
}
