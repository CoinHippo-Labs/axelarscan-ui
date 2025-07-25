'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import clsx from 'clsx'
import _ from 'lodash'
import moment from 'moment'
import { IoCheckmarkDoneCircle } from 'react-icons/io5'

import { Container } from '@/components/Container'
import { Copy } from '@/components/Copy'
import { Spinner } from '@/components/Spinner'
import { Tag } from '@/components/Tag'
import { Number } from '@/components/Number'
import { Profile, ChainProfile } from '@/components/Profile'
import { TimeAgo } from '@/components/Time'
import { ExplorerLink } from '@/components/ExplorerLink'
import { useGlobalStore } from '@/components/Global'
import { getRPCStatus, searchAmplifierPolls } from '@/lib/api/validator'
import { getChainData } from '@/lib/config'
import { toArray, getValuesOfAxelarAddressKey } from '@/lib/parser'
import { equalsIgnoreCase, headString, lastString, find, ellipse, toTitle } from '@/lib/string'
import { isNumber } from '@/lib/number'
import { TIME_FORMAT } from '@/lib/time'

function Info({ data, id }) {
  const { chains } = useGlobalStore()

  const { contract_address, transaction_id, event_index, sender_chain, status, height, initiated_txhash, confirmation_txhash, completed_txhash, expired_height, participants, voteOptions, created_at, updated_at } = { ...data }

  const { url, transaction_path } = { ...getChainData(sender_chain, chains)?.explorer }

  return (
    <div className="overflow-hidden bg-zinc-50/75 dark:bg-zinc-800/25 shadow sm:rounded-lg">
      <div className="px-4 sm:px-6 py-6">
        <h3 className="text-zinc-900 dark:text-zinc-100 text-base font-semibold leading-7">
          <Copy value={data?.poll_id || id}>
            <span>{data?.poll_id || ellipse(id, 16)}</span>
          </Copy>
        </h3>
        <div className="max-w-2xl text-zinc-400 dark:text-zinc-500 text-sm leading-6 mt-1">
          {transaction_id && (
            <div className="flex items-center gap-x-1">
              <Copy value={transaction_id}>
                <Link
                  href={`${url}${transaction_path?.replace('{tx}', transaction_id)}`}
                  target="_blank"
                  className="text-blue-600 dark:text-blue-500 font-semibold"
                >
                  {ellipse(transaction_id)}{isNumber(event_index) ? `-${event_index}` : ''}
                </Link>
              </Copy>
              <ExplorerLink value={transaction_id} chain={sender_chain} />
            </div>
          )}
        </div>
      </div>
      <div className="border-t border-zinc-200 dark:border-zinc-700">
        <dl className="divide-y divide-zinc-100 dark:divide-zinc-800">
          <div className="px-4 sm:px-6 py-6 sm:grid sm:grid-cols-3 sm:gap-4">
            <dt className="text-zinc-900 dark:text-zinc-100 text-sm font-medium">Chain</dt>
            <dd className="sm:col-span-2 text-zinc-700 dark:text-zinc-300 text-sm leading-6 mt-1 sm:mt-0">
              <ChainProfile value={sender_chain} />
            </dd>
          </div>
          {contract_address && (
            <div className="px-4 sm:px-6 py-6 sm:grid sm:grid-cols-3 sm:gap-4">
              <dt className="text-zinc-900 dark:text-zinc-100 text-sm font-medium">Verifier Contract</dt>
              <dd className="sm:col-span-2 text-zinc-700 dark:text-zinc-300 text-sm leading-6 mt-1 sm:mt-0">
                <Copy value={contract_address}>
                  {ellipse(contract_address)}
                </Copy>
              </dd>
            </div>
          )}
          <div className="px-4 sm:px-6 py-6 sm:grid sm:grid-cols-3 sm:gap-4">
            <dt className="text-zinc-900 dark:text-zinc-100 text-sm font-medium">Status</dt>
            <dd className="sm:col-span-2 text-zinc-700 dark:text-zinc-300 text-sm leading-6 mt-1 sm:mt-0">
              {status && (
                <Tag className={clsx('w-fit capitalize', ['completed'].includes(status) ? 'bg-green-600 dark:bg-green-500' : ['failed'].includes(status) ? 'bg-red-600 dark:bg-red-500' : ['expired'].includes(status) ? 'bg-zinc-400 dark:bg-zinc-500' : 'bg-yellow-400 dark:bg-yellow-500')}>
                  {status}
                </Tag>
              )}
            </dd>
          </div>
          <div className="px-4 sm:px-6 py-6 sm:grid sm:grid-cols-3 sm:gap-4">
            <dt className="text-zinc-900 dark:text-zinc-100 text-sm font-medium">Height</dt>
            <dd className="sm:col-span-2 text-zinc-700 dark:text-zinc-300 text-sm leading-6 mt-1 sm:mt-0">
              {height && (
                <Link
                  href={`/block/${height}`}
                  target="_blank"
                  className="text-blue-600 dark:text-blue-500 font-medium"
                >
                  <Number value={height} />
                </Link>
              )}
            </dd>
          </div>
          {initiated_txhash && (
            <div className="px-4 sm:px-6 py-6 sm:grid sm:grid-cols-3 sm:gap-4">
              <dt className="text-zinc-900 dark:text-zinc-100 text-sm font-medium">Initiated Tx Hash</dt>
              <dd className="sm:col-span-2 text-zinc-700 dark:text-zinc-300 text-sm leading-6 mt-1 sm:mt-0">
                <Link
                  href={`/tx/${initiated_txhash}`}
                  target="_blank"
                  className="text-blue-600 dark:text-blue-500 font-medium"
                >
                  {ellipse(initiated_txhash)}
                </Link>
              </dd>
            </div>
          )}
          {confirmation_txhash && (
            <div className="px-4 sm:px-6 py-6 sm:grid sm:grid-cols-3 sm:gap-4">
              <dt className="text-zinc-900 dark:text-zinc-100 text-sm font-medium">Confirmation Tx Hash</dt>
              <dd className="sm:col-span-2 text-zinc-700 dark:text-zinc-300 text-sm leading-6 mt-1 sm:mt-0">
                <Link
                  href={`/tx/${confirmation_txhash}`}
                  target="_blank"
                  className="text-blue-600 dark:text-blue-500 font-medium"
                >
                  {ellipse(confirmation_txhash)}
                </Link>
              </dd>
            </div>
          )}
          {completed_txhash && (
            <div className="px-4 sm:px-6 py-6 sm:grid sm:grid-cols-3 sm:gap-4">
              <dt className="text-zinc-900 dark:text-zinc-100 text-sm font-medium">Poll Completed Tx Hash</dt>
              <dd className="sm:col-span-2 text-zinc-700 dark:text-zinc-300 text-sm leading-6 mt-1 sm:mt-0">
                <Link
                  href={`/tx/${completed_txhash}`}
                  target="_blank"
                  className="text-blue-600 dark:text-blue-500 font-medium"
                >
                  {ellipse(completed_txhash)}
                </Link>
              </dd>
            </div>
          )}
          <div className="px-4 sm:px-6 py-6 sm:grid sm:grid-cols-3 sm:gap-4">
            <dt className="text-zinc-900 dark:text-zinc-100 text-sm font-medium">Expires Height</dt>
            <dd className="sm:col-span-2 text-zinc-700 dark:text-zinc-300 text-sm leading-6 mt-1 sm:mt-0">
              {expired_height && (
                <Link
                  href={`/block/${expired_height}`}
                  target="_blank"
                  className="text-blue-600 dark:text-blue-500 font-medium"
                >
                  <Number value={expired_height} />
                </Link>
              )}
            </dd>
          </div>
          <div className="px-4 sm:px-6 py-6 sm:grid sm:grid-cols-3 sm:gap-4">
            <dt className="text-zinc-900 dark:text-zinc-100 text-sm font-medium">Created</dt>
            <dd className="sm:col-span-2 text-zinc-700 dark:text-zinc-300 text-sm leading-6 mt-1 sm:mt-0">
              {created_at?.ms && moment(created_at.ms).format(TIME_FORMAT)}
            </dd>
          </div>
          {updated_at?.ms > created_at?.ms && (
            <div className="px-4 sm:px-6 py-6 sm:grid sm:grid-cols-3 sm:gap-4">
              <dt className="text-zinc-900 dark:text-zinc-100 text-sm font-medium">Updated</dt>
              <dd className="sm:col-span-2 text-zinc-700 dark:text-zinc-300 text-sm leading-6 mt-1 sm:mt-0">
                {moment(updated_at.ms).format(TIME_FORMAT)}
              </dd>
            </div>
          )}
          {participants && (
            <div className="px-4 sm:px-6 py-6 sm:grid sm:grid-cols-3 sm:gap-4">
              <dt className="text-zinc-900 dark:text-zinc-100 text-sm font-medium">{`Participants${participants.length > 1 ? ` (${participants.length})` : ''}`}</dt>
              <dd className="sm:col-span-2 text-zinc-700 dark:text-zinc-300 text-sm leading-6 mt-1 sm:mt-0">
                <div className="w-fit flex items-center">
                  {voteOptions.map((v, i) => (
                    <Number
                      key={i}
                      value={v.value}
                      format="0,0"
                      suffix={` ${toTitle(v.option.substring(0, ['unsubmitted'].includes(v.option) ? 2 : 1))}`}
                      noTooltip={true}
                      className={clsx('rounded-xl uppercase text-xs mr-2 px-2.5 py-1', ['no'].includes(v.option) ? 'bg-red-600 dark:bg-red-500 text-white' : ['yes'].includes(v.option) ? 'bg-green-600 dark:bg-green-500 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500')}
                    />
                  ))}
                </div>
              </dd>
            </div>
          )}
        </dl>
      </div>
    </div>
  )
}

