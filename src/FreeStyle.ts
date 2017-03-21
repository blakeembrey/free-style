import { Cache } from './Cache';
import { Container } from './Container';
import { Rule } from './Rule';
import { Style } from './Style';

import {
  HashFunction,
  Styles,
} from './types';

import {
  composeStyles,
  getStyles,
  stringHash,
} from './utils';

import {
  GLOBALS,
} from './constants';

/**
 * The FreeStyle class implements the API for everything else.
 */
export class FreeStyle extends Cache<Rule | Style> implements Container<FreeStyle> {

  constructor (public hash: HashFunction, public debug: boolean, public id = `f${(++GLOBALS.uniqueId).toString(36)}`) {
    super(hash)
  }

  registerStyle (styles: Styles, displayName?: string) {
    const { cache, id } = composeStyles(this, '&', styles, true, this.debug ? displayName : undefined)
    this.merge(cache)
    return id
  }

  registerKeyframes (keyframes: Styles, displayName?: string) {
    return this.registerHashRule('@keyframes', keyframes, displayName)
  }

  registerHashRule (prefix: string, styles: Styles, displayName?: string) {
    const { cache, pid, id } = composeStyles(this, '', styles, false, this.debug ? displayName : undefined)
    const rule = new Rule(`${prefix} ${id}`, undefined, this.hash, undefined, pid)
    this.add(rule.merge(cache))
    return id
  }

  registerRule (rule: string, styles: Styles) {
    this.merge(composeStyles(this, rule, styles, false).cache)
  }

  registerCss (styles: Styles) {
    this.merge(composeStyles(this, '', styles, false).cache)
  }

  getStyles () {
    return getStyles(this)
  }

  getIdentifier () {
    return this.id
  }

  clone (): FreeStyle {
    return new FreeStyle(this.hash, this.debug, this.id).merge(this)
  }

}

/**
 * Exports a simple function to create a new instance.
 */
export function create (hash = stringHash, debug = process.env['NODE_ENV'] !== 'production') {
  return new FreeStyle(hash, debug)
}
