import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'

import Info from './info'
import Transactions from '../transactions'
import Spinner from '../spinner'
import { getBalances, getDelegations, getRedelegations, getUnbondings } from '../../lib/api/account'
import { distributionRewards, distributionCommissions } from '../../lib/api/lcd'
import { searchTransfers, searchDepositAddresses } from '../../lib/api/transfers'
import { getChainData, getAssetData } from '../../lib/config'
import { getKeyType } from '../../lib/key'
import { formatUnits } from '../../lib/number'
import { toArray, includesStringList, equalsIgnoreCase, normalizeQuote } from '../../lib/utils'
import accounts from '../../data/accounts'

export default () => {
  const { chains, assets, validators } = useSelector(state => ({ chains: state.chains, assets: state.assets, validators: state.validators }), shallowEqual)
  const { chains_data } = { ...chains }
  const { assets_data } = { ...assets }
  const { validators_data } = { ...validators }

  const router = useRouter()
  const { query } = { ...router }
  let { address } = { ...query }
  address = normalizeQuote(address)

  const [balances, setBalances] = useState(null)
  const [delegations, setDelegations] = useState(null)
  const [redelegations, setRedelegations] = useState(null)
  const [unbondings, setUnbondings] = useState(null)
  const [rewards, setRewards] = useState(null)
  const [commissions, setCommissions] = useState(null)
  const [depositAddressData, setDepositAddressData] = useState(null)

  useEffect(
    () => {
      if (address) {
        setBalances(null)
        setDelegations(null)
        setRedelegations(null)
        setUnbondings(null)
        setRewards(null)
        setCommissions(null)
        setDepositAddressData(null)
      }
    },
    [address],
  )

  useEffect(
    () => {
      const getData = async () => {
        if (address) {
          if (['axelarvaloper', 'axelarvalcons'].findIndex(p => address.startsWith(p)) > -1 && validators_data) {
            const { operator_address } = { ...validators_data.find(v => includesStringList(address.toLowerCase(), [v.operator_address, v.consensus_address])) }
            router.push(`/validator/${operator_address}`)
          }
          else if (address.startsWith('axelar1') && assets_data && (!validators_data || !balances)) {
            const { data } = { ...await getBalances({ address }) }
            setBalances(
              _.orderBy(
                toArray(data).map(d => {
                  const { denom, amount } = { ...d }
                  const { price } = { ...getAssetData(denom, assets_data) }
                  return {
                    ...d,
                    value: (amount || 0) * (price || 0),
                  }
                }),
                ['value'], ['desc'],
              )
            )
          }
        }
      }
      getData()
    },
    [address, assets_data, validators_data],
  )

  useEffect(
    () => {
      const getData = async () => {
        if (address?.startsWith('axelar1') && (address.length < 65 || isCustomAddress) && validators_data) {
          const { data } = { ...await getDelegations({ address }) }
          setDelegations(toArray(data).map(d => { return { ...d, validator_data: validators_data.find(v => equalsIgnoreCase(v.operator_address, d.validator_address)) } }))
        }
      }
      getData()
    },
    [address, validators_data],
  )

  useEffect(
    () => {
      const getData = async () => {
        if (address?.startsWith('axelar1') && (address.length < 65 || isCustomAddress) && validators_data) {
          const { data } = { ...await getRedelegations({ address }) }
          setRedelegations(toArray(data).map(d => { return { ...d, source_validator_data: validators_data.find(v => equalsIgnoreCase(v.operator_address, d.validator_src_address)), destination_validator_data: validators_data.find(v => equalsIgnoreCase(v.operator_address, d.validator_dst_address)) } }))
        }
      }
      getData()
    },
    [address, validators_data],
  )

  useEffect(
    () => {
      const getData = async () => {
        if (address?.startsWith('axelar1') && (address.length < 65 || isCustomAddress) && validators_data) {
          const { data } = { ...await getUnbondings({ address }) }
          setUnbondings(toArray(data).map(d => { return { ...d, validator_data: validators_data.find(v => equalsIgnoreCase(v.operator_address, d.validator_address)) } }))
        }
      }
      getData()
    },
    [address, validators_data],
  )

  useEffect(
    () => {
      const getData = async () => {
        if (address?.startsWith('axelar1') && (address.length < 65 || isCustomAddress) && assets_data) {
          const { rewards, total } = { ...await distributionRewards(address) }
          setRewards({
            rewards:
              Object.entries(
                _.groupBy(
                  toArray(rewards).flatMap(d => d.reward).map(d => {
                    const { denom, amount } = { ...d }
                    const { symbol } = { ...getAssetData(denom, assets_data) }
                    return {
                      ...d,
                      symbol,
                      amount: formatUnits(amount),
                    }
                  })
                  .filter(d => typeof d.amount === 'number'),
                  'denom',
                )
              )
              .map(([k, v]) => {
                return {
                  denom: k,
                  symbol: _.head(v)?.symbol,
                  amount: _.sumBy(v, 'amount'),
                }
              }),
            total:
              Object.entries(
                _.groupBy(
                  toArray(total).map(d => {
                    const { denom, amount } = { ...d }
                    const { symbol } = { ...getAssetData(denom, assets_data) }
                    return {
                      ...d,
                      symbol,
                      amount: formatUnits(amount),
                    }
                  })
                  .filter(d => typeof d.amount === 'number'),
                  'denom',
                )
              )
              .map(([k, v]) => {
                return {
                  denom: k,
                  symbol: _.head(v)?.symbol,
                  amount: _.sumBy(v, 'amount'),
                }
              }),
          })
        }
      }
      getData()
    },
    [address, assets_data],
  )

  useEffect(
    () => {
      const getData = async () => {
        if (address?.startsWith('axelar1') && (address.length < 65 || isCustomAddress) && assets_data && validators_data) {
          const { operator_address } = { ...validators_data.find(v => equalsIgnoreCase(v.delegator_address, address)) }
          if (operator_address) {
            const { commission } = { ...await distributionCommissions(operator_address) }
            setCommissions(
              toArray(commission?.commission).map(d => {
                const { denom, amount } = { ...d }
                const { symbol } = { ...getAssetData(denom, assets_data) }
                return {
                  ...d,
                  symbol,
                  amount: formatUnits(amount),
                }
              })
              .filter(d => typeof d.amount === 'number')
            )
          }
        }
      }
      getData()
    },
    [address, assets_data, validators_data],
  )

  useEffect(
    () => {
      const getData = async () => {
        if (address && (address.length >= 65 || getKeyType(address, chains_data) === 'evmAddress') && !isCustomAddress && chains_data && assets_data) {
          let response = await searchDepositAddresses({ depositAddress: address })
          const desposit_address_data = _.head(response?.data)
          response = await searchTransfers({ depositAddress: address })
          const transfer_data = _.head(response?.data)
          const { original_sender_chain, original_recipient_chain, sender_chain, recipient_chain, denom } = { ...desposit_address_data }
          const asset_data = getAssetData(denom, assets_data)
          const { symbol } = { ...asset_data }
          setDepositAddressData({
            ...desposit_address_data,
            source_chain_data: getChainData(sender_chain, chains_data) || getChainData(original_sender_chain, chains_data),
            destination_chain_data: getChainData(recipient_chain, chains_data) || getChainData(original_recipient_chain, chains_data),
            symbol,
            asset_data,
            transfer_data,
          })
        }
      }
      getData()
    },
    [address, chains_data, assets_data],
  )

  const isCustomAddress = accounts.findIndex(a => equalsIgnoreCase(a.address, address)) > -1
  const data = address && (address.length >= 65 || getKeyType(address, chains_data) === 'evmAddress') && !isCustomAddress ?
    depositAddressData && { depositAddressData, balances } :
    (balances || delegations || redelegations || unbondings || rewards || commissions) && {
      balances,
      delegations,
      redelegations,
      unbondings,
      rewards,
      commissions,
    }

  return (
    <div className="children px-3">
      {data ?
        <div className="max-w-7xl space-y-4 sm:space-y-6 mt-6 sm:mt-8 mx-auto">
          <Info address={address} data={data} />
          <Transactions />
        </div> :
        <div className="loading">
          <Spinner name="Blocks" />
        </div>
      }
    </div>
  )
}