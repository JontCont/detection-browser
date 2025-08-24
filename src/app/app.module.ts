import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { MaibBrowserCompatibilityModule } from './service/browser-compatibility.module';
import { BrowserErrorComponent } from './browser-error.component';

@NgModule({
  declarations: [
    AppComponent,
    BrowserErrorComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    MaibBrowserCompatibilityModule.forRoot()
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
