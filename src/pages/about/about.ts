import { Component } from '@angular/core';
import { NavController, Platform } from 'ionic-angular';
import { Http } from '@angular/http';

declare var cordova;

@Component({
  selector: 'page-about',
  templateUrl: 'about.html'
})
export class AboutPage {

  constructor(public navCtrl: NavController,
              public http: Http,
              public platform: Platform) {

  }

  // Load map only after view is initialized
  ngAfterViewInit() {
    this.platform.ready()
      .then(
        () => {

        }
      );
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
