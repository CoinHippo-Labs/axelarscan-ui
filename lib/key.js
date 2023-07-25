import _ from 'lodash'

import { toArray } from './utils'

export const getKeyType = (key, chains_data = []) => {
  const regexMap = {
    txhash: new RegExp(/^0x([A-Fa-f0-9]{64})$/, 'igm'),
    evmAddress: new RegExp(/^0x[a-fA-F0-9]{40}$/, 'igm'),
    ns: new RegExp(/[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)?/, 'igm'),
    validator: new RegExp('axelarvaloper.*$', 'igm'),
    axelarAddress: new RegExp('axelar.*$', 'igm'),
    cosmosAddress: Object.fromEntries(toArray(chains_data).filter(c => c.id !== 'axelarnet' && c.prefix_address).map(c => [c.id, new RegExp(`${c.prefix_address}.*$`, 'igm')])),
  }
  return !key ? null : _.head(Object.entries(regexMap).filter(([k, v]) => k === 'cosmosAddress' ? Object.values(v).findIndex(_v => key.match(_v)) > -1 : key.match(v)).map(([k, v]) => k)) || (!isNaN(key) ? 'block' : 'tx')
}