import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  // Default redirect — Satyam's birthday page is the landing page
  { path: '', redirectTo: '/wish/satyam-birthday', pathMatch: 'full' },
  // Wildcard: redirect unknown paths to home
  { path: '**', redirectTo: '/wish/satyam-birthday' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
