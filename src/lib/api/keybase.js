import _ from 'lodash'

import { sleep } from '@/lib/operator'

export const getKeybaseUser = async params => {
  await sleep(_.random(0, 3, true) * 1000)

  const qs = new URLSearchParams()
  Object.entries({ ...params, fields: 'pictures' }).forEach(([k, v]) => qs.append(k, v))

  const response = await fetch(`https://keybase.io/_/api/1.0/user/lookup.json?${qs.toString()}`).catch(error => null)
  return response && await response.json()
}
