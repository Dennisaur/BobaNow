import { Storage } from '@ionic/storage';
import { Injectable } from '@angular/core';
import { Geolocation, Geoposition } from '@ionic-native/geolocation';
import { Http, Headers, RequestOptions } from '@angular/http';
import { Observable } from 'rxjs/Observable';

@Injectable()
export class YelpService {
  private lat: number;
  private lng: number;
  private locations: any;
  private clientId: string;
  private clientSecret: string;
  private accessToken: string;
  private requestOptions: RequestOptions;
  private dayOfWeek: number;

  private defaultSearchParams: any;
  private openNow: boolean;
  private radius: number;
  private sortBy: string;

  private getRequests: number;
  private remainingBusinessesToCheck: number;

  private currentLocation: any;
  private currentLocationObserver: any;
  private search: any;
  private searchObserver: any;


  constructor (public http: Http,
               private geolocation: Geolocation,
               private storage: Storage) {

    this.getRequests = 0;

    this.clientId = "OXIJVK12GNTdHlmKJR7xbg";
    this.clientSecret = "Kui2Eqxk9OOl7pGXH2yOKLkY32oAWWZRSYENc8hFA9jZbMTnTypcWUM46kzLTAcf"
    this.accessToken = "4CsWcVaxR1MdfR55e6vVjH0XRJNUkDsBHOc7HM073bhnnAbBr2f4-4QliYaYR4QabhRBhRiDfgYiLYYeN9m0scWLcvRAPZqfnC8c8RMe-qUGhmteiNkpx8anPFlDWXYx";

    this.search = Observable.create(observer => {
      this.searchObserver = observer;
    });

    this.currentLocation = Observable.create(observer => {
      this.currentLocationObserver = observer;
    })

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

    this.defaultSearchParams = {
          'term': "bubble tea",
          'latitude': 37.3090591,
          'longitude': -122.0554348,
          'radius': 5000,
          'limit': 10,
          'openNow': true,
          'sortBy': "best_match"
        };
  }

  currentLocationUpdate(): Observable<any> {
    return this.currentLocation;
  }

  searchUpdates(): Observable<any> {
    return this.search;
  }

  getOpenNow() {
    return this.openNow;
  }

  getRadius() {
    return this.radius;
  }

  getSortBy() {
    return this.sortBy;
  }

  // Get current location and center map to current position
  locateUser() {
    let getPosition = this.geolocation.getCurrentPosition();

    getPosition.then(
        (location) => {
          this.lat = location.coords.latitude;
          this.lng = location.coords.longitude;
          this.defaultSearchParams.latitude = location.coords.latitude;
          this.defaultSearchParams.longitude = location.coords.longitude;
          this.currentLocationObserver.next(location);
        }
      )
      .catch(
        (error) => console.log("An error occurred getting current location")
      );

    return getPosition;
  }

  getLat() {
    return this.lat;
  }
  getLng() {
    return this.lng;
  }

  // Returns current search locations
  getLocations() {
    return this.locations;
  }

  // Updates search params for Yelp get request
  updateSearchParams(newParams) {
    this.defaultSearchParams = Object.assign(this.defaultSearchParams, newParams);
    this.openNow = newParams.openNow;
    this.sortBy = newParams.sortBy;
    this.radius = newParams.radius;
  }

  // Use Yelp API to locate nearby locations
  findLocations() {
    let yelpParams = this.defaultSearchParams;
    // Generate get request URL
    let getRequestUrl = "https://api.yelp.com/v3/businesses/search?";
    let term = "term=" + yelpParams.term;
    let latitude = "latitude=" + yelpParams.latitude;
    let longitude = "longitude=" + yelpParams.longitude;
    let radius = "radius=" + Math.round(yelpParams.radius); // In meters
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
    this.getRequests++;
    console.log("Get requests: " + this.getRequests + " search");

    // Store results when response from get request received
    observableGetRequest.subscribe(
      data => {
        this.locations = data.businesses;
        this.remainingBusinessesToCheck = this.locations.length;
        for (let location of this.locations) {
          // Add some new properties to locations for easier access
          location.ratingImage = this.getRatingImage(location.rating);
          location.launchMapsUrl = this.getLaunchMapsUrl(location);

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
    this.getRequests++;
    console.log("Get requests: " + this.getRequests + " hours");

    observableGetRequest.subscribe(
        data => {
          // Add open and close times as date object to location
          location.hours = data.hours[0].open;
          let todayHours = location.hours[this.dayOfWeek];
          if (typeof todayHours != 'undefined') {
            let startTime = todayHours.start;
            let endTime = todayHours.end;
            location.openTime = new Date(0, 0, 0, Math.floor(startTime / 100), startTime % 100);
            location.closeTime = new Date(0, 0, 0, Math.floor(endTime / 100), endTime % 100);
            location.hasHours = true;
          }
          else {
            location.hasHours = false;
          }
          this.remainingBusinessesToCheck--;
          if (this.remainingBusinessesToCheck <= 0) {
            this.searchObserver.next(this.locations);
          }
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
