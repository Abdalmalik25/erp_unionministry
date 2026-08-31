/**
 * HeroAnimation.tsx — رسومات متحركة عالية الدقة للصفحة الرئيسية
 * High-Resolution Animated Graphics for Homepage
 */

import { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Building2, Users, FileCheck, Shield, BarChart3, 
  Globe, TrendingUp, Award, MapPin, Briefcase,
  Activity, Zap, Lock, Database, Cloud, Smartphone
} from 'lucide-react';

// تكوين الرسوم المتحركة
const animationConfig = {
  particleCount: 30,
  lineCount: 15,
  pulseDuration: 2000,
  floatDuration: 3000,
};

// جزيئات الخلفية المتحركة
function FloatingParticle({ delay, x, y, size, color }: {
  delay: number;
  x: number;
  y: number;
  size: number;
  color: string;
}) {
  const [position, setPosition] = useState({ x, y });
  const [opacity, setOpacity] = useState(0);
  const frameRef = useRef<number>();
  
  useEffect(() => {
    const startTime = Date.now();
    setOpacity(1);
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = (elapsed % animationConfig.floatDuration) / animationConfig.floatDuration;
      const newY = y + Math.sin(progress * Math.PI * 2) * 20;
      const newOpacity = 0.3 + Math.sin(progress * Math.PI) * 0.3;
      
      setPosition({ x, y: newY });
      setOpacity(newOpacity);
      frameRef.current = requestAnimationFrame(animate);
    };
    
    const timeout = setTimeout(() => {
      frameRef.current = requestAnimationFrame(animate);
    }, delay);
    
    return () => {
      clearTimeout(timeout);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [x, y, delay]);
  
  return (
    <div 
      className="absolute rounded-full"
      style={{
        left: `${position.x}%`,
        top: `${position.y}%`,
        width: size,
        height: size,
        backgroundColor: color,
        opacity,
        boxShadow: `0 0 ${size * 2}px ${color}`,
      }}
    />
  );
}

// خطوط الشبكة المتحركة
function AnimatedGridLines() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    let animationId: number;
    let time = 0;
    
    const resize = () => {
      canvas.width = canvas.offsetWidth * 2;
      canvas.height = canvas.offsetHeight * 2;
      ctx.scale(2, 2);
    };
    
    const draw = () => {
      const width = canvas.offsetWidth;
      const height = canvas.offsetHeight;
      
      ctx.clearRect(0, 0, width, height);
      
      // خطوط الشبكة
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.1)';
      ctx.lineWidth = 1;
      
      const gridSize = 50;
      const offset = (time * 0.5) % gridSize;
      
      for (let x = -gridSize + offset; x < width + gridSize; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      
      // جزيئات متحركة على خطوط الشبكة
      for (let i = 0; i < 5; i++) {
        const x = ((time * 20 + i * 100) % (width + 100)) - 50;
        const y = height / 2 + Math.sin((time + i) * 0.05) * 100;
        
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(59, 130, 246, ${0.3 + Math.sin(time * 0.1 + i) * 0.2})`;
        ctx.fill();
        
        // توهج
        ctx.beginPath();
        ctx.arc(x, y, 8, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
        ctx.fill();
      }
      
      time += 0.016;
      animationId = requestAnimationFrame(draw);
    };
    
    resize();
    window.addEventListener('resize', resize);
    animationId = requestAnimationFrame(draw);
    
    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationId);
    };
  }, []);
  
  return (
    <canvas 
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ imageRendering: 'auto' }}
    />
  );
}

// أيقونة متحركة مع نبض
function PulsingIcon({ icon: Icon, x, y, delay, color, size = 'md' }: {
  icon: any;
  x: number;
  y: number;
  delay: number;
  color: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const [scale, setScale] = useState(0);
  const [opacity, setOpacity] = useState(0);
  
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  };
  
  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };
  
  useEffect(() => {
    const timeout = setTimeout(() => {
      setScale(1);
      setOpacity(1);
    }, delay);
    
    return () => clearTimeout(timeout);
  }, [delay]);
  
  return (
    <div
      className="absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-500"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        transform: `translate(-50%, -50%) scale(${scale})`,
        opacity,
      }}
    >
      {/* الحلقة الخارجية النبضية */}
      <div 
        className={`absolute inset-0 rounded-2xl ${sizeClasses[size]} animate-ping`}
        style={{ 
          backgroundColor: color,
          animationDuration: `${animationConfig.pulseDuration}ms`,
        }}
      />
      
      {/* الحلقة الوسطى */}
      <div 
        className={`absolute inset-1 rounded-xl ${sizeClasses[size]}`}
        style={{ backgroundColor: `${color}40` }}
      />
      
      {/* الأيقونة */}
      <div 
        className={`
          relative ${sizeClasses[size]} rounded-xl
          bg-gradient-to-br from-white/20 to-white/5
          backdrop-blur-sm border border-white/20
          flex items-center justify-center
          shadow-lg
        `}
        style={{ boxShadow: `0 0 20px ${color}40` }}
      >
        <Icon className={`${iconSizes[size]} text-white`} />
      </div>
    </div>
  );
}

// دائرة متحركة
function RotatingCircle({ radius, children, duration }: {
  radius: number;
  children: React.ReactNode;
  duration: number;
}) {
  const [rotation, setRotation] = useState(0);
  const frameRef = useRef<number>();
  
  useEffect(() => {
    let startTime: number;
    
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      setRotation((elapsed / duration) * 360);
      frameRef.current = requestAnimationFrame(animate);
    };
    
    frameRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [duration]);
  
  return (
    <div 
      className="absolute"
      style={{
        transform: `rotate(${rotation}deg)`,
        left: `calc(50% - ${radius}px)`,
        top: `calc(50% - ${radius}px)`,
      }}
    >
      <div 
        className="relative"
        style={{
          transform: `translateX(${radius}px)`,
        }}
      >
        {children}
      </div>
    </div>
  );
}

// مكون الرسم البياني المتحرك
function AnimatedChart() {
  const [data, setData] = useState([30, 45, 35, 60, 55, 70, 65]);
  const [animatedData, setAnimatedData] = useState<number[]>([]);
  
  useEffect(() => {
    // تحريك البيانات
    const interval = setInterval(() => {
      setData(prev => {
        const newData = prev.map(v => v + (Math.random() - 0.5) * 10);
        return newData.map(v => Math.max(20, Math.min(80, v)));
      });
    }, 2000);
    
    return () => clearInterval(interval);
  }, []);
  
  useEffect(() => {
    // تحريك الرسم البياني
    const duration = 1000;
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      
      setAnimatedData(data.map(v => v * eased));
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [data]);
  
  const maxValue = 100;
  const barWidth = 100 / data.length - 4;
  
  return (
    <div className="flex items-end justify-center gap-4 h-32">
      {animatedData.map((value, i) => (
        <div
          key={i}
          className="relative"
          style={{ width: `${barWidth}%` }}
        >
          <div 
            className="absolute bottom-0 left-0 right-0 rounded-t-lg transition-all duration-300"
            style={{ 
              height: `${(value / maxValue) * 100}%`,
              background: `linear-gradient(to top, rgb(59, 130, 246), rgb(147, 197, 253))`,
              boxShadow: '0 0 20px rgba(59, 130, 246, 0.5)',
            }}
          />
          {/* نقطة البيانات */}
          <div 
            className="absolute w-2 h-2 rounded-full bg-white shadow-lg"
            style={{ 
              bottom: `${(value / maxValue) * 100}%`,
              left: '50%',
              transform: 'translate(-50%, 50%)',
            }}
          />
        </div>
      ))}
    </div>
  );
}

// مكون العداد المتحرك
function AnimatedCounter({ end, duration = 2000, suffix = '' }: {
  end: number;
  duration?: number;
  suffix?: string;
}) {
  const [count, setCount] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true);
          
          const startTime = Date.now();
          const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            
            setCount(Math.floor(end * eased));
            
            if (progress < 1) {
              requestAnimationFrame(animate);
            } else {
              setCount(end);
            }
          };
          
          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.5 }
    );
    
    if (ref.current) {
      observer.observe(ref.current);
    }
    
    return () => observer.disconnect();
  }, [end, duration, hasAnimated]);
  
  return (
    <div ref={ref} className="font-bold text-3xl text-white">
      {count.toLocaleString()}{suffix}
    </div>
  );
}

// مكون Hero الرئيسي
export default function HeroAnimation() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 1200, height: 600 });
  
  // مراقبة أبعاد الشاشة
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };
    
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);
  
  // الألوان والسمات
  const colors = [
    'rgba(59, 130, 246, 0.6)', // أزرق
    'rgba(16, 185, 129, 0.6)', // أخضر
    'rgba(245, 158, 11, 0.6)', // برتقالي
    'rgba(139, 92, 246, 0.6)', // بنفسجي
    'rgba(236, 72, 153, 0.6)', // وردي
    'rgba(6, 182, 212, 0.6)', // سماوي
  ];
  
  // موضع الأيقونات
  const iconPositions = [
    { x: 15, y: 25, icon: Building2, color: colors[0], size: 'lg' as const, delay: 0 },
    { x: 85, y: 20, icon: Users, color: colors[1], size: 'lg' as const, delay: 200 },
    { x: 10, y: 70, icon: Shield, color: colors[2], size: 'md' as const, delay: 400 },
    { x: 90, y: 75, icon: BarChart3, color: colors[3], size: 'md' as const, delay: 600 },
    { x: 25, y: 85, icon: Globe, color: colors[4], size: 'sm' as const, delay: 800 },
    { x: 75, y: 85, icon: FileCheck, color: colors[5], size: 'sm' as const, delay: 1000 },
  ];
  
  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full min-h-[500px] overflow-hidden rounded-2xl"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* خلفية متدرجة */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900" />
      
      {/* خطوط الشبكة المتحركة */}
      <AnimatedGridLines />
      
      {/* الجزيئات العائمة */}
      {Array.from({ length: animationConfig.particleCount }).map((_, i) => (
        <FloatingParticle
          key={i}
          delay={i * 100}
          x={Math.random() * 100}
          y={Math.random() * 100}
          size={2 + Math.random() * 4}
          color={colors[i % colors.length]}
        />
      ))}
      
      {/* الأيقونات النبضية */}
      {iconPositions.map((pos, i) => (
        <PulsingIcon
          key={i}
          icon={pos.icon}
          x={pos.x}
          y={pos.y}
          color={pos.color}
          size={pos.size}
          delay={pos.delay}
        />
      ))}
      
      {/* المركز - الرسم البياني المتحرك */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
        <div className="
          relative w-64 h-48 rounded-2xl
          bg-white/10 backdrop-blur-md
          border border-white/20
          p-4
          shadow-2xl
        ">
          <div className="text-white/80 text-sm font-medium mb-2">
            {isRTL ? 'إحصائيات النظام' : 'System Statistics'}
          </div>
          <AnimatedChart />
          <div className="flex justify-center gap-6 mt-2">
            <div className="text-center">
              <div className="text-white/60 text-xs">
                {isRTL ? 'العمال' : 'Workers'}
              </div>
              <AnimatedCounter end={50000} suffix="+" />
            </div>
            <div className="text-center">
              <div className="text-white/60 text-xs">
                {isRTL ? 'المنشآت' : 'Establishments'}
              </div>
              <AnimatedCounter end={12000} suffix="+" />
            </div>
          </div>
        </div>
        
        {/* حلقات زخرفية */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full border border-blue-500/20 animate-pulse" />
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full border border-blue-500/10 animate-pulse" style={{ animationDelay: '500ms' }} />
        </div>
      </div>
      
      {/* النص الرئيسي */}
      <div className="absolute bottom-8 left-0 right-0 text-center">
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 drop-shadow-lg">
          {isRTL ? 'المنظومة الوطنية لإدارة العمل' : 'National Labor Management Platform'}
        </h1>
        <p className="text-lg text-white/80 max-w-xl mx-auto">
          {isRTL 
            ? 'منصة متكاملة لرقابة وتنظيم سوق العمل اليمني'
            : 'Integrated Platform for Monitoring and Regulating Yemeni Labor Market'
          }
        </p>
      </div>
      
      {/* زخارف إضافية */}
      <div className="absolute top-4 left-4 w-32 h-32 bg-gradient-to-br from-blue-500/20 to-transparent rounded-full blur-2xl" />
      <div className="absolute bottom-4 right-4 w-40 h-40 bg-gradient-to-tl from-indigo-500/20 to-transparent rounded-full blur-2xl" />
    </div>
  );
}
