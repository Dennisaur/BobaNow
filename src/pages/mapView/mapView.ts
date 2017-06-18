import { Component } from '@angular/core';
import { NavController, Platform } from 'ionic-angular';
import { Http, Headers, RequestOptions } from '@angular/http';
import { Geolocation } from '@ionic-native/geolocation';
import {
  GoogleMaps,
  GoogleMap,
  GoogleMapsEvent,
  LatLng,
  CameraPosition,
  MarkerOptions,
  Marker
} from '@ionic-native/google-maps';
import { Observable } from 'rxjs/RX';
import 'rxjs/add/operator/map';

import { BobaService } from '../../services/boba.service';

@Component({
  selector: 'page-mapView',
  templateUrl: 'mapView.html'
})
export class MapViewPage {
  location: any;
  lat: number;
  lng: number;
  map: GoogleMap;

  clientId: string = "OXIJVK12GNTdHlmKJR7xbg";
  clientSecret: string = "Kui2Eqxk9OOl7pGXH2yOKLkY32oAWWZRSYENc8hFA9jZbMTnTypcWUM46kzLTAcf"
  accessToken: string = "4CsWcVaxR1MdfR55e6vVjH0XRJNUkDsBHOc7HM073bhnnAbBr2f4-4QliYaYR4QabhRBhRiDfgYiLYYeN9m0scWLcvRAPZqfnC8c8RMe-qUGhmteiNkpx8anPFlDWXYx";

  currentLocationMarker: Marker;
  bobaLocations: any;
  markers: any = [];
  openNow: boolean = true;

  constructor(public navCtrl: NavController,
              public http: Http,
              public platform: Platform,
              private geolocation: Geolocation,
              private googleMaps: GoogleMaps) {
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
          this.loadMap();
        }
      );
  }

  loadMap() {
    // create a new map by passing HTMLElement
    let element: HTMLElement = document.getElementById('map');
    this.map = this.googleMaps.create(element);

    // listen to MAP_READY event
    // You must wait for this event to fire before adding something to the map or modifying it in anyway
    this.map.one(GoogleMapsEvent.MAP_READY).then(
      () => {
        console.log('Map is ready!');

        // Now you can add elements to the map like the marker
        this.map.setMyLocationEnabled(true);  // This adds blue location accuracy circle
        this.locateUser(true);
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

          let currentPosition: LatLng = new LatLng(this.lat, this.lng);

          this.map.moveCamera({
            'target': currentPosition,
            'zoom': 17,
            });

          this.map.animateCamera({
            'target': currentPosition,
            'zoom': 12,
            'duration': 2000
            });

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
          this.addMarkersToMap(this.bobaLocations);
        }
      );
  }

  // Clear current markers and add new markers to map
  // using list of businesses returned from Yelp API
  addMarkersToMap(locations) {
    this.clearMarkers();

    let count = 1;
    for (let location of locations) {
      let position = new LatLng(location.coordinates.latitude, location.coordinates.longitude);
      let name = location.name;

      let icon = 'http://chart.apis.google.com/chart?chst=d_map_pin_letter&chld=' + count + '|FE6256|000000'
      let icon2 = 'https://raw.githubusercontent.com/Concept211/Google-Maps-Markers/master/images/marker_red' + count + '.png'
      let markerOptions: {} = {
        'position': position,
        'title': name,
        'icon': icon2
      };

      this.map.addMarker(markerOptions)
        .then((marker: Marker) => {
          this.markers.push(marker);
        });

      location.listIndex = count;
      count += 1;
    }
  }

  // Removes all current markers from the map
  clearMarkers() {
    for (let marker of this.markers) {
      marker.remove();
    }
  }
}
