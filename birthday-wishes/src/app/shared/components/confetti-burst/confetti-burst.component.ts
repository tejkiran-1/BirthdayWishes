import {
  Component,
  OnDestroy,
  ChangeDetectorRef,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ConfettiPiece {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  angle: number;
  speed: number;
  shape: 'circle' | 'rect' | 'star';
}

let nextId = 0;

@Component({
  selector: 'app-confetti-burst',
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="confetti-overlay" aria-hidden="true">
      <div
        *ngFor="let p of pieces"
        class="piece"
        [class]="'piece shape-' + p.shape"
        [style.left.px]="p.x"
        [style.top.px]="p.y"
        [style.background]="p.color"
        [style.width.px]="p.size"
        [style.height.px]="p.size"
        [style.--angle]="p.angle + 'deg'"
        [style.--speed]="p.speed + 's'"
      ></div>
    </div>
  `,
  styles: [`
    .confetti-overlay {
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: 999;
      overflow: hidden;
    }

    .piece {
      position: absolute;
      border-radius: 2px;
      animation: burst var(--speed, 1s) ease-out forwards;
      transform-origin: center;
    }

    .piece.shape-circle { border-radius: 50%; }
    .piece.shape-star {
      clip-path: polygon(50% 0%,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%);
      border-radius: 0;
    }

    @keyframes burst {
      0%   { transform: translate(0,0) rotate(0deg) scale(1); opacity: 1; }
      100% {
        transform:
          translate(calc(cos(var(--angle)) * 200px), calc(sin(var(--angle)) * 300px))
          rotate(720deg)
          scale(0.2);
        opacity: 0;
      }
    }
  `],
})
export class ConfettiBurstComponent implements OnDestroy {
  pieces: ConfettiPiece[] = [];

  private readonly colors = [
    '#c9a227', '#8b0000', '#ff4500', '#ffffff',
    '#ffd700', '#dc143c', '#ff6347', '#f5deb3',
  ];

  private timers: ReturnType<typeof setTimeout>[] = [];

  constructor(private cdr: ChangeDetectorRef) {}

  burst(clientX: number, clientY: number, count = 30): void {
    const newPieces: ConfettiPiece[] = Array.from({ length: count }, () => ({
      id: nextId++,
      x: clientX,
      y: clientY,
      color: this.colors[Math.floor(Math.random() * this.colors.length)],
      size: 4 + Math.random() * 10,
      angle: Math.random() * 360,
      speed: 0.6 + Math.random() * 0.8,
      shape: (['circle', 'rect', 'star'] as const)[Math.floor(Math.random() * 3)],
    }));

    this.pieces = [...this.pieces, ...newPieces];
    this.cdr.markForCheck();

    const t = setTimeout(() => {
      const ids = new Set(newPieces.map(p => p.id));
      this.pieces = this.pieces.filter(p => !ids.has(p.id));
      this.cdr.markForCheck();
    }, 1200);
    this.timers.push(t);
  }

  ngOnDestroy(): void {
    this.timers.forEach(clearTimeout);
  }
}
