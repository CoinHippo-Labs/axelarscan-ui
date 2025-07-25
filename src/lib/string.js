import _ from 'lodash'

import { toCase, split, toArray } from '@/lib/parser'

export const isString = string => typeof string === 'string'
export const equalsIgnoreCase = (a, b) => (!a && !b) || toCase(a, 'lower') === toCase(b, 'lower')
export const capitalize = string => !isString(string) ? '' : `${string.substr(0, 1).toUpperCase()}${string.substr(1)}`
export const camel = (string, delimiter = '_') => toArray(string, { delimiter }).map((s, i) => i > 0 ? capitalize(s) : s).join('')
export const removeDoubleQuote = string => !isString(string) ? string : split(string, { delimiter: '"' }).join('')
export const toBoolean = (string, defaultValue = true) => typeof string === 'boolean' ? string : !isString(string) ? defaultValue : equalsIgnoreCase(string, 'true')
export const headString = (string, delimiter = '-') => _.head(split(string, { delimiter }))
export const lastString = (string, delimiter = '-') => _.last(split(string, { delimiter }))
export const find = (x, elements) => toArray(elements).find(e => equalsIgnoreCase(e, x))
export const includesSomePatterns = (string, patterns) => toArray(patterns).findIndex(p => toArray(string).findIndex(s => s.includes(p)) > -1) > -1
export const ellipse = (string, length = 10, prefix = '') => !isString(string) || !string ? '' : string.length < (length * 2) + 3 ? string : `${string.startsWith(prefix) ? prefix : ''}${string.replace(prefix, '').slice(0, length)}...${string.replace(prefix, '').slice(-length)}`
export const toTitle = (string, delimiter = '_', isCapitalize = false, noSpace = false) => split(string, { delimiter }).map(s => isCapitalize ? capitalize(s) : s).join(noSpace ? '' : ' ')
export const filterSearchInput = (string, pattern) => !pattern || (pattern.length > 2 ? includesSomePatterns(string, pattern) : toArray(string).findIndex(s => toCase(s, 'lower').startsWith(toCase(pattern, 'lower'))) > -1)
