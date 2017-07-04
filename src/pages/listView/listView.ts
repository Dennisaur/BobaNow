import { Component } from '@angular/core';
import { NavController, Platform, MenuController, AlertController, LoadingController } from 'ionic-angular';
import { Http } from '@angular/http';
import { AppVersion } from '@ionic-native/app-version';
import 'rxjs/add/operator/map';

import { AppState } from '../../app/app.global';
import { YelpService } from '../../services/yelp.service';

declare var cordova;
declare var google;

@Component({
  selector: 'page-listView',
  templateUrl: 'listView.html'
})
export class ListViewPage {
  bobaLocations: any = [];

  loadingControl: any;
  waitingForLocations: boolean = false;
  needUpdateCamera: boolean;

  mapView: boolean = true;
  map: any;
  currentLocationMarker: any;
  markers: any = [];
  infoWindow: any;
  infoWindowClickListener: any;
  mapReady: boolean;
  markersAdded: boolean;

  packageName: string;

  menuContent: any;
  locationAvailable: boolean;
  locationEnabled: boolean;
  locationPermissionGranted: boolean;
  task: any;
  resume: any;

  constructor(public navCtrl: NavController,
              public http: Http,
              public platform: Platform,
              public menuController: MenuController,
              public alertController: AlertController,
              public loadingController: LoadingController,
              public global: AppState,
              private appVersion: AppVersion,
              private yelpService: YelpService) {

  }

  // Load map only after view is initialized
  ngAfterViewInit() {
    this.platform.ready()
      .then(
        () => {
          // Get package name
          this.appVersion.getPackageName()
            .then(
              (name) => this.packageName = name
            );
          // For testing
          if (this.yelpService.isTesting()) {
            this.locationAvailable = true;
            this.locationEnabled = true;
            this.locationPermissionGranted = true;
            this.yelpService.findLocations()
              .subscribe(
                (data) => {
                  this.initializeMapAndMarkers();
                }
              );
          }
          else {
            this.locationPermissions();
            this.task = setInterval(() => {
              this.checkLocationEnabled();
            }, 1000);
          }
        }
      );
  }

