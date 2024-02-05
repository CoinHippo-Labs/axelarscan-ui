import { toJson, toArray } from '@/lib/parser'
import { removeDoubleQuote } from '@/lib/string'

export const getAttributeValue = (attributes, key) => {
  const { value } = { ...toArray(attributes).find(a => a.key === key) }
  return toJson(value) || removeDoubleQuote(value)
}
