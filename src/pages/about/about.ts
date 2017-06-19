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

declare var google;

@Component({
  selector: 'page-about',
  templateUrl: 'about.html'
})
export class AboutPage {

  location: any;
  lat: number;
  lng: number;
  map: any;
  infoWindow: any;

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
              private bobaService: BobaService) {

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
    this.map = new google.maps.Map(element, {'disableDefaultUI': true});
    this.infoWindow = new google.maps.InfoWindow();

    console.log('Map is ready!');
    this.addMarkersToMap();
    this.mapReady = true;
    google.maps.event.addListener(this.map, 'click', function(infoWindow) {
      return function() {
        infoWindow.close();
      };
    }(this.infoWindow));
  }


  // Moves camera to fit current positions and search locations
  updateCamera() {
    console.log("Moving camera");

    let bounds = new google.maps.LatLngBounds();
    bounds.extend(new google.maps.LatLng(this.lat, this.lng));

    for (let location of this.bobaLocations) {
      let bound = new google.maps.LatLng(location.coordinates.latitude,location.coordinates.longitude);
      bounds.extend(bound);
    }

    this.map.fitBounds(bounds, 30);
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
            this.findLocations();
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
      let position = new google.maps.LatLng(location.coordinates.latitude, location.coordinates.longitude);

      let marker = new google.maps.Marker({
        'position': position,
        'label': String(count),
        'map': this.map
      });

      let content = this.createInfoWindowContent(location);

      google.maps.event.addListener(marker, 'click', function(map, marker, infoWindow, content) {
        return function() {
          infoWindow.setContent(content);
          infoWindow.open(map, marker);
        }
      }(this.map, marker, this.infoWindow, content));

      location.listIndex = count;
      count += 1;
    }

    this.markersAdded = true;
  }

  // Removes all current markers from the map
  clearMarkers() {
    for (let marker of this.markers) {
      marker.setMap(null);
    }
    this.markers = [];
  }

  findLocations() {
    console.log("Finding locations near (" + this.lat + ", " + this.lng + ")");

    let bobaParams = {
      'term': "boba",
      'latitude': this.lat,
      'longitude': this.lng,
      'radius': 5000,
      'limit': 10,
      'openNow': this.openNow,
      'sortBy': "distance"
    };

    // Call service to find locations
    this.bobaService.findLocations(bobaParams)
      .subscribe(
        data => {
          console.log("Found locations in map2 view page");

          this.bobaLocations = data.businesses;

          // Add markers to map if map is loaded
          this.addMarkersToMap();
          if (this.mapReady) {
            this.updateCamera();
          }
        }
      );
  }

  createInfoWindowContent(location) {
    let ratingImage = this.getRatingImage(location.rating);
    let htmlContent = "";

    htmlContent += "<div><b>" + location.name + "</b> (" + Math.round(location.distance / 1609.3445).toFixed(2) + " mi)</div>";
    htmlContent += "<div><img src=\"" + ratingImage + "\" />&nbsp;" + location.review_count + " reviews</div>";

    return htmlContent;
  }

  getRatingImage(rating) {
    let ratingString = rating;
    if (rating % 1 != 0) {
      ratingString = Math.floor(rating) + "_half";
    }
    return "img/yelp_stars/android/drawable-mdpi/small/stars_small_" + ratingString + ".png";
  }
}
