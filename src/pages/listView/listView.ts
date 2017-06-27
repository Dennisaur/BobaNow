import { Component } from '@angular/core';
import { NavController, Platform, LoadingController, MenuController } from 'ionic-angular';
import { Http } from '@angular/http';
import 'rxjs/add/operator/map';

import { YelpService } from '../../services/yelp.service';

declare var cordova;
declare var google;
var testingInBrowser = false;
var consoleLogging = true;

@Component({
  selector: 'page-listView',
  templateUrl: 'listView.html'
})
export class ListViewPage {
  bobaLocations: any = [];

  loadingControl: any;
  waitingForLocations: boolean = false;

  mapView: boolean = true;
  map: any;
  markers: any = [];
  infoWindow: any;
  infoWindowClickListener: any;
  mapReady: boolean;
  markersAdded: boolean;

  menuContent: any;

  constructor(public navCtrl: NavController,
              public http: Http,
              public platform: Platform,
              public loadingController: LoadingController,
              public menuController: MenuController,
              private yelpService: YelpService) {

    if (testingInBrowser) {
      this.getTestResults();
    }
  }

  // Load map only after view is initialized
  ngAfterViewInit() {
    this.platform.ready()
      .then(
        () => {
          // Load map before adding markers
          this.loadMap();

          // Subscribe to observable to add current location marker
          this.yelpService.currentLocationUpdate()
            .subscribe(
              (location) => {
                this.addCurrentLocationMarker();
              }
            )
          // Subscribe to observable to get search locations
          this.yelpService.searchUpdates()
            .subscribe(
              (locations) => {
                this.bobaLocations = locations;
                this.addMarkersToMap();
              }
            );
        }
      );
  }

  // Toggles between list and map view
  toggleView() {
    this.mapView = !this.mapView;
    if (consoleLogging) {
      console.log("Toggle view");
    }

    // Update camera in case search was changed
    (function(self) {
      setTimeout(function() { self.updateCamera()}, 500);
    })(this);
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
    //*todo fix resizing issue
    this.infoWindow = new google.maps.InfoWindow({maxWidth: 230});
    google.maps.event.addListener(this.infoWindow, 'domready', function() {
      let element = document.getElementsByClassName('gm-style-iw')[0];
      element.parentElement.className += ' custom-iw';
    });

    this.mapReady = true;
    if (consoleLogging) {
      console.log("Map is ready");
    }

    // Add event listener to close infoWindow when map is clicked
    google.maps.event.addListener(this.map, 'click', function(infoWindow) {
      return function() {
        infoWindow.close();
      };
    }(this.infoWindow));
  }

  // Moves camera to fit current position and search locations
  updateCamera() {
    // Quit if we aren't in map view
    if (!this.mapView) {
      return;
    }

    if (consoleLogging) {
      console.log("Updating camera");
    }

    let bounds = new google.maps.LatLngBounds();

    // Add current location to bounds
    bounds.extend(new google.maps.LatLng(this.yelpService.getLat(), this.yelpService.getLng()));

    // Add search locations to bounds
    for (let location of this.bobaLocations) {
      let bound = new google.maps.LatLng(location.coordinates.latitude, location.coordinates.longitude);
      bounds.extend(bound);
    }

    // Move camera to fit bounds
    //*todo get panToBounds working
    this.map.fitBounds(bounds, 25);
  }

  // Add marker for current location
  addCurrentLocationMarker() {
    if (consoleLogging) {
      console.log("Adding current location marker " + this.yelpService.getLat() + ", " + this.yelpService.getLng());
    }

    let position = new google.maps.LatLng(this.yelpService.getLat(), this.yelpService.getLng());

    // Add marker to map
    let marker = new google.maps.Marker({
      'position': position,
      'map': this.map,
      'icon': 'img/CurrentLocation.png'
    });

    // Attach info window for current location
    //*todo Infowindow sizing
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

    if (consoleLogging) {
      console.log("Adding location markers");
      console.log(this.bobaLocations);
    }
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

      // Attach info window content for this marker
      google.maps.event.addListener(marker, 'click', function(self, marker, location) {
        return function() {
          let content = self.createInfoWindowContent(location);
          self.infoWindow.setContent(content);
          self.infoWindow.open(self.map, marker);
        }
      }(this, marker, location));

      this.markers.push(marker);
      count += 1;
    }

    this.markersAdded = true;
    this.updateCamera();
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
  //*todo Improve styling
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


  // Function to use InAppBrowser to navigate to given URL
  launch(url, evt) {
    if (evt) {
      evt.stopPropagation();
    }

    this.platform.ready()
    .then(
      () => {
        cordova.InAppBrowser.open(url, "_system", "location=yes");
      }
    );
  }


  // For testing without using calling Yelp API
  getTestResults() {
    this.http.get("./testResults.json").map(res => res.json())
      .subscribe(
        (data) => {
          this.bobaLocations = data.businesses;
          for (let location of this.bobaLocations) {
            // Add some new properties to locations for easier access
            location.ratingImage = this.yelpService.getRatingImage(location.rating);
            location.launchMapsUrl = this.yelpService.getLaunchMapsUrl(location);
          }
        }
      );
  }
}
