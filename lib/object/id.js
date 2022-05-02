export const type = id => {
  const txRegEx = new RegExp(/^0x([A-Fa-f0-9]{64})$/, 'igm')
  const hashRegEx = new RegExp(/[0-9A-F]{64}$/, 'igm')
  const evmAddressRegEx = new RegExp(/^0x[a-fA-F0-9]{40}$/, 'igm')
  const validatorRegEx = new RegExp(`${process.env.NEXT_PUBLIC_PREFIX_VALIDATOR}.*$`, 'igm')
  const accountRegEx = new RegExp(`${process.env.NEXT_PUBLIC_PREFIX_ACCOUNT}.*$`, 'igm')
  const prefixLookup = {
    osmosis: 'osmo',
  }
  const cosmosChainsAddressRegEx = Object.fromEntries((process.env.NEXT_PUBLIC_COSMOS_CHAINS?.split(',') || []).map(c => prefixLookup[c] || c).map(c => [c, new RegExp(`${c}.*$`, 'igm')]))
  return !id ? null : id.match(txRegEx) ? 'gmp' : id.match(evmAddressRegEx) ? 'gmp_address' : !isNaN(id) ? 'block' : id.match(validatorRegEx) ? 'validator' : id.match(accountRegEx) || Object.values(cosmosChainsAddressRegEx).findIndex(r => id.match(r)) > -1 ? 'account' : 'tx'
}