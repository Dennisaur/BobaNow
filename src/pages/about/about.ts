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

import { YelpService } from '../../services/yelp.service';

@Component({
  selector: 'page-about',
  templateUrl: 'about.html'
})
export class AboutPage {
  location: any;
  lat: number;
  lng: number;
  map: GoogleMap;

  clientId: string = "OXIJVK12GNTdHlmKJR7xbg";
  clientSecret: string = "Kui2Eqxk9OOl7pGXH2yOKLkY32oAWWZRSYENc8hFA9jZbMTnTypcWUM46kzLTAcf"
  accessToken: string = "4CsWcVaxR1MdfR55e6vVjH0XRJNUkDsBHOc7HM073bhnnAbBr2f4-4QliYaYR4QabhRBhRiDfgYiLYYeN9m0scWLcvRAPZqfnC8c8RMe-qUGhmteiNkpx8anPFlDWXYx";

  mapReady: boolean;
  atCurrentLocation: boolean;
  markersAdded: boolean;

  currentLocationMarker: Marker;
  bobaLocations: any = [];
  markers: any = [];
  openNow: boolean = true;

  constructor(public navCtrl: NavController,
              public http: Http,
              public platform: Platform,
              private geolocation: Geolocation,
              private googleMaps: GoogleMaps,
              private yelpService: YelpService) {

  }

  // Load map only after view is initialized
  ngAfterViewInit() {
    this.platform.ready()
      .then(
        () => {
          this.locateUser(true);
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
        this.mapReady = true;

        // Now you can add elements to the map like the marker
        this.map.setMyLocationEnabled(true);  // This adds blue location accuracy circle
        this.map.setPadding(30);

        // Add markers to map if they haven't been added already
        if (!this.markersAdded) {
          this.addMarkersToMap();
        }
      }
    );
  }


  // Moves camera to fit current positions and search locations
  updateCamera() {
    console.log("Moving camera");

    let bounds = [];
    bounds.push({"lat": this.lat, "lng": this.lng});

    for (let location of this.bobaLocations) {
      let bound = {"lat": location.coordinates.latitude, "lng": location.coordinates.longitude};
      bounds.push(bound);
    }

    this.map.animateCamera({
      'target': bounds,
      'duration': 2000
      });

    this.atCurrentLocation = true;
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
            this.findLocations(this.lat, this.lng);
          }

          // Move camera to current location if map is ready
          let currentPosition = new LatLng(this.lat, this.lng);
          if (this.mapReady) {
            this.map.moveCamera({
              'target': currentPosition,
              'zoom': 17
            });
          }

        }
      )
      .catch(
        (error) => console.log("An error occurred getting current location")
      );
  }

  // Clear current markers and add new markers to map
  // using list of businesses returned from Yelp API
  addMarkersToMap() {
    if (!this.mapReady) {
      return;
    }

    console.log("Adding markers to map");

    this.clearMarkers();

    let count = 1;
    for (let location of this.bobaLocations) {
      let position = new LatLng(location.coordinates.latitude, location.coordinates.longitude);
      let name = location.name;

      let icon = 'http://chart.apis.google.com/chart?chst=d_map_pin_letter&chld=' + count + '|FE6256|000000'
      let icon2 = 'https://raw.githubusercontent.com/Concept211/Google-Maps-Markers/master/images/marker_red' + count + '.png'
      let markerOptions: {} = {
        'position': position,
        'title': name,
        'icon': icon2,
      };

      this.map.addMarker(markerOptions)
        .then((marker: Marker) => {
          this.markers.push(marker);
        });

      location.listIndex = count;
      count += 1;
    }

    this.markersAdded = true;
  }

  // Removes all current markers from the map
  clearMarkers() {
    for (let marker of this.markers) {
      marker.remove();
    }
  }

  findLocations(lat: number, lng: number) {
    console.log("Finding locations near (" + lat + ", " + lng + ")");

    let bobaParams = {
      'term': "boba",
      'latitude': lat,
      'longitude': lng,
      'radius': 5000,
      'limit': 10,
      'openNow': this.openNow,
      'sortBy': "distance"
    };

    // Call service to find locations
    this.yelpService.findLocations(bobaParams)
      .subscribe(
        data => {
          console.log("Found locations in map view page");

          this.bobaLocations = data.businesses;

          // Add markers to map if map is loaded
          if (this.mapReady) {
            this.addMarkersToMap();
            this.updateCamera();
          }
        }
      );
  }
}
