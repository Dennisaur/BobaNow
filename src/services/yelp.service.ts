import { Storage } from '@ionic/storage';
import { Injectable } from '@angular/core';
import { Geolocation } from '@ionic-native/geolocation';
import { Http, Headers, RequestOptions } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import { AppState } from '../app/app.global';

import { SettingsService } from './settings.service';

@Injectable()
export class YelpService {
  private clientId: string = "OXIJVK12GNTdHlmKJR7xbg";
  private clientSecret: string = "Kui2Eqxk9OOl7pGXH2yOKLkY32oAWWZRSYENc8hFA9jZbMTnTypcWUM46kzLTAcf";
  private accessToken: string = "4CsWcVaxR1MdfR55e6vVjH0XRJNUkDsBHOc7HM073bhnnAbBr2f4-4QliYaYR4QabhRBhRiDfgYiLYYeN9m0scWLcvRAPZqfnC8c8RMe-qUGhmteiNkpx8anPFlDWXYx";
  private requestOptions: RequestOptions;
  private tokenReady: boolean = false;
  private googleMapsAPIKey: string = "AIzaSyArdyECCHkDoR-Ozr48gjwdewXzkKPd8YY";

  // Observables to listen to
  private currentLocation: any;
  private curLocObserver: any;
  private curLocObserverReady: boolean = false;
  private userLocated: boolean = false;
  // private currentLocation: any;
  private searchObservable: any;
  private searchObserver: any;
  private searchObserverReady: boolean = false;
  private locationsFound: boolean = false;

  // Search variables
  private searchReady: boolean = false;
  private searchParams: any;
  private defaultSearchParams: any = {
        'term': "boba bubble tea",
        'latitude': 0,
        'longitude': 0,
        'radius': 5,
        'limit': 10,
        'openNow': true,
        'sortBy': "best_match"
      };
  private locations: any = [];
  private remainingBusinessesToCheck: number;
  private dayOfWeek: number;

  constructor (public http: Http,
               public global: AppState,
               private geolocation: Geolocation,
               private settingsService: SettingsService) {

    // Create observables for views to listen to update markers
    this.currentLocation = Observable.create(observer => {
      this.curLocObserver = observer;
      this.curLocObserverReady = true;
      if (this.userLocated) {
        this.curLocObserver.next(this.currentLocation);
      }
    });
    this.searchObservable = Observable.create(observer => {
      this.searchObserver = observer;
      this.searchObserverReady = true;
      if (this.locationsFound) {
        this.curLocObserver.next(this.locations);
      }
    });

    if (!global.get('testLocations')) {
      // Get access token and store it in requestOptions
      let body = new FormData();
      body.append('grant_type', 'client_credentials');
      body.append('client_id', this.clientId);
      body.append('client_secret', this.clientSecret);
      // Remove this?
      let headers = new Headers();
      headers.append('Authorization', "Bearer " + this.accessToken);
      this.requestOptions = new RequestOptions({headers: headers});

      http.post("https://api.yelp.com/oauth2/token", body)
        .subscribe((data) => {
          let headers = new Headers();
          this.accessToken = data.json().access_token;
          headers.append('Authorization', "Bearer " + this.accessToken);
          this.requestOptions = new RequestOptions({headers: headers});
          this.tokenReady = true;
        });
    }
    else {
      this.userLocated = true;
    }

    // Get values from storage
    this.searchParams = this.defaultSearchParams;
    this.getParamsFromStorage();

    // Get current day
    let date = new Date();
    this.dayOfWeek = (date.getDay() + 6) % 7; // Convert to 0 indexed at Monday
  }

  // Get search parameters from storage
  getParamsFromStorage() {
    this.settingsService.getSearchParams()
      .then((newParams) => {
        this.searchParams = Object.assign(this.searchParams, newParams);
        this.searchReady = true;
      });
  }

  getSearchReady() {
    return this.searchReady;
  }

  // Returns observables for views to listen to update markers
  getCurLocObservable(): Observable<any> {
    return this.currentLocation;
  }
  getSearchObservable(): Observable<any> {
    return this.searchObservable;
  }

  // Getter functions
  getUserLocated() {
    return this.userLocated;
  }
  getRadius() {
    return this.searchParams.radius;
  }
  getLimit() {
    return this.searchParams.limit;
  }
  getOpenNow() {
    return this.searchParams.openNow;
  }
  getSortBy() {
    return this.searchParams.sortBy;
  }
  // Gets latitude of current position
  getLat() {
    return this.searchParams.latitude;
  }
  // Gets longitude of current position
  getLng() {
    return this.searchParams.longitude;
  }
  // Returns resulting search locations
  getLocations() {
    return this.locations;
  }

  // Get current location and center map to current position
  locateUser() {
    let getPositionPromise = this.geolocation.getCurrentPosition();
    getPositionPromise.then((location) => {
      this.searchParams.latitude = location.coords.latitude; //43.012796; //
      this.searchParams.longitude = location.coords.longitude; //-89.5041027; //
      this.userLocated = true;
      this.currentLocation = location;
      if (this.curLocObserverReady) {
        this.curLocObserver.next(location);
      }
    })
    .catch((error) => {
      console.log("An error occurred getting current location");
    });

    return getPositionPromise;
  }

  // Updates search params for Yelp get request
  updateSearchParams(newParams) {
    this.searchParams = Object.assign(this.searchParams, newParams);

    // Save values in storage
    this.settingsService.setSearchParams(newParams);
  }

