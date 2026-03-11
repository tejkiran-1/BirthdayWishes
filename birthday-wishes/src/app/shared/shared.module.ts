import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FloatingParticlesComponent } from './components/floating-particles/floating-particles.component';
import { ConfettiBurstComponent } from './components/confetti-burst/confetti-burst.component';

@NgModule({
  declarations: [
    FloatingParticlesComponent,
    ConfettiBurstComponent,
  ],
  imports: [CommonModule],
  exports: [
    CommonModule,
    FloatingParticlesComponent,
    ConfettiBurstComponent,
  ],
})
export class SharedModule {}
