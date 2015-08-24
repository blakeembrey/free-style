const FNV1_32A_INIT = 0x811c9dc5

export default function fnv32a (str: string) {
  let hval = FNV1_32A_INIT

  for (let i = 0; i < str.length; ++i) {
    hval ^= str.charCodeAt(i)
    hval += (hval << 1) + (hval << 4) + (hval << 7) + (hval << 8) + (hval << 24)
  }

  return hval >>> 0
}
