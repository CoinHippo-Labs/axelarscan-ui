import { toArray } from '@/lib/parser'
import { isString, equalsIgnoreCase } from '@/lib/string'

export const find = (x, list = []) => list.find(_x => isString(x) ? equalsIgnoreCase(_x, x) : _x === x)

export const includesStringList = (x, list = []) => toArray(list).findIndex(s => toArray(x).findIndex(_x => _x.includes(s)) > -1) > -1

export const sleep = (ms = 0) => new Promise(resolve => setTimeout(resolve, ms))
