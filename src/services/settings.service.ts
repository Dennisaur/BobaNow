import { Storage } from '@ionic/storage';
import { Injectable } from '@angular/core';

@Injectable()
export class SettingsService {
  private theme: string = "milkTea";

  constructor (private storage: Storage) {

  }

  getTheme() {
    return this.storage.get('theme')
      .then((theme) => {
        this.theme = (theme == null) ? "theme-milkTea" : theme;
        return this.theme;
      });
  }

  setTheme(newTheme: string) {
    this.theme = newTheme;
    this.storage.set('theme', this.theme);
  }
}
