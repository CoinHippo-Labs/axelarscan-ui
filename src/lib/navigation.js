import _ from 'lodash'

import { split } from '@/lib/parser'

export const getSlug = (pathname, id = 'tx') => {
  const paths = split(pathname, { delimiter: '/' })
  if (!(paths.length > 1)) return

  const slug = _.last(paths)
  if (['search'].includes(slug)) return

  switch (id) {
    case 'tx':
      if (['/gmp', 'transfer', '/tx', '/transaction'].findIndex(d => pathname.startsWith(d)) > -1) return slug
      break
    case 'address':
      if (['/account', '/address', '/validator/'].findIndex(d => pathname.startsWith(d)) > -1) return slug
      break
    default:
      break
  }
  return
}