  // Use Yelp API to locate nearby locations
  findLocations() {
    if (this.global.get('testLocations')) {
      return this.getTestResults();
    }

    // Generate get request URL
    let term = "term=" + encodeURIComponent(this.searchParams.term);
    let latitude = "latitude=" + this.searchParams.latitude;
    let longitude = "longitude=" + this.searchParams.longitude;
    let radius = "radius=" + Math.round(this.searchParams.radius * 1609.34); // Convert miles to meters
    let limit = "limit=" + this.searchParams.limit;
    let openNow = "open_now=" + this.searchParams.openNow;
    let sortBy = "sort_by=" + this.searchParams.sortBy;
    let getRequestUrl = "https://api.yelp.com/v3/businesses/search?"
      + term + "&"
      + latitude + "&"
      + longitude + "&"
      + radius + "&"
      + limit + "&"
      + openNow + "&"
      + sortBy;
    let observableGetRequest = this.http.get(getRequestUrl, this.requestOptions).map(res => res.json());
    observableGetRequest.subscribe((data) => {
      this.locations = data.businesses;
      // No results found
      if (this.locations.length == 0) {
        this.locationsFound = true;
        if (this.searchObserverReady) {
          this.searchObserver.next(this.locations);
        }
      }
      else {
        this.remainingBusinessesToCheck = this.locations.length;
        for (let location of this.locations) {
          // Add some new properties to locations for easier access
          location.ratingImage = this.getRatingImage(location.rating);
          this.verifyLocationCoords(location);

          // Get hours for each location (not provided from business search API)
          this.getMoreInfo(location);
        }
      }
    });

    return observableGetRequest;
  }

  // Safety net to convert address to coordinates using google API in case results
  // from Yelp API return null coordinates
  verifyLocationCoords(location: any) {
    if (location.coordinates.latitude == null || location.coordinates.longitude == null) {
      let destination: string = location.location.address1 + '+' + location.location.city + '+' + location.location.country;
      destination = destination.replace(/ /g, "+");
      let getRequestUrl = "https://maps.googleapis.com/maps/api/geocode/json?address=" + destination + "&key=" + this.googleMapsAPIKey;

      // This business needs to get checked again for new coords
      this.remainingBusinessesToCheck++;
      this.http.get(getRequestUrl).map(res => res.json())
        .subscribe((data) => {
          let newCoords = {
            latitude: data.results[0].geometry.location.lat,
            longitude: data.results[0].geometry.location.lng
          };
          location.coordinates = newCoords;
          location.launchMapsUrl = this.getLaunchMapsUrl(location);

          this.decrementBusinessesToCheck();
        });
    }
    else {
      location.launchMapsUrl = this.getLaunchMapsUrl(location);
    }
  }

  // Separate get request to received specific hours for a given business location
  getMoreInfo(location: any) {
    let getRequestUrl = "https://api.yelp.com/v3/businesses/" + location.id;
    this.http.get(getRequestUrl, this.requestOptions).map(res => res.json())
      .subscribe((data) => {
        // Add open and close times as date object to location
        if (typeof data.hours != 'undefined') {
          location.hours = data.hours[0].open;
          let todayHours = location.hours[this.dayOfWeek];
          if (typeof todayHours != 'undefined') {
            let startTime = todayHours.start;
            let endTime = todayHours.end;
            location.openTime = new Date(0, 0, 0, Math.floor(startTime / 100), startTime % 100); // We only care about the hours
            location.closeTime = new Date(0, 0, 0, Math.floor(endTime / 100), endTime % 100); // We only care about the hours
            location.hasHours = true;
          }
        }
        else {
          location.hasHours = false;
        }

        // When all businesses have additional info stored, send updated location info to subscribers
        this.decrementBusinessesToCheck();
      },
      (err) => {
        console.log("Error getting hours from " + location.id + ": " + err);
        // Error occurred, mark this location as not having hours and decrement counter
        location.hasHours = false;
        this.decrementBusinessesToCheck();
      });
  }

  decrementBusinessesToCheck() {
    this.remainingBusinessesToCheck--;
    if (this.remainingBusinessesToCheck <= 0) {
      this.locationsFound = true;
      if (this.searchObserverReady) {
        this.searchObserver.next(this.locations);
      }
    }
  }

  // Returns ratings image URL
  getRatingImage(rating) {
    let ratingString = rating;
    if (rating % 1 != 0) {
      ratingString = Math.floor(rating) + "_half";
    }
    let imgUrl: string;
    if (this.global.get('ios')) {
      imgUrl = "img/yelp_stars/web_and_ios/small/small_" + ratingString + ".png";
    }
    else {
      imgUrl = "img/yelp_stars/android/drawable-mdpi/small/stars_small_" + ratingString + ".png";
    }
    return imgUrl;
  }

  // Returns google maps link to navigate to location from current position
  getLaunchMapsUrl(location) {
    let destination: string = location.coordinates.latitude + "," + location.coordinates.longitude;
    return "https://www.google.com/maps/dir/?api=1&destination=" + destination;
  }

  // For testing without using calling Yelp API
  getTestResults() {
    let observableGetRequest = this.http.get("./testResults2.json").map(res => res.json());
    observableGetRequest.subscribe((data) => {
      this.locations = data.businesses;
      for (let location of this.locations) {
        // Add some new properties to locations for easier access
        location.ratingImage = this.getRatingImage(location.rating);
        location.launchMapsUrl = this.getLaunchMapsUrl(location);

        location.hasHours = false;
      }
      if (typeof this.searchObserver != "undefined") {
        this.searchObserver.next(this.locations);
      }
    });
    return observableGetRequest;
  }

}
