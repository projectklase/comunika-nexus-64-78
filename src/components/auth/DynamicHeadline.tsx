import { useState, useEffect } from 'react';

const headlines = [
  "Acesse sua conta • 100% seguro",
  "Conecte-se ao Klase • Sempre online",
  "Entre em sua conta • Experiência premium"
];

interface DynamicHeadlineProps {
  paused?: boolean;
}

export const DynamicHeadline = ({ paused = false }: DynamicHeadlineProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (paused) return;

    const interval = setInterval(() => {
      setIsVisible(false);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % headlines.length);
        setIsVisible(true);
      }, 200);
    }, 3000);

    return () => clearInterval(interval);
  }, [paused]);

  return (
    <div className="text-center h-5">
      <p 
        className={`text-xs text-muted-foreground transition-opacity duration-200 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
      >
        {headlines[currentIndex]}
      </p>
    </div>
  );
};