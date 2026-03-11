import {
  Component,
  Input,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';

export interface FloatingParticle {
  id: number;
  emoji: string;
  x: number;       // % from left
  delay: number;   // animation-delay s
  duration: number;// animation-duration s
  size: number;    // font-size rem
  spin: boolean;
}

@Component({
  selector: 'app-floating-particles',
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="particles-container" aria-hidden="true">
      <span
        *ngFor="let p of particles"
        class="particle"
        [class.spin]="p.spin"
        [style.left.%]="p.x"
        [style.animation-delay.s]="p.delay"
        [style.animation-duration.s]="p.duration"
        [style.font-size.rem]="p.size"
      >{{ p.emoji }}</span>
    </div>
  `,
  styles: [`
    .particles-container {
      position: fixed;
      inset: 0;
      pointer-events: none;
      overflow: hidden;
      z-index: 0;
    }

    .particle {
      position: absolute;
      bottom: -2rem;
      display: inline-block;
      user-select: none;
      will-change: transform, opacity;
      animation: floatUp linear infinite;
      filter: drop-shadow(0 0 6px rgba(201,162,39,0.6));
    }

    .particle.spin {
      animation: floatUpSpin linear infinite;
    }

    @keyframes floatUp {
      0%   { transform: translateY(0) scale(0.7);  opacity: 0; }
      10%  { opacity: 1; }
      90%  { opacity: 0.7; }
      100% { transform: translateY(-110vh) scale(1.1); opacity: 0; }
    }

    @keyframes floatUpSpin {
      0%   { transform: translateY(0) rotate(0deg) scale(0.7);   opacity: 0; }
      10%  { opacity: 1; }
      90%  { opacity: 0.7; }
      100% { transform: translateY(-110vh) rotate(720deg) scale(1.1); opacity: 0; }
    }
  `],
})
export class FloatingParticlesComponent implements OnInit, OnDestroy {
  @Input() emojis: string[] = ['⭐', '✨'];
  @Input() count = 20;

  particles: FloatingParticle[] = [];

  ngOnInit(): void {
    this.particles = Array.from({ length: this.count }, (_, i) => ({
      id: i,
      emoji: this.emojis[i % this.emojis.length],
      x: Math.random() * 100,
      delay: -(Math.random() * 8),
      duration: 5 + Math.random() * 8,
      size: 0.8 + Math.random() * 1.4,
      spin: Math.random() > 0.5,
    }));
  }

  ngOnDestroy(): void {}
}
