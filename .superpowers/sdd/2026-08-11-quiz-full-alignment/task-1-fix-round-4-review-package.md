45f938e test: lock quiz frontend quality dependencies
 package-lock.json | 23864 +++++++++++++++++++++++++++++-----------------------
 1 file changed, 13268 insertions(+), 10596 deletions(-)
diff --git a/package-lock.json b/package-lock.json
index 489bd89..ac29859 100644
--- a/package-lock.json
+++ b/package-lock.json
@@ -30,56 +30,88 @@
       },
       "devDependencies": {
         "@babel/core": "^7.24.4",
         "@babel/plugin-transform-class-properties": "7.25.9",
         "@babel/preset-react": "^7.24.1",
         "@commitlint/cli": "^19.8.1",
         "@commitlint/config-conventional": "^19.8.1",
         "@tarojs/cli": "4.2.0",
         "@tarojs/plugin-generator": "4.2.0",
         "@tarojs/vite-runner": "4.2.0",
+        "@testing-library/jest-dom": "^6.6.3",
+        "@testing-library/react": "^16.3.0",
         "@types/minimatch": "^5",
         "@types/react": "^18.0.0",
         "@vitejs/plugin-react": "^4.3.0",
         "babel-preset-taro": "4.2.0",
         "classnames": "^2.5.1",
         "eslint": "^8.57.0",
         "eslint-config-taro": "4.2.0",
         "eslint-plugin-react": "^7.34.1",
         "eslint-plugin-react-hooks": "^4.4.0",
         "husky": "^9.1.7",
+        "jsdom": "^26.1.0",
         "lint-staged": "^16.1.2",
         "postcss": "^8.5.6",
         "react-refresh": "^0.14.0",
         "sass": "^1.99.0",
         "sharp": "^0.34.5",
         "stylelint": "^16.4.0",
         "stylelint-config-standard": "^38.0.0",
         "terser": "^5.30.4",
         "typescript": "^5.4.5",
-        "vite": "^4.2.0"
+        "vite": "^4.2.0",
+        "vitest": "^3.2.4"
       }
     },
+    "node_modules/@adobe/css-tools": {
+      "version": "4.5.0",
+      "resolved": "https://registry.npmjs.org/@adobe/css-tools/-/css-tools-4.5.0.tgz",
+      "integrity": "sha512-6OzddxPio9UiWTCemp4N8cYLV2ZN1ncRnV1cVGtve7dhPOtRkleRyx32GQCYSwDYgaHU3USMm84tNsvKzRCa1Q==",
+      "dev": true,
+      "license": "MIT"
+    },
     "node_modules/@ampproject/remapping": {
       "version": "2.3.0",
       "resolved": "https://registry.npmjs.org/@ampproject/remapping/-/remapping-2.3.0.tgz",
       "integrity": "sha512-30iZtAPgz+LTIYoeivqYo853f02jBYSd5uGnGpkFV0M3xOt9aN73erkgYAmZU43x4VfqcnLxW9Kpg3R5LC4YYw==",
       "dev": true,
       "license": "Apache-2.0",
       "dependencies": {
         "@jridgewell/gen-mapping": "^0.3.5",
         "@jridgewell/trace-mapping": "^0.3.24"
       },
       "engines": {
         "node": ">=6.0.0"
       }
     },
+    "node_modules/@asamuzakjp/css-color": {
+      "version": "3.2.0",
+      "resolved": "https://registry.npmjs.org/@asamuzakjp/css-color/-/css-color-3.2.0.tgz",
+      "integrity": "sha512-K1A6z8tS3XsmCMM86xoWdn7Fkdn9m6RSVtocUrJYIwZnFVkng/PvkEoWtOWmP+Scc6saYWHWZYbndEEXxl24jw==",
+      "dev": true,
+      "license": "MIT",
+      "dependencies": {
+        "@csstools/css-calc": "^2.1.3",
+        "@csstools/css-color-parser": "^3.0.9",
+        "@csstools/css-parser-algorithms": "^3.0.4",
+        "@csstools/css-tokenizer": "^3.0.3",
+        "lru-cache": "^10.4.3"
+      }
+    },
+    "node_modules/@asamuzakjp/css-color/node_modules/lru-cache": {
+      "version": "10.4.3",
+      "resolved": "https://registry.npmjs.org/lru-cache/-/lru-cache-10.4.3.tgz",
+      "integrity": "sha512-JNAzZcXrCt42VGLuYz0zfAzDfAvJWW6AfYlDBQyDV5DClI2m5sAmK+OIO7s59XfsRsWHp02jAJrRadPRGTt6SQ==",
+      "dev": true,
+      "license": "ISC"
+    },
     "node_modules/@babel/code-frame": {
       "version": "7.29.0",
       "resolved": "https://registry.npmjs.org/@babel/code-frame/-/code-frame-7.29.0.tgz",
       "integrity": "sha512-9NhCeYjq9+3uxgdtp20LSiJXJvN0FeCtNGpJxuMFZ1Kv3cWUNb6DOhJwUvcVCzKGR66cw4njwM6hrJLqgOwbcw==",
       "license": "MIT",
       "dependencies": {
         "@babel/helper-validator-identifier": "^7.28.5",
         "js-tokens": "^4.0.0",
         "picocolors": "^1.1.1"
       },
@@ -2260,20 +2292,92 @@
       "dev": true,
       "license": "MIT",
       "dependencies": {
         "@types/conventional-commits-parser": "^5.0.0",
         "chalk": "^5.3.0"
       },
       "engines": {
         "node": ">=v18"
       }
     },
