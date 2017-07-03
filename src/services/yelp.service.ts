import { Storage } from '@ionic/storage';
import { Injectable } from '@angular/core';
import { Geolocation } from '@ionic-native/geolocation';
import { Http, Headers, RequestOptions } from '@angular/http';
import { Observable } from 'rxjs/Observable';

var useTestLocations = true;

@Injectable()
export class YelpService {
  private locations: any;

  private clientId: string = "OXIJVK12GNTdHlmKJR7xbg";
  private clientSecret: string = "Kui2Eqxk9OOl7pGXH2yOKLkY32oAWWZRSYENc8hFA9jZbMTnTypcWUM46kzLTAcf";
  private accessToken: string = "4CsWcVaxR1MdfR55e6vVjH0XRJNUkDsBHOc7HM073bhnnAbBr2f4-4QliYaYR4QabhRBhRiDfgYiLYYeN9m0scWLcvRAPZqfnC8c8RMe-qUGhmteiNkpx8anPFlDWXYx";
  private requestOptions: RequestOptions;

  private dayOfWeek: number;

  private readyToSearch: boolean;
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

  private remainingBusinessesToCheck: number;

  private currentLocation: any;
  private currentLocationObserver: any;
  private search: any;
  private searchObserver: any;


  constructor (public http: Http,
               private geolocation: Geolocation,
               private storage: Storage) {

    // Create observables for views to listen to update markers
    this.search = Observable.create(observer => {
      this.searchObserver = observer;
      this.searchObserver.next(this.locations);
    });
    this.currentLocation = Observable.create(observer => {
      this.currentLocationObserver = observer;
    })

    let body = new FormData();
    body.append('grant_type', 'client_credentials');
    body.append('client_id', this.clientId);
    body.append('client_secret', this.clientSecret);

    if (!useTestLocations) {
      http.post("https://api.yelp.com/oauth2/token", body)
        .subscribe(
          data => {
            let headers = new Headers();
            this.accessToken = data.json().access_token;
            headers.append('Authorization', "Bearer " + this.accessToken);
            this.requestOptions = new RequestOptions({headers: headers});
          }
      );
    }
    else {
      this.readyToSearch = true;
    }

    let date = new Date();
    this.dayOfWeek = date.getDay();

    // Get values from storage
    this.searchParams = this.defaultSearchParams;
    this.storage.get('radius')
      .then((radius) => {
        if (radius != null) {
          this.searchParams.radius = radius;
        }
      });
    this.storage.get('limit')
      .then((limit) => {
        if (limit != null) {
          this.searchParams.limit = limit;
        }
      });
    this.storage.get('openNow')
      .then((openNow) => {
        if (openNow != null) {
          this.searchParams.openNow = openNow;
        }
      });
    this.storage.get('sortBy')
      .then((sortBy) => {
        if (sortBy != null) {
          this.searchParams.sortBy = sortBy;
        }
      });

  }

  isTesting() {
    return useTestLocations;
  }

  // Returns observables for views to listen to update markers
  currentLocationUpdate(): Observable<any> {
    return this.currentLocation;
  }
  searchUpdates(): Observable<any> {
    return this.search;
  }

  // Getter functions
  getReadyToSearch() {
    return this.readyToSearch;
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
    let getPosition = this.geolocation.getCurrentPosition();
    getPosition.then(
        (location) => {
          this.searchParams.latitude = location.coords.latitude;
          this.searchParams.longitude = location.coords.longitude;
          this.readyToSearch = true;
          this.currentLocationObserver.next(location);
        }
      )
      .catch(
        (error) => console.log("An error occurred getting current location")
      );

    return getPosition;
  }

  // Updates search params for Yelp get request
  updateSearchParams(newParams) {
    this.searchParams = Object.assign(this.searchParams, newParams);

    // Set values in storage
    this.storage.set('radius', newParams.radius);
    this.storage.set('limit', newParams.limit);
    this.storage.set('openNow', newParams.openNow);
    this.storage.set('sortBy', newParams.sortBy);
  }

  // Use Yelp API to locate nearby locations
  findLocations() {
    if (useTestLocations) {
      return this.getTestResults();
    }

    // Generate get request URL
    let getRequestUrl = "https://api.yelp.com/v3/businesses/search?";
    let term = "term=" + this.searchParams.term;
    let latitude = "latitude=" + this.searchParams.latitude;
    let longitude = "longitude=" + this.searchParams.longitude;
    let radius = "radius=" + Math.round(this.searchParams.radius * 1609.34); // In meters
    let limit = "limit=" + this.searchParams.limit;
    let openNow = "open_now=" + this.searchParams.openNow;
    let sortBy = "sort_by=" + this.searchParams.sortBy;

    getRequestUrl = getRequestUrl + term + "&"
      + latitude + "&"
      + longitude + "&"
      + radius + "&"
      + limit + "&"
      + openNow + "&"
      + sortBy;

    let observableGetRequest = this.http.get(getRequestUrl, this.requestOptions).map(res => res.json());

    observableGetRequest.subscribe(
        data => {
          this.locations = data.businesses;
          this.remainingBusinessesToCheck = this.locations.length;
          for (let location of this.locations) {
            // Add some new properties to locations for easier access
            location.ratingImage = this.getRatingImage(location.rating);
            location.launchMapsUrl = this.getLaunchMapsUrl(location);

            // Get hours for each location (not provided from business search API)
            this.getMoreInfo(location);
          }
        }
      );

    return observableGetRequest;
  }

  // Separate get request to received specific hours for a given business location
  getMoreInfo(location: any) {

    let getRequestUrl = "https://api.yelp.com/v3/businesses/" + location.id;
    this.http.get(getRequestUrl, this.requestOptions).map(res => res.json())
      .subscribe(
          (data) => {
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
            // When all businesses have additional info stored, send updated location info to subscribers
            this.remainingBusinessesToCheck--;
            if (this.remainingBusinessesToCheck <= 0) {
              this.searchObserver.next(this.locations);
            }
          },
          (err) => {
            console.log("Error getting hours from " + location.id);
            location.hasHours = false;
            this.remainingBusinessesToCheck--;
            if (this.remainingBusinessesToCheck <= 0) {
              this.searchObserver.next(this.locations);
            }
          }
        );
  }

  // Returns ratings image URL
  getRatingImage(rating) {
    let ratingString = rating;
    if (rating % 1 != 0) {
      ratingString = Math.floor(rating) + "_half";
    }
    return "img/yelp_stars/android/drawable-mdpi/small/stars_small_" + ratingString + ".png";
  }

  // Returns google maps link to navigate to location from current position
  getLaunchMapsUrl(location) {
    return "https://www.google.com/maps/dir/?api=1&destination=" + location.coordinates.latitude + "," + location.coordinates.longitude;
  }


  // For testing without using calling Yelp API
  getTestResults() {
    let observableGetRequest = this.http.get("./testResults.json").map(res => res.json());

    observableGetRequest.subscribe(
      (data) => {
        this.locations = data.businesses;
        for (let location of this.locations) {
          console.log(location.id);
          // Add some new properties to locations for easier access
          location.ratingImage = this.getRatingImage(location.rating);
          location.launchMapsUrl = this.getLaunchMapsUrl(location);

          location.hasHours = false;
        }
        if (typeof this.searchObserver != "undefined")
          this.searchObserver.next(this.locations);
      }
    );

    return observableGetRequest;
  }

}
