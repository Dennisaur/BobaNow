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

@Component({
  selector: 'page-contact',
  templateUrl: 'contact.html'
})
export class ContactPage {
  location: any;
  lat: number;
  lng: number;
  map: GoogleMap;

  clientId: string = "OXIJVK12GNTdHlmKJR7xbg";
  clientSecret: string = "Kui2Eqxk9OOl7pGXH2yOKLkY32oAWWZRSYENc8hFA9jZbMTnTypcWUM46kzLTAcf"
  accessToken: string = "4CsWcVaxR1MdfR55e6vVjH0XRJNUkDsBHOc7HM073bhnnAbBr2f4-4QliYaYR4QabhRBhRiDfgYiLYYeN9m0scWLcvRAPZqfnC8c8RMe-qUGhmteiNkpx8anPFlDWXYx";

  bobaLocations: any;

  constructor(public navCtrl: NavController,
              public http: Http,
              private geolocation: Geolocation,
              private googleMaps: GoogleMaps) {
/*
    http.post("https://api.yelp.com/oauth2/token", {
      "grant_type": "client_credentials",
      "client_id": this.clientId,
      "client_secret": this.clientSecret})
      .subscribe(
        data => {
          console.log(data.json());
        }
      );
      */
  }

  // Load map only after view is initialized
  ngAfterViewInit() {
    this.loadMap();
  }

  // Get current location and center map to current position
  locateUser() {
    this.geolocation.getCurrentPosition()
      .then(
        (location) => {
          this.location = location;
          this.lat = location.coords.latitude;
          this.lng = location.coords.longitude;

          let currentPosition: LatLng = new LatLng(this.lat, this.lng);
          this.map.animateCamera({
            'target': currentPosition,
            'zoom': 16,
            'duration': 2500
            });

          this.findBoba();
        }
      )
      .catch(
        (error) => console.log("An error occurred getting current location")
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
        this.locateUser();
      }
    );
  }

  // Use Yelp API to locate nearby locations
  findBoba() {
    var headers = new Headers();
    var tok = "Bearer " + this.accessToken;
    headers.append('Authorization', "Bearer " + this.accessToken);
    var options = new RequestOptions({headers: headers});

    var locations = [];

    this.http.get("https://api.yelp.com/v3/businesses/search?term=boba&location=95014", options).map(res => res.json())
      .subscribe(
        data => {
          this.bobaLocations = data.businesses;
          this.addMarkersToMap(this.bobaLocations);
        }
      );
  }

  // Add markers to map using list of businesses returned from Yelp API
  addMarkersToMap(locations) {
    for (let location of locations) {
      var position = new LatLng(location.coordinates.latitude, location.coordinates.longitude);
      var name = location.name;
      let markerOptions: {} = {
        'position': position,
        'title': name
      };

      this.map.addMarker(markerOptions)
        .then((marker: Marker) => {
          marker.showInfoWindow();
        });
    }
  }
}
