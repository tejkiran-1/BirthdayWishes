import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  ChangeDetectorRef,
  ChangeDetectionStrategy,
  HostListener,
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
}

export interface SwordSlash {
  id: number;
  x: number;         // px from left
  y: number;         // px from top
  angle: number;     // degrees
  length: number;    // px
  color: string;
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
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') ?? 'satyam-birthday';
    this.config = this.wishConfigService.getWishById(id)!;
    this.generateKanjiRain();

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

  // ── Click handler ─────────────────────────────────────────────
  @HostListener('document:click', ['$event'])
  onDocumentClick(e: MouseEvent): void {
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
    this.cdr.markForCheck();

    const t1 = setTimeout(() => {
      this.showKiai = false;
      this.shakeActive = false;
      this.cdr.markForCheck();
    }, 750);
    this.timers.push(t1);

    // Total Concentration trigger
    if (this.chargeLevel >= 100 && !this.totalConcentrationActive) {
      this.triggerTotalConcentration();
    }
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
    this.cdr.markForCheck();
    this.announceForm(this.activeForm, false);

    // Small burst on form switch
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

  trackBySlash(_: number, s: SwordSlash): number { return s.id; }
  trackByKanji(_: number, k: { id: number }): number { return k.id; }

  ngOnDestroy(): void {
    if (this.introTimer) clearTimeout(this.introTimer);
    this.timers.forEach(clearTimeout);
  }
}
