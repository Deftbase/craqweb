import type { CSSProperties } from 'react';
import hand from '../assets/pointing-hand.png';

export function PointingFinger({ className, style }: { className?: string; style?: CSSProperties }) {
  return <img className={className} style={style} src={hand} alt="" draggable={false} />;
}
