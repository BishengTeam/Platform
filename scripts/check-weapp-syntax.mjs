import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export function checkWeappScript(source, filename) {
  try {
    // WeChat supplies these environment bindings around each CommonJS script.
    // Parsing as an isolated file misses lexical declarations that collide with them.
    new Function('require', 'module', 'exports', 'window', 'document', 'navigator', 'location', source)
  } catch (error) {
    throw new SyntaxError(`${filename}: ${error.message}`)
  }
}

async function checkDirectory(directory) {
  let count = 0
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name)
    if (entry.isDirectory()) count += await checkDirectory(target)
    else if (entry.name.endsWith('.js')) {
      checkWeappScript(await readFile(target, 'utf8'), target)
      count += 1
    }
  }
  return count
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const count = await checkDirectory(path.resolve(process.argv[2] || 'dist'))
  if (!count) throw new Error('未找到小程序脚本，请先构建')
  console.log(`小程序脚本语法检查通过：${count} 个文件`)
}
