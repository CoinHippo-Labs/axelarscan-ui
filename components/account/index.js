import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'

import Info from './info'
import Transactions from '../transactions'
import { all_bank_balances, all_staking_delegations, all_staking_redelegations, all_staking_unbonding, distribution_rewards, distribution_commissions } from '../../lib/api/cosmos'
import { transactions as getTransactions, deposit_addresses } from '../../lib/api/index'
import { denom_manager } from '../../lib/object/denom'
import { equals_ignore_case } from '../../lib/utils'

export default () => {
  const { evm_chains, cosmos_chains, assets, chain, validators } = useSelector(state => ({ evm_chains: state.evm_chains, cosmos_chains: state.cosmos_chains, assets: state.assets, chain: state.chain, validators: state.validators }), shallowEqual)
  const { evm_chains_data } = { ...evm_chains }
  const { cosmos_chains_data } = { ...cosmos_chains }
  const { assets_data } = { ...assets }
  const { chain_data } = { ...chain }
  const { validators_data } = { ...validators }

  const router = useRouter()
  const { query } = { ...router }
  const { address } = { ...query }

  const [balances, setBalances] = useState(null)
  const [delegations, setDelegations] = useState(null)
  const [redelegations, setRedelegations] = useState(null)
  const [unbonds, setUnbonds] = useState(null)
  const [rewards, setRewards] = useState(null)
  const [commissions, setCommissions] = useState(null)
  const [depositAddresses, setDepositAddresses] = useState(null)

  useEffect(() => {
    const controller = new AbortController()
    const getData = async () => {
      if (address && assets_data) {
        if (!controller.signal.aborted) {
          const response = await all_bank_balances(address)
          setBalances(response?.data?.map(b => {
            const { denom, amount } = { ...b }
            return {
              ...b,
              denom: denom_manager.symbol(denom, assets_data),
              amount: denom_manager.amount(amount, denom, assets_data),
            }
          })?.filter(b => b?.amount > -1) || [])
        }
      }
    }
    getData()
    return () => {
      controller?.abort()
    }
  }, [address, assets_data])

  useEffect(() => {
    const controller = new AbortController()
    const getData = async () => {
      if (address && address.length < 65 && assets_data && validators_data) {
        if (!controller.signal.aborted) {
          const response = await all_staking_delegations(address)
          setDelegations(response?.data?.map(d => {
            const { delegation, balance } = { ...d }
            const { validator_address, shares } = { ...delegation }
            const { denom, amount } = { ...balance }
            return {
              ...delegation,
              validator_data: { ...validators_data.find(v => equals_ignore_case(v?.operator_address, validator_address)) },
              shares: isNaN(shares) ? -1 : denom_manager.amount(shares, denom, assets_data),
              ...balance,
              denom: denom_manager.symbol(denom, assets_data),
              amount: isNaN(amount) ? -1 : denom_manager.amount(amount, denom, assets_data),
            }
          }).filter(d => d?.amount > -1) || [])
        }
      }
    }
    getData()
    return () => {
      controller?.abort()
    }
  }, [address, assets_data, validators_data])

  useEffect(() => {
    const controller = new AbortController()
    const getData = async () => {
      if (address && address.length < 65 && assets_data && validators_data) {
        if (!controller.signal.aborted) {
          const response = await all_staking_redelegations(address)
          setRedelegations(response?.data?.flatMap(r => !r?.redelegation?.entries ? [] : r.redelegation.entries.map(e => {
            const { validator_src_address, validator_dst_address } = { ...r.redelegation }
            const { creation_height, initial_balance, shares_dst } = { ...e }
            return {
              ...r.redelegation,
              source_validator_data: { ...validators_data?.find(v => equals_ignore_case(v?.operator_address, validator_src_address)) },
              destination_validator_data: { ...validators_data?.find(v => equals_ignore_case(v?.operator_address, validator_dst_address)) },
              entries: undefined,
              ...e,
              creation_height: Number(creation_height),
              initial_balance: denom_manager.amount(Number(initial_balance), assets_data[0]?.id, assets_data),
              shares_dst: denom_manager.amount(Number(shares_dst), assets_data[0]?.id, assets_data),
            }
          })).map(r => {
            const { denom, shares_dst } = { ...r }
            const { staking_params } = { ...chain_data }
            return {
              ...r,
              denom: denom || staking_params?.bond_denom,
              amount: shares_dst,
            }
          }).filter(r => r?.amount > -1) || [])
        }
      }
    }
    getData()
    return () => {
      controller?.abort()
    }
  }, [address, assets_data, validators_data])

  useEffect(() => {
    const controller = new AbortController()
    const getData = async () => {
      if (address && address.length < 65 && assets_data && validators_data) {
        if (!controller.signal.aborted) {
          const response = await all_staking_unbonding(address)
          setUnbonds(response?.data?.flatMap(u => !u?.entries ? [] : u.entries.map(e => {
            const { validator_address } = { ...u }
            const { creation_height, initial_balance, balance } = { ...e }
            return {
              ...u,
              validator_data: { ...validators_data?.find(v => equals_ignore_case(v?.operator_address, validator_address)) },
              entries: undefined,
              ...e,
              creation_height: Number(creation_height),
              initial_balance: denom_manager.amount(Number(initial_balance), assets_data[0]?.id, assets_data),
              balance: denom_manager.amount(Number(balance), assets_data[0]?.id, assets_data),
            }
          })).map(u => {
            const { denom, balance } = { ...u }
            const { staking_params } = { ...chain_data }
            return {
              ...u,
              denom: denom || staking_params?.bond_denom,
              amount: balance,
            }
          }).filter(u => u?.amount > -1) || [])
        }
      }
    }
    getData()
    return () => {
      controller?.abort()
    }
  }, [address, assets_data, validators_data])

  useEffect(() => {
    const controller = new AbortController()
    const getData = async () => {
      if (address && address.length < 65 && assets_data) {
        if (!controller.signal.aborted) {
          const response = await distribution_rewards(address)
          const { rewards, total } = { ...response }
          setRewards({
            ...response,
            rewards: Object.entries(
              _.groupBy(rewards?.flatMap(r => r?.reward).map(r => {
                const { denom, amount } = { ...r }
                return {
                  ...r,
                  denom: denom_manager.symbol(denom, assets_data),
                  amount: isNaN(amount) ? -1 : denom_manager.amount(amount, denom, assets_data),
                }
              }) || [], 'denom')
            ).map(([k, v]) => {
              return {
                denom: k,
                amount: _.sumBy(v, 'amount'),
              }
            }).filter(r => r?.amount > -1) || [],
            total: Object.entries(
              _.groupBy(total?.map(t => {
                const { denom, amount } = { ...t }
                return {
                  ...t,
                  denom: denom_manager.symbol(denom, assets_data),
                  amount: denom_manager.amount(amount, denom, assets_data),
                }
              }) || [], 'denom')
            ).map(([k, v]) => {
              return {
                denom: k,
                amount: _.sumBy(v, 'amount'),
              }
            }).filter(t => t?.amount > -1) || [],
          })
        }
      }
    }
    getData()
    return () => {
      controller?.abort()
    }
  }, [address, assets_data])

  useEffect(() => {
    const controller = new AbortController()
    const getData = async () => {
      if (address && address.length < 65 && assets_data && validators_data) {
        if (!controller.signal.aborted) {
          const validator_data = validators_data.find(v => equals_ignore_case(v?.delegator_address, address))
          const { operator_address } = { ...validator_data }
          if (operator_address) {
            const response = await distribution_commissions(operator_address)
            const { commission } = { ...response }
            setCommissions(commission?.commission?.map(c => {
              const { denom, amount } = { ...c }
              return {
                ...c,
                denom: denom_manager.symbol(denom, assets_data),
                amount: isNaN(amount) ? -1 : denom_manager.amount(amount, denom, assets_data),
              }
            }).filter(c => c?.amount > -1) || [])
          }
        }
      }
    }
    getData()
    return () => {
      controller?.abort()
    }
  }, [address, assets_data, validators_data])

  useEffect(() => {
    const controller = new AbortController()
    const getData = async () => {
      if (address && address.length >= 65 && evm_chains_data && cosmos_chains_data && assets_data) {
        if (!controller.signal.aborted) {
          const response = await deposit_addresses({
            query: {
              match: { deposit_address: address },
            },
            size: 10,
            sort: [{ height: 'desc' }],
          })
          setDepositAddresses(response?.data?.map(d => {
            const { asset, sender_chain, recipient_chain } = { ...d }
            return {
              ...d,
              denom: denom_manager.symbol(asset, assets_data),
              asset_data: assets_data.find(a => equals_ignore_case(a?.id, asset)),
              source_chain_data: evm_chains_data.find(c => equals_ignore_case(c?.id, sender_chain)) ||
                cosmos_chains_data.find(c => equals_ignore_case(c?.id, sender_chain)),
              destination_chain_data: evm_chains_data.find(c => equals_ignore_case(c?.id, recipient_chain)) ||
                cosmos_chains_data?.find(c => equals_ignore_case(c?.id, recipient_chain)),
            }
          }) || [])
        }
      }
    }
    getData()
    return () => {
      controller?.abort()
    }
  }, [address, evm_chains_data, cosmos_chains_data, assets_data])

  return (
    <div className="space-y-4 mt-2 mb-6 mx-auto">
      <Info
        data={address?.length >= 65 ?
          { depositAddresses } :
          {
            balances,
            delegations,
            redelegations,
            unbonds,
            rewards,
            commissions,
          }
        }
      />
      <Transactions />
    </div>
  )
}