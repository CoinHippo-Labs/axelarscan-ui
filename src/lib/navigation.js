import _ from 'lodash'

import { split } from '@/lib/parser'
import { find } from '@/lib/string'

export const getSlug = (pathname, id = 'tx') => {
  const paths = split(pathname, { delimiter: '/' })
  if (!(paths.length > 1)) return

  const slug = _.last(paths)
  if (find(slug, ['search'])) return

  switch (id) {
    case 'tx':
      if (['/gmp', '/transfer', '/tx', '/transaction'].findIndex(d => pathname.startsWith(d)) > -1) {
        return slug
      }
      break
    case 'address':
      if (['/account', '/address', '/validator/', '/verifier/'].findIndex(d => pathname.startsWith(d)) > -1) {
        return slug
      }
      break
    default:
      break
  }

  return
}