+    "node_modules/@csstools/color-helpers": {
+      "version": "5.1.0",
+      "resolved": "https://registry.npmjs.org/@csstools/color-helpers/-/color-helpers-5.1.0.tgz",
+      "integrity": "sha512-S11EXWJyy0Mz5SYvRmY8nJYTFFd1LCNV+7cXyAgQtOOuzb4EsgfqDufL+9esx72/eLhsRdGZwaldu/h+E4t4BA==",
+      "dev": true,
+      "funding": [
+        {
+          "type": "github",
+          "url": "https://github.com/sponsors/csstools"
+        },
+        {
+          "type": "opencollective",
+          "url": "https://opencollective.com/csstools"
+        }
+      ],
+      "license": "MIT-0",
+      "engines": {
+        "node": ">=18"
+      }
+    },
+    "node_modules/@csstools/css-calc": {
+      "version": "2.1.4",
+      "resolved": "https://registry.npmjs.org/@csstools/css-calc/-/css-calc-2.1.4.tgz",
+      "integrity": "sha512-3N8oaj+0juUw/1H3YwmDDJXCgTB1gKU6Hc/bB502u9zR0q2vd786XJH9QfrKIEgFlZmhZiq6epXl4rHqhzsIgQ==",
+      "dev": true,
+      "funding": [
+        {
+          "type": "github",
+          "url": "https://github.com/sponsors/csstools"
+        },
+        {
+          "type": "opencollective",
+          "url": "https://opencollective.com/csstools"
+        }
+      ],
+      "license": "MIT",
+      "engines": {
+        "node": ">=18"
+      },
+      "peerDependencies": {
+        "@csstools/css-parser-algorithms": "^3.0.5",
+        "@csstools/css-tokenizer": "^3.0.4"
+      }
+    },
+    "node_modules/@csstools/css-color-parser": {
+      "version": "3.1.0",
+      "resolved": "https://registry.npmjs.org/@csstools/css-color-parser/-/css-color-parser-3.1.0.tgz",
+      "integrity": "sha512-nbtKwh3a6xNVIp/VRuXV64yTKnb1IjTAEEh3irzS+HkKjAOYLTGNb9pmVNntZ8iVBHcWDA2Dof0QtPgFI1BaTA==",
+      "dev": true,
+      "funding": [
+        {
+          "type": "github",
+          "url": "https://github.com/sponsors/csstools"
+        },
+        {
+          "type": "opencollective",
+          "url": "https://opencollective.com/csstools"
+        }
+      ],
+      "license": "MIT",
+      "dependencies": {
+        "@csstools/color-helpers": "^5.1.0",
+        "@csstools/css-calc": "^2.1.4"
+      },
+      "engines": {
+        "node": ">=18"
+      },
+      "peerDependencies": {
+        "@csstools/css-parser-algorithms": "^3.0.5",
+        "@csstools/css-tokenizer": "^3.0.4"
+      }
+    },
     "node_modules/@csstools/css-parser-algorithms": {
       "version": "3.0.5",
       "resolved": "https://registry.npmjs.org/@csstools/css-parser-algorithms/-/css-parser-algorithms-3.0.5.tgz",
       "integrity": "sha512-DaDeUkXZKjdGhgYaHNJTV9pV7Y9B3b644jCLs9Upc3VeNGg6LWARAT6O+Q+/COo+2gg/bM5rhpMAtf70WqfBdQ==",
       "dev": true,
       "funding": [
         {
           "type": "github",
           "url": "https://github.com/sponsors/csstools"
         },
@@ -2669,52 +2773,103 @@
       ],
       "license": "MIT",
       "optional": true,
       "os": [
         "linux"
       ],
       "engines": {
         "node": ">=12"
       }
     },
+    "node_modules/@esbuild/netbsd-arm64": {
+      "version": "0.28.2",
+      "resolved": "https://registry.npmjs.org/@esbuild/netbsd-arm64/-/netbsd-arm64-0.28.2.tgz",
+      "integrity": "sha512-sSATRjPeDBg3pdgHoQfoYBob11Kk1FGa9lui5RIHZCoCkJa9QKlvl3/vKz2usCmYYjs7ymJR/2Nnsqe+Hjt5nw==",
+      "cpu": [
+        "arm64"
+      ],
+      "dev": true,
+      "license": "MIT",
+      "optional": true,
+      "os": [
+        "netbsd"
+      ],
+      "engines": {
+        "node": ">=18"
+      }
+    },
     "node_modules/@esbuild/netbsd-x64": {
       "version": "0.21.5",
       "resolved": "https://registry.npmjs.org/@esbuild/netbsd-x64/-/netbsd-x64-0.21.5.tgz",
       "integrity": "sha512-Woi2MXzXjMULccIwMnLciyZH4nCIMpWQAs049KEeMvOcNADVxo0UBIQPfSmxB3CWKedngg7sWZdLvLczpe0tLg==",
       "cpu": [
         "x64"
       ],
       "license": "MIT",
       "optional": true,
       "os": [
         "netbsd"
       ],
       "engines": {
         "node": ">=12"
       }
     },
+    "node_modules/@esbuild/openbsd-arm64": {
+      "version": "0.28.2",
+      "resolved": "https://registry.npmjs.org/@esbuild/openbsd-arm64/-/openbsd-arm64-0.28.2.tgz",
+      "integrity": "sha512-AL2qJILH7lNjrDmCQDvdxMfAUIv8KMNZOvrwAQ8i8//ntL9FflhOyMJ8OZSMBb8/AWXe3/5v5S20y3zCoZWKoQ==",
+      "cpu": [
+        "arm64"
+      ],
+      "dev": true,
+      "license": "MIT",
+      "optional": true,
+      "os": [
+        "openbsd"
+      ],
+      "engines": {
+        "node": ">=18"
+      }
+    },
     "node_modules/@esbuild/openbsd-x64": {
       "version": "0.21.5",
       "resolved": "https://registry.npmjs.org/@esbuild/openbsd-x64/-/openbsd-x64-0.21.5.tgz",
       "integrity": "sha512-HLNNw99xsvx12lFBUwoT8EVCsSvRNDVxNpjZ7bPn947b8gJPzeHWyNVhFsaerc0n3TsbOINvRP2byTZ5LKezow==",
       "cpu": [
         "x64"
       ],
       "license": "MIT",
       "optional": true,
       "os": [
         "openbsd"
       ],
       "engines": {
         "node": ">=12"
       }
     },
+    "node_modules/@esbuild/openharmony-arm64": {
+      "version": "0.28.2",
+      "resolved": "https://registry.npmjs.org/@esbuild/openharmony-arm64/-/openharmony-arm64-0.28.2.tgz",
+      "integrity": "sha512-WkhYDmpTjLvGlScA1rwjRUmhl4k8oXR3cIbtqWmELgU/dFeHHlEllxDvdWcNJV9rbzCexB5vz8gtNewWLgCT7Q==",
+      "cpu": [
+        "arm64"
+      ],
+      "dev": true,
+      "license": "MIT",
+      "optional": true,
+      "os": [
+        "openharmony"
+      ],
+      "engines": {
+        "node": ">=18"
+      }
+    },
     "node_modules/@esbuild/sunos-x64": {
       "version": "0.21.5",
       "resolved": "https://registry.npmjs.org/@esbuild/sunos-x64/-/sunos-x64-0.21.5.tgz",
       "integrity": "sha512-6+gjmFpfy0BHU5Tpptkuh8+uw3mnrvgs+dSPQXQOv3ekbordwnzTVEb4qnIvQcYXq6gzkyTnoZ9dZG+D4garKg==",
       "cpu": [
         "x64"
       ],
       "license": "MIT",
       "optional": true,
       "os": [
@@ -3540,21 +3695,21 @@
       "integrity": "sha512-bRISgCIjP20/tbWSPWMEi54QVPRZExkuD9lJL+UIxUKtwVJA8wW1Trb1jMs1RFXo1CBTNZ/5hpC9QvmKWdopKw==",
       "license": "MIT",
       "engines": {
         "node": ">=6.0.0"
       }
     },
     "node_modules/@jridgewell/source-map": {
       "version": "0.3.11",
       "resolved": "https://registry.npmjs.org/@jridgewell/source-map/-/source-map-0.3.11.tgz",
       "integrity": "sha512-ZMp1V8ZFcPG5dIWnQLr3NSI1MiCU7UETdS/A0G8V/XWHvJv3ZsFqutJn1Y5RPmAPX6F3BiE397OqveU/9NCuIA==",
-      "devOptional": true,
+      "dev": true,
       "license": "MIT",
       "dependencies": {
         "@jridgewell/gen-mapping": "^0.3.5",
         "@jridgewell/trace-mapping": "^0.3.25"
       }
     },
     "node_modules/@jridgewell/sourcemap-codec": {
       "version": "1.5.5",
       "resolved": "https://registry.npmjs.org/@jridgewell/sourcemap-codec/-/sourcemap-codec-1.5.5.tgz",
       "integrity": "sha512-cYQ9310grqxueWbl+WuIUIaiUaDcj7WOq5fVhEljNVgRfOUhY9fy2zTvfoqWsnebh8Sl70VScFbICvJnLKB0Og==",
@@ -3587,20 +3742,37 @@
         "keyv": "^5.6.0"
       }
     },
     "node_modules/@keyv/serialize": {
       "version": "1.1.1",
       "resolved": "https://registry.npmjs.org/@keyv/serialize/-/serialize-1.1.1.tgz",
       "integrity": "sha512-dXn3FZhPv0US+7dtJsIi2R+c7qWYiReoEh5zUntWCf4oSpMNib8FDhSoed6m3QyZdx5hK7iLFkYk3rNxwt8vTA==",
       "dev": true,
       "license": "MIT"
     },
