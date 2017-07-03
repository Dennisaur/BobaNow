import { Injectable } from '@angular/core';

@Injectable()
export class AppState {
  _state = {}

  constructor() {

  }

  get state() {
    return this._state = this._clone(this._state);
  }
  set state(value) {
    throw new Error('Do no mutate the `.state` directly');
  }

  get(prop?: any) {
    const state = this._state;
    return state.hasOwnProperty(prop) ? state[prop] : state;
  }
  set(prop: string, value: any) {
    return this._state[prop] = value;
  }

  _clone(object) {
    return JSON.parse(JSON.stringify(object));
  }
}