function Votes({ data }) {
  const [votes, setVotes] = useState(null)
  const { verifiers } = useGlobalStore()

  useEffect(() => {
    if (data?.votes) {
      const votes = data.votes.map(d => ({
        ...d,
        verifierData: toArray(verifiers).find(v => equalsIgnoreCase(v.address, d.voter)) || { address: d.voter },
      }))

      setVotes(_.concat(
        votes,
        // unsubmitted
        toArray(data.participants).filter(p => !find(p, votes.map(v => v.verifierData?.address))).map(p => {
          const verifierData = toArray(verifiers).find(v => equalsIgnoreCase(v.address, p))

          return {
            voter: verifierData?.address || p,
            verifierData,
          }
        }),
      ))
    }
  }, [data, setVotes, verifiers])

  const { confirmation_txhash } = { ...data }

  return votes && (
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
            <th scope="col" className="whitespace-nowrap px-3 py-3.5 text-left">
              Tx Hash
            </th>
            <th scope="col" className="px-3 py-3.5 text-left">
              Height
            </th>
            <th scope="col" className="px-3 py-3.5 text-right">
              Vote
            </th>
            <th scope="col" className="pl-3 pr-4 sm:pr-0 py-3.5 text-right">
              Time
            </th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-zinc-900 divide-y divide-zinc-100 dark:divide-zinc-800">
          {votes.map((d, i) => {
            const vote = d.vote ? 'yes' : typeof d.vote === 'boolean' ? 'no' : 'unsubmitted'

            return (
              <tr key={i} className="align-top text-zinc-400 dark:text-zinc-500 text-sm">
                <td className="pl-4 sm:pl-0 pr-3 py-4 text-left">
                  {i + 1}
                </td>
                <td className="px-3 py-4 text-left">
                  {d.verifierData ?
                    <Profile i={i} address={d.verifierData.address} /> :
                    <Copy value={d.voter}>
                      <Link
                        href={`/verifier/${d.voter}`}
                        target="_blank"
                        className="text-blue-600 dark:text-blue-500 font-medium"
                      >
                        {ellipse(d.voter, 10, '0x')}
                      </Link>
                    </Copy>
                  }
                </td>
                <td className="px-3 py-4 text-left">
                  {d.id && (
                    <div className="flex flex-col gap-y-1">
                      <Copy value={d.id}>
                        <Link
                          href={`/tx/${d.id}`}
                          target="_blank"
                          className="text-blue-600 dark:text-blue-500 font-medium"
                        >
                          {ellipse(d.id, 6)}
                        </Link>
                      </Copy>
                      {equalsIgnoreCase(d.id, confirmation_txhash) && (
                        <Link
                          href={`/tx/${confirmation_txhash}`}
                          target="_blank"
                          className="h-6 flex items-center gap-x-1"
                        >
                          <IoCheckmarkDoneCircle size={18} className="text-green-600 dark:text-green-500" />
                          <span className="text-zinc-400 dark:text-zinc-500">
                            Confirmation
                          </span>
                        </Link>
                      )}
                    </div>
                  )}
                </td>
                <td className="px-3 py-4 text-left">
                  {d.height && (
                    <Link
                      href={`/block/${d.height}`}
                      target="_blank"
                      className="text-blue-600 dark:text-blue-500 font-medium"
                    >
                      <Number value={d.height} />
                    </Link>
                  )}
                </td>
                <td className="px-3 py-4 text-right">
                  <div className="flex flex-col items-end">
                    <Tag className={clsx('w-fit capitalize', ['no'].includes(vote) ? 'bg-red-600 dark:bg-red-500 text-white' : ['yes'].includes(vote) ? 'bg-green-600 dark:bg-green-500 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500')}>
                      {toTitle(vote)}
                    </Tag>
                  </div>
                </td>
                <td className="pl-3 pr-4 sm:pr-0 py-4 flex items-center justify-end text-right">
                  <TimeAgo timestamp={d.created_at} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export function AmplifierPoll({ id }) {
  const [data, setData] = useState(null)
  const [blockData, setBlockData] = useState(null)
  const { chains, verifiers } = useGlobalStore()

  useEffect(() => {
    const getData = async () => setBlockData(await getRPCStatus())
    getData()
  }, [setBlockData])

  useEffect(() => {
    const getData = async () => {
      if (blockData) {
        const { data } = { ...await searchAmplifierPolls({ verifierContractAddress: id.includes('_') ? headString(id, '_') : undefined, pollId: lastString(id, '_') }) }

        let d = data?.[0]

        if (d) {
          const votes = getValuesOfAxelarAddressKey(d).map(v => ({
            ...v,
            option: v.vote ? 'yes' : typeof v.vote === 'boolean' ? 'no' : 'unsubmitted',
          }))

          const voteOptions = Object.entries(_.groupBy(votes, 'option')).map(([k, v]) => ({
            option: k,
            value: v?.length,
            voters: toArray(v?.map(d => d.voter)),
          }))
          .filter(v => v.value)
          .map(v => ({
            ...v,
            i: v.option === 'yes' ? 0 : v.option === 'no' ? 1 : 2,
          }))

          // add unsubmitted option
          if (toArray(d.participants).length > 0 && voteOptions.findIndex(v => v.option === 'unsubmitted') < 0 && _.sumBy(voteOptions, 'value') < d.participants.length) {
            voteOptions.push({
              option: 'unsubmitted',
              value: d.participants.length - _.sumBy(voteOptions, 'value'),
            })
          }

          d = {
            ...d,
            status: d.success ? 'completed' : d.failed ? 'failed' : d.expired || d.expired_height < blockData.latest_block_height ? 'expired' : 'pending',
            height: _.minBy(votes, 'height')?.height || d.height,
            votes: _.orderBy(votes, ['height', 'created_at'], ['desc', 'desc']),
            voteOptions: _.orderBy(voteOptions, ['i'], ['asc']),
            url: `/gmp/${d.transaction_id || 'search'}`,
          }
        }

        console.log('[data]', d)
        setData({ ...d })
      }
    }

    getData()
  }, [id, setData, blockData, chains])

  return (
    <Container className="sm:mt-8">
      {!data ? <Spinner /> :
        <div className="max-w-5xl flex flex-col gap-y-4 sm:gap-y-6">
          <Info data={data} id={id} />
          {verifiers && <Votes data={data} />}
        </div>
      }
    </Container>
  )
}