+    "node_modules/@napi-rs/lzma-linux-x64-gnu": {
+      "version": "1.5.1",
+      "resolved": "https://registry.npmjs.org/@napi-rs/lzma-linux-x64-gnu/-/lzma-linux-x64-gnu-1.5.1.tgz",
+      "integrity": "sha512-oTXEIha4SsuXdTA4Iyskj0kpdx2yVXdhd75c2v3xGrHFfVMsbhTPZU/nMPL4sWKo4pBHm3aucLaqGlF696dTyQ==",
+      "cpu": [
+        "x64"
+      ],
+      "dev": true,
+      "license": "MIT",
+      "optional": true,
+      "os": [
+        "linux"
+      ],
+      "engines": {
+        "node": "^22.20 || ^24.12 || >=25"
+      }
+    },
     "node_modules/@napi-rs/triples": {
       "version": "1.2.0",
       "resolved": "https://registry.npmjs.org/@napi-rs/triples/-/triples-1.2.0.tgz",
       "integrity": "sha512-HAPjR3bnCsdXBsATpDIP5WCrw0JcACwhhrwIAQhiR46n+jm+a2F8kBsfseAuWtSyQ+H3Yebt2k43B5dy+04yMA==",
       "dev": true,
       "license": "MIT"
     },
     "node_modules/@nicolo-ribaudo/eslint-scope-5-internals": {
       "version": "5.1.1-v1",
       "resolved": "https://registry.npmjs.org/@nicolo-ribaudo/eslint-scope-5-internals/-/eslint-scope-5-internals-5.1.1-v1.tgz",
@@ -4236,15655 +4408,18048 @@
       },
       "peerDependencies": {
         "rollup": "^1.20.0||^2.0.0||^3.0.0||^4.0.0"
       },
       "peerDependenciesMeta": {
         "rollup": {
           "optional": true
         }
       }
     },
