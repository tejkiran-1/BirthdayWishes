import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedModule } from '../shared/shared.module';
import { WishesRoutingModule } from './wishes-routing.module';

import { HomeComponent } from './home/home.component';
import { MartialArtsBirthdayComponent } from './martial-arts-birthday/martial-arts-birthday.component';

@NgModule({
  declarations: [
    HomeComponent,
    MartialArtsBirthdayComponent,
  ],
  imports: [
    CommonModule,
    SharedModule,
    WishesRoutingModule,
  ],
})
export class WishesModule {}
