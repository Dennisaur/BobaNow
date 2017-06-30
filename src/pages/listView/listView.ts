import { Component } from '@angular/core';
import { NavController, Platform, MenuController, AlertController } from 'ionic-angular';
import { Http } from '@angular/http';
import { AppVersion } from '@ionic-native/app-version';
import 'rxjs/add/operator/map';

import { YelpService } from '../../services/yelp.service';

declare var cordova;
declare var google;
var consoleLogging = true;

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
  currentLocMarker: any;
  markers: any = [];
  infoWindow: any;
  infoWindowClickListener: any;
  mapReady: boolean;
  markersAdded: boolean;

  menuContent: any;

  constructor(public navCtrl: NavController,
              public http: Http,
              public platform: Platform,
              public menuController: MenuController,
              public alertController: AlertController,
              private appVersion: AppVersion,
              private yelpService: YelpService) {

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
                if (!this.mapView) {
                  this.needUpdateCamera = true;
                }
              }
            );
        }
      );
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
    console.log("loading map now " + Date.now().toLocaleString());

    let icon = {
      url: "img/CurrentLocation3.png",
      scaledSize: new google.maps.Size(36, 36),
      origin: new google.maps.Point(0, 0),
      anchor: new google.maps.Point(0, 0)
    }

    // Add marker to map
    this.currentLocMarker = new google.maps.Marker({
      'map': this.map,
      'icon': icon
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
    this.needUpdateCamera = false;
  }

  addCurrentLocationControl() {
    let controlDiv = document.createElement('div');

    controlDiv.className = "getCurrentLocation";
    controlDiv.innerHTML = `<img src='img/GetCurrentLocation.png' />`;

    controlDiv.addEventListener('click', function() {
      this.yelpService.locateUser()
        .then(
          (location) => {
            let position = new google.maps.LatLng(location.coords.latitude, location.coords.longitude);
            this.map.panTo(position);
          }
        );
    }.bind(this));

    this.map.controls[google.maps.ControlPosition.RIGHT_TOP].push(controlDiv);
  }

  // Add marker for current location
  addCurrentLocationMarker() {
    if (consoleLogging) {
      console.log("Adding current location marker " + this.yelpService.getLat() + ", " + this.yelpService.getLng());
    }

    // Update current location marker position
    let position = new google.maps.LatLng(this.yelpService.getLat(), this.yelpService.getLng());
    this.currentLocMarker.setPosition(position);

    // Attach info window for current location
    //*todo Infowindow sizing
    google.maps.event.addListener(this.currentLocMarker, 'click', function(self, marker) {
      return function() {
        let content = "Current location";
        self.infoWindow.setContent(content);
        self.infoWindow.open(self.map, marker);
        self.map.panTo(marker.position);
      }
    }(this, this.currentLocMarker));
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
          self.infoWindow.open(self.map, marker);
          self.infoWindow.setContent(content);
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
    let leftContent = "<div class='name'><b>" + location.name + "</b></div>";
    // Don't display this div if invalid open/close time
    let openTimeString = location.openTime.toLocaleTimeString('en-US', {hour: 'numeric', minute: '2-digit'});
    let closeTimeString = location.closeTime.toLocaleTimeString('en-US', {hour: 'numeric', minute: '2-digit'});
    if (openTimeString != "" && closeTimeString != "") {
      leftContent += "<div class='hours'>Hours: " + openTimeString + " - " + closeTimeString + "</div>";
    }
    // Rating and review count
    leftContent += "<div class='ratings'><img src=\"" + location.ratingImage + "\" />&nbsp;" + location.review_count + " reviews</div>";
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
    if (consoleLogging) {
      console.log("Toggle view");
    }

    // Update camera in case search was changed
    if (this.needUpdateCamera) {
      (function(self) {
        setTimeout(function() { self.updateCamera()}, 500);
      })(this);
    }
  }

  // Opens alert window with About us info
  openInfo() {
    let alert = this.alertController.create({
      title: "About us",
      message: this.createAboutContent(),
      cssClass: "aboutWindow",
      buttons: ['OK']
    });

    alert.present();
  }

  // Creates message content for about window
  createAboutContent() {
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
      <div>
        <a href="https://play.google.com/store/apps/details?id="` + this.appVersion.getPackageName() + `>Rate/review</a>
      </div>
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
