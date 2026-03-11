import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { MartialArtsBirthdayComponent } from './martial-arts-birthday/martial-arts-birthday.component';

const routes: Routes = [
  { path: '',               component: HomeComponent },
  // Generic wish route — resolves component based on theme in WishConfigService
  { path: 'wish/satyam-birthday', component: MartialArtsBirthdayComponent },
  // Catch-all for the generic :id param (future themes will be added here)
  { path: 'wish/:id',       component: MartialArtsBirthdayComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class WishesRoutingModule {}