  // Load map and subscribe to observables from Yelp service
  initializeMapAndMarkers() {
    if (!this.mapReady) {
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
            // No locations found
            if (this.bobaLocations.length == 0) {
              let message = "";
              if (this.yelpService.getRadius() < 10) {
                message += "Try a larger search area.";
              }
              if (this.yelpService.getOpenNow()) {
                message += (message.length > 0 ? "<br>or<br>" : "") + "Try unchecking Open Now to find boba for another time.<br>";
              }
              if (message.length == 0) {
                message = "Sorry, we couldn't find any boba near you.";
              }
              this.openAlertWindow("No results", message)
            }
            
            this.addMarkersToMap();
            if (!this.mapView) {
              this.needUpdateCamera = true;
            }
          }
        );
    }
  }

  // Check if location is available before initializing map and markers
  checkLocationAvailable() {
    cordova.plugins.diagnostic.isLocationAvailable(function(available) {
      this.locationAvailable = available;
      if (available) {
        let loading = this.loadingController.create({
          content: "Searching for boba..."
        });
        loading.present();
        clearInterval(this.task);

        this.yelpService.locateUser()
          .then(
            (location) => {
              if (this.yelpService.getReadyToSearch()) {
                this.yelpService.findLocations()
                  .subscribe(
                    (data) => {
                      loading.dismiss();
                    }
                  );
              }
              else {
                loading.dismiss();

                this.openAlertWindow("Error", "Oh no, an error occurred trying to locate you! Please try restarting the app.");
              }
            }
          );

        this.initializeMapAndMarkers();
      }
    }.bind(this), function(error) {
      console.log("The following error occurred checking if location available: " + error);
    });
  }

  // Request location permission
  locationPermissions() {
    cordova.plugins.diagnostic.requestLocationAuthorization(function(status){
      switch(status){
          case cordova.plugins.diagnostic.permissionStatus.NOT_REQUESTED:
          case cordova.plugins.diagnostic.permissionStatus.DENIED:
              this.locationPermissionGranted = false;
              break;
          case cordova.plugins.diagnostic.permissionStatus.GRANTED:
          case cordova.plugins.diagnostic.permissionStatus.GRANTED_WHEN_IN_USE:
              this.locationPermissionGranted = true;
              this.checkLocationAvailable();
              break;
      }
    }.bind(this), function(error){
      console.error("The following error occurred: " + error);
    });
  }

  // Checks if gps location is enabled
  checkLocationEnabled() {
    cordova.plugins.diagnostic.getLocationMode(function(locationMode) {
      if (locationMode == cordova.plugins.diagnostic.locationMode.LOCATION_OFF) {
        this.locationEnabled = false;
      }
      else {
        this.locationEnabled = true;
        this.checkLocationAvailable();
      }
    }.bind(this),function(error){
      console.error("The following error occurred getting location mode: " + error);
    });
  }

  // Goes to location settings, then checks if location is available when resuming app
  locationSettings() {
    cordova.plugins.diagnostic.switchToLocationSettings();
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
      fullscreenControl: false,
      styles: [
        {
          featureType: 'poi',
          stylers: [{visibility: 'off'}]
        }]
    });

    this.addCurrentLocationControl();

    // Create and add current location marker to map
    let icon = {
      url: "img/CurrentLocation.png",
      scaledSize: new google.maps.Size(36, 36),
      origin: new google.maps.Point(0, 0),
      anchor: new google.maps.Point(0, 0)
    }
    this.currentLocationMarker = new google.maps.Marker({
      'map': this.map,
      'icon': icon
    });

    // Create info window for marker information
    //*todo fix resizing issue
    this.infoWindow = new google.maps.InfoWindow({
      maxWidth: 230,
      disableAutoPan: true
    });
    google.maps.event.addListener(this.infoWindow, 'domready', function() {
      let element = document.getElementsByClassName('gm-style-iw')[0];
      element.parentElement.className += ' custom-iw';
    });

    this.mapReady = true;

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

    let bounds = new google.maps.LatLngBounds();

    // Add current location to bounds
    let currentPosition = new google.maps.LatLng(this.yelpService.getLat(), this.yelpService.getLng());
    bounds.extend(currentPosition);

    // Add search locations to bounds
    for (let location of this.bobaLocations) {
      let bound = new google.maps.LatLng(location.coordinates.latitude, location.coordinates.longitude);
      bounds.extend(bound);
    }

    // Move camera to fit all locations
    //*todo get panToBounds working
    if (this.bobaLocations.length == 0) {
      this.map.setCenter(currentPosition);
      // Variable zoom based on radius of search
      switch (this.yelpService.getRadius()) {
        case 1:
          this.map.setZoom(14);
          break;
        case 2:
          this.map.setZoom(13);
          break;
        case 5:
          this.map.setZoom(12);
          break;
        default:
          this.map.setZoom(11);
          break;
      }
    }
    else {
      this.map.fitBounds(bounds, 10);
    }
    this.needUpdateCamera = false;
  }

  // Creates control to center on current location in map
  addCurrentLocationControl() {
    let controlDiv = document.createElement('div');

    controlDiv.className = "getCurrentLocation";
    controlDiv.innerHTML = `<img src='img/GetCurrentLocation.png' />`;

    // Close info window and pan to current position when clicked
    controlDiv.addEventListener('click', function() {
      this.yelpService.locateUser()
        .then(
          (location) => {
            this.infoWindow.close();

            let position = new google.maps.LatLng(location.coords.latitude, location.coords.longitude);
            this.map.panTo(position);
          }
        );
    }.bind(this));

    // Add the control element to map
    this.map.controls[google.maps.ControlPosition.RIGHT_TOP].push(controlDiv);
  }

  // Add marker for current location
  addCurrentLocationMarker() {
    // Update current location marker position
    let position = new google.maps.LatLng(this.yelpService.getLat(), this.yelpService.getLng());
    this.currentLocationMarker.setPosition(position);
  }

  // Clear current markers and add new markers to map using list of businesses returned from search
  addMarkersToMap() {
    // Return if map isn't ready
    if (!this.mapReady) {
      return;
    }

    this.clearMarkers();

    // Iterate through and create a marker for each location
    let count = 1;
    if (this.bobaLocations.length == 0) {
      // Oh noo! None nearby
    }
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
          self.map.panTo(marker.position);
          self.infoWindow.setContent(content);
          self.infoWindow.open(self.map, marker);
          self.map.panBy(-20, -60);
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
  createInfoWindowContent(location) {
    let leftContent = "<div class='name'>" + location.name + "</div>";
    // Address
    leftContent += "<div class='address'>" + location.location.address1 + ", " + location.location.city + "</div>";
    // Don't display this div if invalid open/close time
    let openTimeString = location.openTime.toLocaleTimeString('en-US', {hour: 'numeric', minute: '2-digit'});
    let closeTimeString = location.closeTime.toLocaleTimeString('en-US', {hour: 'numeric', minute: '2-digit'});
    if (openTimeString != "" && closeTimeString != "") {
      leftContent += "<div class='hours'>Hours: " + openTimeString + " - " + closeTimeString + "</div>";
    }
    // Rating and review count
    leftContent += "<div class='ratings'><img src=\"" + location.ratingImage + "\" /><div>&nbsp;" + location.review_count + " reviews</div></div>";
    // Wrap in leftContent div
    leftContent = "<div class='leftContent'>" + leftContent + "</div>";

    // Convert distance from meters to miles
    let rightContent = "<div class='distance'>" + (location.distance / 1609.3445).toFixed(2) + " mi</div>";
    // Launch maps URL
    // Stop propagation to prevent opening yelp page instead of navigation
    rightContent += "<div onclick=\"event.stopPropagation(); location.href='" + location.launchMapsUrl
          + "';\"><button class='navigationButton'><img src='img/DirectionsIconBlue.png' class='directionsIcon' /></button></div>";
    // Wrap in rightContent div
    rightContent = "<div class='rightContent'>" + rightContent + "</div>";
    return "<div class='infoWindowContent' onclick=\"location.href='" + location.url + "'\">" + leftContent + rightContent + "</div>";
  }

  // Returns if an info window is open
  getInfoWindowOpen() {
    var map = this.infoWindow.getMap();
    return (map !== null && typeof map !== "undefined");
  }

  // Close the info window
  closeInfoWindow() {
    this.infoWindow.close();
  }

  // Toggles between list and map view
  toggleView() {
    this.mapView = !this.mapView;

    // Update camera in case search was changed
    if (this.needUpdateCamera) {
      (function(self) {
        setTimeout(function() { self.updateCamera()}, 500);
      })(this);
    }
  }

  // Getter function for which view we're in
  getIsMapView() {
    return this.mapView;
  }

  // Opens the given menu
  openMenu(id: string) {
    this.menuController.enable(true, id);
    this.menuController.open(id);
  }

  // Opens alert window with About us info
  openInfo() {
    this.openAlertWindow("About us", this.createAboutContent());
  }

  // Generic open alert window
  openAlertWindow(title: string, message: string) {
      let alert = this.alertController.create({
        title: title,
        message: message,
        cssClass: "alertWindow " + this.global.get('theme'),
        buttons: ['OK']
      });

      alert.present();
  }

  // Creates message content for about window
  createAboutContent() {
    let playStoreLink = "<a href='https://play.google.com/store/apps/details?id=" + this.packageName + "'>Rate/review</a>"
    let htmlContent = `
    <div>
      Thank you for using Boba Now!
    </div>
    <div>
      <div class="poweredByText">
        Powered by
      </div>
      <a href="https://www.yelp.com">
        <img class="yelpTrademark" src="img/Yelp%20Logo%20Trademark/Screen/Yelp_trademark_RGB_outline.png" />
      </a>
    </div>
    <div class="companyInfo">
      <div class="companyName">
        Dennisaur Co.
      </div>
      <div>` + playStoreLink + `</div>
      <div>
        <a href="mailto:dennisaur.co@gmail.com">Contact us</a>
      </div>
    </div>
    `
    return htmlContent;
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
}
