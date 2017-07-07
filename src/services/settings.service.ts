import { Storage } from '@ionic/storage';
import { Injectable } from '@angular/core';
import { AppState } from '../app/app.global';

// Used to save and retrieve settings in storage

@Injectable()
export class SettingsService {
  private testLocations: boolean = false;
  private skipLocationPermission: boolean = false;
  private browser: boolean = false;
  private ios: boolean = false;
  private theme: string = "milkTea";

  private searchParams: any;
  private defaultSearchParams: any = {
    radius: 5,
    limit: 10,
    openNow: true,
    sortBy: 'best_match'
  };

  constructor (private storage: Storage,
               public global: AppState) {
     // Initialize globals
     global.set('skipLocationPermission', this.skipLocationPermission);
     global.set('testLocations', this.testLocations);
     // Set is ios in global
     global.set('ios', this.ios);
     // Set is browser for testing
     global.set('browser', this.browser);

     storage.get('theme')
      .then((theme) => {
        this.theme = (theme == null) ? "theme-milkTea" : theme;
        global.set('theme', this.theme);
      });

      this.getSearchParams();
  }

  // Returns promise to retrieve theme from storage
  getTheme() {
    return this.storage.get('theme')
      .then((theme) => {
        this.theme = (theme == null) ? "theme-milkTea" : theme;
        return this.theme;
      });
  }
  // Sets theme in storage
  setTheme(newTheme: string) {
    this.theme = newTheme;
    this.storage.set('theme', this.theme);
  }

  // Returns promise to retrieve search params from storage
  getSearchParams() {
    return this.storage.get('searchParams')
      .then((searchParams) => {
        this.searchParams = (searchParams == null) ? this.defaultSearchParams : searchParams;
        return this.searchParams;
      })
  }
  // Sets search params in storage
  setSearchParams(searchParams) {
    this.searchParams = searchParams;
    this.storage.set('searchParams', this.searchParams);
  }

}
