"use client";

import React, { useEffect, useState, useRef } from "react";

export interface TextRevealProps {
  text: string;
  as?: React.ElementType;
  splitBy?: "words" | "characters";
  staggerDelay?: number;
  duration?: number;
  once?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export const TextReveal: React.FC<TextRevealProps> = ({
  text,
  as: Component = "h1",
  splitBy = "words",
  staggerDelay = 0.05,
  duration = 0.5,
  once = true,
  className = "",
  style,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (typeof window !== "undefined" && "IntersectionObserver" in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setIsVisible(true);
              if (once && containerRef.current) {
                observer.unobserve(containerRef.current);
              }
            } else if (!once) {
              setIsVisible(false);
            }
          });
        },
        { threshold: 0.1 }
      );

      if (containerRef.current) {
        observer.observe(containerRef.current);
      }

      return () => {
        observer.disconnect();
      };
    } else {
      timer = setTimeout(() => setIsVisible(true), 50);
      return () => clearTimeout(timer);
    }
  }, [once]);

  const items = React.useMemo(() => {
    if (!text) return [];
    if (splitBy === "characters") {
      return Array.from(text);
    }
    return text.split(" ");
  }, [text, splitBy]);

  return (
    <Component
      ref={containerRef}
      className={`inline-flex flex-wrap ${className}`}
      style={style}
      aria-label={text}
    >
      {items.map((item, index) => (
        <span
          key={`${item}-${index}`}
          className="inline-block overflow-hidden py-0.5 align-top"
          style={{
            marginRight: splitBy === "words" && index < items.length - 1 ? "0.28em" : "0",
          }}
        >
          <span
            className="inline-block transform-gpu transition-all ease-[cubic-bezier(0.16,1,0.3,1)]"
            style={{
              opacity: isVisible ? 1 : 0,
              transform: isVisible
                ? "translate3d(0, 0px, 0)"
                : "translate3d(0, 18px, 0)",
              transitionDuration: `${duration}s`,
              transitionDelay: `${index * staggerDelay}s`,
              willChange: "transform, opacity",
            }}
          >
            {item === " " ? "\u00A0" : item}
          </span>
        </span>
      ))}
    </Component>
  );
};

export default TextReveal;
