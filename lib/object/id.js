const cosmos_chains_prefix = ['cosmos,osmo,juno,emoney,terra']
export const type = string => {
  const txRegEx = new RegExp(/^0x([A-Fa-f0-9]{64})$/, 'igm')
  const hashRegEx = new RegExp(/[0-9A-F]{64}$/, 'igm')
  const evmAddressRegEx = new RegExp(/^0x[a-fA-F0-9]{40}$/, 'igm')
  const ensRegEx = new RegExp(/[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)?/, 'igm')
  const validatorRegEx = new RegExp(`${process.env.NEXT_PUBLIC_PREFIX_VALIDATOR}.*$`, 'igm')
  const accountRegEx = new RegExp(`${process.env.NEXT_PUBLIC_PREFIX_ACCOUNT}.*$`, 'igm')
  const cosmosChainsAddressRegEx = Object.fromEntries(cosmos_chains_prefix.map(p => [p, new RegExp(`${p}.*$`, 'igm')]))
  return !string ? null :
    string.match(txRegEx) ? 'evm_tx' :
    string.match(evmAddressRegEx) ? 'evm_address' :
    string.match(ensRegEx) ? 'ens' :
    string.match(validatorRegEx) ? 'validator' :
    string.match(accountRegEx) ? 'account' :
    Object.values(cosmosChainsAddressRegEx).findIndex(r => string.match(r)) > -1 ? 'cosmos_address' :
    !isNaN(string) ? 'block' :
    'tx'
}