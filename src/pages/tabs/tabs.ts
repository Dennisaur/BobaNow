import { Component } from '@angular/core';

import { AboutPage } from '../about/about';
import { MapViewPage } from '../mapView/mapView';
import { ListViewPage } from '../listView/listView';

@Component({
  templateUrl: 'tabs.html'
})
export class TabsPage {

  tab1Root = ListViewPage;
  tab2Root = MapViewPage;
  tab3Root = AboutPage;

  constructor() {

  }
}
