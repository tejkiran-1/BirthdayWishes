import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ChangeDetectorRef,
  ChangeDetectionStrategy,
  HostListener,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { WishConfigService } from '../../core/services/wish-config.service';
import { WishConfig } from '../../core/models/wish-config.model';
import { ConfettiBurstComponent } from '../../shared/components/confetti-burst/confetti-burst.component';

@Component({
  selector: 'app-martial-arts-birthday',
  standalone: false,
  templateUrl: './martial-arts-birthday.component.html',
  styleUrls: ['./martial-arts-birthday.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MartialArtsBirthdayComponent implements OnInit, OnDestroy {
  @ViewChild('confetti') confetti!: ConfettiBurstComponent;

  config!: WishConfig;

  // State flags
  heroVisible = false;
  cardVisible = false;
  messageFocus = false;
  hitCount = 0;
  lastPunchZone: 'left' | 'right' | 'center' | null = null;
  showKiai = false;
  kiaiWord = '';
  shakeActive = false;

  private timers: ReturnType<typeof setTimeout>[] = [];
  private introTimer: ReturnType<typeof setTimeout> | null = null;

  readonly kiaiWords = ['KIAI!', 'OSS!', 'HAJIME!', 'YAH!', 'SENSEI!', 'DOJO!'];
  readonly particles = ['🥋', '⭐', '🌟', '✨', '🔥', '💥', '⚡', '🏆', '🎯', '🎖️'];

  constructor(
    private route: ActivatedRoute,
    private wishConfigService: WishConfigService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') ?? 'satyam-birthday';
    this.config = this.wishConfigService.getWishById(id)!;

    // Staged reveal with delays
    this.introTimer = setTimeout(() => {
      this.heroVisible = true;
      this.cdr.markForCheck();

      const t2 = setTimeout(() => {
        this.cardVisible = true;
        this.cdr.markForCheck();
        // Auto-burst confetti on first load
        this.autoBurst();
      }, 600);
      this.timers.push(t2);
    }, 300);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(e: MouseEvent): void {
    // Don't trigger on buttons
    if ((e.target as HTMLElement).closest('button, a')) return;
    this.triggerInteraction(e.clientX, e.clientY);
  }

  triggerInteraction(x: number, y: number): void {
    this.confetti?.burst(x, y, 25);
    this.hitCount++;

    // Determine zone
    const zone = x < window.innerWidth * 0.33
      ? 'left'
      : x > window.innerWidth * 0.66
        ? 'right'
        : 'center';
    this.lastPunchZone = zone;

    // Show kiai word
    this.kiaiWord = this.kiaiWords[this.hitCount % this.kiaiWords.length];
    this.showKiai = true;
    this.shakeActive = true;
    this.cdr.markForCheck();

    const t1 = setTimeout(() => {
      this.showKiai = false;
      this.shakeActive = false;
      this.cdr.markForCheck();
    }, 800);
    this.timers.push(t1);
  }

  private autoBurst(): void {
    const viewW = window.innerWidth;
    const viewH = window.innerHeight;

    // 3 burst points across the top area
    [[viewW * 0.25, viewH * 0.3], [viewW * 0.5, viewH * 0.2], [viewW * 0.75, viewH * 0.3]]
      .forEach(([x, y], i) => {
        const t = setTimeout(() => {
          this.confetti?.burst(x, y, 35);
          this.cdr.markForCheck();
        }, i * 300);
        this.timers.push(t);
      });
  }

  fireKick(): void {
    this.confetti?.burst(window.innerWidth / 2, window.innerHeight / 2, 50);
    this.kiaiWord = '🥋 FIGHT!';
    this.showKiai = true;
    this.shakeActive = true;
    this.cdr.markForCheck();
    const t = setTimeout(() => {
      this.showKiai = false;
      this.shakeActive = false;
      this.cdr.markForCheck();
    }, 900);
    this.timers.push(t);
  }

  ngOnDestroy(): void {
    if (this.introTimer) clearTimeout(this.introTimer);
    this.timers.forEach(clearTimeout);
  }
}
