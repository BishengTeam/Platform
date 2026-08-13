// Taro's runtime replaces these compile-time flags during a mini-program
// build. Define the minimal defaults needed when importing its API in Node
// unit tests; production bundles continue to use Taro/Vite replacements.
globalThis.ENABLE_INNER_HTML = false
globalThis.ENABLE_ADJACENT_HTML = false
globalThis.ENABLE_SIZE_APIS = false
globalThis.ENABLE_TEMPLATE_CONTENT = false
globalThis.ENABLE_CLONE_NODE = false
globalThis.ENABLE_CONTAINS = false
globalThis.ENABLE_MUTATION_OBSERVER = false
