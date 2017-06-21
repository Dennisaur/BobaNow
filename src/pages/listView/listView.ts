import { Component } from '@angular/core';
import { NavController, Platform } from 'ionic-angular';
import { Http, Headers, RequestOptions } from '@angular/http';
import { Geolocation } from '@ionic-native/geolocation';
import { Observable } from 'rxjs/RX';
import 'rxjs/add/operator/map';
//import { InAppBrowser } from '@ionic-native/in-app-browser';

import { BobaService } from '../../services/boba.service';

declare var cordova;

@Component({
  selector: 'page-listView',
  templateUrl: 'listView.html'
})
export class ListViewPage {
  location: any;
  lat: number;
  lng: number;

  clientId: string = "OXIJVK12GNTdHlmKJR7xbg";
  clientSecret: string = "Kui2Eqxk9OOl7pGXH2yOKLkY32oAWWZRSYENc8hFA9jZbMTnTypcWUM46kzLTAcf"
  accessToken: string = "4CsWcVaxR1MdfR55e6vVjH0XRJNUkDsBHOc7HM073bhnnAbBr2f4-4QliYaYR4QabhRBhRiDfgYiLYYeN9m0scWLcvRAPZqfnC8c8RMe-qUGhmteiNkpx8anPFlDWXYx";

  bobaLocations: any = [];
  openNow: boolean = true;
  dayOfWeek: number;

  constructor(public navCtrl: NavController,
              public http: Http,
              public platform: Platform,
              private geolocation: Geolocation,
              private bobaService: BobaService) {

    let date = new Date();
    this.dayOfWeek = date.getDay();
  }

  // After view is initialized
  ngAfterViewInit() {
    this.bobaLocations = this.bobaService.getLocations();
  }

  // Returns ratings image URL
  getRatingImage(rating) {
    let ratingString = rating;
    if (rating % 1 != 0) {
      ratingString = Math.floor(rating) + "_half";
    }
    return "img/yelp_stars/android/drawable-mdpi/small/stars_small_" + ratingString + ".png";
  }

  // Function to use InAppBrowser to navigate to given URL
  launch(url) {
    this.platform.ready()
    .then(
      () => {
        let browser = cordova.InAppBrowser.open(url, "_system", "location=yes");
      }
    );
  }
}
