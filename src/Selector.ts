import { Container } from './Container';
import { HashFunction } from './types';
/**
 * Selector is a dumb class made to represent nested CSS selectors.
 */
export class Selector implements Container<Selector> {

  constructor (
    public selector: string,
    public hash: HashFunction,
    public id = `s${hash(selector)}`,
    public pid = ''
  ) {}

  getStyles () {
    return this.selector
  }

  getIdentifier () {
    return `${this.pid}.${this.selector}`
  }

  clone () {
    return new Selector(this.selector, this.hash, this.id, this.pid)
  }

}