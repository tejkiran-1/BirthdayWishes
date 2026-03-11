import { Injectable } from '@angular/core';
import { WishConfig } from '../models/wish-config.model';
import { OccasionType } from '../models/occasion.enum';

@Injectable({ providedIn: 'root' })
export class WishConfigService {

  /**
   * Central registry of all wish configs.
   * To add a new wish: append an entry here and add a matching route.
   */
  private readonly wishes: WishConfig[] = [
    // ─── Satyam Gupta — Birthday 2026 ──────────────────────────────
    {
      id: 'satyam-birthday',
      personName: 'Satyam Gupta',
      shortName: 'Satyam',
      gender: 'male',
      occasionType: OccasionType.BIRTHDAY,
      title: 'Happy Birthday!',
      subtitle: 'The Warrior. The Champion. The Legend.',
      messages: [
        'On this special day, we celebrate the fierce spirit and unwavering discipline of a true martial arts warrior.',
        'Your dedication on the mat is matched only by the warmth of your heart off it. May this year bring you new belts, new heights, and victories beyond the dojo.',
        'The world bows to a champion — today, we bow to you. Fight on, legend!',
      ],
      highlights: [
        '🥋 Happy Birthday, Fighter!',
        '⚡ A New Year. New Power. New Victories.',
        '🏆 The Warrior Celebrates Today!',
      ],
      theme: {
        themeClass: 'theme-martial-arts',
        bgColor: '#0a0a0f',
        accentColor: '#c9a227',
        secondaryColor: '#8b0000',
        textColor: '#f5f5f5',
        particles: ['🥋', '⭐', '🌟', '✨', '🔥', '💥', '⚡', '🏆'],
        vibeLabel: 'Martial Arts Warrior',
      },
      componentKey: 'martial-arts-birthday',
      occasionDate: new Date('2026-03-11'),
    },
    // ─── Add more wishes below ─────────────────────────────────────
    // {
    //   id: 'priya-anniversary',
    //   ...
    // },
  ];

  /** Find a wish config by its URL slug */
  getWishById(id: string): WishConfig | undefined {
    return this.wishes.find(w => w.id === id);
  }

  /** Get all wishes (for the home / directory page) */
  getAllWishes(): WishConfig[] {
    return [...this.wishes];
  }
}
