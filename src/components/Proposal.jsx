'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import Linkify from 'react-linkify'
import clsx from 'clsx'
import _ from 'lodash'
import moment from 'moment'

import { Container } from '@/components/Container'
import { Image } from '@/components/Image'
import { JSONView } from '@/components/JSONView'
import { Copy } from '@/components/Copy'
import { Tooltip } from '@/components/Tooltip'
import { Spinner } from '@/components/Spinner'
import { Tag } from '@/components/Tag'
import { Number } from '@/components/Number'
import { Profile } from '@/components/Profile'
import { useGlobalStore } from '@/components/Global'
import { getProposal } from '@/lib/api/axelarscan'
import { getChainData } from '@/lib/config'
import { toJson, toArray } from '@/lib/parser'
import { equalsIgnoreCase, ellipse, toTitle } from '@/lib/string'
import { toNumber } from '@/lib/number'
import { TIME_FORMAT } from '@/lib/time'

function Info({ id, data, end, voteOptions }) {
  const { chains } = useGlobalStore()

  const { proposal_id, type, content, status, submit_time, deposit_end_time, voting_start_time, voting_end_time, total_deposit, final_tally_result } = { ...data }
  const { plan, title, description, changes, contract_calls } = { ...content }
  const { height, info } = { ...plan }

  return (
    <div className="overflow-hidden bg-zinc-50/75 dark:bg-zinc-800/25 shadow sm:rounded-lg">
      <div className="px-4 sm:px-6 py-6">
        <h3 className="text-zinc-900 dark:text-zinc-100 text-base font-semibold leading-7">
          {title || plan?.name}
        </h3>
        <p className="max-w-2xl text-zinc-400 dark:text-zinc-500 text-sm leading-6 mt-1">
          Proposal ID: {proposal_id || id}
        </p>
      </div>
      <div className="border-t border-zinc-200 dark:border-zinc-700">
        <dl className="divide-y divide-zinc-100 dark:divide-zinc-800">
          <div className="px-4 sm:px-6 py-6 sm:grid sm:grid-cols-3 sm:gap-4">
            <dt className="text-zinc-900 dark:text-zinc-100 text-sm font-medium">Description</dt>
            <dd className="sm:col-span-2 text-zinc-700 dark:text-zinc-300 text-sm leading-6 mt-1 sm:mt-0">
              <span className="max-w-xl linkify text-zinc-400 dark:text-zinc-500 break-words whitespace-pre-wrap">
                <Linkify>
                  {description}
                </Linkify>
              </span>
            </dd>
          </div>
          <div className="px-4 sm:px-6 py-6 sm:grid sm:grid-cols-3 sm:gap-4">
            <dt className="text-zinc-900 dark:text-zinc-100 text-sm font-medium">Status</dt>
            <dd className="sm:col-span-2 text-zinc-700 dark:text-zinc-300 text-sm leading-6 mt-1 sm:mt-0">
              {status && (
                <Tag className={clsx('w-fit', ['UNSPECIFIED', 'DEPOSIT_PERIOD'].includes(status) ? '' : ['VOTING_PERIOD'].includes(status) ? 'bg-yellow-400 dark:bg-yellow-500' : ['REJECTED', 'FAILED'].includes(status) ? 'bg-red-600 dark:bg-red-500' : 'bg-green-600 dark:bg-green-500')}>
                  {status}
                </Tag>
              )}
            </dd>
          </div>
          {type && (
            <div className="px-4 sm:px-6 py-6 sm:grid sm:grid-cols-3 sm:gap-4">
              <dt className="text-zinc-900 dark:text-zinc-100 text-sm font-medium">Type</dt>
              <dd className="sm:col-span-2 text-zinc-700 dark:text-zinc-300 text-sm leading-6 mt-1 sm:mt-0">
                <Tag className="w-fit">
                  {type}
                </Tag>
              </dd>
            </div>
          )}
          {plan && (
            <>
              <div className="px-4 sm:px-6 py-6 sm:grid sm:grid-cols-3 sm:gap-4">
                <dt className="text-zinc-900 dark:text-zinc-100 text-sm font-medium">Plan</dt>
                <dd className="sm:col-span-2 text-zinc-700 dark:text-zinc-300 text-sm font-medium leading-6 mt-1 sm:mt-0">
                  {plan.name}
                </dd>
              </div>
              <div className="px-4 sm:px-6 py-6 sm:grid sm:grid-cols-3 sm:gap-4">
                <dt className="text-zinc-900 dark:text-zinc-100 text-sm font-medium">Height</dt>
                <dd className="sm:col-span-2 text-zinc-700 dark:text-zinc-300 text-sm font-medium leading-6 mt-1 sm:mt-0">
                  <Number value={height} />
                </dd>
              </div>
              {info && (
                <div className="px-4 sm:px-6 py-6 sm:grid sm:grid-cols-3 sm:gap-4">
                  <dt className="text-zinc-900 dark:text-zinc-100 text-sm font-medium">{type}</dt>
                  <dd className="sm:col-span-2 text-zinc-700 dark:text-zinc-300 text-sm font-medium leading-6 mt-1 sm:mt-0">
                    {typeof toJson(info) === 'object' ?
                      <JSONView value={info} /> :
                      <div className="bg-zinc-100 dark:bg-zinc-800 rounded-lg p-3">
                        {info}
                      </div>
                    }
                  </dd>
                </div>
              )}
            </>
          )}
          {toArray(changes).filter(d => d.subspace).map(({ key, value, subspace }, i) => (
            <div key={i} className="px-4 sm:px-6 py-6 sm:grid sm:grid-cols-3 sm:gap-4">
              <dt className="text-zinc-900 dark:text-zinc-100 text-sm font-medium">{subspace}</dt>
              <dd className="sm:col-span-2 text-zinc-700 dark:text-zinc-300 text-sm font-medium leading-6 mt-1 sm:mt-0">
                {typeof toJson(value) === 'object' ?
                  <div className="flex flex-col gap-y-2">
                    <Tag className="w-fit bg-orange-400 dark:bg-orange-500 whitespace-nowrap">
                      {key}
                    </Tag>
                    <JSONView value={value} />
                  </div> :
                  <Tag className="w-fit bg-orange-400 dark:bg-orange-500 whitespace-nowrap">
                    {key} = {value}
                  </Tag>
                }
              </dd>
            </div>
          ))}
          {toArray(contract_calls).length > 0 && (
            <div className="px-4 sm:px-6 py-6 sm:grid sm:grid-cols-3 sm:gap-4">
              <dt className="text-zinc-900 dark:text-zinc-100 text-sm font-medium">GMP(s)</dt>
              <Link
                href={`/gmp/search?proposalId=${proposal_id}`}
                target="_blank"
                className="h-6 flex items-center gap-x-3"
              >
                <div>
                  <div className="block dark:hidden">
                    <Image
                      src="/logos/logo.png"
                      alt=""
                      width={24}
                      height={24}
                    />
                  </div>
                  <div className="hidden dark:block">
                    <Image
                      src="/logos/logo_white.png"
                      alt=""
                      width={24}
                      height={24}
                    />
                  </div>
                </div>
                <div className="w-12 h-1 border-t-2 border-dashed border-zinc-400 dark:border-zinc-600" />
                <div className="max-w-fit flex flex-wrap items-center">
                  {contract_calls.map(({ chain }, i) => {
                    const { name, image } = { ...getChainData(chain, chains) }

                    return (
                      <div key={i} className="mr-0.5 mb-0.5">
                        <Tooltip content={name}>
                          <Image
                            src={image}
                            alt=""
                            width={20}
                            height={20}
                          />
                        </Tooltip>
                      </div>
                    )
                  })}
                </div>
              </Link>
            </div>
          )}
          <div className="px-4 sm:px-6 py-6 sm:grid sm:grid-cols-3 sm:gap-4">
            <dt className="text-zinc-900 dark:text-zinc-100 text-sm font-medium">Deposit Period</dt>
            <dd className="sm:col-span-2 text-zinc-700 dark:text-zinc-300 text-sm leading-6 mt-1 sm:mt-0">
              {!!proposal_id && (
                <>
                  {moment(submit_time).format(TIME_FORMAT)} - {moment(deposit_end_time).format(TIME_FORMAT)}
                </>
              )}
            </dd>
          </div>
          <div className="px-4 sm:px-6 py-6 sm:grid sm:grid-cols-3 sm:gap-4">
            <dt className="text-zinc-900 dark:text-zinc-100 text-sm font-medium">Voting Period</dt>
            <dd className="sm:col-span-2 text-zinc-700 dark:text-zinc-300 text-sm leading-6 mt-1 sm:mt-0">
              {!!proposal_id && (
                <>
                  {moment(voting_start_time).format(TIME_FORMAT)} - {moment(voting_end_time).format(TIME_FORMAT)}
                </>
              )}
            </dd>
          </div>
          <div className="px-4 sm:px-6 py-6 sm:grid sm:grid-cols-3 sm:gap-4">
            <dt className="text-zinc-900 dark:text-zinc-100 text-sm font-medium">Total Deposit</dt>
            <dd className="sm:col-span-2 text-zinc-700 dark:text-zinc-300 text-sm leading-6 mt-1 sm:mt-0">
              <div className="flex flex-col gap-y-1">
                {toArray(total_deposit).map((d, i) => (
                  <Number
                    key={i}
                    value={d.amount}
                    suffix={` ${d.symbol}`}
                    noTooltip={true}
                    className="text-zinc-700 dark:text-zinc-300 font-medium"
                  />
                ))}
              </div>
            </dd>
          </div>
          <div className="px-4 sm:px-6 py-6 sm:grid sm:grid-cols-3 sm:gap-4">
            <dt className="text-zinc-900 dark:text-zinc-100 text-sm font-medium">{end ? 'Final Tally' : 'Votes'}</dt>
            <dd className="sm:col-span-2 text-zinc-700 dark:text-zinc-300 text-sm leading-6 mt-1 sm:mt-0">
              <div className="flex flex-col gap-y-1">
                {end ?
                  Object.entries({ ...final_tally_result }).filter(([k, v]) => toNumber(v) >= 0).map(([k, v]) => (
                    <Number
                      key={k}
                      value={v}
                      format="0,0.00a"
                      prefix={`${toTitle(k)}: `}
                      noTooltip={true}
                      className="capitalize text-zinc-400 dark:text-zinc-500 font-medium"
                    />
                  )) :
                  voteOptions.map((d, i) => (
                    <Number
                      key={i}
                      value={d.value}
                      format="0,0.00a"
                      prefix={`${toTitle(d.option)}: `}
                      noTooltip={true}
                      className="capitalize text-zinc-400 dark:text-zinc-500 font-medium"
                    />
                  ))
                }
              </div>
            </dd>
          </div>
        </dl>
      </div>
    </div>
  )
}

