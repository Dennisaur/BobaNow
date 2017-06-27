import { Component } from '@angular/core';
import { Platform } from 'ionic-angular';
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
  distance: number = 5; // Radius search in miles
  limit: number = 10;

  constructor(private platform: Platform, statusBar: StatusBar, splashScreen: SplashScreen,
              private yelpService: YelpService) {
    console.log("Constructor");
    platform.ready().then(() => {
      console.log("Platform ready");
      // Okay, so the platform is ready and our plugins are available.
      // Here you can do any higher level native things you might need.
      statusBar.styleDefault();
      yelpService.locateUser()
        .then(
          (location) => {
            console.log("Located user");
            yelpService.findLocations()
              .subscribe(
                data => {
                  console.log("Found locations, hiding splash screen");
                  splashScreen.hide();
                }
              );
          }
        );
    });
  }

  // Updates search params in service and updates new locations
  refreshLocations() {
    this.yelpService.updateSearchParams({
      openNow: this.openNow,
      radius: this.distance * 1609.34, // Convert to meters
      sortBy: this.sortBy,
      limit: this.limit
    });

    this.yelpService.findLocations();
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
