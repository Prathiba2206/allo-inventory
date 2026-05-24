"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

interface CountdownTimerProps {
  expiresAt: string | Date;
  onExpire?: () => void;
}

export function CountdownTimer({ expiresAt, onExpire }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = new Date(expiresAt).getTime() - new Date().getTime();
      return Math.max(0, Math.floor(difference / 1000));
    };

    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
      const remaining = calculateTimeLeft();
      setTimeLeft(remaining);
      if (remaining === 0) {
        clearInterval(timer);
        if (onExpire) onExpire();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [expiresAt, onExpire]);

  if (timeLeft === 0) {
    return (
      <span className="inline-flex items-center rounded-full bg-slate-900 px-2.5 py-0.5 text-xs font-medium text-slate-400 border border-slate-800">
        Expired
      </span>
    );
  }

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div className="inline-flex items-center gap-1 text-amber-400 bg-amber-950/20 border border-amber-900/30 px-2 py-0.5 rounded font-mono text-xs font-semibold">
      <Clock className="h-3.5 w-3.5 animate-pulse text-amber-500" />
      <span>
        {minutes}:{seconds.toString().padStart(2, "0")}
      </span>
    </div>
  );
}
