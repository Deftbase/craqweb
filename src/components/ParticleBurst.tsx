import { useEffect, useRef } from 'react';

type Kind = 'coin' | 'gem' | 'star' | 'confetti';

interface Particle {
  kind: Kind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  size: number;
  color: string;
  age: number;
  life: number;
}

const GEM_COLORS = ['#ff3ea5', '#22e4ff', '#8b5cff'];
const CONFETTI_COLORS = ['#ff3ea5', '#22e4ff', '#b6ff3b', '#ffc83d', '#8b5cff', '#ffffff'];
const GRAVITY = 0.32;

function spawn(x: number, y: number, count: number, out: Particle[]) {
  for (let i = 0; i < count; i++) {
    const r = Math.random();
    const kind: Kind = r < 0.38 ? 'coin' : r < 0.55 ? 'gem' : r < 0.68 ? 'star' : 'confetti';
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.7;
    const speed = 7 + Math.random() * 13;
    out.push({
      kind,
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 3,
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 0.35,
      size: kind === 'coin' ? 11 + Math.random() * 8 : kind === 'confetti' ? 5 + Math.random() * 5 : 8 + Math.random() * 7,
      color:
        kind === 'gem'
          ? GEM_COLORS[i % GEM_COLORS.length]
          : kind === 'star'
            ? '#b6ff3b'
            : CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      age: 0,
      life: 110 + Math.random() * 80,
    });
  }
}

function draw(ctx: CanvasRenderingContext2D, p: Particle) {
  const alpha = Math.max(0, Math.min(1, (p.life - p.age) / 40));
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(p.x, p.y);
  ctx.rotate(p.rot);
  const s = p.size;

  if (p.kind === 'coin') {
    ctx.scale(Math.cos(p.age * 0.18) || 0.05, 1);
    ctx.beginPath();
    ctx.arc(0, 0, s, 0, Math.PI * 2);
    ctx.fillStyle = '#ffc83d';
    ctx.shadowColor = '#ffc83d';
    ctx.shadowBlur = 12;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.lineWidth = s * 0.18;
    ctx.strokeStyle = '#c98a00';
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.68, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#fff4c2';
    ctx.font = `bold ${s * 1.05}px Bungee, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('$', 0, s * 0.05);
  } else if (p.kind === 'gem') {
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.lineTo(s * 0.8, -s * 0.2);
    ctx.lineTo(0, s);
    ctx.lineTo(-s * 0.8, -s * 0.2);
    ctx.closePath();
    ctx.fillStyle = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 14;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.lineTo(s * 0.3, -s * 0.2);
    ctx.lineTo(-s * 0.3, -s * 0.2);
    ctx.closePath();
    ctx.fill();
  } else if (p.kind === 'star') {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? s : s * 0.45;
      const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fillStyle = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 14;
    ctx.fill();
  } else {
    ctx.scale(1, Math.sin(p.age * 0.25));
    ctx.fillStyle = p.color;
    ctx.fillRect(-s, -s * 0.4, s * 2, s * 0.8);
  }
  ctx.restore();
}

interface Props {
  /** Increment to fire a new burst. */
  trigger: number;
  origin: { x: number; y: number } | null;
}

export function ParticleBurst({ trigger, origin }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!trigger || !origin) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const particles: Particle[] = [];
    spawn(origin.x, origin.y, 170, particles);
    const waveTimes = [380, 760, 1200];
    const waves = waveTimes.map((ms) => window.setTimeout(() => spawn(origin.x, origin.y, 70, particles), ms));
    const wavesDoneAt = performance.now() + waveTimes[waveTimes.length - 1] + 50;

    let raf = 0;

    const tick = () => {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.vy += GRAVITY;
        p.vx *= 0.99;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        p.age++;
        if (p.age > p.life || p.y > window.innerHeight + 60) particles.splice(i, 1);
        else draw(ctx, p);
      }
      if (particles.length || performance.now() < wavesDoneAt) raf = requestAnimationFrame(tick);
      else ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      waves.forEach(clearTimeout);
      window.removeEventListener('resize', resize);
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    };
  }, [trigger, origin]);

  return <canvas ref={canvasRef} className="particle-canvas" aria-hidden />;
}
