"use client";

import { useEffect, useState } from "react";

interface TypewriterProps {
  text: string;
  speed?: number;
  delay?: number;
  className?: string;
}

export function Typewriter({ text, speed = 100, delay = 500, className = "" }: TypewriterProps) {
  const [displayText, setDisplayText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showCursor, setShowCursor] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    // Initial delay before starting
    const startTimer = setTimeout(() => {
      setIsTyping(true);
    }, delay);

    return () => clearTimeout(startTimer);
  }, [delay]);

  useEffect(() => {
    if (!isTyping) return;

    const interval = setInterval(() => {
      if (currentIndex < text.length) {
        setDisplayText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      } else {
        setIsTyping(false);
        setIsComplete(true);
        setShowCursor(false);
        clearInterval(interval);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [isTyping, currentIndex, text, speed]);

  // Blinking cursor effect - only when typing
  useEffect(() => {
    if (isComplete) return;
    
    const cursorInterval = setInterval(() => {
      setShowCursor(prev => !prev);
    }, 500);

    return () => clearInterval(cursorInterval);
  }, [isComplete]);

  return (
    <span className={className}>
      {displayText}
      {!isComplete && (
        <span 
          className={`inline-block w-0.5 h-8 bg-accent ml-1 transition-opacity duration-150 ${
            showCursor ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ animation: 'blink 1s infinite' }}
        />
      )}
    </span>
  );
} 