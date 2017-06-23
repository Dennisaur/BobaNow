import { Storage } from '@ionic/storage';
import { Injectable } from '@angular/core';
import { Http, Headers, RequestOptions } from '@angular/http';

@Injectable()
export class BobaService {
  private locations: any;
  private clientId: string;
  private clientSecret: string;
  private accessToken: string;
  private requestOptions: RequestOptions;
  private dayOfWeek: number;

  constructor (public http: Http,
               private storage: Storage) {

    this.clientId = "OXIJVK12GNTdHlmKJR7xbg";
    this.clientSecret = "Kui2Eqxk9OOl7pGXH2yOKLkY32oAWWZRSYENc8hFA9jZbMTnTypcWUM46kzLTAcf"
    this.accessToken = "4CsWcVaxR1MdfR55e6vVjH0XRJNUkDsBHOc7HM073bhnnAbBr2f4-4QliYaYR4QabhRBhRiDfgYiLYYeN9m0scWLcvRAPZqfnC8c8RMe-qUGhmteiNkpx8anPFlDWXYx";

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

    let headers = new Headers();
    headers.append('Authorization', "Bearer " + this.accessToken);
    this.requestOptions = new RequestOptions({headers: headers});

    let date = new Date();
    this.dayOfWeek = date.getDay();
  }

  // Returns current search locations
  getLocations() {
    return this.locations;
  }

  // Use Yelp API to locate nearby locations
  findLocations(yelpParams: any) {
    // Generate get request URL
    let getRequestUrl = "https://api.yelp.com/v3/businesses/search?";
    let term = "term=" + yelpParams.term;
    let latitude = "latitude=" + yelpParams.latitude;
    let longitude = "longitude=" + yelpParams.longitude;
    let radius = "radius=" + yelpParams.radius; // In meters
    let limit = "limit=" + yelpParams.limit;
    let openNow = "open_now=" + yelpParams.openNow;
    let sortBy = "sort_by=" + yelpParams.sortBy;

    getRequestUrl = getRequestUrl + term + "&"
      + latitude + "&"
      + longitude + "&"
      + radius + "&"
      + limit + "&"
      + openNow + "&"
      + sortBy;

    let observableGetRequest = this.http.get(getRequestUrl, this.requestOptions).map(res => res.json());

    // Store results when response from get request received
    observableGetRequest.subscribe(
      data => {
        this.locations = data.businesses;
        for (let location of this.locations) {
          // Get hours for each location (not provided from search API)
          this.getMoreInfo(location);
        }
      }
    );

    return observableGetRequest;
  }

  // Separate get request to received specific hours for a given business location
  getMoreInfo(location: any) {
    let observableGetRequest = this.http.get("https://api.yelp.com/v3/businesses/" + location.id, this.requestOptions).map(res => res.json());

    // Add some new properties to locations for easier access
    location.ratingImage = this.getRatingImage(location.rating);
    location.launchMapsUrl = this.getLaunchMapsUrl(location);

    observableGetRequest.subscribe(
        data => {
          // Add open and close times as date object to location
          location.hours = data.hours[0].open;
          let startTime = location.hours[this.dayOfWeek].start;
          let endTime = location.hours[this.dayOfWeek].end;
          location.openTime = new Date(0, 0, 0, Math.floor(startTime / 100), startTime % 100);
          location.closeTime = new Date(0, 0, 0, Math.floor(endTime / 100), endTime % 100);
        }
      );

    return observableGetRequest;
  }

  // Returns ratings image URL
  getRatingImage(rating) {
    let ratingString = rating;
    if (rating % 1 != 0) {
      ratingString = Math.floor(rating) + "_half";
    }
    return "img/yelp_stars/android/drawable-mdpi/small/stars_small_" + ratingString + ".png";
  }

  // Returns link to nativate to location from current position
  getLaunchMapsUrl(location) {
    return "https://www.google.com/maps/dir/?api=1&destination=" + location.coordinates.latitude + "," + location.coordinates.longitude;
  }
}
