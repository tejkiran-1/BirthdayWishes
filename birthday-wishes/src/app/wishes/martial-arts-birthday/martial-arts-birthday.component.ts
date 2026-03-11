import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  ChangeDetectorRef,
  ChangeDetectionStrategy,
  HostListener,
  NgZone,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { WishConfigService } from '../../core/services/wish-config.service';
import { WishConfig } from '../../core/models/wish-config.model';
import { ConfettiBurstComponent } from '../../shared/components/confetti-burst/confetti-burst.component';

// ── Demon Slayer Breathing Forms ─────────────────────────────────────────────
export interface BreathingForm {
  id: string;
  kanji: string;
  nameJp: string;
  nameEn: string;
  formLabel: string;   // e.g. "Ninth Form · Rengoku"
  icon: string;
  color: string;       // CSS color for accents
  glowColor: string;   // rgba for glow effects
  bgClass: string;     // CSS class applied to wrapper
  particles: string[];
  kiaiWords: string[];
  hapticPattern: number[];   // vibration pattern for this form
}

export interface SwordSlash {
  id: number;
  x: number;
  y: number;
  angle: number;
  length: number;
  color: string;
  mega?: boolean;
}

let slashId = 0;

@Component({
  selector: 'app-martial-arts-birthday',
  standalone: false,
  templateUrl: './martial-arts-birthday.component.html',
  styleUrls: ['./martial-arts-birthday.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MartialArtsBirthdayComponent implements OnInit, OnDestroy {
  @ViewChild('confetti') confetti!: ConfettiBurstComponent;
  @ViewChild('wrapper') wrapperRef!: ElementRef<HTMLElement>;

  config!: WishConfig;

  // ── Intro state ───────────────────────────────────────────────
  heroVisible = false;
  cardVisible = false;
  hitCount = 0;

  // ── Kiai popup ────────────────────────────────────────────────
  showKiai = false;
  kiaiWord = '';
  shakeActive = false;

  // ── Sword slashes ─────────────────────────────────────────────
  slashes: SwordSlash[] = [];

  // ── Zenitsu loader ─────────────────────────────────────────────
  showLoader = true;
  loaderExiting = false;
  loaderProgress = 0;
  thunderReveal = false;
  private loaderProgressInterval: ReturnType<typeof setInterval> | null = null;

  // ── Mobile enhancements ───────────────────────────────────────
  isFullscreen = false;
  megaSlashActive = false;
  doubleTapFinisherActive = false;
  private suppressNextClick = false;
  private longPressActive = false;
  private longPressTouchX = 0;
  private longPressTouchY = 0;
  private lastTapTime = 0;
  private longPressTimer: ReturnType<typeof setTimeout> | null = null;
  private wakeLock: any = null;
  private motionDetectorUnlisten: (() => void) | null = null;

  // ── Demon Slayer Breathing Forms ──────────────────────────────
  readonly breathingForms: BreathingForm[] = [
    {
      id: 'flame',
      kanji: '炎',
      nameJp: '炎の呼吸',
      nameEn: 'Flame Breathing',
      formLabel: 'Ninth Form · Rengoku',
      icon: '🔥',
      color: '#ff4500',
      glowColor: 'rgba(255,69,0,0.85)',
      bgClass: 'form-flame',
      particles: ['🔥', '💥', '✨', '⭐', '🌟', '🥋'],
      kiaiWords: ['RENGOKU!', '炎!', 'BLAZE!', 'INFERNO!', 'FLAME!', 'KIAI!'],
      hapticPattern: [100, 40, 200],
    },
    {
      id: 'water',
      kanji: '水',
      nameJp: '水の呼吸',
      nameEn: 'Water Breathing',
      formLabel: 'Eleventh Form · Dead Calm',
      icon: '💧',
      color: '#00c8ff',
      glowColor: 'rgba(0,200,255,0.85)',
      bgClass: 'form-water',
      particles: ['💧', '🌊', '❄️', '✨', '💫', '🥋'],
      kiaiWords: ['TOMIOKA!', '水!', 'FLOW!', 'CURRENT!', 'TIDE!', 'OSS!'],
      hapticPattern: [40, 60, 40, 60, 40],
    },
    {
      id: 'thunder',
      kanji: '雷',
      nameJp: '雷の呼吸',
      nameEn: 'Thunder Breathing',
      formLabel: 'First Form · Thunderclap Flash',
      icon: '⚡',
      color: '#ffd700',
      glowColor: 'rgba(255,215,0,0.9)',
      bgClass: 'form-thunder',
      particles: ['⚡', '✨', '💛', '⭐', '🌟', '🥋'],
      kiaiWords: ['ZENITSU!', '雷!', 'FLASH!', 'LIGHTNING!', 'THUNDER!', 'YAH!'],
      hapticPattern: [20, 20, 20, 20, 300],
    },
    {
      id: 'wind',
      kanji: '風',
      nameJp: '風の呼吸',
      nameEn: 'Wind Breathing',
      formLabel: 'Ninth Form · Idaten Typhoon',
      icon: '🌬️',
      color: '#7fff00',
      glowColor: 'rgba(100,220,50,0.85)',
      bgClass: 'form-wind',
      particles: ['🍃', '🌿', '💨', '✨', '🌟', '🥋'],
      kiaiWords: ['SANEMI!', '風!', 'GALE!', 'TYPHOON!', 'CYCLONE!', 'HAJIME!'],
      hapticPattern: [60, 30, 60, 30, 60],
    },
    {
      id: 'sun',
      kanji: '日',
      nameJp: '日の呼吸',
      nameEn: 'Hinokami Kagura',
      formLabel: 'Dance of the Fire God',
      icon: '☀️',
      color: '#ffbe00',
      glowColor: 'rgba(255,165,0,0.9)',
      bgClass: 'form-sun',
      particles: ['☀️', '🌅', '✨', '🌟', '💫', '⭐'],
      kiaiWords: ['TANJIRO!', '日の呼吸!', 'KAGURA!', 'SUN GOD!', 'HINOKAMI!', 'SENSEI!'],
      hapticPattern: [200, 60, 200],
    },
  ];

  activeFormIndex = 0;
  showFormAnnounce = false;
  formAnnounceText = '';

  get activeForm(): BreathingForm { return this.breathingForms[this.activeFormIndex]; }

  // ── Total Concentration Charge ────────────────────────────────
  chargeLevel = 0;                  // 0–100
  totalConcentrationActive = false;
  showConcentrationBurst = false;

  // ── Kanji rain ────────────────────────────────────────────────
  kanjiRain: Array<{ id: number; char: string; x: number; delay: number; dur: number }> = [];
  private readonly kanjiChars = ['滅', '鬼', '炎', '水', '雷', '風', '日', '剣', '刀', '龍', '武'];

  private timers: ReturnType<typeof setTimeout>[] = [];
  private introTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private route: ActivatedRoute,
    private wishConfigService: WishConfigService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') ?? 'satyam-birthday';
    this.config = this.wishConfigService.getWishById(id)!;
    this.generateKanjiRain();
    this.requestWakeLock();
    this.initShakeDetector();
    document.addEventListener('fullscreenchange', () => {
      this.ngZone.run(() => { this.isFullscreen = !!document.fullscreenElement; this.cdr.markForCheck(); });
    });

    // ── Zenitsu loader: fill progress bar over 3s then thunder-exit ──
    this.loaderProgress = 0;
    this.loaderProgressInterval = setInterval(() => {
      this.loaderProgress = Math.min(100, this.loaderProgress + 2);
      this.cdr.markForCheck();
    }, 60); // 50 steps × 60ms ≈ 3 000ms

    const loaderExit = setTimeout(() => {
      if (this.loaderProgressInterval) { clearInterval(this.loaderProgressInterval); this.loaderProgressInterval = null; }
      this.loaderProgress = 100;
      this.loaderExiting = true;
      this.vibrate([50, 30, 50, 30, 300]);
      this.cdr.markForCheck();
      const hideTimer = setTimeout(() => {
        this.showLoader = false;
        this.thunderReveal = true;
        this.cdr.markForCheck();
        const clearReveal = setTimeout(() => { this.thunderReveal = false; this.cdr.markForCheck(); }, 600);
        this.timers.push(clearReveal);
        this.startIntro();
      }, 700);
      this.timers.push(hideTimer);
    }, 3000);
    this.timers.push(loaderExit);
  }

  private startIntro(): void {
    this.introTimer = setTimeout(() => {
      this.heroVisible = true;
      this.cdr.markForCheck();
      const t2 = setTimeout(() => {
        this.cardVisible = true;
        this.cdr.markForCheck();
        this.autoBurst();
        this.announceForm(this.activeForm, true);
      }, 600);
      this.timers.push(t2);
    }, 300);
  }

  // ── Touch handlers ────────────────────────────────────────────
  onWrapperTouchStart(e: TouchEvent): void {
    if (e.touches.length >= 2) {
      if ((e.target as HTMLElement).closest('button, a, .form-selector')) return;
      const x = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const y = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      this.suppressNextClick = true;
      this.triggerTwoFingerAttack(x, y);
      return;
    }
    const touch = e.touches[0];
    this.longPressTouchX = touch.clientX;
    this.longPressTouchY = touch.clientY;
    this.longPressActive = false;
    this.longPressTimer = setTimeout(() => {
      if ((e.target as HTMLElement)?.closest('button, a, .form-selector')) return;
      this.longPressActive = true;
      this.suppressNextClick = true;
      this.ngZone.run(() => { this.triggerMegaSlash(this.longPressTouchX, this.longPressTouchY); this.cdr.markForCheck(); });
    }, 600);
  }

  onWrapperTouchEnd(e: TouchEvent): void {
    if (this.longPressTimer) { clearTimeout(this.longPressTimer); this.longPressTimer = null; }
    if (this.longPressActive) { this.longPressActive = false; return; }
    if ((e.target as HTMLElement).closest('button, a, .form-selector')) return;
    const now = Date.now();
    if (now - this.lastTapTime < 300) {
      this.suppressNextClick = true;
      const touch = e.changedTouches[0];
      this.triggerDoubleTapFinisher(touch.clientX, touch.clientY);
      this.lastTapTime = 0;
    } else {
      this.lastTapTime = now;
    }
  }

  // ── Click handler (desktop + single-tap passthrough) ─────────
  @HostListener('document:click', ['$event'])
  onDocumentClick(e: MouseEvent): void {
    if (this.suppressNextClick) { this.suppressNextClick = false; return; }
    if ((e.target as HTMLElement).closest('button, a, .form-selector')) return;
    this.triggerInteraction(e.clientX, e.clientY);
  }

  triggerInteraction(x: number, y: number): void {
    // Sword slash
    this.spawnSlash(x, y);

    // Confetti in form color
    this.confetti?.burst(x, y, 20);

    this.hitCount++;

    // Charge bar
    const chargeGain = 8 + Math.floor(Math.random() * 7);
    this.chargeLevel = Math.min(100, this.chargeLevel + chargeGain);

    // Kiai
    const form = this.activeForm;
    this.kiaiWord = form.kiaiWords[this.hitCount % form.kiaiWords.length];
    this.showKiai = true;
    this.shakeActive = true;
    this.vibrate(form.hapticPattern);
    this.cdr.markForCheck();

    const t1 = setTimeout(() => {
      this.showKiai = false;
      this.shakeActive = false;
      this.cdr.markForCheck();
    }, 750);
    this.timers.push(t1);

    if (this.chargeLevel >= 100 && !this.totalConcentrationActive) {
      this.triggerTotalConcentration();
    }
  }

  // ── Mega Slash (long press) ───────────────────────────────────
  triggerMegaSlash(x: number, y: number): void {
    this.megaSlashActive = true;
    this.vibrate([200, 80, 200, 80, 400]);
    for (let i = 0; i < 5; i++) {
      this.slashes = [...this.slashes, { id: slashId++, x, y, angle: -60 + i * 30, length: 200 + Math.random() * 100, color: this.activeForm.color, mega: true }];
    }
    this.chargeLevel = Math.min(100, this.chargeLevel + 40);
    this.kiaiWord = this.activeForm.kanji + ' MEGA SLASH!!';
    this.showKiai = true; this.shakeActive = true; this.hitCount += 5;
    const vW = window.innerWidth, vH = window.innerHeight;
    [[x, y], [vW * 0.1, vH * 0.3], [vW * 0.9, vH * 0.3]].forEach(([bx, by], i) => {
      const t = setTimeout(() => { this.confetti?.burst(bx, by, 40); this.cdr.markForCheck(); }, i * 100);
      this.timers.push(t);
    });
    const t = setTimeout(() => {
      this.slashes = this.slashes.filter(s => !s.mega); this.megaSlashActive = false;
      this.showKiai = false; this.shakeActive = false; this.cdr.markForCheck();
      if (this.chargeLevel >= 100 && !this.totalConcentrationActive) this.triggerTotalConcentration();
    }, 900);
    this.timers.push(t); this.cdr.markForCheck();
  }

  // ── Double-tap Finisher ───────────────────────────────────────
  triggerDoubleTapFinisher(x: number, y: number): void {
    if (this.totalConcentrationActive) return;
    this.doubleTapFinisherActive = true;
    this.vibrate([80, 40, 80, 40, 80, 40, 300]);
    this.kiaiWord = '⚔️ FINAL FORM — ' + this.activeForm.nameEn.toUpperCase() + '!!';
    this.showKiai = true; this.shakeActive = true; this.hitCount += 10;
    for (let i = 0; i < 8; i++) {
      this.slashes = [...this.slashes, { id: slashId++, x, y, angle: i * 45, length: 160 + Math.random() * 80, color: this.activeForm.color, mega: true }];
    }
    const vW = window.innerWidth, vH = window.innerHeight;
    [[x, y], [vW * 0.1, vH * 0.1], [vW * 0.9, vH * 0.1], [vW * 0.1, vH * 0.9], [vW * 0.9, vH * 0.9]]
      .forEach(([bx, by], i) => { const t = setTimeout(() => { this.confetti?.burst(bx, by, 50); this.cdr.markForCheck(); }, i * 80); this.timers.push(t); });
    this.chargeLevel = Math.min(100, this.chargeLevel + 60); this.cdr.markForCheck();
    const t = setTimeout(() => {
      this.slashes = this.slashes.filter(s => !s.mega); this.doubleTapFinisherActive = false;
      this.showKiai = false; this.shakeActive = false; this.cdr.markForCheck();
      if (this.chargeLevel >= 100 && !this.totalConcentrationActive) this.triggerTotalConcentration();
    }, 1200);
    this.timers.push(t);
  }

  // ── Two-finger dual strike ────────────────────────────────────
  triggerTwoFingerAttack(x: number, y: number): void {
    this.vibrate([150, 60, 150]); this.hitCount += 3;
    [-40, 40].forEach(angle => {
      const slash: SwordSlash = { id: slashId++, x, y, angle, length: 180 + Math.random() * 60, color: this.activeForm.color };
      this.slashes = [...this.slashes, slash];
      const t = setTimeout(() => { this.slashes = this.slashes.filter(s => s.id !== slash.id); this.cdr.markForCheck(); }, 600);
      this.timers.push(t);
    });
    this.chargeLevel = Math.min(100, this.chargeLevel + 20);
    this.kiaiWord = '✌️ DUAL STRIKE!'; this.showKiai = true; this.shakeActive = true;
    this.confetti?.burst(x, y, 35); this.cdr.markForCheck();
    const t = setTimeout(() => {
      this.showKiai = false; this.shakeActive = false; this.cdr.markForCheck();
      if (this.chargeLevel >= 100 && !this.totalConcentrationActive) this.triggerTotalConcentration();
    }, 800);
    this.timers.push(t);
  }

  // ── Sword slash spawner ───────────────────────────────────────
  private spawnSlash(x: number, y: number): void {
    const slash: SwordSlash = {
      id: slashId++,
      x,
      y,
      angle: -30 + Math.random() * 60,
      length: 120 + Math.random() * 140,
      color: this.activeForm.color,
    };
    this.slashes = [...this.slashes, slash];
    this.cdr.markForCheck();

    const t = setTimeout(() => {
      this.slashes = this.slashes.filter(s => s.id !== slash.id);
      this.cdr.markForCheck();
    }, 550);
    this.timers.push(t);
  }

  // ── Total Concentration: Constant ─────────────────────────────
  triggerTotalConcentration(): void {
    this.totalConcentrationActive = true;
    this.showConcentrationBurst = true;
    this.kiaiWord = '全集中・常中!';
    this.showKiai = true;
    this.vibrate([100, 50, 100, 50, 100, 50, 500]);
    this.cdr.markForCheck();

    // Multi-burst confetti
    const vW = window.innerWidth, vH = window.innerHeight;
    [[vW * 0.15, vH * 0.2], [vW * 0.5, vH * 0.15], [vW * 0.85, vH * 0.2],
     [vW * 0.25, vH * 0.6], [vW * 0.75, vH * 0.6], [vW * 0.5, vH * 0.45]]
      .forEach(([bx, by], i) => {
        const t = setTimeout(() => { this.confetti?.burst(bx, by, 45); this.cdr.markForCheck(); }, i * 120);
        this.timers.push(t);
      });

    const tEnd = setTimeout(() => {
      this.showConcentrationBurst = false;
      this.showKiai = false;
      this.totalConcentrationActive = false;
      this.chargeLevel = 0;
      this.cdr.markForCheck();
    }, 2600);
    this.timers.push(tEnd);
  }

  // ── Breathing form switch ─────────────────────────────────────
  switchForm(index: number): void {
    if (index === this.activeFormIndex) return;
    this.activeFormIndex = index;
    this.chargeLevel = 0;
    this.generateKanjiRain();
    this.vibrate([50, 30, 100]);
    this.cdr.markForCheck();
    this.announceForm(this.activeForm, false);
    const vW = window.innerWidth, vH = window.innerHeight;
    this.confetti?.burst(vW / 2, vH / 3, 30);
  }

  private announceForm(form: BreathingForm, silent: boolean): void {
    this.formAnnounceText = `${form.nameJp} — ${form.formLabel}`;
    this.showFormAnnounce = true;
    this.cdr.markForCheck();
    const delay = silent ? 2200 : 1800;
    const t = setTimeout(() => {
      this.showFormAnnounce = false;
      this.cdr.markForCheck();
    }, delay);
    this.timers.push(t);
  }

  // ── Kanji rain generator ──────────────────────────────────────
  private generateKanjiRain(): void {
    const form = this.activeForm;
    const chars = [form.kanji, ...this.kanjiChars].slice(0, 8);
    this.kanjiRain = Array.from({ length: 14 }, (_, i) => ({
      id: i,
      char: chars[i % chars.length],
      x: Math.random() * 100,
      delay: -(Math.random() * 12),
      dur: 8 + Math.random() * 10,
    }));
  }

  // ── Big CTA button ────────────────────────────────────────────
  fireKick(): void {
    const vW = window.innerWidth, vH = window.innerHeight;
    this.spawnSlash(vW / 2, vH / 2);
    this.confetti?.burst(vW / 2, vH / 2, 60);
    this.chargeLevel = Math.min(100, this.chargeLevel + 25);
    this.kiaiWord = this.activeForm.icon + ' ' + this.activeForm.kanji + '!!';
    this.showKiai = true;
    this.shakeActive = true;
    this.vibrate(this.activeForm.hapticPattern);
    this.cdr.markForCheck();
    const t = setTimeout(() => {
      this.showKiai = false; this.shakeActive = false; this.cdr.markForCheck();
    }, 900);
    this.timers.push(t);
    if (this.chargeLevel >= 100 && !this.totalConcentrationActive) {
      this.triggerTotalConcentration();
    }
  }

  private autoBurst(): void {
    const vW = window.innerWidth, vH = window.innerHeight;
    [[vW * 0.25, vH * 0.3], [vW * 0.5, vH * 0.2], [vW * 0.75, vH * 0.3]]
      .forEach(([x, y], i) => {
        const t = setTimeout(() => { this.confetti?.burst(x, y, 35); this.cdr.markForCheck(); }, i * 300);
        this.timers.push(t);
      });
  }

  // ── Fullscreen toggle ─────────────────────────────────────────
  toggleFullscreen(): void {
    const el = this.wrapperRef?.nativeElement ?? document.documentElement;
    if (!document.fullscreenElement) {
      const req = (el as any).requestFullscreen ?? (el as any).webkitRequestFullscreen;
      req?.call(el)?.catch(() => {});
    } else {
      const exit = (document as any).exitFullscreen ?? (document as any).webkitExitFullscreen;
      exit?.call(document)?.catch(() => {});
    }
  }

  // ── Native share ──────────────────────────────────────────────
  async shareWish(): Promise<void> {
    try {
      if ((navigator as any).share) {
        await (navigator as any).share({ title: 'Happy Birthday Satyam! ⚔️', text: 'An epic Demon Slayer birthday wish 🔥🥋', url: location.href });
      } else {
        await navigator.clipboard.writeText(location.href);
        this.kiaiWord = '🔗 Link Copied!';
        this.showKiai = true; this.cdr.markForCheck();
        const t = setTimeout(() => { this.showKiai = false; this.cdr.markForCheck(); }, 1500);
        this.timers.push(t);
      }
    } catch {}
  }

  // ── Wake lock ─────────────────────────────────────────────────
  private async requestWakeLock(): Promise<void> {
    try {
      if ('wakeLock' in navigator) this.wakeLock = await (navigator as any).wakeLock.request('screen');
    } catch {}
  }

  // ── Shake → Total Concentration ───────────────────────────────
  private initShakeDetector(): void {
    const THRESHOLD = 18; let lastShake = 0;
    const handler = (e: DeviceMotionEvent) => {
      const acc = e.accelerationIncludingGravity;
      if (!acc) return;
      const force = Math.sqrt((acc.x ?? 0) ** 2 + (acc.y ?? 0) ** 2 + (acc.z ?? 0) ** 2);
      const now = Date.now();
      if (force > THRESHOLD && now - lastShake > 2000) {
        lastShake = now;
        this.ngZone.run(() => {
          this.chargeLevel = 100;
          if (!this.totalConcentrationActive) { this.vibrate([100, 50, 100, 50, 300]); this.triggerTotalConcentration(); }
        });
      }
    };
    window.addEventListener('devicemotion', handler);
    this.motionDetectorUnlisten = () => window.removeEventListener('devicemotion', handler);
  }

  // ── Haptic wrapper ────────────────────────────────────────────
  private vibrate(pattern: number[]): void {
    try { if ('vibrate' in navigator) navigator.vibrate(pattern); } catch {}
  }

  // ── CTA button also fires kick with haptics ───────────────────
  fireKickMobile(): void {
    this.vibrate(this.activeForm.hapticPattern);
    this.fireKick();
  }

  trackBySlash(_: number, s: SwordSlash): number { return s.id; }
  trackByKanji(_: number, k: { id: number }): number { return k.id; }

  ngOnDestroy(): void {
    if (this.introTimer) clearTimeout(this.introTimer);
    if (this.longPressTimer) clearTimeout(this.longPressTimer);
    if (this.loaderProgressInterval) clearInterval(this.loaderProgressInterval);
    this.timers.forEach(clearTimeout);
    this.wakeLock?.release?.().catch(() => {});
    this.motionDetectorUnlisten?.();
  }
}
