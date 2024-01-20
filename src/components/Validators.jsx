'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { create } from 'zustand'
import clsx from 'clsx'
import _ from 'lodash'

import { Container } from '@/components/Container'
import { Spinner } from '@/components/Spinner'
import { Tag } from '@/components/Tag'
import { Number } from '@/components/Number'
import { Profile } from '@/components/Profile'
import { useGlobalStore } from '@/app/providers'
import { getValidatorsVotes, getChainMaintainers } from '@/lib/api/validator'
import { toArray } from '@/lib/parser'
import { equalsIgnoreCase } from '@/lib/string'
import { isNumber, toNumber, formatUnits, toFixed } from '@/lib/number'

export const useValidatorStore = create()(set => ({
  maintainers: null,
  setMaintainers: data => set(state => ({ ...state, maintainers: { ...state.maintainers, ...data } })),
}))

const statuses = ['active', 'inactive']

export function Validators({ status }) {
  const [EVMChains, setEVMChains] = useState(null)
  const [validatorsVotes, setValidatorsVotes] = useState(null)
  const [data, setData] = useState(null)
  const { chains, contracts, validators, inflationData, networkParameters } = useGlobalStore()
  const { maintainers, setMaintainers } = useValidatorStore()

  useEffect(() => {
    if (chains && contracts) setEVMChains(toArray(chains).filter(d => d.chain_type ==='evm' && contracts.gateway_contracts?.[d.id]?.address))
  }, [chains, contracts, setEVMChains])

  useEffect(() => {
    const getData = async () => {
      if (EVMChains) {
        setMaintainers(Object.fromEntries(toArray(
          await Promise.all(EVMChains.filter(d => !maintainers?.[d.id]).map(d => new Promise(async resolve => {
            const { maintainers } = { ...await getChainMaintainers({ chain: d.id }) }
            resolve(maintainers && [d.id, maintainers])
          })))
        )))
      }
    }
    getData()
  }, [EVMChains, setMaintainers])

  useEffect(() => {
    const getData = async () => {
      const response = await getValidatorsVotes()
      if (response?.data) setValidatorsVotes(response)
    }
    getData()
  }, [setValidatorsVotes])

  useEffect(() => {
    if (EVMChains && validatorsVotes && validators && inflationData && networkParameters && Object.keys({ ...maintainers }).length === EVMChains.length) {
      const { tendermintInflationRate, keyMgmtRelativeInflationRate, externalChainVotingInflationRate, communityTax } = { ...inflationData }
      const { bankSupply, stakingPool } = { ...networkParameters }

      const _data = _.orderBy(validators.map(d => {
        const { rate } = { ...d.commission?.commission_rates }

        if (validatorsVotes?.data) {
          d.total_polls = toNumber(validatorsVotes.total)
          d.votes = { ...validatorsVotes.data[d.broadcaster_address] }
          d.total_votes = toNumber(d.votes.total)

          const getVoteCount = (vote, votes) => _.sum(Object.values({ ...votes }).map(v => toNumber(_.last(Object.entries({ ...v?.votes }).find(([k, v]) => equalsIgnoreCase(k, vote?.toString()))))))
          d.total_yes_votes = getVoteCount(true, d.votes.chains)
          d.total_no_votes = getVoteCount(false, d.votes.chains)
          d.total_unsubmitted_votes = getVoteCount('unsubmitted', d.votes.chains)
        }

        const supportedChains = Object.entries(maintainers).filter(([k, v]) => v.includes(d.operator_address)).map(([k, v]) => k)
        const inflation = toFixed(
          ((d.uptime / 100) * toNumber(tendermintInflationRate)) +
          ((isNumber(d.heartbeats_uptime) ? d.heartbeats_uptime / 100 : 1) * toNumber(keyMgmtRelativeInflationRate) * toNumber(tendermintInflationRate)) +
          (toNumber(externalChainVotingInflationRate) * _.sum(supportedChains.map(c => {
            const { total, total_polls } = { ...d.votes?.chains?.[c] }
            return 1 - (total_polls ? (total_polls - total) / total_polls : 0)
          }))), 6
        )

        return {
          ...d,
          inflation,
          apr: (inflation * 100) * formatUnits(bankSupply?.amount, 6) * (1 - toNumber(communityTax)) * (1 - toNumber(rate)) / formatUnits(stakingPool?.bonded_tokens, 6),
          supportedChains,
          votes: d.votes && { ...d.votes, chains: Object.fromEntries(Object.entries({ ...d.votes.chains }).filter(([k, v]) => supportedChains.includes(k))) },
        }
      }), ['quadratic_voting_power', 'tokens'], ['desc', 'desc'])

      if (!_.isEqual(_data, data)) setData(_data)
    }
  }, [status, EVMChains, validatorsVotes, data, validators, inflationData, networkParameters, maintainers, setData])

  const filter = status => toArray(data).filter(d => status === 'inactive' ? d.status !== 'BOND_STATUS_BONDED' : d.status === 'BOND_STATUS_BONDED' && !d.jailed)

  return (
    <Container className="sm:mt-8">
      {!data ? <Spinner /> :
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between sm:gap-x-4 gap-y-4 sm:gap-y-0">
            <div className="sm:flex-auto">
              <h1 className="text-zinc-900 dark:text-zinc-100 text-base font-semibold leading-6">Validators</h1>
              <p className="mt-2 text-zinc-400 dark:text-zinc-500 text-sm">
                List of {status || 'active'} validators in Axelar Network.
              </p>
            </div>
            <nav className="flex gap-x-4">
              {statuses.map((d, i) => (
                <Link
                  key={i}
                  href={`/validators${d !== 'active' ? `/${d}` : ''}`}
                  className={clsx(
                    'rounded-md px-3 py-2 capitalize text-base font-medium',
                    d === (status || 'active') ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300' : 'text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-400',
                  )}
                >
                  {d} ({filter(d).length})
                </Link>
              ))}
            </nav>
          </div>
          <div className="overflow-x-auto lg:overflow-x-visible -mx-4 sm:-mx-0 mt-4">
            <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-700">
              <thead className="sticky top-0 z-10 bg-white dark:bg-zinc-900">
                <tr className="text-zinc-800 dark:text-zinc-200 text-sm font-semibold">
                  <th scope="col" className="pl-4 sm:pl-0 pr-3 py-3.5 text-left">
                    #
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left">
                    Validator
                  </th>
                  <th scope="col" className="hidden sm:table-cell px-3 py-3.5 text-left whitespace-nowrap">
                    Consensus Power
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left whitespace-nowrap">
                    Quadratic Power
                  </th>
                  <th scope="col" className="hidden sm:table-cell px-3 py-3.5 text-right">
                    Uptime
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-right">
                    Heartbeat
                  </th>
                  <th scope="col" className="hidden sm:table-cell px-3 py-3.5 text-right">
                    EVM Votes
                  </th>
                  <th scope="col" className="pl-3 pr-4 sm:pr-0 py-3.5 text-right">
                    EVM Supported
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-zinc-900 divide-y divide-zinc-100 dark:divide-zinc-800">
                {filter(status).map((d, i) => {
                  const { rate } = { ...d.commission?.commission_rates }

                  return (
                    <tr key={i} className="align-top text-zinc-400 dark:text-zinc-500 text-sm">
                      <td className="pl-4 sm:pl-0 pr-3 py-4 text-left">
                        {i + 1}
                      </td>
                      <td className="px-3 py-4 text-left">
                        <div className="flex flex-col gap-y-0.5">
                          <Profile i={i} address={d.operator_address} prefix="axelarvaloper" />
                          {isNumber(rate) && (
                            <Number
                              value={rate * 100}
                              maxDecimals={2}
                              prefix="Commission: "
                              suffix="%"
                              noTooltip={true}
                              className="capitalize text-zinc-400 dark:text-zinc-500 font-medium"
                            />
                          )}
                          {isNumber(d.inflation) && (
                            <Number
                              value={d.inflation * 100}
                              maxDecimals={2}
                              prefix="Inflation: "
                              suffix="%"
                              noTooltip={true}
                              className="capitalize text-zinc-400 dark:text-zinc-500 font-medium"
                            />
                          )}
                          {isNumber(d.apr) && (
                            <Number
                              value={d.apr}
                              maxDecimals={2}
                              prefix="APR: "
                              suffix="%"
                              noTooltip={true}
                              className="capitalize text-zinc-400 dark:text-zinc-500 font-medium"
                            />
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-4 text-left">
                        {d.type && <Tag className="w-fit">{d.type}</Tag>}
                      </td>
                      <td className="hidden sm:table-cell px-3 py-4 text-left">
                        <Number value={d.content?.plan?.height} />
                      </td>
                      <td className="hidden sm:table-cell px-3 py-4 text-right">
                        <div className="flex flex-col items-end gap-y-1">
                          {toArray(d.total_deposit).map((d, i) => (
                            <Number
                              key={i}
                              value={d.amount}
                              suffix={` ${d.symbol}`}
                              noTooltip={true}
                              className="text-zinc-700 dark:text-zinc-300 font-medium"
                            />
                          ))}
                        </div>
                      </td>
                      <td className="pl-3 pr-4 sm:pr-0 py-4 text-right">
                        {d.status && (
                          <div className="flex flex-col items-end gap-y-1">
                            <Tag className={clsx('w-fit', ['UNSPECIFIED', 'DEPOSIT_PERIOD'].includes(d.status) ? '' : ['VOTING_PERIOD'].includes(d.status) ? 'bg-yellow-400 dark:bg-yellow-500' : ['REJECTED', 'FAILED'].includes(d.status) ? 'bg-red-600 dark:bg-red-500' : 'bg-green-600 dark:bg-green-500')}>
                              {d.status}
                            </Tag>
                            {['PASSED', 'REJECTED'].includes(d.status) && (
                              <div className="flex flex-col items-end gap-y-0.5">
                                {Object.entries({ ...d.final_tally_result }).filter(([k, v]) => toNumber(v) > 0).map(([k, v]) => (
                                  <Number
                                    key={k}
                                    value={v}
                                    format="0,0.00a"
                                    prefix={`${k}: `}
                                    noTooltip={true}
                                    className="capitalize text-zinc-400 dark:text-zinc-500 font-medium"
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      }
    </Container>
  )
}
