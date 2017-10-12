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
  selector: 'page-mainView',
  templateUrl: 'mainView.html'
})
export class MainViewPage {
  private packageName: string;
  private isIos: boolean;

  // Location permissions
  private locationAvailable: boolean;
  private locationEnabled: boolean;
  private locationPermissionGranted: boolean;
  private checkLocationTask: any;

  // Map variables
  private mapView: boolean = true;
  private map: any;
  private mapReady: boolean;
  private currentLocationMarker: any;
  private markers: any = [];
  private infoWindow: any;
  private infoWindowClickListener: any;
  private needUpdateCamera: boolean;

  // Search results
  private bobaLocations: any = [];


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
      .then(() => {
        this.subscribeToObservables();

        this.isIos = this.global.get('ios');

        // Get package name
        if (!this.global.get('browser')) {
          this.appVersion.getPackageName()
            .then(
              (name) => this.packageName = name
            );
        }
        // For testing, skip all locations checks
        if (this.global.get('testLocations') || this.global.get('skipLocationPermission')) {
          this.locationAvailable = true;
          this.locationEnabled = true;
          this.locationPermissionGranted = true;
          this.loadMap();
          this.initiateYelpSearch();
        }
        else {
          this.requestLocationPermission();
          this.checkLocationTask = setInterval(() => {
            this.checkLocationEnabled();
          }, 1000);
        }
      });
  }

  // Request location permission
  requestLocationPermission() {
    if (!this.global.get('browser')) {
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
  }

  // Checks if gps location is enabled
  // [Android only]
  checkLocationEnabled() {
    // ios doesn't have getLocationMode
    if (this.global.get('ios')) {
      this.locationEnabled = true;
      this.checkLocationAvailable();
      return;
    }

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
  // [Android only]
  locationSettings() {
    if (!this.global.get('browser')) {
      cordova.plugins.diagnostic.switchToLocationSettings();
    }
  }

  // Check if location is available before initializing map and markers
  // This checks both permission and gps enabled
  checkLocationAvailable() {
    if (!this.global.get('browser')) {
      cordova.plugins.diagnostic.isLocationAvailable(function(available) {
        this.locationAvailable = available;
        if (available) {
          this.loadMap();
          this.initiateYelpSearch();
        }
      }.bind(this), function(error) {
        console.log("The following error occurred checking if location available: " + error);
      });
    }
  }

  // For initial search, wait until search params fetched from storage
  findLocationsWhenReady(loading: any) {
    let findLocationsTask = setInterval(() => {
      if (this.yelpService.getSearchReady()) {
        this.yelpService.findLocations()
          .subscribe((data) => {
            loading.dismiss();
          });
        clearInterval(findLocationsTask);
      }
    }, 500);
  }

  // Initiates Yelp search (finding current location and nearby locations)
  initiateYelpSearch() {
    let loading = this.loadingController.create({
      content: "Searching for boba..."
    });
    loading.present();
    clearInterval(this.checkLocationTask);

    // Find current location
    this.yelpService.locateUser()
      .then((location) => {
        if (this.yelpService.getUserLocated()) {
          this.findLocationsWhenReady(loading);
        }
        else {
          loading.dismiss();
          this.openAlertWindow("Error", "Oh no, an error occurred trying to locate you! Please try restarting the app.");
        }
      });
  }

  // Subscribe to observables from Yelp service
  subscribeToObservables() {
    // Observable to add current location marker
    this.yelpService.getCurLocObservable()
      .subscribe((location) => {
        this.addCurrentLocationMarker();
      });
    // Observable to get search locations
    this.yelpService.getSearchObservable()
      .subscribe((locations) => {
        this.bobaLocations = locations;
        this.addMarkersToMap();

        // Search was updated in list view, camera will need to be updated
        if (!this.mapView) {
          this.needUpdateCamera = true;
        }
        else {
          this.updateCamera();
        }

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
      });
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
    this.infoWindow = new google.maps.InfoWindow({
      maxWidth: 230,
      disableAutoPan: true
    });
    google.maps.event.addListener(this.infoWindow, 'domready', function() {
      let element = document.getElementsByClassName('gm-style-iw')[0];
      element.parentElement.className += ' custom-iw';
    });

    // Add event listener to close infoWindow when map is clicked
    google.maps.event.addListener(this.map, 'click', function(infoWindow) {
      return function() {
        infoWindow.close();
      };
    }(this.infoWindow));

    this.mapReady = true;
  }

  // Creates control to center on current location in map
  addCurrentLocationControl() {
    let controlDiv = document.createElement('div');

    controlDiv.className = "getCurrentLocation";
    controlDiv.innerHTML = `<img src='img/GetCurrentLocation.png' />`;

    // Close info window and pan to current position when clicked
    controlDiv.addEventListener('click', function() {
      this.yelpService.locateUser()
        .then((location) => {
          this.infoWindow.close();

          let position = new google.maps.LatLng(location.coords.latitude, location.coords.longitude);
          this.map.panTo(position);
        });
    }.bind(this));

    // Add the control element to map
    this.map.controls[google.maps.ControlPosition.RIGHT_TOP].push(controlDiv);
  }

  // Moves camera to fit current position and search locations
  updateCamera() {
    // Quit if we aren't in map view
    if (!this.mapView || this.global.get('browser')) {
      return;
    }

    let bounds = new google.maps.LatLngBounds();

    // Add current location to bounds
    let currentPosition = new google.maps.LatLng(this.yelpService.getLat(), this.yelpService.getLng());
    bounds.extend(currentPosition);

    // Add search locations to bounds
    for (let location of this.bobaLocations) {
      if (location.coordinates.latitude == null || location.coordinates.longitude == null) {
        continue;
      }
      let bound = new google.maps.LatLng(location.coordinates.latitude, location.coordinates.longitude);
      bounds.extend(bound);
    }

    // Variable zoom based on radius of search when no locations found
    if (this.bobaLocations.length == 0) {
      this.map.setCenter(currentPosition);
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
    // Fit all locations and current location
    else {
      this.map.fitBounds(bounds, 30);
    }
    this.needUpdateCamera = false;
  }

  // Set position of current location marker
  addCurrentLocationMarker() {
    // Quit if map isn't ready
    if (!this.mapReady) {
      return;
    }

    let position = new google.maps.LatLng(this.yelpService.getLat(), this.yelpService.getLng());
    this.currentLocationMarker.setPosition(position);
  }

  // Clear current markers and add new markers to map using list of businesses returned from search
  addMarkersToMap() {
    // Quit if map isn't ready
    if (!this.mapReady) {
      return;
    }

    this.clearMarkers();

    // Iterate through and create a marker for each location
    let count = 1;
    for (let location of this.bobaLocations) {
      if (location.coordinates.latitude == null || location.coordinates.longitude == null) {
        count += 1;
        continue;
      }
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
    if (location.hasHours) {
      let openTimeString = location.openTime.toLocaleTimeString('en-US', {hour: 'numeric', minute: '2-digit'});
      let closeTimeString = location.closeTime.toLocaleTimeString('en-US', {hour: 'numeric', minute: '2-digit'});
      if (openTimeString != "" && closeTimeString != "") {
        leftContent += "<div class='hours'>Hours: " + openTimeString + " - " + closeTimeString + "</div>";
      }
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
    let storeLink: string;
    if (this.global.get('ios')) {
      storeLink = "<a href='https://play.google.com/store/apps/details?id=" + this.packageName + "'>Rate/review</a>"
    }
    else {
      storeLink = "<a href='https://play.google.com/store/apps/details?id=" + this.packageName + "'>Rate/review</a>"
    }
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
      <div>` + storeLink + `</div>
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
    .then(() => {
      cordova.InAppBrowser.open(url, "_system", "location=yes");
    });
  }
}
