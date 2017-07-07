import { Component } from '@angular/core';
import { Deploy } from '@ionic/cloud-angular';
import { Platform, App, ViewController, LoadingController, ToastController, MenuController } from 'ionic-angular';
import { StatusBar } from '@ionic-native/status-bar';
import { SplashScreen } from '@ionic-native/splash-screen';

import { AppState } from './app.global';
import { MainViewPage } from '../pages/mainView/mainView';
import { SettingsService } from '../services/settings.service';
import { YelpService } from '../services/yelp.service';

declare var cordova;

@Component({
  templateUrl: 'app.html'
})
export class MyApp {
  private rootPage:any = MainViewPage;

  // Menu options
  private sortBy: string = "best_match";
  private openNow: boolean = true;
  private radius: string; // Radius search in miles
  private limit: string;

  // Back to exit [Android]
  private lastBack: number;
  private allowClose: boolean;

  private theme: string;

  constructor(private platform: Platform, statusBar: StatusBar, splashScreen: SplashScreen,
              private app: App,
              public global: AppState,
              public deploy: Deploy,
              public loadingController: LoadingController,
              public toastController: ToastController,
              public menuController: MenuController,
              private settingsService: SettingsService,
              private yelpService: YelpService) {

    this.lastBack = Date.now();

    platform.ready().then(() => {
      // Okay, so the platform is ready and our plugins are available.
      // Here you can do any higher level native things you might need.
      statusBar.styleDefault();
      splashScreen.hide();

      // Get values from storage
      this.resetTheme();
      this.getSearchParams();

      // Back button twice to exit
      if (!this.global.get('ios'))
        platform.registerBackButtonAction(() => {
          const overlay = app._appRoot._overlayPortal.getActive();
          const nav = app.getActiveNav();
          const closeDelay = 2000;
          const spamDelay = 100;
          let activeView: ViewController = nav.getActive();

          // Dismiss overlay if active
          if (overlay && overlay.dismiss) {
            overlay.dismiss();
          }
          // Go back a page if we can go back
          else if (nav.canGoBack()) {
            nav.pop();
          }
          // Close menu if open
          else if (menuController.getOpen() != null) {
            menuController.close();
          }
          // Return to map view if currently on list view
          else if (typeof activeView.instance.getIsMapView === 'function' && !activeView.instance.getIsMapView()) {
            activeView.instance.toggleView();
          }
          // First back button press, display toast
          else if (Date.now() - this.lastBack > spamDelay && !this.allowClose) {
            this.allowClose = true;
            let toast = toastController.create({
              message: "Press again to exit",
              duration: closeDelay,
              position: 'middle',
              cssClass: 'backToExit',
              dismissOnPageChange: true
            });
            toast.onDidDismiss(() => {
              this.allowClose = false;
            });
            toast.present();
          }
          // Second back button press, exit app
          else if (Date.now() - this.lastBack < closeDelay && this.allowClose) {
            platform.exitApp();
          }
          this.lastBack = Date.now();
      });
    });
  }

  // Get search params
  getSearchParams() {
    this.settingsService.getSearchParams()
      .then((searchParams) => {
        this.sortBy = searchParams.sortBy;
        this.limit = searchParams.limit.toString();
        this.openNow = searchParams.openNow;
        this.radius = searchParams.radius.toString();
      });
    // this.settingsService.getSortBy()
    //   .then((sortBy) => {
    //     this.sortBy = sortBy;
    //   });
    // this.settingsService.getLimit()
    //   .then((limit) => {
    //     this.limit = limit.toString();
    //   });
    // this.settingsService.getOpenNow()
    //   .then((openNow) => {
    //     this.openNow = openNow;
    //   });
    // this.settingsService.getRadius()
    //   .then((radius) => {
    //     this.radius = radius.toString();
    //   });
  }

  // Updates search params in service and updates new locations
  refreshLocations() {
    this.yelpService.updateSearchParams({
      openNow: this.openNow,
      radius: Number(this.radius),
      sortBy: this.sortBy,
      limit: Number(this.limit)
    });

    // Prevent searching for locations without current location
    if (this.yelpService.getUserLocated()) {
      let loading = this.loadingController.create({
        content: "Searching for boba..."
      });
      loading.present();
      this.yelpService.findLocations()
        .subscribe((data) => {
          loading.dismiss();
        });
    }
  }

  // Function to use InAppBrowser to navigate to given URL
  launch(url, evt) {
    if (evt) {
      evt.stopPropagation();
    }

    this.platform.ready()
      .then(() => {
        cordova.InAppBrowser.open(url, "_system", "location=yes");
      });
  }

  // Changes global theme
  changeTheme(theme: string) {
    this.theme = theme;
    this.global.set('theme', this.theme);
  }

  // Resets theme to what's saved in storage
  resetTheme() {
    this.settingsService.getTheme()
      .then((theme) => {
        this.changeTheme(theme);
      });
  }

  // Saves theme to storage
  saveTheme() {
    this.settingsService.setTheme(this.global.get('theme'));
  }
}
