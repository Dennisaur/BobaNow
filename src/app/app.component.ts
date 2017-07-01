import { Component } from '@angular/core';
import { Platform, App, LoadingController, ToastController, MenuController } from 'ionic-angular';
import { StatusBar } from '@ionic-native/status-bar';
import { SplashScreen } from '@ionic-native/splash-screen';

import { ListViewPage } from '../pages/listView/listView';

import { YelpService } from '../services/yelp.service';

declare var cordova;

@Component({
  templateUrl: 'app.html'
})
export class MyApp {
  rootPage:any = ListViewPage;

  // Menu options
  sortBy: string = "best_match";
  openNow: boolean = true;
  radius: string; // Radius search in miles
  limit: string;

  lastBack: number;
  allowClose: boolean;

  constructor(private platform: Platform, statusBar: StatusBar, splashScreen: SplashScreen,
              private app: App,
              public loadingController: LoadingController,
              public toastController: ToastController,
              public menuController: MenuController,
              private yelpService: YelpService) {

    this.lastBack = Date.now();
    platform.ready().then(() => {
      // Okay, so the platform is ready and our plugins are available.
      // Here you can do any higher level native things you might need.
      statusBar.styleDefault();
      splashScreen.hide();
      this.getSearchParams();

      // Back button twice to exit
      platform.registerBackButtonAction(() => {
        const overlay = app._appRoot._overlayPortal.getActive();
        const nav = app.getActiveNav();
        const closeDelay = 2000;
        const spamDelay = 100;

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
    this.sortBy = this.yelpService.getSortBy();
    this.limit = this.yelpService.getLimit().toString();
    this.openNow = this.yelpService.getOpenNow();
    this.radius = this.yelpService.getRadius().toString();
  }

  // Updates search params in service and updates new locations
  refreshLocations() {

    this.yelpService.updateSearchParams({
      openNow: this.openNow,
      radius: Number(this.radius),
      sortBy: this.sortBy,
      limit: Number(this.limit)
    });

    // Prevent searching for locations when Yelp service not ready
    if (this.yelpService.getReadyToSearch()) {
      let loading = this.loadingController.create({
        content: "Finding boba..."
      });
      loading.present();
      this.yelpService.findLocations()
        .subscribe(
            data => {
              loading.dismiss();
            }
        );
    }
  }

  // Function to use InAppBrowser to navigate to given URL
  launch(url, evt) {
    if (evt) {
      evt.stopPropagation();
    }

    this.platform.ready()
    .then(
      () => {
        cordova.InAppBrowser.open(url, "_system", "location=yes");
      }
    );
  }

}
