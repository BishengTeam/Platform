# 010 — Use persistent sliding tab indicators

- **Status**: TODO
- **Commit**: d49af23
- **Severity**: MEDIUM
- **Category**: Spatial consistency
- **Estimated scope**: 4 files, medium

## Problem

Both tab indicators are conditionally remounted under the currently active tab:

```tsx
/* src/components/TagFilter/index.tsx:44 — current */
{isActive && <View className={styles.underlineIndicator} />}

/* src/pages/orders/index.tsx:64 — current */
{isActive && <View className={styles.tabIndicator} />}
```

Because the element is destroyed and recreated under another tab, it teleports instead of sliding. This loses the spatial relationship between tabs.

## Target

Keep one indicator mounted and move it with `transform` only.

### General TagFilter

The underline variant has variable-width tabs, so measure tab centers after layout with Taro's selector query:

```tsx
const INDICATOR_WIDTH = 24

const items = useMemo(() => tags.map(toTagItem), [tags])
const activeIndex = items.findIndex(item => item.label === activeTag)
const [tabCenters, setTabCenters] = useState<number[]>([])

const measureTabs = useCallback(() => {
  const query = Taro.createSelectorQuery()
  query.selectAll(`.${styles.underlineTab}`).boundingClientRect()
  query.select(`.${styles.underlineRow}`).boundingClientRect()
  query.exec(results => {
    const rects = (results?.[0] ?? []) as Array<{ left: number; width: number }>
    const row = results?.[1] as { left: number } | null | undefined
    if (!row || rects.length === 0) return
    setTabCenters(
      rects.map(rect => rect.left - row.left + rect.width / 2),
    )
  })
}, [styles])

const labelKey = items.map(item => item.label).join('\u0000')
useReady(() => { measureTabs() })
useEffect(() => { measureTabs() }, [labelKey, measureTabs])

const indicatorCenter = tabCenters[activeIndex]
const indicatorVisible = typeof indicatorCenter === 'number'
```

Render one indicator as the last child of `.underlineRow`; do not put it inside `.map()`:

```tsx
<View
  className={styles.underlineIndicator}
  style={{
    opacity: indicatorVisible ? 1 : 0,
    transform: `translateX(${(indicatorCenter ?? 0) - INDICATOR_WIDTH / 2}px)`,
  }}
/>
```

Target SCSS:

```scss
.underlineIndicator {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 24px;
  height: 3px;
  background: $color-primary;
  border-radius: 2px;
  opacity: 0;
  transform: translateX(-24px);
  transition:
    transform $motion-duration-press $motion-ease-out,
    opacity $motion-duration-state $motion-ease-out;
}

@media (prefers-reduced-motion: reduce) {
  .underlineIndicator {
    transition: opacity $motion-duration-state ease-out;
  }
}
```

### Orders tabs

Order tabs are four equal-width flex children. Compute `activeIndex = TAG_KEYS.indexOf(activeTag)` and render one indicator after the tab map:

```tsx
<View
  className={styles.tabIndicator}
  style={{
    width: `${100 / TAG_KEYS.length}%`,
    transform: `translateX(${Math.max(activeIndex, 0) * 100}%)`,
  }}
/>
```

Target SCSS:

```scss
.tabs {
  position: relative;
}

.tabIndicator {
  position: absolute;
  bottom: $spacing-sm;
  left: 0;
  height: 3px;
  background: $color-primary;
  border-radius: 2px;
  transition: transform $motion-duration-press $motion-ease-out;
}

@media (prefers-reduced-motion: reduce) {
  .tabIndicator {
    transition: none;
  }
}
```

## Repo conventions to follow

- Motion tokens live in `src/styles/_variables.scss`.
- Existing press duration is `$motion-duration-press: 160ms`.
- Existing state duration is `$motion-duration-state: 200ms`.
- Existing strong ease-out is `$motion-ease-out: cubic-bezier(0.23, 1, 0.32, 1)`.
- Reduced-motion must preserve visible state while suppressing movement.

## Steps

1. Update `TagFilter` underline variant to measure tab centers and render one persistent indicator.
2. Remove the conditional indicator from each `TagFilter` tab.
3. Update `TagFilter` SCSS so the indicator animates only `transform` and `opacity`.
4. Update the orders tab bar to compute active index and render one persistent indicator.
5. Remove the conditional indicator from each order tab.
6. Update orders SCSS for an absolutely positioned, transform-driven indicator.
7. Add static contract tests proving both indicators are persistent and transform-driven.

## Boundaries

- Do not animate `left`, `width`, `margin`, or `height`.
- Do not change tab labels, filtering behavior, click handlers, or data models.
- Do not change the pill variant of `TagFilter`.
- Do not add a JavaScript animation loop or a dependency.
- If selector query results are unavailable, hide the indicator rather than positioning it incorrectly.

## Verification

- **Mechanical**:
  - `npm run typecheck`
  - `npm test`
  - `npm run build:weapp`
  - `rg "\\{isActive && <View className=\\{styles\\.(underlineIndicator|tabIndicator)\\}" src` must return no matches.
- **Feel check**:
  - On training underline tabs and order tabs, switch slowly: the same indicator slides from the old tab to the new one.
  - Switch rapidly: movement retargets from the current position and never restarts from the first tab.
  - Scroll long tag rows and switch tags: the indicator remains centered under the selected label.
  - Enable reduced motion: the indicator repositions instantly while active text/color state remains visible.
  - Confirm no tab content shifts vertically while the indicator moves.
- **Done when**: neither indicator is conditionally remounted, both use `transform`, and all commands pass.
