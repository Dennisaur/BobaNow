import { NgModule, ErrorHandler } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { IonicApp, IonicModule, IonicErrorHandler } from 'ionic-angular';
import { MyApp } from './app.component';
import { HttpModule } from '@angular/http';
import { IonicStorageModule } from '@ionic/storage';
import { AppVersion } from '@ionic-native/app-version';

import { ListViewPage } from '../pages/listView/listView';
import { YelpService } from '../services/yelp.service';

import { StatusBar } from '@ionic-native/status-bar';
import { SplashScreen } from '@ionic-native/splash-screen';

import { Geolocation } from '@ionic-native/geolocation';
import { AgmCoreModule } from '@agm/core';

@NgModule({
  declarations: [
    MyApp,
    ListViewPage
  ],
  imports: [
    BrowserModule,
    HttpModule,
    IonicModule.forRoot(MyApp, {
      tabsPlacement: 'top'
    }),
    AgmCoreModule.forRoot({
      apiKey: 'AIzaSyDcCzzTSBvYIgH8AdNYgkSlaVO5Jnlb0rk'
    }),
    IonicStorageModule.forRoot()
  ],
  bootstrap: [IonicApp],
  entryComponents: [
    MyApp,
    ListViewPage
  ],
  providers: [
    StatusBar,
    SplashScreen,
    Geolocation,
    YelpService,
    Storage,
    AppVersion,
    {provide: ErrorHandler, useClass: IonicErrorHandler}
  ]
})
export class AppModule {}
