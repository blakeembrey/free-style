import { Cache } from './Cache';
import { Container } from './Container';
import { Style } from './Style';
import { HashFunction } from './types';
import {
  getStyles,
} from './utils';
/**
 * Implement rule logic for style output.
 */
export class Rule extends Cache<Rule | Style> implements Container<Rule> {

  constructor (
    public rule: string,
    public style = '',
    public hash: HashFunction,
    public id = `a${hash(`${rule}.${style}`)}`,
    public pid = ''
  ) {
    super(hash)
  }

  getStyles (): string {
    return `${this.rule}{${this.style}${getStyles(this)}}`
  }

  getIdentifier () {
    return `${this.pid}.${this.rule}.${this.style}`
  }

  clone (): Rule {
    return new Rule(this.rule, this.style, this.hash, this.id, this.pid).merge(this)
  }

}