import { useState, useEffect } from 'react';

const headlines = [
  "Acesse sua conta • 100% seguro",
  "Conecte-se ao KLASE • Sempre online",
  "Entre em sua conta • Experiência premium"
];

export const DynamicHeadline = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % headlines.length);
    }, 3000); // Change every 3 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="text-center">
      <p 
        key={currentIndex}
        className="text-xs text-muted-foreground animate-fade-in"
      >
        {headlines[currentIndex]}
      </p>
    </div>
  );
};