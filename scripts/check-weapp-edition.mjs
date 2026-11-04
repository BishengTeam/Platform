import { readFile } from 'node:fs/promises'

const edition = (await readFile('dist/EDITION', 'utf8')).trim()

if (edition !== 'full') {
  throw new Error(
    `拒绝上传非全量小程序包：dist/EDITION=${edition}。当前生产统一使用 full 口径；历史 trim 包仅作源码归档，不再提供构建入口。`
  )
}

console.log('小程序构建口径检查通过：full')
