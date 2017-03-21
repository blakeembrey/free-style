import { Container } from './Container';
import {
  HashFunction,
} from './types';


/**
 * Implement a cache/event emitter.
 */
export class Cache <T extends Container<any>> {

  changeId = 0

  private _children: { [id: string]: T } = {}
  private _keys: string[] = []
  private _counters: { [id: string]: number } = {}

  constructor (public hash: HashFunction) {}

  values (): T[] {
    return this._keys.map(x => this._children[x])
  }

  add <U extends T> (style: U): U {
    const count = this._counters[style.id] || 0
    const item = this._children[style.id] || style.clone()

    this._counters[style.id] = count + 1

    if (count === 0) {
      this._keys.push(item.id)
      this._children[item.id] = item
      this.changeId++
    } else {
      // Check if contents are different.
      if (item.getIdentifier() !== style.getIdentifier()) {
        throw new TypeError(`Hash collision: ${style.getStyles()} === ${item.getStyles()}`)
      }

      this._keys.splice(this._keys.indexOf(style.id), 1)
      this._keys.push(style.id)

      if (item instanceof Cache && style instanceof Cache) {
        const prevChangeId = item.changeId

        item.merge(style)

        if (item.changeId !== prevChangeId) {
          this.changeId++
        }
      }
    }

    return item as U
  }

  remove (style: T): void {
    const count = this._counters[style.id]

    if (count > 0) {
      this._counters[style.id] = count - 1

      const item = this._children[style.id]

      if (count === 1) {
        delete this._counters[style.id]
        delete this._children[style.id]
        this._keys.splice(this._keys.indexOf(style.id), 1)
        this.changeId++
      } else if (item instanceof Cache && style instanceof Cache) {
        const prevChangeId = item.changeId

        item.unmerge(style)

        if (item.changeId !== prevChangeId) {
          this.changeId++
        }
      }
    }
  }

  merge <U extends Cache<any>> (cache: U) {
    for (const value of cache.values()) {
      this.add(value)
    }

    return this
  }

  unmerge <U extends Cache<any>> (cache: U) {
    for (const value of cache.values()) {
      this.remove(value)
    }

    return this
  }

  clone () {
    return new Cache(this.hash).merge(this)
  }

}
