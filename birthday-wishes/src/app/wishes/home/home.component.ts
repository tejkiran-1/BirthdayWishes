import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { WishConfig } from '../../core/models/wish-config.model';
import { WishConfigService } from '../../core/services/wish-config.service';

@Component({
  selector: 'app-home',
  standalone: false,
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent implements OnInit {
  wishes: WishConfig[] = [];

  constructor(
    private wishConfigService: WishConfigService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.wishes = this.wishConfigService.getAllWishes();
  }

  openWish(id: string): void {
    this.router.navigate(['/wish', id], { state: { fromWishCard: true } });
  }

  getOccasionIcon(type: string): string {
    const icons: Record<string, string> = {
      birthday: '🎂',
      anniversary: '💍',
      wedding: '💒',
      farewell: '👋',
      graduation: '🎓',
      custom: '🎉',
    };
    return icons[type] ?? '🎉';
  }
}
