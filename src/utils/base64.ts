export function toBase64(str: string): string {
  if (typeof TextEncoder !== 'undefined' && typeof btoa !== 'undefined') {
    const encoder = new TextEncoder()
    const bytes = encoder.encode(str)
    let binary = ''
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return btoa(binary)
  }

  if (typeof btoa !== 'undefined') {
    return btoa(str)
  }

  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
  let result = ''
  for (let i = 0; i < str.length; i += 3) {
    const b1 = str.charCodeAt(i)
    const b2 = i + 1 < str.length ? str.charCodeAt(i + 1) : NaN
    const b3 = i + 2 < str.length ? str.charCodeAt(i + 2) : NaN
    result += chars[b1 >> 2]
    result += chars[((b1 & 3) << 4) | (isNaN(b2) ? 0 : b2 >> 4)]
    result += isNaN(b2) ? '=' : chars[((b2 & 15) << 2) | (isNaN(b3) ? 0 : b3 >> 6)]
    result += isNaN(b3) ? '=' : chars[b3 & 63]
  }
  return result
}