-    "node_modules/@rtsao/scc": {
-      "version": "1.1.0",
-      "resolved": "https://registry.npmjs.org/@rtsao/scc/-/scc-1.1.0.tgz",
-      "integrity": "sha512-zt6OdqaDoOnJ1ZYsCYGt9YmWzDXl4vQdKTyJev62gFhRGKdx7mcT54V9KIjg+d2wi9EXsPvAPKe7i7WjfVWB8g==",
-      "dev": true,
-      "license": "MIT"
-    },
-    "node_modules/@sideway/address": {
-      "version": "4.1.5",
-      "resolved": "https://registry.npmjs.org/@sideway/address/-/address-4.1.5.tgz",
-      "integrity": "sha512-IqO/DUQHUkPeixNQ8n0JA6102hT9CmaljNTPmQ1u8MEhBo/R4Q8eKLN/vGZxuebwOroDB4cbpjheD4+/sKFK4Q==",
-      "license": "BSD-3-Clause",
-      "dependencies": {
-        "@hapi/hoek": "^9.0.0"
-      }
-    },
-    "node_modules/@sideway/formula": {
-      "version": "3.0.1",
-      "resolved": "https://registry.npmjs.org/@sideway/formula/-/formula-3.0.1.tgz",
-      "integrity": "sha512-/poHZJJVjx3L+zVD6g9KgHfYnb443oi7wLu/XKojDviHy6HOEOA6z1Trk5aR1dGcmPenJEgb2sK2I80LeS3MIg==",
-      "license": "BSD-3-Clause"
-    },
-    "node_modules/@sideway/pinpoint": {
-      "version": "2.0.0",
-      "resolved": "https://registry.npmjs.org/@sideway/pinpoint/-/pinpoint-2.0.0.tgz",
-      "integrity": "sha512-RNiOoTPkptFtSVzQevY/yWtZwf/RxyVnPy/OcA9HBM3MlGDnBEYL5B41H0MTn0Uec8Hi+2qUtTfG2WWZBmMejQ==",
-      "license": "BSD-3-Clause"
-    },
-    "node_modules/@sindresorhus/is": {
-      "version": "0.7.0",
-      "resolved": "https://registry.npmjs.org/@sindresorhus/is/-/is-0.7.0.tgz",
-      "integrity": "sha512-ONhaKPIufzzrlNbqtWFFd+jlnemX6lJAgq9ZeiZtS7I1PIf/la7CW4m83rTXRnVnsMbW2k56pGYu7AUFJD9Pow==",
+    "node_modules/@rollup/rollup-android-arm-eabi": {
+      "version": "4.62.4",
+      "resolved": "https://registry.npmjs.org/@rollup/rollup-android-arm-eabi/-/rollup-android-arm-eabi-4.62.4.tgz",
+      "integrity": "sha512-RrPokAb7dmbxFoeO3TloqHyOjgye8RkBhSqmp4aJMIex4c9r46ZstPnleDQOq1t46VOVjwIuwNogIqbodV1Vvg==",
+      "cpu": [
+        "arm"
+      ],
       "dev": true,
       "license": "MIT",
-      "engines": {
-        "node": ">=4"
-      }
+      "optional": true,
+      "os": [
+        "android"
+      ]
     },
-    "node_modules/@stencil/core": {
-      "version": "2.22.3",
-      "resolved": "https://registry.npmjs.org/@stencil/core/-/core-2.22.3.tgz",
-      "integrity": "sha512-kmVA0M/HojwsfkeHsifvHVIYe4l5tin7J5+DLgtl8h6WWfiMClND5K3ifCXXI2ETDNKiEk21p6jql3Fx9o2rng==",
+    "node_modules/@rollup/rollup-android-arm64": {
+      "version": "4.62.4",
+      "resolved": "https://registry.npmjs.org/@rollup/rollup-android-arm64/-/rollup-android-arm64-4.62.4.tgz",
+      "integrity": "sha512-JKuJc+pnpks2pjy7L/N3v/cAkZxYlnmuZoD840ldbMI5KDbC4iO9NKwPKYdjYFCMAIIlBzYSFHxIJVYzRo2/8A==",
+      "cpu": [
+        "arm64"
+      ],
+      "dev": true,
       "license": "MIT",
-      "bin": {
-        "stencil": "bin/stencil"
-      },
-      "engines": {
-        "node": ">=12.10.0",
-        "npm": ">=6.0.0"
-      }
-    },
-    "node_modules/@swc/core": {
-      "version": "1.3.96",
-      "resolved": "https://registry.npmjs.org/@swc/core/-/core-1.3.96.tgz",
-      "integrity": "sha512-zwE3TLgoZwJfQygdv2SdCK9mRLYluwDOM53I+dT6Z5ZvrgVENmY3txvWDvduzkV+/8IuvrRbVezMpxcojadRdQ==",
-      "hasInstallScript": true,
-      "license": "Apache-2.0",
-      "dependencies": {
-        "@swc/counter": "^0.1.1",
-        "@swc/types": "^0.1.5"
-      },
-      "engines": {
-        "node": ">=10"
-      },
-      "funding": {
-        "type": "opencollective",
-        "url": "https://opencollective.com/swc"
-      },
-      "optionalDependencies": {
-        "@swc/core-darwin-arm64": "1.3.96",
-        "@swc/core-darwin-x64": "1.3.96",
-        "@swc/core-linux-arm-gnueabihf": "1.3.96",
-        "@swc/core-linux-arm64-gnu": "1.3.96",
-        "@swc/core-linux-arm64-musl": "1.3.96",
-        "@swc/core-linux-x64-gnu": "1.3.96",
-        "@swc/core-linux-x64-musl": "1.3.96",
-        "@swc/core-win32-arm64-msvc": "1.3.96",
-        "@swc/core-win32-ia32-msvc": "1.3.96",
-        "@swc/core-win32-x64-msvc": "1.3.96"
-      },
-      "peerDependencies": {
-        "@swc/helpers": "^0.5.0"
-      },
-      "peerDependenciesMeta": {
-        "@swc/helpers": {
-          "optional": true
-        }
-      }
+      "optional": true,
+      "os": [
+        "android"
+      ]
     },
-    "node_modules/@swc/core-darwin-arm64": {
-      "version": "1.3.96",
-      "resolved": "https://registry.npmjs.org/@swc/core-darwin-arm64/-/core-darwin-arm64-1.3.96.tgz",
-      "integrity": "sha512-8hzgXYVd85hfPh6mJ9yrG26rhgzCmcLO0h1TIl8U31hwmTbfZLzRitFQ/kqMJNbIBCwmNH1RU2QcJnL3d7f69A==",
+    "node_modules/@rollup/rollup-darwin-arm64": {
+      "version": "4.62.4",
+      "resolved": "https://registry.npmjs.org/@rollup/rollup-darwin-arm64/-/rollup-darwin-arm64-4.62.4.tgz",
+      "integrity": "sha512-krw5uS2STmvJ02x0uTXHbqQNuz+9eZ1iw+qXk9dmW2gvV4jV7O2hEoOnuhFrpOPiel1mBFtqbxYZZtC46hXLOw==",
       "cpu": [
         "arm64"
       ],
-      "license": "Apache-2.0 AND MIT",
+      "dev": true,
+      "license": "MIT",
       "optional": true,
       "os": [
         "darwin"
-      ],
-      "engines": {
-        "node": ">=10"
-      }
+      ]
     },
-    "node_modules/@swc/core-darwin-x64": {
-      "version": "1.3.96",
-      "resolved": "https://registry.npmjs.org/@swc/core-darwin-x64/-/core-darwin-x64-1.3.96.tgz",
-      "integrity": "sha512-mFp9GFfuPg+43vlAdQZl0WZpZSE8sEzqL7sr/7Reul5McUHP0BaLsEzwjvD035ESfkY8GBZdLpMinblIbFNljQ==",
+    "node_modules/@rollup/rollup-darwin-x64": {
+      "version": "4.62.4",
+      "resolved": "https://registry.npmjs.org/@rollup/rollup-darwin-x64/-/rollup-darwin-x64-4.62.4.tgz",
+      "integrity": "sha512-wsTxtgApb4PrOsNJIm0FZ1h3WvCC+k9uxLJ4ad75hgoS4NiRes2SoJFlDAyMwiUY8IssDqGcHbXuN0sx1tfF1A==",
       "cpu": [
         "x64"
       ],
-      "license": "Apache-2.0 AND MIT",
+      "dev": true,
+      "license": "MIT",
       "optional": true,
       "os": [
         "darwin"
-      ],
-      "engines": {
-        "node": ">=10"
-      }
+      ]
     },
-    "node_modules/@swc/core-linux-arm-gnueabihf": {
-      "version": "1.3.96",
-      "resolved": "https://registry.npmjs.org/@swc/core-linux-arm-gnueabihf/-/core-linux-arm-gnueabihf-1.3.96.tgz",
-      "integrity": "sha512-8UEKkYJP4c8YzYIY/LlbSo8z5Obj4hqcv/fUTHiEePiGsOddgGf7AWjh56u7IoN/0uEmEro59nc1ChFXqXSGyg==",
+    "node_modules/@rollup/rollup-freebsd-arm64": {
+      "version": "4.62.4",
+      "resolved": "https://registry.npmjs.org/@rollup/rollup-freebsd-arm64/-/rollup-freebsd-arm64-4.62.4.tgz",
+      "integrity": "sha512-GUOnQlyZe3yAXhWOtOMsn5Qkrv5E5mZXa0thbARWi5Ei2szlVXJFQhddZ4HbAzh8q92w5twp+CQvs/eFanz9YQ==",
       "cpu": [
-        "arm"
+        "arm64"
       ],
-      "license": "Apache-2.0 AND MIT",
+      "dev": true,
+      "license": "MIT",
       "optional": true,
       "os": [
-        "linux"
-      ],
-      "engines": {
-        "node": ">=10"
-      }
+        "freebsd"
+      ]
     },
-    "node_modules/@swc/core-linux-arm64-gnu": {
-      "version": "1.3.96",
-      "resolved": "https://registry.npmjs.org/@swc/core-linux-arm64-gnu/-/core-linux-arm64-gnu-1.3.96.tgz",
-      "integrity": "sha512-c/IiJ0s1y3Ymm2BTpyC/xr6gOvoqAVETrivVXHq68xgNms95lu…252144 tokens truncated…ncies": {
-        "emoji-regex": "^8.0.0",
-        "is-fullwidth-code-point": "^3.0.0",
-        "strip-ansi": "^6.0.1"
+        "is-number": "^7.0.0"
       },
       "engines": {
-        "node": ">=8"
+        "node": ">=8.0"
       }
     },
-    "node_modules/string-width-cjs": {
-      "name": "string-width",
-      "version": "4.2.3",
-      "resolved": "https://registry.npmjs.org/string-width/-/string-width-4.2.3.tgz",
-      "integrity": "sha512-wKyQRQpjJ0sIp62ErSZdGsjMJWsap5oRNihHhu6G7JVO/9jIB6UyevL+tXuOqrng8j/cxKTWyWUwvSTriiZz/g==",
+    "node_modules/toposort": {
+      "version": "2.0.2",
+      "resolved": "https://registry.npmjs.org/toposort/-/toposort-2.0.2.tgz",
+      "integrity": "sha512-0a5EOkAUp8D4moMi2W8ZF8jcga7BgZd91O/yabJCFY8az+XSzeGyTKs0Aoo897iV1Nj6guFq8orWDS96z91oGg==",
+      "license": "MIT"
+    },
+    "node_modules/tough-cookie": {
+      "version": "5.1.2",
+      "resolved": "https://registry.npmjs.org/tough-cookie/-/tough-cookie-5.1.2.tgz",
+      "integrity": "sha512-FVDYdxtnj0G6Qm/DhNPSb8Ju59ULcup3tuJxkFb5K8Bv2pUXILbf0xZWU8PX8Ov19OXljbUyveOFwRMwkXzO+A==",
       "dev": true,
-      "license": "MIT",
+      "license": "BSD-3-Clause",
       "dependencies": {
-        "emoji-regex": "^8.0.0",
-        "is-fullwidth-code-point": "^3.0.0",
-        "strip-ansi": "^6.0.1"
+        "tldts": "^6.1.32"
       },
       "engines": {
-        "node": ">=8"
+        "node": ">=16"
       }
     },
-    "node_modules/string-width-cjs/node_modules/is-fullwidth-code-point": {
-      "version": "3.0.0",
-      "resolved": "https://registry.npmjs.org/is-fullwidth-code-point/-/is-fullwidth-code-point-3.0.0.tgz",
-      "integrity": "sha512-zymm5+u+sCsSWyD9qNaejV3DFvhCKclKdizYaJUuHA83RLjb7nSuGnddCHGv0hk+KY7BMAlsWeK4Ueg6EV6XQg==",
+    "node_modules/tr46": {
+      "version": "5.1.1",
+      "resolved": "https://registry.npmjs.org/tr46/-/tr46-5.1.1.tgz",
+      "integrity": "sha512-hdF5ZgjTqgAntKkklYw0R03MG2x/bSzTtkxmIRw/sTNV8YXsCJ1tfLAX23lhxhHJlEf3CRCOCGGWw3vI3GaSPw==",
       "dev": true,
       "license": "MIT",
+      "dependencies": {
+        "punycode": "^2.3.1"
+      },
       "engines": {
-        "node": ">=8"
+        "node": ">=18"
       }
     },
-    "node_modules/string-width/node_modules/is-fullwidth-code-point": {
-      "version": "3.0.0",
-      "resolved": "https://registry.npmjs.org/is-fullwidth-code-point/-/is-fullwidth-code-point-3.0.0.tgz",
-      "integrity": "sha512-zymm5+u+sCsSWyD9qNaejV3DFvhCKclKdizYaJUuHA83RLjb7nSuGnddCHGv0hk+KY7BMAlsWeK4Ueg6EV6XQg==",
+    "node_modules/trim-repeated": {
+      "version": "1.0.0",
+      "resolved": "https://registry.npmjs.org/trim-repeated/-/trim-repeated-1.0.0.tgz",
+      "integrity": "sha512-pkonvlKk8/ZuR0D5tLW8ljt5I8kmxp2XKymhepUeOdCEfKpZaktSArkLHZt76OB1ZvO9bssUsDty4SWhLvZpLg==",
       "dev": true,
       "license": "MIT",
+      "dependencies": {
+        "escape-string-regexp": "^1.0.2"
+      },
       "engines": {
-        "node": ">=8"
+        "node": ">=0.10.0"
       }
     },
-    "node_modules/string.prototype.matchall": {
-      "version": "4.0.12",
-      "resolved": "https://registry.npmjs.org/string.prototype.matchall/-/string.prototype.matchall-4.0.12.tgz",
-      "integrity": "sha512-6CC9uyBL+/48dYizRf7H7VAYCMCNTBeM78x/VTUe9bFEaxBepPJDa1Ow99LqI/1yF7kuy7Q3cQsYMrcjGUcskA==",
+    "node_modules/trim-repeated/node_modules/escape-string-regexp": {
+      "version": "1.0.5",
+      "resolved": "https://registry.npmjs.org/escape-string-regexp/-/escape-string-regexp-1.0.5.tgz",
+      "integrity": "sha512-vbRorB5FUQWvla16U8R/qgaFIya2qGzwDrNmCZuYKrbdSUMG6I1ZCGQRefkRVhuOkIGVne7BQ35DSfo1qvJqFg==",
       "dev": true,
       "license": "MIT",
-      "dependencies": {
-        "call-bind": "^1.0.8",
-        "call-bound": "^1.0.3",
-        "define-properties": "^1.2.1",
-        "es-abstract": "^1.23.6",
-        "es-errors": "^1.3.0",
-        "es-object-atoms": "^1.0.0",
-        "get-intrinsic": "^1.2.6",
-        "gopd": "^1.2.0",
-        "has-symbols": "^1.1.0",
-        "internal-slot": "^1.1.0",
-        "regexp.prototype.flags": "^1.5.3",
-        "set-function-name": "^2.0.2",
-        "side-channel": "^1.1.0"
-      },
       "engines": {
-        "node": ">= 0.4"
-      },
-      "funding": {
-        "url": "https://github.com/sponsors/ljharb"
+        "node": ">=0.8.0"
       }
     },
-    "node_modules/string.prototype.repeat": {
-      "version": "1.0.0",
-      "resolved": "https://registry.npmjs.org/string.prototype.repeat/-/string.prototype.repeat-1.0.0.tgz",
-      "integrity": "sha512-0u/TldDbKD8bFCQ/4f5+mNRrXwZ8hg2w7ZR8wa16e8z9XpePWl3eGEcUD0OXpEH/VJH/2G3gjUtR3ZOiBe2S/w==",
+    "node_modules/ts-api-utils": {
+      "version": "1.4.3",
+      "resolved": "https://registry.npmjs.org/ts-api-utils/-/ts-api-utils-1.4.3.tgz",
+      "integrity": "sha512-i3eMG77UTMD0hZhgRS562pv83RC6ukSAC2GMNWc+9dieh/+jDM5u5YG+NHX6VNDRHQcHwmsTHctP9LhbC3WxVw==",
       "dev": true,
       "license": "MIT",
-      "dependencies": {
-        "define-properties": "^1.1.3",
-        "es-abstract": "^1.17.5"
+      "engines": {
+        "node": ">=16"
+      },
+      "peerDependencies": {
+        "typescript": ">=4.2.0"
       }
     },
-    "node_modules/string.prototype.trim": {
-      "version": "1.2.10",
-      "resolved": "https://registry.npmjs.org/string.prototype.trim/-/string.prototype.trim-1.2.10.tgz",
-      "integrity": "sha512-Rs66F0P/1kedk5lyYyH9uBzuiI/kNRmwJAR9quK6VOtIpZ2G+hMZd+HQbbv25MgCA6gEffoMZYxlTod4WcdrKA==",
+    "node_modules/ts-morph": {
+      "version": "26.0.0",
+      "resolved": "https://registry.npmjs.org/ts-morph/-/ts-morph-26.0.0.tgz",
+      "integrity": "sha512-ztMO++owQnz8c/gIENcM9XfCEzgoGphTv+nKpYNM1bgsdOVC/jRZuEBf6N+mLLDNg68Kl+GgUZfOySaRiG1/Ug==",
       "dev": true,
       "license": "MIT",
       "dependencies": {
-        "call-bind": "^1.0.8",
-        "call-bound": "^1.0.2",
-        "define-data-property": "^1.1.4",
-        "define-properties": "^1.2.1",
-        "es-abstract": "^1.23.5",
-        "es-object-atoms": "^1.0.0",
-        "has-property-descriptors": "^1.0.2"
-      },
-      "engines": {
-        "node": ">= 0.4"
-      },
-      "funding": {
-        "url": "https://github.com/sponsors/ljharb"
+        "@ts-morph/common": "~0.27.0",
+        "code-block-writer": "^13.0.3"
       }
     },
-    "node_modules/string.prototype.trimend": {
-      "version": "1.0.9",
-      "resolved": "https://registry.npmjs.org/string.prototype.trimend/-/string.prototype.trimend-1.0.9.tgz",
-      "integrity": "sha512-G7Ok5C6E/j4SGfyLCloXTrngQIQU3PWtXGst3yM7Bea9FRURf1S42ZHlZZtsNque2FN2PoUhfZXYLNWwEr4dLQ==",
+    "node_modules/tsconfig-paths": {
+      "version": "3.15.0",
+      "resolved": "https://registry.npmjs.org/tsconfig-paths/-/tsconfig-paths-3.15.0.tgz",
+      "integrity": "sha512-2Ac2RgzDe/cn48GvOe3M+o82pEFewD3UPbyoUHHdKasHwJKjds4fLXWf/Ux5kATBKN20oaFGu+jbElp1pos0mg==",
       "dev": true,
       "license": "MIT",
       "dependencies": {
-        "call-bind": "^1.0.8",
-        "call-bound": "^1.0.2",
-        "define-properties": "^1.2.1",
-        "es-object-atoms": "^1.0.0"
-      },
-      "engines": {
-        "node": ">= 0.4"
-      },
-      "funding": {
-        "url": "https://github.com/sponsors/ljharb"
+        "@types/json5": "^0.0.29",
+        "json5": "^1.0.2",
+        "minimist": "^1.2.6",
+        "strip-bom": "^3.0.0"
       }
     },
-    "node_modules/string.prototype.trimstart": {
-      "version": "1.0.8",
-      "resolved": "https://registry.npmjs.org/string.prototype.trimstart/-/string.prototype.trimstart-1.0.8.tgz",
-      "integrity": "sha512-UXSH262CSZY1tfu3G3Secr6uGLCFVPMhIqHjlgCUtCCcgihYc/xKs9djMTMUOb2j1mVSeU8EU6NWc/iQKU6Gfg==",
+    "node_modules/tsconfig-paths/node_modules/json5": {
+      "version": "1.0.2",
+      "resolved": "https://registry.npmjs.org/json5/-/json5-1.0.2.tgz",
+      "integrity": "sha512-g1MWMLBiz8FKi1e4w0UyVL3w+iJceWAFBAaBnnGKOpNa5f8TLktkbre1+s6oICydWAm+HRUGTmI+//xv2hvXYA==",
       "dev": true,
       "license": "MIT",
       "dependencies": {
-        "call-bind": "^1.0.7",
-        "define-properties": "^1.2.1",
-        "es-object-atoms": "^1.0.0"
-      },
-      "engines": {
-        "node": ">= 0.4"
+        "minimist": "^1.2.0"
       },
-      "funding": {
-        "url": "https://github.com/sponsors/ljharb"
+      "bin": {
+        "json5": "lib/cli.js"
       }
     },
-    "node_modules/strip-ansi": {
-      "version": "6.0.1",
-      "resolved": "https://registry.npmjs.org/strip-ansi/-/strip-ansi-6.0.1.tgz",
-      "integrity": "sha512-Y38VPSHcqkFrCpFnQ9vuSXmquuv5oXOKpGeT6aGrr3o3Gc9AlVa6JBfUSOCnbxGGZF+/0ooI7KrPuUSztUdU5A==",
-      "license": "MIT",
+    "node_modules/tslib": {
+      "version": "2.8.1",
+      "resolved": "https://registry.npmjs.org/tslib/-/tslib-2.8.1.tgz",
+      "integrity": "sha512-oJFu94HQb+KVduSUQL7wnpmqnfmLsOA/nAh6b6EH0wCEoK0/mPeXU6c3wKDV83MkOuHPRHtSXKKU99IBazS/2w==",
+      "license": "0BSD"
+    },
+    "node_modules/tunnel-agent": {
+      "version": "0.6.0",
+      "resolved": "https://registry.npmjs.org/tunnel-agent/-/tunnel-agent-0.6.0.tgz",
+      "integrity": "sha512-McnNiV1l8RYeY8tBgEpuodCC1mLUdbSN+CYBL7kJsJNInOP8UjDDEwdk6Mw60vdLLrr5NHKZhMAOSrR2NZuQ+w==",
+      "dev": true,
+      "license": "Apache-2.0",
       "dependencies": {
-        "ansi-regex": "^5.0.1"
+        "safe-buffer": "^5.0.1"
       },
       "engines": {
-        "node": ">=8"
+        "node": "*"
       }
     },
-    "node_modules/strip-ansi-cjs": {
-      "name": "strip-ansi",
-      "version": "6.0.1",
-      "resolved": "https://registry.npmjs.org/strip-ansi/-/strip-ansi-6.0.1.tgz",
-      "integrity": "sha512-Y38VPSHcqkFrCpFnQ9vuSXmquuv5oXOKpGeT6aGrr3o3Gc9AlVa6JBfUSOCnbxGGZF+/0ooI7KrPuUSztUdU5A==",
+    "node_modules/type-check": {
+      "version": "0.4.0",
+      "resolved": "https://registry.npmjs.org/type-check/-/type-check-0.4.0.tgz",
+      "integrity": "sha512-XleUoc9uwGXqjWwXaUTZAmzMcFZ5858QA2vvx1Ur5xIcixXIP+8LnFDgRplU30us6teqdlskFfu+ae4K79Ooew==",
       "dev": true,
       "license": "MIT",
       "dependencies": {
-        "ansi-regex": "^5.0.1"
+        "prelude-ls": "^1.2.1"
       },
       "engines": {
-        "node": ">=8"
+        "node": ">= 0.8.0"
       }
     },
-    "node_modules/strip-bom": {
-      "version": "3.0.0",
-      "resolved": "https://registry.npmjs.org/strip-bom/-/strip-bom-3.0.0.tgz",
-      "integrity": "sha512-vavAMRXOgBVNF6nyEEmL3DBK19iRpDcoIwW+swQ+CbGiu7lju6t+JklA1MHweoWtadgt4ISVUsXLyDq34ddcwA==",
-      "dev": true,
-      "license": "MIT",
+    "node_modules/type-fest": {
+      "version": "0.21.3",
+      "resolved": "https://registry.npmjs.org/type-fest/-/type-fest-0.21.3.tgz",
+      "integrity": "sha512-t0rzBq87m3fVcduHDUFhKmyyX+9eo6WQjZvf51Ea/M0Q7+T374Jp1aUiyUl0GKxp8M/OETVHSDvmkyPgvX+X2w==",
+      "license": "(MIT OR CC0-1.0)",
       "engines": {
-        "node": ">=4"
+        "node": ">=10"
+      },
+      "funding": {
+        "url": "https://github.com/sponsors/sindresorhus"
       }
     },
-    "node_modules/strip-dirs": {
-      "version": "2.1.0",
-      "resolved": "https://registry.npmjs.org/strip-dirs/-/strip-dirs-2.1.0.tgz",
-      "integrity": "sha512-JOCxOeKLm2CAS73y/U4ZeZPTkE+gNVCzKt7Eox84Iej1LT/2pTWYpZKJuxwQpvX1LiZb1xokNR7RLfuBAa7T3g==",
-      "dev": true,
+    "node_modules/typed-array-buffer": {
+      "version": "1.0.3",
+      "resolved": "https://registry.npmjs.org/typed-array-buffer/-/typed-array-buffer-1.0.3.tgz",
+      "integrity": "sha512-nAYYwfY3qnzX30IkA6AQZjVbtK6duGontcQm1WSG1MD94YLqK0515GNApXkoxKOWMusVssAHWLh9SeaoefYFGw==",
       "license": "MIT",
       "dependencies": {
-        "is-natural-number": "^4.0.1"
-      }
-    },
-    "node_modules/strip-eof": {
-      "version": "1.0.0",
-      "resolved": "https://registry.npmjs.org/strip-eof/-/strip-eof-1.0.0.tgz",
-      "integrity": "sha512-7FCwGGmx8mD5xQd3RPUvnSpUXHM3BWuzjtpD4TXsfcZ9EL4azvVVUscFYwD9nx8Kh+uCBC00XBtAykoMHwTh8Q==",
-      "license": "MIT",
+        "call-bound": "^1.0.3",
+        "es-errors": "^1.3.0",
+        "is-typed-array": "^1.1.14"
+      },
       "engines": {
-        "node": ">=0.10.0"
+        "node": ">= 0.4"
       }
     },
-    "node_modules/strip-json-comments": {
-      "version": "3.1.1",
-      "resolved": "https://registry.npmjs.org/strip-json-comments/-/strip-json-comments-3.1.1.tgz",
-      "integrity": "sha512-6fPc+R4ihwqP6N/aIv2f1gMH8lOVtWQHoqC4yK6oSDVVocumAsfCqjkXnqiYMhmMwS/mEHLp7Vehlt3ql6lEig==",
+    "node_modules/typed-array-byte-length": {
+      "version": "1.0.3",
+      "resolved": "https://registry.npmjs.org/typed-array-byte-length/-/typed-array-byte-length-1.0.3.tgz",
+      "integrity": "sha512-BaXgOuIxz8n8pIq3e7Atg/7s+DpiYrxn4vdot3w9KbnBhcRQq6o3xemQdIfynqSeXeDrF32x+WvfzmOjPiY9lg==",
       "dev": true,
       "license": "MIT",
+      "dependencies": {
+        "call-bind": "^1.0.8",
+        "for-each": "^0.3.3",
+        "gopd": "^1.2.0",
+        "has-proto": "^1.2.0",
+        "is-typed-array": "^1.1.14"
+      },
       "engines": {
-        "node": ">=8"
+        "node": ">= 0.4"
       },
       "funding": {
-        "url": "https://github.com/sponsors/sindresorhus"
+        "url": "https://github.com/sponsors/ljharb"
       }
     },
-    "node_modules/strip-outer": {
-      "version": "1.0.1",
-      "resolved": "https://registry.npmjs.org/strip-outer/-/strip-outer-1.0.1.tgz",
-      "integrity": "sha512-k55yxKHwaXnpYGsOzg4Vl8+tDrWylxDEpknGjhTiZB8dFRU5rTo9CAzeycivxV3s+zlTKwrs6WxMxR95n26kwg==",
+    "node_modules/typed-array-byte-offset": {
+      "version": "1.0.4",
+      "resolved": "https://registry.npmjs.org/typed-array-byte-offset/-/typed-array-byte-offset-1.0.4.tgz",
+      "integrity": "sha512-bTlAFB/FBYMcuX81gbL4OcpH5PmlFHqlCCpAl8AlEzMz5k53oNDvN8p1PNOWLEmI2x4orp3raOFB51tv9X+MFQ==",
       "dev": true,
       "license": "MIT",
       "dependencies": {
-        "escape-string-regexp": "^1.0.2"
+        "available-typed-arrays": "^1.0.7",
+        "call-bind": "^1.0.8",
+        "for-each": "^0.3.3",
+        "gopd": "^1.2.0",
+        "has-proto": "^1.2.0",
+        "is-typed-array": "^1.1.15",
+        "reflect.getprototypeof": "^1.0.9"
       },
       "engines": {
-        "node": ">=0.10.0"
+        "node": ">= 0.4"
+      },
+      "funding": {
+        "url": "https://github.com/sponsors/ljharb"
       }
     },
-    "node_modules/strip-outer/node_modules/escape-string-regexp": {
-      "version": "1.0.5",
-      "resolved": "https://registry.npmjs.org/escape-string-regexp/-/escape-string-regexp-1.0.5.tgz",
-      "integrity": "sha512-vbRorB5FUQWvla16U8R/qgaFIya2qGzwDrNmCZuYKrbdSUMG6I1ZCGQRefkRVhuOkIGVne7BQ35DSfo1qvJqFg==",
+    "node_modules/typed-array-length": {
+      "version": "1.0.7",
+      "resolved": "https://registry.npmjs.org/typed-array-length/-/typed-array-length-1.0.7.tgz",
+      "integrity": "sha512-3KS2b+kL7fsuk/eJZ7EQdnEmQoaho/r6KUef7hxvltNA5DR8NAUM+8wJMbJyZ4G9/7i3v5zPBIMN5aybAh2/Jg==",
       "dev": true,
       "license": "MIT",
+      "dependencies": {
+        "call-bind": "^1.0.7",
+        "for-each": "^0.3.3",
+        "gopd": "^1.0.1",
+        "is-typed-array": "^1.1.13",
+        "possible-typed-array-names": "^1.0.0",
+        "reflect.getprototypeof": "^1.0.6"
+      },
       "engines": {
-        "node": ">=0.8.0"
+        "node": ">= 0.4"
+      },
+      "funding": {
+        "url": "https://github.com/sponsors/ljharb"
       }
     },
-    "node_modules/stylelint": {
-      "version": "16.26.1",
-      "resolved": "https://registry.npmjs.org/stylelint/-/stylelint-16.26.1.tgz",
-      "integrity": "sha512-v20V59/crfc8sVTAtge0mdafI3AdnzQ2KsWe6v523L4OA1bJO02S7MO2oyXDCS6iWb9ckIPnqAFVItqSBQr7jw==",
+    "node_modules/typedarray": {
+      "version": "0.0.6",
+      "resolved": "https://registry.npmjs.org/typedarray/-/typedarray-0.0.6.tgz",
+      "integrity": "sha512-/aCDEGatGvZ2BIk+HmLf4ifCJFwvKFNb9/JeZPMulfgFracn9QFcAf5GO8B/mweUjSoblS5In0cWhqpfs/5PQA==",
+      "license": "MIT"
+    },
+    "node_modules/typescript": {
+      "version": "5.9.3",
+      "resolved": "https://registry.npmjs.org/typescript/-/typescript-5.9.3.tgz",
+      "integrity": "sha512-jl1vZzPDinLr9eUt3J/t7V6FgNEw9QjvBPdysz9KfQDD41fQrC2Y4vKQdiaUpFT4bXlb1RHhLpp8wtm6M5TgSw==",
       "dev": true,
-      "funding": [
-        {
-          "type": "opencollective",
-          "url": "https://opencollective.com/stylelint"
-        },
-        {
-          "type": "github",
-          "url": "https://github.com/sponsors/stylelint"
-        }
-      ],
-      "license": "MIT",
-      "dependencies": {
-        "@csstools/css-parser-algorithms": "^3.0.5",
-        "@csstools/css-syntax-patches-for-csstree": "^1.0.19",
-        "@csstools/css-tokenizer": "^3.0.4",
-        "@csstools/media-query-list-parser": "^4.0.3",
-        "@csstools/selector-specificity": "^5.0.0",
-        "@dual-bundle/import-meta-resolve": "^4.2.1",
-        "balanced-match": "^2.0.0",
-        "colord": "^2.9.3",
-        "cosmiconfig": "^9.0.0",
-        "css-functions-list": "^3.2.3",
-        "css-tree": "^3.1.0",
-        "debug": "^4.4.3",
-        "fast-glob": "^3.3.3",
-        "fastest-levenshtein": "^1.0.16",
-        "file-entry-cache": "^11.1.1",
-        "global-modules": "^2.0.0",
-        "globby": "^11.1.0",
-        "globjoin": "^0.1.4",
-        "html-tags": "^3.3.1",
-        "ignore": "^7.0.5",
-        "imurmurhash": "^0.1.4",
-        "is-plain-object": "^5.0.0",
-        "known-css-properties": "^0.37.0",
-        "mathml-tag-names": "^2.1.3",
-        "meow": "^13.2.0",
-        "micromatch": "^4.0.8",
-        "normalize-path": "^3.0.0",
-        "picocolors": "^1.1.1",
-        "postcss": "^8.5.6",
-        "postcss-resolve-nested-selector": "^0.1.6",
-        "postcss-safe-parser": "^7.0.1",
-        "postcss-selector-parser": "^7.1.0",
-        "postcss-value-parser": "^4.2.0",
-        "resolve-from": "^5.0.0",
-        "string-width": "^4.2.3",
-        "supports-hyperlinks": "^3.2.0",
-        "svg-tags": "^1.0.0",
-        "table": "^6.9.0",
-        "write-file-atomic": "^5.0.1"
-      },
+      "license": "Apache-2.0",
       "bin": {
-        "stylelint": "bin/stylelint.mjs"
+        "tsc": "bin/tsc",
+        "tsserver": "bin/tsserver"
       },
       "engines": {
-        "node": ">=18.12.0"
+        "node": ">=14.17"
       }
     },
-    "node_modules/stylelint-config-recommended": {
-      "version": "16.0.0",
-      "resolved": "https://registry.npmjs.org/stylelint-config-recommended/-/stylelint-config-recommended-16.0.0.tgz",
-      "integrity": "sha512-4RSmPjQegF34wNcK1e1O3Uz91HN8P1aFdFzio90wNK9mjgAI19u5vsU868cVZboKzCaa5XbpvtTzAAGQAxpcXA==",
+    "node_modules/uglify-js": {
+      "version": "3.19.3",
+      "resolved": "https://registry.npmjs.org/uglify-js/-/uglify-js-3.19.3.tgz",
+      "integrity": "sha512-v3Xu+yuwBXisp6QYTcH4UbH+xYJXqnq2m/LtQVWKWzYc1iehYnLixoQDN9FH6/j9/oybfd6W9Ghwkl8+UMKTKQ==",
       "dev": true,
-      "funding": [
-        {
-          "type": "opencollective",
-          "url": "https://opencollective.com/stylelint"
-        },
-        {
-          "type": "github",
-          "url": "https://github.com/sponsors/stylelint"
-        }
-      ],
-      "license": "MIT",
-      "engines": {
-        "node": ">=18.12.0"
+      "license": "BSD-2-Clause",
+      "bin": {
+        "uglifyjs": "bin/uglifyjs"
       },
-      "peerDependencies": {
-        "stylelint": "^16.16.0"
+      "engines": {
+        "node": ">=0.8.0"
       }
     },
-    "node_modules/stylelint-config-standard": {
-      "version": "38.0.0",
-      "resolved": "https://registry.npmjs.org/stylelint-config-standard/-/stylelint-config-standard-38.0.0.tgz",
-      "integrity": "sha512-uj3JIX+dpFseqd/DJx8Gy3PcRAJhlEZ2IrlFOc4LUxBX/PNMEQ198x7LCOE2Q5oT9Vw8nyc4CIL78xSqPr6iag==",
+    "node_modules/unbox-primitive": {
+      "version": "1.1.0",
+      "resolved": "https://registry.npmjs.org/unbox-primitive
