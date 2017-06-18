import { Storage } from '@ionic/storage';
import { Injectable } from '@angular/core';
import { Http, Headers, RequestOptions } from '@angular/http';

@Injectable()
export class BobaService {
  private locations: any;
  private clientId: string;
  private clientSecret: string;
  private accessToken: string;

  constructor (public http: Http,
               private storage: Storage) {

    this.clientId = "OXIJVK12GNTdHlmKJR7xbg";
    this.clientSecret = "Kui2Eqxk9OOl7pGXH2yOKLkY32oAWWZRSYENc8hFA9jZbMTnTypcWUM46kzLTAcf"
    this.accessToken = "4CsWcVaxR1MdfR55e6vVjH0XRJNUkDsBHOc7HM073bhnnAbBr2f4-4QliYaYR4QabhRBhRiDfgYiLYYeN9m0scWLcvRAPZqfnC8c8RMe-qUGhmteiNkpx8anPFlDWXYx";
  }

  getLocations() {
    return this.locations;
  }

  // Use Yelp API to locate nearby locations
  findLocations(yelpParams: any) {
    let headers = new Headers();
    headers.append('Authorization', "Bearer " + this.accessToken);
    let options = new RequestOptions({headers: headers});

    // Generate get request URL
    let getRequestUrl = "https://api.yelp.com/v3/businesses/search?";
    let term = "term=" + yelpParams.term;
    let latitude = "latitude=" + yelpParams.latitude;
    let longitude = "longitude=" + yelpParams.longitude;
    let radius = "radius=" + yelpParams.radius; // Meters
    let limit = "limit=" + yelpParams.limit;
    let openNowString = "open_now=" + yelpParams.openNow;
    let sortBy = "sort_by=" + yelpParams.sortBy;

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
          this.locations = data.businesses;
        }
      );
  }

  getTestResults() {
    this.http.get('./testResults.json').map(res => res.json())
      .subscribe(
        data => {
          this.locations = data.businesses;
        }
      );
  }

}
