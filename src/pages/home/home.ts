import { Component } from '@angular/core';
import { NavController } from 'ionic-angular';
import { Geolocation } from '@ionic-native/geolocation';

import { AgmCoreModule } from '@agm/core'

@Component({
  selector: 'page-home',
  templateUrl: 'home.html'
})
export class HomePage {
  location: any;
  lat: number;
  lng: number;

  constructor(public navCtrl: NavController,
              private geolocation: Geolocation) {

  }

  onLocateUser() {
    this.geolocation.getCurrentPosition()
      .then(
        (location) => {
          this.location = location;
          this.lat = this.location.coords.latitude;
          this.lng = this.location.coords.longitude;
        }
      )
      .catch(
        (error) => console.log("An error occurred")
      );

  }
}
