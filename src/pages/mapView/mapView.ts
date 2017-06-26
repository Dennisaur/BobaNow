import { Component } from '@angular/core';
import { NavController, Platform, LoadingController } from 'ionic-angular';
import { Http, Headers, RequestOptions } from '@angular/http';
import { Geolocation } from '@ionic-native/geolocation';
import { Observable } from 'rxjs/RX';
import 'rxjs/add/operator/map';

import { YelpService } from '../../services/yelp.service';

declare var google;
declare var cordova;
var consoleLogger = true;

@Component({
  selector: 'page-mapView',
  templateUrl: 'mapView.html'
})
export class MapViewPage {
  lat: number;
  lng: number;
  currentLocation: any;
  map: any;
  infoWindow: any;
  infoWindowClickListener: any;

  clientId: string = "OXIJVK12GNTdHlmKJR7xbg";
  clientSecret: string = "Kui2Eqxk9OOl7pGXH2yOKLkY32oAWWZRSYENc8hFA9jZbMTnTypcWUM46kzLTAcf"
  accessToken: string = "4CsWcVaxR1MdfR55e6vVjH0XRJNUkDsBHOc7HM073bhnnAbBr2f4-4QliYaYR4QabhRBhRiDfgYiLYYeN9m0scWLcvRAPZqfnC8c8RMe-qUGhmteiNkpx8anPFlDWXYx";

  mapReady: boolean;
  markersAdded: boolean;

  bobaLocations: any = [];
  markers: any = [];
  openNow: boolean = true;
  distance: number = 5;
  sortBy: string = "best_match";

  constructor(public navCtrl: NavController,
              public http: Http,
              public platform: Platform,
              public loadingController: LoadingController,
              private geolocation: Geolocation,
              private yelpService: YelpService) {

  }

  // Load map only after view is initialized
  ngAfterViewInit() {
    this.getLocations();
    this.platform.ready()
      .then(
        () => {
          this.loadMap();
        }
      );
  }

  ionViewWillEnter() {
    this.openNow = this.yelpService.getOpenNow();
    this.distance = this.yelpService.getDistance();
    this.sortBy = this.yelpService.getSortBy();
    this.getLocations();
  }

  // Updates search params in service and updates new locations
  refreshLocations() {
    this.yelpService.updateSearchParams({
      openNow: this.openNow,
      distance: this.distance * 1609.34,
      sortBy: this.sortBy
    });

    this.getLocations();
  }

  // Loads locations from service to local locations
  getLocations() {
    if (this.yelpService.getIsDirty()) {
      let loadingControl = this.loadingController.create({content: "Loading..."});
      loadingControl.present();
      this.yelpService.findLocations()
        .subscribe(
          data => {
            this.bobaLocations = this.yelpService.getLocations();
            this.addMarkersToMap();
            loadingControl.dismissAll();
          }
        )
    }
    else {
      this.bobaLocations = this.yelpService.getLocations();
      this.addMarkersToMap();
    }
  }

  // Toggles open now "button"
  toggleOpenNow() {
    this.openNow = !this.openNow;
  }

  // Creates map using google maps API
  loadMap() {
    // Create a new map by passing HTMLElement
    let element: HTMLElement = document.getElementById('map');
    this.map = new google.maps.Map(element,{
      zoomControl: true,
      mapTypeControl: false,
      scaleControl: false,
      streetViewControl: false,
      rotateControl: false,
      fullscreenControl: false
    });

    // Create info window for marker information
    this.infoWindow = new google.maps.InfoWindow({maxWidth: 230});
    google.maps.event.addListener(this.infoWindow, 'domready', function() {
      let element = document.getElementsByClassName('gm-style-iw')[0];
      element.parentElement.className += ' custom-iw';
    });

    this.mapReady = true;

    // Add markers to map
    this.addCurrentLocationMarker();
    this.addMarkersToMap();
    this.updateCamera();

    // Add event listener to close infoWindow when map is clicked
    google.maps.event.addListener(this.map, 'click', function(infoWindow) {
      return function() {
        infoWindow.close();
      };
    }(this.infoWindow));
  }

  // Moves camera to fit current position and search locations
  updateCamera() {
    let bounds = new google.maps.LatLngBounds();

    // Add current location to bounds
    bounds.extend(new google.maps.LatLng(this.yelpService.getLat(), this.yelpService.getLng()));

    // Add search locations to bounds
    for (let location of this.bobaLocations) {
      let bound = new google.maps.LatLng(location.coordinates.latitude,location.coordinates.longitude);
      bounds.extend(bound);
    }

    // Move camera to fit bounds
    this.map.fitBounds(bounds, 50);
  }

  // Add marker for current location
  addCurrentLocationMarker() {
    let position = new google.maps.LatLng(this.yelpService.getLat(), this.yelpService.getLng());

    let marker = new google.maps.Marker({
      'position': position,
      'map': this.map,
      'icon': 'img/CurrentLocation.png'
    });

    google.maps.event.addListener(marker, 'click', function(self, marker) {
      return function() {
        let content = "Current location";
        self.infoWindow.setContent(content);
        self.infoWindow.open(self.map, marker);
      }
    }(this, marker));
  }

  // Clear current markers and add new markers to map using list of businesses returned from search
  addMarkersToMap() {
    // Return if map isn't ready
    if (!this.mapReady) {
      return;
    }

    this.clearMarkers();

    console.log("addMarkersToMap");
    console.log(this.bobaLocations);

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
      // this.yelpService.getMoreInfo(location)
      //   .subscribe(
      //     data => {

      // Update info window content for this location when this marker is selected
      google.maps.event.addListener(marker, 'click', function(self, marker, location) {
        return function() {
          let content = self.createInfoWindowContent(location);
          self.infoWindow.setContent(content);
          self.infoWindow.open(self.map, marker);
        }
      }(this, marker, location));
        //   }
        // );

      this.markers.push(marker);
      count += 1;
    }

    this.markersAdded = true;
  }

  // Removes all location markers from the map
  clearMarkers() {
    this.infoWindow.close();

    for (let marker of this.markers) {
      marker.setMap(null);
    }
    this.markers = [];
  }

  // Returns HTML content string for info window using a given location
  createInfoWindowContent(location) {
    let htmlContent = "";

    // Convert distance from meters to miles
    htmlContent += "<div class='name'><b>" + location.name + "</b> (" + (location.distance / 1609.3445).toFixed(2) + " mi)</div>";

    // Rating and review count
    htmlContent += "<div class='ratings'><img src=\"" + location.ratingImage + "\" />&nbsp;" + location.review_count + " reviews</div>";

    // Don't display this div if invalid open/close time
    let openTimeString = location.openTime.toLocaleTimeString('en-US', {hour: 'numeric', minute: '2-digit'});
    let closeTimeString = location.closeTime.toLocaleTimeString('en-US', {hour: 'numeric', minute: '2-digit'});
    if (openTimeString != "" && closeTimeString != "") {
      htmlContent += "<div class='hours'>Hours: " + openTimeString + " - " + closeTimeString + "</div>";
    }
    htmlContent = "<div class='leftContent'>" + htmlContent + "</div>";

    // Launch maps URL
    let launchMaps = "<div class='launchMaps' onclick=\"event.stopPropagation(); location.href='" + location.launchMapsUrl + "';\"><img src='img/DirectionsIconBlue.png' class='directionsIcon' /></div>";

    return "<div class='infoWindowContent' onclick=\"location.href='" + location.url + "'\">" + htmlContent + launchMaps + "</div>";
  }

}
