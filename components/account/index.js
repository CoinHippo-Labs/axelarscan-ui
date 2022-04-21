import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'

import _ from 'lodash'
import moment from 'moment'
import Loader from 'react-loader-spinner'

import AccountDetail from './account-detail'
import TransactionsTable from '../transactions/transactions-table'
import Widget from '../widget'

import { allBankBalances, allStakingDelegations, allStakingUnbonding, distributionRewards, distributionCommissions, transactionsByEvents, transactionsByEventsPaging } from '../../lib/api/cosmos'
import { transactions as getTransactions, linkedAddresses } from '../../lib/api/opensearch'
import { denomer } from '../../lib/object/denom'
import { numberFormat, sleep } from '../../lib/utils'

export default function Account({ address }) {
  const { preferences, chains, cosmos_chains, denoms, env, validators } = useSelector(state => ({ preferences: state.preferences, chains: state.chains, cosmos_chains: state.cosmos_chains, denoms: state.denoms, env: state.env, validators: state.validators }), shallowEqual)
  const { theme } = { ...preferences }
  const { chains_data } = { ...chains }
  const { cosmos_chains_data } = { ...cosmos_chains }
  const { denoms_data } = { ...denoms }
  const { env_data } = { ...env }
  const { validators_data } = { ...validators }

  const [account, setAccount] = useState(null)
  const [transactions, setTransactions] = useState(null)
  const [loadMore, setLoadMore] = useState(null)
  const [loading, setLoading] = useState(null)
  const [actions, setActions] = useState({})
  const [filterActions, setFilterActions] = useState([])

  useEffect(() => {
    const controller = new AbortController()

    const getData = async () => {
      if (address && chains_data && denoms_data && validators_data) {
        let account_data, response

        const validator_data = validators_data?.find(v => v?.delegator_address?.toLowerCase() === address.toLowerCase())
        const operator_address = validator_data?.operator_address

        if (operator_address) {
          account_data = { ...account_data, operator_address }
        }

        if (!controller.signal.aborted) {
          response = await allBankBalances(address)

          if (response) {
            account_data = {
              ...account_data,
              balances: response.data?.map(b => {
                return {
                  ...b,
                  denom: denomer.symbol(b.denom, denoms_data),
                  amount: denomer.amount(b.amount, b.denom, denoms_data),
                }
              }),
            }
          }
        }

        if (address.length < 65) {
          if (!controller.signal.aborted) {
            response = await allStakingDelegations(address)

            if (response) {
              account_data = {
                ...account_data,
                stakingDelegations: response.data?.map(d => {
                  return {
                    ...d?.delegation,
                    validator_data: d?.delegation && (validators_data?.find(v => v.operator_address === d.delegation.validator_address) || {}),
                    shares: d.delegation?.shares && (isNaN(d.delegation.shares) ? -1 : denomer.amount(d.delegation.shares, d.balance?.denom, denoms_data)),
                    ...d.balance,
                    denom: denomer.symbol(d?.balance?.denom, denoms_data),
                    amount: d.balance?.amount && (isNaN(d.balance.amount) ? -1 : denomer.amount(d.balance.amount, d.balance.denom, denoms_data)),
                  }
                }),
              }
            }
          }

          if (!controller.signal.aborted) {
            response = await allStakingUnbonding(address)

            if (response) {
              account_data = {
                ...account_data,
                stakingUnbonding: response.data?.flatMap(u => !u?.entries ? [] : u.entries.map(e => {
                  return {
                    ...u,
                    validator_data: u && (validators_data?.find(v => v.operator_address === u.validator_address) || {}),
                    entries: undefined,
                    ...e,
                    creation_height: Number(e?.creation_height),
                    initial_balance: denomer.amount(Number(e?.initial_balance), denoms_data?.[0]?.id, denoms_data),
                    balance: denomer.amount(Number(e?.balance), denoms_data?.[0]?.id, denoms_data),
                  }
                })),
              }
            }
          }

          if (!controller.signal.aborted) {
            response = await distributionRewards(address)

            if (response) {
              account_data = {
                ...account_data,
                rewards: {
                  ...response,
                  rewards: response.rewards && Object.entries(_.groupBy(response.rewards.flatMap(r => r.reward).map(r => { return { ...r, denom: denomer.symbol(r.denom, denoms_data), amount: r.amount && (isNaN(r.amount) ? -1 : denomer.amount(r.amount, r.denom, denoms_data)) } }), 'denom')).map(([key, value]) => { return { denom: key, amount: _.sumBy(value, 'amount') } }),
                  total: response.total && Object.entries(_.groupBy(response.total.map(t => { return { ...t, denom: denomer.symbol(t.denom, denoms_data), amount: t.amount && denomer.amount(t.amount, t.denom, denoms_data) } }), 'denom')).map(([key, value]) => { return { denom: key, amount: _.sumBy(value, 'amount') } }),
                },
              }
            }
          }

          if (!controller.signal.aborted) {
            if (operator_address) {
              response = await distributionCommissions(operator_address)

              if (response) {
                account_data = {
                  ...account_data,
                  commission: response?.commission?.commission?.map(c => {
                    return {
                      ...c,
                      denom: denomer.symbol(c.denom, denoms_data),
                      amount: c.amount && (isNaN(c.amount) ? -1 : denomer.amount(c.amount, c.denom, denoms_data)),
                    }
                  }),
                }
              }
            }
          }
        }
        else {
          if (!controller.signal.aborted) {
            const response = await linkedAddresses({
              query: {
                // match: { _id: address.toLowerCase() },
                match: { deposit_address: address.toLowerCase() },
              },
              sort: [
                { height: 'desc' },
              ],
              size: 1000,
            })

            if (response) {
              account_data = {
                ...account_data,
                linked_addresses: response?.data?.map(l => {
                  return {
                    ...l,
                    denom: denomer.symbol(l.asset, denoms_data),
                    asset: denoms_data?.find(d => d?.id === l.asset),
                    from_chain: chains_data?.find(c => c?.id === l.sender_chain) || cosmos_chains_data?.find(c => c?.id === l.sender_chain),
                    to_chain: chains_data?.find(c => c?.id === l.recipient_chain) || cosmos_chains_data?.find(c => c?.id === l.recipient_chain),
                  }
                }),
              }
            }
          }
        }

        if (!controller.signal.aborted) {
          account_data = {
            ...account_data,
            total: Object.entries(_.groupBy(_.concat(
              account_data.balances?.filter(b => b.amount > -1),
              account_data.stakingDelegations?.filter(d => d.amount > -1),
              account_data.stakingUnbonding?.map(u => { return { ...u, denom: u.denom || env_data?.staking_params?.bond_denom, amount: u.balance } }),
              account_data.rewards?.rewards?.filter(r => r.amount > -1),
              account_data.commission?.filter(c => c.amount > -1)
            ), 'denom')).map(([key, value]) => { return { denom: key, amount: _.sumBy(value, 'amount') } }).filter(t => t.denom && !['undefined'].includes(t.denom)),
          }

          setAccount({ data: account_data || {}, address })
        }
      }
    }

    getData()

    const interval = setInterval(() => getData(), 3 * 60 * 1000)
    return () => {
      controller?.abort()
      clearInterval(interval)
    }
  }, [address, chains_data, denoms_data, validators_data])

  useEffect(() => {
    const controller = new AbortController()

    const getData = async () => {
      if (address && denoms_data) {
        const data = (transactions?.address === address && transactions?.data) || {}

        setLoading(true)
        setTransactions(Object.keys(data).length > 0 ? { data, address } : null)

        if (address.length >= 65) {
          if (!controller.signal.aborted) {
            const response = await transactionsByEvents(`transfer.sender='${address}'`, null, null, null, denoms_data)

            if (response?.data?.length > 0) {
              data[0] = response
              setTransactions({ data, address })
            }
          }
          if (!controller.signal.aborted) {
            const response = await transactionsByEvents(`transfer.recipient='${address}'`, null, null, null, denoms_data)

            if (response?.data?.length > 0) {
              data[1] = response
              setTransactions({ data, address })
            }
          }
          if (!controller.signal.aborted) {
            const response = await transactionsByEvents(`message.sender='${address}'`, null, null, null, denoms_data)

            if (response?.data?.length > 0) {
              data[2] = response
              setTransactions({ data, address })
            }
          }
          if (!controller.signal.aborted && address.length >= 65) {
            const response = await transactionsByEvents(`link.depositAddress='${address}'`, null, null, null, denoms_data)

            if (response?.data?.length > 0) {
              data[3] = response
              setTransactions({ data, address })
            }
          }
        }
        else {
          if (!controller.signal.aborted) {
            const response = await getTransactions({
              size: 1000,
              from: 0,
              query: {
                bool: {
                  must: [
                    { match: { addresses: address } },
                  ],
                },
              },
              sort: [{ timestamp: 'desc' }],
            }, denoms_data)

            if (response?.data?.length > 0) {
              data[0] = response
              setTransactions({ data, address })
            }
          }
        }

        setTransactions({ data, address })
        setLoading(false)
      }
    }

    getData()

    return () => {
      controller?.abort()
    }
  }, [address, denoms_data])

  useEffect(() => {
    const getData = async () => {
      if (transactions?.data) {
        const data = (transactions?.address === address && transactions?.data) || {}

        setLoading(true)

        for (let i = 0; i < Object.entries(transactions.data).length; i++) {
          const [key, value] = Object.entries(transactions.data)[i]

          if (value?.data) {
            if (address.length >= 65) {
              if (Number(key) === 0) {
                if (value.offset > 0) {
                  const response = await transactionsByEventsPaging(`transfer.sender='${address}'`, value.data, value.offset || (value.total - value.data.length), denoms_data)

                  if (response?.data?.length > 0) {
                    data[0] = response
                    setTransactions({ data, address })
                  }
                }
              }
              else if (Number(key) === 1) {
                if (value.offset > 0) {
                  const response = await transactionsByEventsPaging(`transfer.recipient='${address}'`, value.data, value.offset || (value.total - value.data.length), denoms_data)

                  if (response?.data?.length > 0) {
                    data[1] = response
                    setTransactions({ data, address })
                  }
                }
              }
              else if (Number(key) === 2) {
                if (value.offset > 0) {
                  const response = await transactionsByEventsPaging(`message.sender='${address}'`, value.data, value.offset || (value.total - value.data.length), denoms_data)

                  if (response?.data?.length > 0) {
                    data[2] = response
                    setTransactions({ data, address })
                  }
                }
              }
              else if (Number(key) === 3) {
                if (value.offset > 0 && address.length >= 65) {
                  const response = await transactionsByEventsPaging(`link.depositAddress='${address}'`, value.data, value.offset || (value.total - value.data.length), denoms_data)

                  if (response?.data?.length > 0) {
                    data[3] = response
                    setTransactions({ data, address })
                  }
                }
              }
            }
            else {
              if (Number(key) === 0) {
                if (value.total > value.data.length) {
                  const response = await getTransactions({
                    size: 1000,
                    from: value.data.length - 1,
                    query: {
                      bool: {
                        must: [
                          { match: { addresses: address } },
                        ],
                      },
                    },
                    sort: [{ timestamp: 'desc' }],
                  }, denoms_data)

                  if (response?.data?.length > 0) {
                    data[0] = { ...response, data: _.uniqBy(_.concat(value.data, response.data), 'txhash') }
                    setTransactions({ data, address })
                  }
                }
              }
            }
          }
        }

        await sleep(0.5 * 1000)

        setLoading(false)
      }
    }

    if (loadMore) {
      setLoadMore(false)

      getData()
    }
  }, [loadMore])

  useEffect(() => {
    if (address && transactions?.address === address && transactions.data) {
      setActions(_.countBy(_.uniqBy(Object.values(transactions?.data).flatMap(txs => txs?.data?.flatMap(_txs => _txs)), 'txhash').map(tx => tx.type)))
    }
  }, [address, transactions])

  return (
    <div className="max-w-8xl my-2 xl:my-4 mx-auto">
      <AccountDetail
        address={address}
        data={account?.address === address && account?.data}
      />
      <Widget
        title={<div className="flex sm:items-center overflow-x-auto text-gray-900 dark:text-white text-lg font-semibold">
          <span className="mr-4">Transactions</span>
          <div className={`block sm:flex flex-wrap items-center justify-end ${Object.keys(actions).length > 6 ? '' : 'overflow-x-auto'} space-x-1 mt-0.5 sm:ml-auto`}>
            {Object.entries(actions).map(([key, value]) => (
              <div
                key={key}
                onClick={() => setFilterActions(_.uniq(filterActions.includes(key) ? filterActions.filter(_action => _action !== key) : _.concat(filterActions, key)))}
                className={`max-w-min btn btn-rounded cursor-pointer whitespace-nowrap flex items-center space-x-1.5 bg-trasparent ${filterActions.includes(key) ? 'bg-gray-100 dark:bg-black text-gray-900 dark:text-white font-semibold' : 'hover:bg-gray-50 dark:hover:bg-gray-900 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-100'} mb-1 ml-1 px-2`}
                style={{ textTransform: 'none', fontSize: '.7rem' }}
              >
                <span>{key === 'undefined' ? 'Failed' : key?.endsWith('Request') ? key.replace('Request', '') : key}</span>
                <span className="text-2xs text-indigo-600 dark:text-indigo-400 font-bold mt-0.5"> {numberFormat(value, '0,0')}</span>
              </div>
            ))}
          </div>
        </div>}
        className="dark:border-gray-900 flex-col sm:flex-row items-start sm:items-center mt-4"
      >
        <div className="mt-3">
          <TransactionsTable
            data={address && transactions?.address === address && { ...transactions, data: _.orderBy(_.uniqBy(Object.values(transactions?.data || {}).flatMap(txs => txs?.data?.flatMap(_txs => _txs)), 'txhash'), ['timestamp', 'height'], ['desc', 'desc']).filter(tx => !(filterActions?.length > 0) || filterActions.includes(tx.type) || (filterActions.includes('undefined') && !tx.type))?.map(tx => { return { ...tx, transfer: tx.activities?.findIndex(a => a.sender?.toLowerCase() === address?.toLowerCase()) > -1 ? 'out' : tx.activities?.findIndex(a => a.receiver?.toLowerCase() === address?.toLowerCase()) > -1 ? 'in' : null } }) }}
            location="account"
            noLoad={true}
            className="no-border"
          />
        </div>
        {!loading ?
          <div
            onClick={() => setLoadMore(true)}
            className="btn btn-default btn-rounded max-w-max bg-trasparent bg-gray-100 dark:bg-gray-900 hover:bg-gray-200 dark:hover:bg-gray-800 cursor-pointer text-gray-900 dark:text-white font-semibold mt-4 mx-auto"
          >
            Load More
          </div>
          :
          <div className="flex justify-center mt-4">
            <Loader type="ThreeDots" color={theme === 'dark' ? 'white' : '#3B82F6'} width="32" height="32" />
          </div>
        }
      </Widget>
    </div>
  )
}