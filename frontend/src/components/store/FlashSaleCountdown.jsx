/**
 * Flash Sale Countdown Banner
 * Live countdown timer with urgency
 */
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Zap, ChevronRight } from 'lucide-react';

const FlashSaleCountdown = ({ 
  endTime, 
  title = "FLASH SALE", 
  subtitle = "Ends in",
  discount = "50%",
  link = "/tnv/sale",
  bgGradient = "from-red-600 via-orange-500 to-yellow-500"
}) => {
  const [timeLeft, setTimeLeft] = useState({
    hours: 0,
    minutes: 0,
    seconds: 0,
  });
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const target = new Date(endTime).getTime();
      const difference = target - now;

      if (difference <= 0) {
        setIsExpired(true);
        return { hours: 0, minutes: 0, seconds: 0 };
      }

      return {
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / (1000 * 60)) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      };
    };

    // Initial calculation
    setTimeLeft(calculateTimeLeft());

    // Update every second
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [endTime]);

  const padNumber = (num) => String(num).padStart(2, '0');

  if (isExpired) return null;

  return (
    <Link 
      to={link}
      className={`block mx-3 my-3 rounded-2xl overflow-hidden bg-gradient-to-r ${bgGradient} animate-pulse-slow`}
      data-testid="flash-sale-countdown"
    >
      <div className="relative p-4">
        {/* Animated Background Elements */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
        
        <div className="relative flex items-center justify-between">
          {/* Left - Title & Icon */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center animate-bounce">
              <Zap className="w-6 h-6 text-white fill-yellow-300" />
            </div>
            <div>
              <h3 className="text-white text-xl font-black tracking-wide">{title}</h3>
              <p className="text-white/80 text-sm">{subtitle}</p>
            </div>
          </div>

          {/* Center - Countdown */}
          <div className="flex items-center gap-2">
            {/* Hours */}
            <div className="bg-black/30 backdrop-blur-sm rounded-lg px-3 py-2 text-center min-w-[50px]">
              <span className="text-white text-2xl font-mono font-black">{padNumber(timeLeft.hours)}</span>
              <p className="text-white/60 text-[10px] uppercase">Hrs</p>
            </div>
            <span className="text-white text-2xl font-bold animate-pulse">:</span>
            
            {/* Minutes */}
            <div className="bg-black/30 backdrop-blur-sm rounded-lg px-3 py-2 text-center min-w-[50px]">
              <span className="text-white text-2xl font-mono font-black">{padNumber(timeLeft.minutes)}</span>
              <p className="text-white/60 text-[10px] uppercase">Min</p>
            </div>
            <span className="text-white text-2xl font-bold animate-pulse">:</span>
            
            {/* Seconds */}
            <div className="bg-black/30 backdrop-blur-sm rounded-lg px-3 py-2 text-center min-w-[50px]">
              <span className="text-white text-2xl font-mono font-black">{padNumber(timeLeft.seconds)}</span>
              <p className="text-white/60 text-[10px] uppercase">Sec</p>
            </div>
          </div>

          {/* Right - Discount & Arrow */}
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-yellow-300 text-3xl font-black">Up to {discount}</p>
              <p className="text-white/80 text-sm">OFF</p>
            </div>
            <ChevronRight className="w-6 h-6 text-white/80" />
          </div>
        </div>
      </div>
    </Link>
  );
};

// Compact version for smaller spaces
export const FlashSaleCompact = ({ endTime, link = "/tnv/sale" }) => {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const target = new Date(endTime).getTime();
      const difference = target - now;

      if (difference <= 0) return { hours: 0, minutes: 0, seconds: 0 };

      return {
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / (1000 * 60)) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      };
    };

    setTimeLeft(calculateTimeLeft());
    const timer = setInterval(() => setTimeLeft(calculateTimeLeft()), 1000);
    return () => clearInterval(timer);
  }, [endTime]);

  const padNumber = (num) => String(num).padStart(2, '0');

  return (
    <Link 
      to={link}
      className="flex items-center gap-2 bg-red-500 text-white px-3 py-1.5 rounded-full text-sm font-bold"
    >
      <Zap className="w-4 h-4 fill-yellow-300" />
      <span>FLASH</span>
      <span className="bg-black/30 px-2 py-0.5 rounded font-mono">
        {padNumber(timeLeft.hours)}:{padNumber(timeLeft.minutes)}:{padNumber(timeLeft.seconds)}
      </span>
    </Link>
  );
};

export default FlashSaleCountdown;
