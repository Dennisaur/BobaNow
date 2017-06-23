import { Component } from '@angular/core';
import { NavController, Platform, LoadingController } from 'ionic-angular';
import { Http, Headers, RequestOptions } from '@angular/http';
import { Geolocation } from '@ionic-native/geolocation';
import { Observable } from 'rxjs/RX';
import 'rxjs/add/operator/map';
//import { InAppBrowser } from '@ionic-native/in-app-browser';

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
            this.getLocations();
          }
        );

    }

  }

  // Updates search params in service and updates new locations
  refreshLocations() {
    this.yelpService.updateSearchParams({
      openNow: this.openNow,
      distance: this.distance * 1609.34,
      sortBy: this.sortBy
    });

    this.getLocations();
  }

  // Loads locations from service to local locations
  getLocations() {
    if (!testingInBrowser) {
      let loadingControl = this.loadingController.create({content: "Loading..."});
      loadingControl.present();

      this.yelpService.findLocations()
        .subscribe(
          data => {
            this.bobaLocations = this.yelpService.getLocations();
            loadingControl.dismissAll();
          }
        )
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
        let browser = cordova.InAppBrowser.open(url, "_system", "location=yes");
      }
    );
  }

  getTestResults() {
    this.http.get("./testResults.json").map(res => res.json())
      .subscribe(
        (data) => this.bobaLocations = data.businesses
      );
  }
}
