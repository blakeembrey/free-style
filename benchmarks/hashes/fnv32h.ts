// Hex http://engineering.chartbeat.com/2014/08/13/you-dont-know-jack-about-hashing/
export default function fnv32h (str: string) {
  const h = [0x6295c58d, 0x62b82175, 0x07bb0142, 0x6c62272e];

  for (let i = 0; i < str.length; i++) {
      h[i % 4] ^= str.charCodeAt(i);
      h[i % 4] *= 0x01000193;
  }

  return h[0].toString(16) + h[1].toString(16) + h[2].toString(16) + h[3].toString(16);
}
