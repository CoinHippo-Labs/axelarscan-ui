const cosmos_chains_prefix = [
  'cosmos',
  'osmo',
  'juno',
  'emoney',
  'inj',
  'cre',
  'kujira',
  'secret',
  'stars',
  'mantle',
  'fetch',
  'ki',
  'evmos',
  'comdex',
  'regen',
  'umee',
  'agoric',
  'sei',
  'aura',
  'persistence',
  'xpla',
  'burnt',
  'odin',
  'stride',
  'somm',
  'terra',
]

export const type = s => {
  const txRegEx = new RegExp(/^0x([A-Fa-f0-9]{64})$/, 'igm')
  const hashRegEx = new RegExp(/[0-9A-F]{64}$/, 'igm')
  const evmAddressRegEx = new RegExp(/^0x[a-fA-F0-9]{40}$/, 'igm')
  const ensRegEx = new RegExp(/[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)?/, 'igm')
  const validatorRegEx = new RegExp(`${process.env.NEXT_PUBLIC_PREFIX_VALIDATOR}.*$`, 'igm')
  const accountRegEx = new RegExp(`${process.env.NEXT_PUBLIC_PREFIX_ACCOUNT}.*$`, 'igm')

  const cosmosChainsAddressRegEx =
    Object.fromEntries(
      cosmos_chains_prefix
        .map(p =>
          [
            p,
            new RegExp(`${p}.*$`, 'igm'),
          ]
        )
    )

  return (
    !s ?
      null :
      s.match(txRegEx) ?
        'evm_tx' :
        s.match(evmAddressRegEx) ?
          'evm_address' :
          s.match(ensRegEx) ?
            'ens' :
            s.match(validatorRegEx) ?
              'validator' :
              s.match(accountRegEx) ?
                'account' :
                Object.values(cosmosChainsAddressRegEx)
                  .findIndex(r =>
                    s.match(r)
                  ) > -1 ?
                    'cosmos_address' :
                    !isNaN(s) ?
                      'block' :
                      'tx'
  )
}