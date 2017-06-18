import { Component } from '@angular/core';

import { AboutPage } from '../about/about';
import { MapViewPage } from '../mapView/mapView';
import { ListViewPage } from '../listView/listView';

@Component({
  templateUrl: 'tabs.html'
})
export class TabsPage {

  tab1Root = MapViewPage;
  tab2Root = ListViewPage;
  tab3Root = AboutPage;

  constructor() {

  }
}
