import { NgModule, ErrorHandler } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { IonicApp, IonicModule, IonicErrorHandler } from 'ionic-angular';
import { HttpModule } from '@angular/http';
import { IonicStorageModule } from '@ionic/storage';
import { AppVersion } from '@ionic-native/app-version';
import { CloudSettings, CloudModule } from '@ionic/cloud-angular';

import { AppState } from './app.global';
import { MyApp } from './app.component';
import { ListViewPage } from '../pages/listView/listView';
import { SettingsService} from '../services/settings.service';
import { YelpService } from '../services/yelp.service';

import { StatusBar } from '@ionic-native/status-bar';
import { SplashScreen } from '@ionic-native/splash-screen';

import { Geolocation } from '@ionic-native/geolocation';
import { AgmCoreModule } from '@agm/core';

const cloudSettings: CloudSettings = {
  'core': {
    'app_id': "94106b42"
  }
}

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
    IonicStorageModule.forRoot(),
    CloudModule.forRoot(cloudSettings)
  ],
  bootstrap: [IonicApp],
  entryComponents: [
    MyApp,
    ListViewPage
  ],
  providers: [
    StatusBar,
    SplashScreen,
    AppState,
    SettingsService,
    YelpService,
    AppVersion,
    Geolocation,
    Storage,
    {provide: ErrorHandler, useClass: IonicErrorHandler}
  ]
})
export class AppModule {}
