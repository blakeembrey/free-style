/**
 * Cacheable interface.
 */
export interface Container <T> {
  id: string
  clone (): T
  getIdentifier (): string
  getStyles (): string
}