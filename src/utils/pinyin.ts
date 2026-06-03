/**
 * 简易拼音占位：将中文姓名转为字母占位符。
 * 接入真实拼音库后替换此实现。
 */
export function autoPinyin(name: string): string {
  return name.split('').map(() => 'XX').join(' ')
}
