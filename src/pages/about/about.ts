import { Component } from '@angular/core';
import { NavController, Platform } from 'ionic-angular';
import { Http, Headers, RequestOptions } from '@angular/http';
import { Geolocation } from '@ionic-native/geolocation';
import { Observable } from 'rxjs/RX';
import 'rxjs/add/operator/map';

import { BobaService } from '../../services/boba.service';

declare var google;

@Component({
  selector: 'page-about',
  templateUrl: 'about.html'
})
export class AboutPage {
  lat: number;
  lng: number;
  map: any;
  infoWindow: any;

  clientId: string = "OXIJVK12GNTdHlmKJR7xbg";
  clientSecret: string = "Kui2Eqxk9OOl7pGXH2yOKLkY32oAWWZRSYENc8hFA9jZbMTnTypcWUM46kzLTAcf"
  accessToken: string = "4CsWcVaxR1MdfR55e6vVjH0XRJNUkDsBHOc7HM073bhnnAbBr2f4-4QliYaYR4QabhRBhRiDfgYiLYYeN9m0scWLcvRAPZqfnC8c8RMe-qUGhmteiNkpx8anPFlDWXYx";

  mapReady: boolean;
  markersAdded: boolean;

  bobaLocations: any = [];
  markers: any = [];
  openNow: boolean = true;

  constructor(public navCtrl: NavController,
              public http: Http,
              public platform: Platform,
              private geolocation: Geolocation,
              private bobaService: BobaService) {

    this.locateUser(true);
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

  // Get current location and center map to current position
  locateUser(redoSearch: boolean = false) {
    this.geolocation.getCurrentPosition()
      .then(
        (location) => {
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

  // Uses current latitude and longitude to find nearby locations using service
  findLocations() {
    console.log("Finding locations near (" + this.lat + ", " + this.lng + ")");

    // Yelp search params
    let bobaParams = {
      'term': "boba",
      'latitude': this.lat,
      'longitude': this.lng,
      'radius': 5000,
      'limit': 10,
      'openNow': this.openNow,
      'sortBy': "best_match"
    };

    // Call service to find locations
    this.bobaService.findLocations(bobaParams)
      .subscribe(
        data => {
          console.log("Found locations in map2 view page");

          this.bobaLocations = data.businesses;

          // Add markers to map if map is loaded
          if (this.mapReady) {
            this.addMarkersToMap();
            this.updateCamera();
          }
        }
      );
  }

  // Creates map using google maps API
  loadMap() {
    // Create a new map by passing HTMLElement
    let element: HTMLElement = document.getElementById('map');
    this.map = new google.maps.Map(element, {'disableDefaultUI': true});

    // Create info window for marker information
    this.infoWindow = new google.maps.InfoWindow();

    this.mapReady = true;
    console.log('Map is ready!');

    this.addMarkersToMap();

    // Add event listener to close infoWindow when map is clicked
    google.maps.event.addListener(this.map, 'click', function(infoWindow) {
      return function() {
        infoWindow.close();
      };
    }(this.infoWindow));
  }

  // Moves camera to fit current position and search locations
  updateCamera() {
    console.log("Moving camera");
    let bounds = new google.maps.LatLngBounds();

    // Add current location to bounds
    bounds.extend(new google.maps.LatLng(this.lat, this.lng));

    // Add search locations to bounds
    for (let location of this.bobaLocations) {
      let bound = new google.maps.LatLng(location.coordinates.latitude,location.coordinates.longitude);
      bounds.extend(bound);
    }

    // Move camera to fit bounds
    this.map.fitBounds(bounds, 50);
  }

  // Clear current markers and add new markers to map using list of businesses returned from search
  addMarkersToMap() {
    // Return if map isn't ready
    if (!this.mapReady) {
      return;
    }

    console.log("Adding markers to map");
    this.clearMarkers();

    // Iterate through and create a marker for each location
    let count = 1;
    for (let location of this.bobaLocations) {
      let position = new google.maps.LatLng(location.coordinates.latitude, location.coordinates.longitude);

      // Create marker and add to map
      let marker = new google.maps.Marker({
        'position': position,
        'label': String(count),
        'map': this.map
      });

      // Call service to get todays hours for this location
      this.bobaService.getHours(location)
        .subscribe(
          data => {
            // Update info window content for this location when this marker is selected
            let content = this.createInfoWindowContent(location);
            google.maps.event.addListener(marker, 'click', function(map, marker, infoWindow, content) {
              return function() {
                infoWindow.setContent(content);
                infoWindow.open(map, marker);
              }
            }(this.map, marker, this.infoWindow, content));
          }
        );

      location.listIndex = count;
      count += 1;
    }

    this.markersAdded = true;
  }

  // Removes all location markers from the map
  clearMarkers() {
    for (let marker of this.markers) {
      marker.setMap(null);
    }
    this.markers = [];
  }

  // Returns HTML content string for info window using a given location
  createInfoWindowContent(location) {
    let ratingImage = this.getRatingImage(location.rating);
    let htmlContent = "";

    let openTimeString = location.openTime.toLocaleTimeString('en-US');
    let closeTimeString = location.closeTime.toLocaleTimeString('en-US');

    // Convert distance from meters to miles
    htmlContent += "<div><b>" + location.name + "</b> (" + (location.distance / 1609.3445).toFixed(2) + " mi)</div>";
    // Don't display this div if invalid open/close time
    if (openTimeString != "" && closeTimeString != "") {
      htmlContent += "<div>" + openTimeString + " - " + closeTimeString + "</div>";
    }
    htmlContent += "<div><img src=\"" + ratingImage + "\" />&nbsp;" + location.review_count + " reviews</div>";

    return htmlContent;
  }

  // Returns ratings image URL
  getRatingImage(rating) {
    let ratingString = rating;
    if (rating % 1 != 0) {
      ratingString = Math.floor(rating) + "_half";
    }
    return "img/yelp_stars/android/drawable-mdpi/small/stars_small_" + ratingString + ".png";
  }
}
