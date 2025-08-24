import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { BrowserErrorComponent } from './browser-error.component';

const routes: Routes = [
  { path: 'browser-error', component: BrowserErrorComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
