import { toArray } from '@/lib/parser'
import { removeDoubleQuote } from '@/lib/string'

export const getAttributeValue = (attributes, key) => removeDoubleQuote(toArray(attributes).find(a => a.key === key)?.value)
