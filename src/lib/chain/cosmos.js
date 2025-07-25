import { toJson, toArray } from '@/lib/parser'
import { removeDoubleQuote, includesSomePatterns } from '@/lib/string'

export const getAttributeValue = (attributes, key) => {
  const { value } = { ...toArray(attributes).find(a => a.key === key) }
  return toJson(value) || removeDoubleQuote(value)
}

export const getLogEventByType = (logs, type) => toArray(logs).find(d => toArray(d.events).find(e => includesSomePatterns(e.type, toArray(type))))?.events.find(e => includesSomePatterns(e.type, toArray(type)))
