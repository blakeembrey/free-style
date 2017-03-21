import { Cache } from './Cache';
import { Selector } from './Selector';
import { Container } from './Container';
import { HashFunction } from './types';
/**
 * The style container registers a style string with selectors.
 */
export class Style extends Cache<Selector> implements Container<Style> {

  constructor (public style: string, public hash: HashFunction, public id = `c${hash(style)}`) {
    super(hash)
  }

  getStyles (): string {
    return `${this.values().map(x => x.getStyles()).join(',')}{${this.style}}`
  }

  getIdentifier () {
    return this.style
  }

  clone (): Style {
    return new Style(this.style, this.hash, this.id).merge(this)
  }

}