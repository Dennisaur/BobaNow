import { Component } from '@angular/core';
import { NavController, Platform, LoadingController } from 'ionic-angular';
import { Http } from '@angular/http';
import 'rxjs/add/operator/map';

import { YelpService } from '../../services/yelp.service';

declare var cordova;
var testingInBrowser = false;

@Component({
  selector: 'page-listView',
  templateUrl: 'listView.html'
})
export class ListViewPage {
  bobaLocations: any = [];
  openNow: boolean = true;
  distance: number = 5;
  sortBy: string = "best_match";
  loadingControl: any;
  waitingForLocations: boolean = false;

  constructor(public navCtrl: NavController,
              public http: Http,
              public platform: Platform,
              public loadingController: LoadingController,
              private yelpService: YelpService) {

    if (testingInBrowser) {
      this.getTestResults();
    }
    else {
      let loadingControl = loadingController.create({content: "Loading..."});
      loadingControl.present();

      yelpService.locateUser()
        .then(
          (location) => {
            loadingControl.dismissAll();
            if (!this.waitingForLocations) {
              this.getLocations();
            }
          }
        );
    }
  }


  ionViewWillEnter() {
    this.openNow = this.yelpService.getOpenNow();
    this.distance = this.yelpService.getDistance();
    this.sortBy = this.yelpService.getSortBy();
    this.getLocations();
  }

  // Updates search params in service and updates new locations
  refreshLocations() {
    this.yelpService.updateSearchParams({
      openNow: this.openNow,
      distance: this.distance * 1609.34, // Convert to meters
      sortBy: this.sortBy
    });

    this.getLocations();
  }

  // Loads locations from service to local variable
  getLocations() {
    if (!testingInBrowser) {
      if (this.yelpService.getIsDirty()) {
        let loadingControl = this.loadingController.create({content: "Loading..."});
        loadingControl.present();
        this.waitingForLocations = true;
        this.yelpService.findLocations()
          .subscribe(
            data => {
              this.bobaLocations = this.yelpService.getLocations();
              this.waitingForLocations = false;
              loadingControl.dismissAll();
            }
          )
      }
      else {
        this.bobaLocations = this.yelpService.getLocations();
      }
    }
  }

  // Toggles open now "button"
  toggleOpenNow() {
    this.openNow = !this.openNow;
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

  // For testing without using calling Yelp API
  getTestResults() {
    this.http.get("./testResults.json").map(res => res.json())
      .subscribe(
        (data) => {
          this.bobaLocations = data.businesses;
          for (let location of this.bobaLocations) {
            // Add some new properties to locations for easier access
            location.ratingImage = this.yelpService.getRatingImage(location.rating);
            location.launchMapsUrl = this.yelpService.getLaunchMapsUrl(location);
          }
        }
      );
  }
}
