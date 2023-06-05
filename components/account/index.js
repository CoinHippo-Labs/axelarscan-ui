import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'

import Info from './info'
import Transactions from '../transactions'
import { all_bank_balances, all_staking_delegations, all_staking_redelegations, all_staking_unbonding, distribution_rewards, distribution_commissions } from '../../lib/api/lcd'
import { deposit_addresses } from '../../lib/api/index'
import { transfers } from '../../lib/api/transfer'
import { type } from '../../lib/object/id'
import { getChain } from '../../lib/object/chain'
import { native_asset_id, getAsset, assetManager } from '../../lib/object/asset'
import { hexToBech32, bech32ToBech32 } from '../../lib/object/key'
import { remove_chars, equalsIgnoreCase } from '../../lib/utils'

export default () => {
  const {
    evm_chains,
    cosmos_chains,
    assets,
    chain,
    validators,
  } = useSelector(state =>
    (
      {
        evm_chains: state.evm_chains,
        cosmos_chains: state.cosmos_chains,
        assets: state.assets,
        chain: state.chain,
        validators: state.validators,
      }
    ),
    shallowEqual,
  )
  const {
    evm_chains_data,
  } = { ...evm_chains }
  const {
    cosmos_chains_data,
  } = { ...cosmos_chains }
  const {
    assets_data,
  } = { ...assets }
  const {
    chain_data,
  } = { ...chain }
  const {
    validators_data,
  } = { ...validators }

  const router = useRouter()
  const {
    pathname,
    query,
  } = { ...router }
  let {
    address,
  } = { ...query }

  address = remove_chars(address)

  const [balances, setBalances] = useState(null)
  const [delegations, setDelegations] = useState(null)
  const [redelegations, setRedelegations] = useState(null)
  const [unbondings, setUnbondings] = useState(null)
  const [rewards, setRewards] = useState(null)
  const [commissions, setCommissions] = useState(null)
  const [depositAddresses, setDepositAddresses] = useState(null)

  useEffect(
    () => {
      if (address) {
        setBalances(null)
        setDelegations(null)
        setRedelegations(null)
        setUnbondings(null)
        setRewards(null)
        setCommissions(null)
        setDepositAddresses(null)
      }
    },
    [address],
  )

  useEffect(
    () => {
      const getData = async () => {
        if (
          address?.startsWith('"') ||
          address?.endsWith('"')
        ) {
          router
            .push(
              `${
                pathname
                  .replace(
                    '[address]',
                    address
                      .split('"')
                      .join('')
                  )
              }`
            )
        }
        else if (
          address?.startsWith(process.env.NEXT_PUBLIC_PREFIX_VALIDATOR) &&
          validators_data &&
          validators_data
            .findIndex(v =>
              equalsIgnoreCase(
                v?.operator_address,
                address,
              )
            ) > -1
        ) {
          const {
            operator_address,
          } = {
            ...(
              validators_data
                .find(v =>
                  equalsIgnoreCase(
                    v?.operator_address,
                    address,
                  )
                )
            ),
          }

          router
            .push(
              `/validator/${operator_address}`
            )
        }
        else if (
          address?.startsWith(process.env.NEXT_PUBLIC_PREFIX_CONSENSUS) &&
          validators_data &&
          validators_data
            .findIndex(v =>
              v?.operator_address &&
              equalsIgnoreCase(
                v.consensus_address,
                address,
              )
            ) > -1
        ) {
          const {
            operator_address,
          } = {
            ...(
              validators_data
                .find(v =>
                  v?.operator_address &&
                  equalsIgnoreCase(
                    v.consensus_address,
                    address,
                  )
                )
            ),
          }

          router
            .push(
              `/validator/${operator_address}`
            )
        }
        else if (
          address &&
          [
            process.env.NEXT_PUBLIC_PREFIX_ACCOUNT,
            process.env.NEXT_PUBLIC_PREFIX_CONSENSUS,
          ].findIndex(p =>
            address.startsWith(p)
          ) < 0 &&
          validators_data &&
          validators_data
            .findIndex(v =>
              v?.operator_address &&
              equalsIgnoreCase(
                v.consensus_address,
                hexToBech32(
                  address,
                  process.env.NEXT_PUBLIC_PREFIX_CONSENSUS,
                ),
              )
            ) > -1
        ) {
          const {
            operator_address,
          } = {
            ...(
              validators_data
                .find(v =>
                  v?.operator_address &&
                  equalsIgnoreCase(
                    v.consensus_address,
                    hexToBech32(
                      address,
                      process.env.NEXT_PUBLIC_PREFIX_CONSENSUS,
                    ),
                  )
                )
            ),
          }

          router
            .push(
              `/validator/${operator_address}`
            )
        }
        else if (
          address?.startsWith(process.env.NEXT_PUBLIC_PREFIX_ACCOUNT) &&
          validators_data &&
          validators_data
            .findIndex(v =>
              v?.operator_address &&
              equalsIgnoreCase(
                v.consensus_address,
                bech32ToBech32(
                  address,
                  process.env.NEXT_PUBLIC_PREFIX_CONSENSUS,
                ),
              )
            ) > -1
        ) {
          const {
            operator_address,
          } = {
            ...(
              validators_data
                .find(v =>
                  v?.operator_address &&
                  equalsIgnoreCase(
                    v.consensus_address,
                    bech32ToBech32(
                      address,
                      process.env.NEXT_PUBLIC_PREFIX_CONSENSUS,
                    ),
                  )
                )
            ),
          }

          router
            .push(
              `/validator/${operator_address}`
            )
        }
        else if (
          address?.startsWith(process.env.NEXT_PUBLIC_PREFIX_ACCOUNT) &&
          assets_data && validators_data && !balances
        ) {
          const response =
            await all_bank_balances(
              address,
            )

          const {
            data,
          } = { ...response }

          setBalances(
            Array.isArray(data) ?
              data
                .map(b => {
                  const {
                    denom,
                    amount,
                  } = { ...b }

                  return {
                    ...b,
                    denom:
                      assetManager
                        .symbol(
                          denom,
                          assets_data,
                        ),
                    amount:
                      assetManager
                        .amount(
                          amount,
                          denom,
                          assets_data,
                        ),
                    asset_data:
                      getAsset(
                        denom,
                        assets_data,
                      ),
                  }
                })
                .filter(b =>
                  b.amount > -1
                )
                .map(b => {
                  const {
                    amount,
                    asset_data,
                  } = { ...b }
                  const {
                    price,
                  } = { ...asset_data }

                  return {
                    ...b,
                    value:
                      amount *
                      (
                        price ||
                        0
                      ),
                  }
                }) :
              []
          )
        }
      }

      getData()
    },
    [address, assets_data, validators_data, balances],
  )

  useEffect(
    () => {
      const getData = async () => {
        if (
          address &&
          (
            address.length < 65 ||
            (
              depositAddresses &&
              depositAddresses.length < 1
            )
          ) &&
          assets_data &&
          validators_data
        ) {
          const response =
            await all_staking_delegations(
              address,
            )

          const {
            data,
          } = { ...response }

          setDelegations(
            Array.isArray(data) ?
              data
                .map(d => {
                  const {
                    delegation,
                    balance,
                  } = { ...d }
                  const {
                    validator_address,
                    shares,
                  } = { ...delegation }
                  const {
                    denom,
                    amount,
                  } = { ...balance }

                  return {
                    ...delegation,
                    validator_data: {
                      ...(
                        validators_data
                          .find(v =>
                            equalsIgnoreCase(
                              v?.operator_address,
                              validator_address,
                            )
                          )
                      ),
                    },
                    shares:
                      isNaN(shares) ?
                        -1 :
                        assetManager
                          .amount(
                            shares,
                            denom,
                            assets_data,
                          ),
                    ...balance,
                    denom:
                      assetManager
                        .symbol(
                          denom,
                          assets_data,
                        ),
                    amount:
                      isNaN(amount) ?
                        -1 :
                        assetManager
                          .amount(
                            amount,
                            denom,
                            assets_data,
                          ),
                    asset_data:
                      getAsset(
                        denom,
                        assets_data,
                      ),
                  }
                })
                .filter(d =>
                  d.amount > -1
                )
                .map(d => {
                  const {
                    amount,
                    asset_data,
                  } = { ...d }
                  const {
                    price,
                  } = { ...asset_data }

                  return {
                    ...d,
                    value:
                      amount *
                      (
                        price ||
                        0
                      ),
                  }
                }) :
              []
          )
        }
      }

      getData()
    },
    [address, assets_data, validators_data, depositAddresses],
  )

  useEffect(
    () => {
      const getData = async () => {
        if (
          address &&
          (
            address.length < 65 ||
            (
              depositAddresses &&
              depositAddresses.length < 1
            )
          ) &&
          assets_data &&
          validators_data
        ) {
          const {
            staking_params,
          } = { ...chain_data }

          const response =
            await all_staking_redelegations(
              address,
            )

          const {
            data,
          } = { ...response }

          setRedelegations(
            Array.isArray(data) ?
              data
                .flatMap(r =>
                  (r?.redelegation?.entries || [])
                    .map(e => {
                      const {
                        validator_src_address,
                        validator_dst_address,
                      } = { ...r.redelegation }
                      const {
                        creation_height,
                        initial_balance,
                        shares_dst,
                      } = { ...e }

                      return {
                        ...r.redelegation,
                        source_validator_data: {
                          ...(
                            (validators_data || [])
                              .find(v =>
                                equalsIgnoreCase(
                                  v?.operator_address,
                                  validator_src_address,
                                )
                              )
                          ),
                        },
                        destination_validator_data: {
                          ...(
                            (validators_data || [])
                              .find(v =>
                                equalsIgnoreCase(
                                  v?.operator_address,
                                  validator_dst_address,
                                )
                              )
                          ),
                        },
                        entries: undefined,
                        ...e,
                        creation_height: Number(creation_height),
                        initial_balance:
                          assetManager
                            .amount(
                              Number(initial_balance),
                              native_asset_id,
                              assets_data,
                            ),
                        shares_dst:
                          assetManager
                            .amount(
                              Number(shares_dst),
                              native_asset_id,
                              assets_data,
                            ),
                      }
                    })
                )
                .map(r => {
                  const {
                    initial_balance,
                    shares_dst,
                  } = { ...r }
                  let {
                    denom,
                  } = { ...r }

                  denom =
                    denom ||
                    staking_params?.bond_denom

                  return {
                    ...r,
                    denom:
                      assetManager
                        .symbol(
                          denom,
                          assets_data,
                        ),
                    amount: shares_dst - initial_balance,
                    asset_data:
                      getAsset(
                        denom,
                        assets_data,
                      ),
                  }
                })
                .filter(r =>
                  r.amount > -1
                )
                .map(r => {
                  const {
                    amount,
                    asset_data,
                  } = { ...r }
                  const {
                    price,
                  } = { ...asset_data }

                  return {
                    ...r,
                    value:
                      amount *
                      (
                        price ||
                        0
                      ),
                  }
                }) :
              []
          )
        }
      }

      getData()
    },
    [address, assets_data, validators_data, depositAddresses],
  )

  useEffect(
    () => {
      const getData = async () => {
        if (
          address &&
          (
            address.length < 65 ||
            (
              depositAddresses &&
              depositAddresses.length < 1
            )
          ) &&
          assets_data &&
          validators_data
        ) {
          const {
            staking_params,
          } = { ...chain_data }

          const response =
            await all_staking_unbonding(
              address,
            )

          const {
            data,
          } = { ...response }

          setUnbondings(
            Array.isArray(data) ?
              data
                .flatMap(u =>
                  (u?.entries || [])
                    .map(e => {
                      const {
                        validator_address,
                      } = { ...u }
                      const {
                        creation_height,
                        initial_balance,
                        balance,
                      } = { ...e }

                      return {
                        ...u,
                        validator_data: {
                          ...(
                            (validators_data || [])
                              .find(v =>
                                equalsIgnoreCase(
                                  v?.operator_address,
                                  validator_address,
                                )
                              )
                          ),
                        },
                        entries: undefined,
                        ...e,
                        creation_height: Number(creation_height),
                        initial_balance:
                          assetManager
                            .amount(
                              Number(initial_balance),
                              native_asset_id,
                              assets_data,
                            ),
                        balance:
                          assetManager
                            .amount(
                              Number(balance),
                              native_asset_id,
                              assets_data,
                            ),
                      }
                    })
                )
                .map(u => {
                  const {
                    initial_balance,
                    balance,
                  } = { ...u }
                  let {
                    denom,
                  } = { ...u }

                  denom =
                    denom ||
                    staking_params?.bond_denom

                  return {
                    ...u,
                    denom:
                      assetManager
                        .symbol(
                          denom,
                          assets_data,
                        ),
                    amount: /*initial_balance - */balance,
                    asset_data:
                      getAsset(
                        denom,
                        assets_data,
                      ),
                  }
                })
                .filter(u =>
                  u.amount > -1
                )
                .map(u => {
                  const {
                    amount,
                    asset_data,
                  } = { ...u }
                  const {
                    price,
                  } = { ...asset_data }

                  return {
                    ...u,
                    value:
                      amount *
                      (
                        price ||
                        0
                      ),
                  }
                }) :
              []
          )
        }
      }

      getData()
    },
    [address, assets_data, validators_data, depositAddresses],
  )

  useEffect(
    () => {
      const getData = async () => {
        if (
          address &&
          (
            address.length < 65 ||
            (
              depositAddresses &&
              depositAddresses.length < 1
            )
          ) &&
          assets_data
        ) {
          const response =
            await distribution_rewards(
              address,
            )

          const {
            rewards,
            total,
          } = { ...response }

          setRewards(
            {
              ...response,
              rewards:
                Object.entries(
                  _.groupBy(
                    (rewards || [])
                      .flatMap(r => r?.reward)
                      .map(r => {
                        const {
                          denom,
                          amount,
                        } = { ...r }

                        return {
                          ...r,
                          denom:
                            assetManager
                              .symbol(
                                denom,
                                assets_data,
                              ),
                          amount:
                            isNaN(amount) ?
                              -1 :
                              assetManager
                                .amount(
                                  amount,
                                  denom,
                                  assets_data,
                                ),
                        }
                      })
                      .filter(r =>
                        r.amount > -1
                      ),
                    'denom',
                  )
                )
                .map(([k, v]) => {
                  return {
                    denom: k,
                    amount:
                      _.sumBy(
                        v,
                        'amount',
                      ),
                  }
                }),
              total:
                Object.entries(
                  _.groupBy(
                    (total || [])
                      .map(t => {
                        const {
                          denom,
                          amount,
                        } = { ...t }

                        return {
                          ...t,
                          denom:
                            assetManager
                              .symbol(
                                denom,
                                assets_data,
                              ),
                          amount:
                            assetManager
                              .amount(
                                amount,
                                denom,
                                assets_data,
                              ),
                        }
                      }),
                    'denom',
                  )
                )
                .map(([k, v]) => {
                  return {
                    denom: k,
                    amount:
                      _.sumBy(
                        v,
                        'amount',
                      ),
                  }
                })
                .filter(t =>
                  t.amount > -1
                ),
            }
          )
        }
      }

      getData()
    },
    [address, assets_data, depositAddresses],
  )

  useEffect(
    () => {
      const getData = async () => {
        if (
          address &&
          (
            address.length < 65 ||
            (
              depositAddresses &&
              depositAddresses.length < 1
            )
          ) &&
          assets_data &&
          validators_data
        ) {
          const validator_data = validators_data
            .find(v =>
              equalsIgnoreCase(
                v?.delegator_address,
                address,
              )
            )

          const {
            operator_address,
          } = { ...validator_data }

          if (operator_address) {
            const response =
              await distribution_commissions(
                operator_address,
              )

            const {
              commission,
            } = { ...response }

            setCommissions(
              Array.isArray(commission?.commission) ?
                commission.commission
                  .map(c => {
                    const {
                      denom,
                      amount,
                    } = { ...c }

                    return {
                      ...c,
                      denom:
                        assetManager
                          .symbol(
                            denom,
                            assets_data,
                          ),
                      amount:
                        isNaN(amount) ?
                          -1 :
                          assetManager
                            .amount(
                              amount,
                              denom,
                              assets_data,
                            ),
                    }
                  })
                  .filter(c =>
                    c.amount > -1
                  ) :
                []
            )
          }
        }
      }

      getData()
    },
    [address, assets_data, validators_data, depositAddresses],
  )

  useEffect(
    () => {
      const getData = async () => {
        if (
          address &&
          (
            address.length >= 65 ||
            type(address) === 'evm_address'
          ) &&
          evm_chains_data &&
          cosmos_chains_data &&
          assets_data
        ) {
          const response =
            await deposit_addresses(
              {
                query: {
                  match: { deposit_address: address },
                },
                size: 10,
                sort: [{ height: 'desc' }],
              },
            )

          const {
            data,
          } = { ...response }

          const _response =
            await transfers(
              {
                depositAddress: address,
              },
            )

          const transfer_data =
            _.head(
              _response?.data
            )

          setDepositAddresses(
            Array.isArray(data) ?
              data
                .map(d => {
                  const {
                    original_sender_chain,
                    original_recipient_chain,
                    sender_chain,
                    recipient_chain,
                    denom,
                  } = { ...d }

                  return {
                    ...d,
                    source_chain_data:
                      evm_chains_data
                        .find(c =>
                          equalsIgnoreCase(
                            c?.id,
                            sender_chain,
                          )
                        ) ||
                      getChain(
                        original_sender_chain,
                        cosmos_chains_data,
                      ) ||
                      getChain(
                        sender_chain,
                        cosmos_chains_data,
                      ),
                    destination_chain_data:
                      evm_chains_data
                        .find(c =>
                          equalsIgnoreCase(
                            c?.id,
                            recipient_chain,
                          )
                        ) ||
                      getChain(
                        original_recipient_chain,
                        cosmos_chains_data,
                      ) ||
                      getChain(
                        recipient_chain,
                        cosmos_chains_data,
                      ),
                    denom:
                      assetManager
                        .symbol(
                          denom,
                          assets_data,
                        ),
                    asset_data:
                      assets_data
                        .find(a =>
                          equalsIgnoreCase(
                            a?.id,
                            denom,
                          )
                        ),
                    transfer_data,
                  }
                }) :
              []
          )
        }
      }

      getData()
    },
    [address, evm_chains_data, cosmos_chains_data, assets_data],
  )

  return (
    <div className="space-y-8 mt-2 mb-6 mx-auto">
      <Info
        data={
          (
            (
              address?.length >= 65 ||
              type(address) === 'evm_address'
            ) &&
            !depositAddresses
          ) ||
          depositAddresses?.length > 0 ?
            {
              depositAddresses,
            } :
            {
              balances,
              delegations,
              redelegations,
              unbondings,
              rewards,
              commissions,
            }
        }
      />
      <div>
        <Transactions />
      </div>
    </div>
  )
}