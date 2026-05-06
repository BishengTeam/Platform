import { useState, useMemo } from 'react'

export interface UseZonePageOptions<T> {
  defaultTag: string
  data: T[]
  filterFn?: (item: T, tag: string) => boolean
}

export function useZonePage<T>({ defaultTag, data, filterFn }: UseZonePageOptions<T>) {
  const [activeTag, setActiveTag] = useState(defaultTag)

  const filteredData = useMemo(() => {
    if (!filterFn) return data
    return data.filter(item => filterFn(item, activeTag))
  }, [activeTag, data, filterFn])

  return { activeTag, setActiveTag, filteredData }
}