function Votes({ data }) {
  const { validators } = useGlobalStore()

  const totalVotingPower = _.sumBy(toArray(validators).filter(d => !d.jailed && d.status === 'BOND_STATUS_BONDED'), 'tokens')

  return data && (
    <div className="overflow-x-auto lg:overflow-x-visible -mx-4 sm:-mx-0 mt-8">
      <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-700">
        <thead className="sticky top-0 z-10 bg-white dark:bg-zinc-900">
          <tr className="text-zinc-800 dark:text-zinc-200 text-sm font-semibold">
            <th scope="col" className="pl-4 sm:pl-0 pr-3 py-3.5 text-left">
              #
            </th>
            <th scope="col" className="px-3 py-3.5 text-left">
              Voter
            </th>
            <th scope="col" className="px-3 py-3.5 text-left">
              Validator
            </th>
            <th scope="col" className="whitespace-nowrap px-3 py-3.5 text-right">
              Voting Power
            </th>
            <th scope="col" className="pl-3 pr-4 sm:pr-0 py-3.5 text-right">
              Vote
            </th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-zinc-900 divide-y divide-zinc-100 dark:divide-zinc-800">
          {data.map((d, i) => (
            <tr key={i} className="align-top text-zinc-400 dark:text-zinc-500 text-sm">
              <td className="pl-4 sm:pl-0 pr-3 py-4 text-left">
                {i + 1}
              </td>
              <td className="px-3 py-4 text-left">
                <Copy value={d.voter}>
                  <Link
                    href={`/account/${d.voter}`}
                    target="_blank"
                    className="text-blue-600 dark:text-blue-500 font-medium"
                  >
                    {ellipse(d.voter, 10, 'axelar')}
                  </Link>
                </Copy>
              </td>
              <td className="px-3 py-4 text-left">
                {d.validatorData && (
                  <Profile
                    i={i}
                    address={d.validatorData.operator_address}
                    prefix="axelarvaloper"
                  />
                )}
              </td>
              <td className="px-3 py-4 text-right">
                {d.voting_power > 0 && (
                  <div className="flex flex-col items-end gap-y-1">
                    <Number
                      value={d.voting_power}
                      format="0,0.00a"
                      noTooltip={true}
                      className="text-zinc-900 dark:text-zinc-100 font-semibold"
                    />
                    {totalVotingPower > 0 && (
                      <Number
                        value={d.voting_power * 100 / totalVotingPower}
                        format="0,0.000000"
                        suffix="%"
                        noTooltip={true}
                        className="text-zinc-400 dark:text-zinc-500"
                      />
                    )}
                  </div>
                )}
              </td>
              <td className="pl-3 pr-4 sm:pr-0 py-4 text-right">
                {d.option && (
                  <div className="flex flex-col items-end">
                    <Tag className={clsx('w-fit capitalize', ['NO'].includes(d.option) ? 'bg-red-600 dark:bg-red-500' : ['YES'].includes(d.option) ? 'bg-green-600 dark:bg-green-500' : '')}>
                      {toTitle(d.option)}
                    </Tag>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function Proposal({ id }) {
  const [data, setData] = useState(null)
  const { validators } = useGlobalStore()

  useEffect(() => {
    const setValidatorsToVotes = votes => {
      if (!validators) {
        return votes
      }

      return _.orderBy(
        toArray(votes).map(d => ({
          ...d,
          validatorData: validators.find(v => equalsIgnoreCase(v.delegator_address, d.voter)),
        })).map(d => ({
          ...d,
          voting_power: d.validatorData ? d.validatorData.tokens : -1,
        })),
        ['voting_power', 'validatorData.description.moniker'], ['desc', 'asc'],
      )
    }

    const getData = async () => {
      if (validators) {
        const response = await getProposal({ id })
        setData({ ...response, votes: setValidatorsToVotes(response?.votes) })
      }
    }

    getData()
  }, [id, setData, validators])

  const { proposal_id, voting_end_time, votes } = { ...data }

  const end = voting_end_time && voting_end_time < moment().valueOf()
  const voteOptions = Object.entries(_.groupBy(toArray(votes), 'option')).map(([k, v]) => ({
    option: k,
    value: toArray(v).length,
  })).filter(d => d.value)

  return (
    <Container className="sm:mt-8">
      {!(data && (!proposal_id || toNumber(id) === toNumber(proposal_id))) ? <Spinner /> :
        <div className="max-w-4xl flex flex-col gap-y-4 sm:gap-y-6">
          <Info
            id={id}
            data={data}
            end={end}
            voteOptions={voteOptions}
          />
          {!end && validators && <Votes data={votes} />}
        </div>
      }
    </Container>
  )
}
