import { Component } from '@angular/core';
import { NavController, Platform } from 'ionic-angular';
import { Http, Headers, RequestOptions } from '@angular/http';
import { Geolocation } from '@ionic-native/geolocation';
import { Observable } from 'rxjs/RX';
import 'rxjs/add/operator/map';

import { BobaService } from '../../services/boba.service';

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

  bobaLocations: any;
  openNow: boolean = true;

  constructor(public navCtrl: NavController,
              public http: Http,
              public platform: Platform,
              private geolocation: Geolocation) {
/*
    let headers = new Headers({'Content-Type': "application/x-www-form-urlencoded"});
    let options = new RequestOptions({headers: headers});
    let body = new FormData();
    body.append('grant_type', 'client_credentials');
    body.append('client_id', this.clientId);
    body.append('client_secret', this.clientSecret);

    http.post("https://api.yelp.com/oauth2/token", body, options)
      .subscribe(
        data => {
          console.log("post" + data.json());
        }
      );
      */

  }

  // Load map only after view is initialized
  ngAfterViewInit() {
    this.platform.ready()
      .then(
        () => {
          this.locateUser();
        }
      );
  }

  // Get current location and center map to current position
  locateUser(redoSearch: boolean = false) {
    this.geolocation.getCurrentPosition()
      .then(
        (location) => {
          this.location = location;
          this.lat = location.coords.latitude;
          this.lng = location.coords.longitude;

          if (redoSearch) {
            this.findBoba();
          }
          else {
            this.getTestResults();
          }
        }
      )
      .catch(
        (error) => console.log("An error occurred getting current location")
      );
  }

  // Use Yelp API to locate nearby locations
  findBoba() {
    let headers = new Headers();
    headers.append('Authorization', "Bearer " + this.accessToken);
    let options = new RequestOptions({headers: headers});

    // Generate get request URL
    let getRequestUrl = "https://api.yelp.com/v3/businesses/search?";
    let term = "term=" + "boba";
    let latitude = "latitude=" + this.lat;
    let longitude = "longitude=" + this.lng;
    let radius = "radius=" + "5000"; // Meters
    let limit = "limit=" + "10";
    let openNowString = "open_now=" + this.openNow;
    let sortBy = "sort_by=" + "distance";

    getRequestUrl = getRequestUrl + term + "&"
      + latitude + "&"
      + longitude + "&"
      + radius + "&"
      + limit + "&"
      + openNowString + "&"
      + sortBy;

    this.http.get(getRequestUrl, options).map(res => res.json())
      .subscribe(
        data => {
          this.bobaLocations = data.businesses;
        }
      );
  }

  getTestResults() {
    this.http.get('./testResults.json').map(res => res.json())
      .subscribe(
        data => {
          this.bobaLocations = data.businesses;
        }
      );
  }

  getRatingImage(rating) {
    let ratingString = rating;
    if (rating % 1 != 0) {
      ratingString = Math.floor(rating) + "_half";
    }
    return "img/yelp_stars/android/drawable-mdpi/small/stars_small_" + ratingString + ".png";
  }
}
