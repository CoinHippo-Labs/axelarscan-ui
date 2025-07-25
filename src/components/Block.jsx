'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import _ from 'lodash'
import moment from 'moment'
import { MdArrowBackIosNew, MdArrowForwardIos } from 'react-icons/md'
import { RxCaretDown, RxCaretUp } from 'react-icons/rx'

import { Container } from '@/components/Container'
import { JSONView } from '@/components/JSONView'
import { Copy } from '@/components/Copy'
import { Tooltip } from '@/components/Tooltip'
import { Spinner } from '@/components/Spinner'
import { Tag } from '@/components/Tag'
import { Number } from '@/components/Number'
import { Profile } from '@/components/Profile'
import { Transactions } from '@/components/Transactions'
import { useGlobalStore } from '@/components/Global'
import { getBlock, getValidatorSets } from '@/lib/api/validator'
import { toJson, toHex, toArray } from '@/lib/parser'
import { equalsIgnoreCase, removeDoubleQuote, lastString, find, ellipse, toTitle } from '@/lib/string'
import { isNumber, toNumber, numberFormat } from '@/lib/number'
import { TIME_FORMAT } from '@/lib/time'

function Info({ data, height, validatorSets }) {
  const [signedCollpased, setSignedCollpased] = useState(true)

  const { hash } = { ...data.block_id }
  const { proposer_address, time } = { ...data.block?.header }
  const { txs } = { ...data.block?.data }

  const signedValidatorsData = toArray(validatorSets).filter(d => find(d.address, data.validators))
  const unsignedValidatorsData = toArray(validatorSets).filter(d => !find(d.address, data.validators))

  return (
    <div className="overflow-hidden h-fit bg-zinc-50/75 dark:bg-zinc-800/25 shadow sm:rounded-lg">
      <div className="px-4 sm:px-6 py-6">
        <h3 className="text-zinc-900 dark:text-zinc-100 text-base font-semibold leading-7">
          <Copy value={height}>
            <Number value={height} format="0,0" />
          </Copy>
        </h3>
        <div className="flex items-center gap-x-2 mt-1">
          <Tooltip content={numberFormat(toNumber(height) - 1, '0,0')}>
            <Link
              href={`/block/${toNumber(height) - 1}`}
              className="bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded-lg p-2.5"
            >
              <MdArrowBackIosNew size={14} />
            </Link>
          </Tooltip>
          <Tooltip content={numberFormat(toNumber(height) + 1, '0,0')}>
            <Link
              href={`/block/${toNumber(height) + 1}`}
              className="bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded-lg p-2.5"
            >
              <MdArrowForwardIos size={14} />
            </Link>
          </Tooltip>
        </div>
      </div>
      <div className="border-t border-zinc-200 dark:border-zinc-700">
        <dl className="divide-y divide-zinc-100 dark:divide-zinc-800">
          <div className="px-4 sm:px-6 py-6 flex flex-col gap-y-2">
            <dt className="text-zinc-900 dark:text-zinc-100 text-sm font-medium">Hash</dt>
            <dd className="text-zinc-700 dark:text-zinc-300 text-sm leading-6 mt-1">
              {hash && (
                <Copy value={hash}>
                  <span>{ellipse(hash)}</span>
                </Copy>
              )}
            </dd>
          </div>
          <div className="px-4 sm:px-6 py-6 flex flex-col gap-y-2">
            <dt className="text-zinc-900 dark:text-zinc-100 text-sm font-medium">Proposer</dt>
            <dd className="text-zinc-700 dark:text-zinc-300 text-sm leading-6 mt-1">
              <Profile address={proposer_address} />
            </dd>
          </div>
          <div className="px-4 sm:px-6 py-6 flex flex-col gap-y-2">
            <dt className="text-zinc-900 dark:text-zinc-100 text-sm font-medium">Block Time</dt>
            <dd className="text-zinc-700 dark:text-zinc-300 text-sm leading-6 mt-1">
              {time && moment(time).format(TIME_FORMAT)}
            </dd>
          </div>
          {isNumber(data.round) && (
            <div className="px-4 sm:px-6 py-6 flex flex-col gap-y-2">
              <dt className="text-zinc-900 dark:text-zinc-100 text-sm font-medium">Round</dt>
              <dd className="text-zinc-700 dark:text-zinc-300 text-sm leading-6 mt-1">
                {data.round}
              </dd>
            </div>
          )}
          {validatorSets && signedValidatorsData.length + unsignedValidatorsData.length > 0 && (
            <div className="px-4 sm:px-6 py-6 flex flex-col gap-y-2">
              <dt className="text-zinc-900 dark:text-zinc-100 text-sm font-medium">Signer / Absent</dt>
              <dd className="text-zinc-700 dark:text-zinc-300 text-sm leading-6 mt-1">
                <div className="flex flex-col gap-y-4">
                  <button
                    onClick={() => setSignedCollpased(!signedCollpased)}
                    className="cursor-pointer flex items-center text-zinc-900 hover:text-zinc-700 dark:text-zinc-100 dark:hover:text-zinc-300 gap-x-2"
                  >
                    <Number
                      value={_.sumBy(signedValidatorsData, 'tokens') * 100 / _.sumBy(_.concat(signedValidatorsData, unsignedValidatorsData), 'tokens')}
                      prefix={`${signedValidatorsData.length} (`}
                      suffix="%)"
                      noTooltip={true}
                    />
                    <span>/</span>
                    <Number value={unsignedValidatorsData.length} format="0,0" />
                    <div className="hover:bg-zinc-200 hover:dark:bg-zinc-700 rounded-lg">
                      {signedCollpased ? <RxCaretDown size={18} /> : <RxCaretUp size={18} />}
                    </div>
                  </button>
                  {!signedCollpased && (
                    <div className="flex flex-col gap-y-4">
                      <div className="flex flex-col gap-y-2">
                        <span className="text-zinc-400 dark:text-zinc-500">Signed by</span>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-3">
                          {signedValidatorsData.map((d, i) => (
                            <Profile
                              key={i}
                              i={i}
                              address={d.operator_address}
                              width={20}
                              height={20}
                              className="text-xs"
                            />
                          ))}
                        </div>
                      </div>
                      {unsignedValidatorsData.length > 0 && (
                        <div className="flex flex-col gap-y-2">
                          <span className="text-zinc-400 dark:text-zinc-500">Missing</span>
                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-3">
                            {unsignedValidatorsData.map((d, i) => (
                              <Profile
                                key={i}
                                i={i}
                                address={d.operator_address}
                                width={20}
                                height={20}
                                className="text-xs"
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </dd>
            </div>
          )}
          <div className="px-4 sm:px-6 py-6 flex flex-col gap-y-2">
            <dt className="text-zinc-900 dark:text-zinc-100 text-sm font-medium">No. Transactions</dt>
            <dd className="text-zinc-700 dark:text-zinc-300 text-sm leading-6 mt-1">
              {txs && (
                <Number
                  value={txs.length}
                  format="0,0"
                  className="text-zinc-700 dark:text-zinc-300 font-medium"
                />
              )}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  )
}

const BLOCK_EVENTS = ['begin_block_events', 'end_block_events']

function BlockEvents({ data }) {
  const COLLAPSE_SIZE = 3

  const [seeMoreTypes, setSeeMoreTypes] = useState([])

  return (
    <div className="grid sm:grid-cols-2 gap-4 sm:gap-8 mx-4">
      {BLOCK_EVENTS.filter(f => toArray(data[f]).length > 0).map((f, i) => (
        <div key={i} className="flex flex-col gap-y-3">
          <Tag className="w-fit capitalize">
            {toTitle(f)}
          </Tag>
          <div className="overflow-x-auto lg:overflow-x-visible -mx-4 sm:-mx-0">
            <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-700">
              <thead className="sticky top-0 z-10 bg-white dark:bg-zinc-900">
                <tr className="text-zinc-800 dark:text-zinc-200 text-sm font-semibold">
                  <th scope="col" className="pl-4 sm:pl-0 pr-3 py-3.5 text-left">
                    Type
                  </th>
                  <th scope="col" className="pl-3 pr-4 sm:pr-0 py-3.5 text-left">
                    Data
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-zinc-900 divide-y divide-zinc-100 dark:divide-zinc-800">
                {data[f].filter(d => d.data).map((d, i) => (
                  <tr key={i} className="align-top text-zinc-400 dark:text-zinc-500 text-sm">
                    <td className="pl-4 sm:pl-0 pr-3 py-4 text-left">
                      <div className="flex items-center text-xs gap-x-1">
                        <span className="whitespace-nowrap">
                          {toTitle(lastString(d.type, '.'))}
                        </span>
                        {d.data.length > 1 && (
                          <Number
                            value={d.data.length}
                            format="0,0"
                            prefix="["
                            suffix="]"
                            className="text-xs font-medium"
                          />
                        )}
                      </div>
                    </td>
                    <td className="pl-3 pr-4 sm:pr-0 py-4 text-left">
                      <div className="flex flex-col gap-y-2">
                        {_.slice(d.data, 0, seeMoreTypes.includes(d.type) ? d.data.length : COLLAPSE_SIZE).map((d, j) => (
                          <JSONView
                            key={j}
                            value={d}
                            tab={2}
                            useJSONView={false}
                            className="text-xs"
                          />
                        ))}
                        {(d.data.length > COLLAPSE_SIZE || seeMoreTypes.includes(d.type)) && (
                          <button
                            onClick={() => setSeeMoreTypes(seeMoreTypes.includes(d.type) ? seeMoreTypes.filter(t => t !== d.type) : _.uniq(_.concat(seeMoreTypes, d.type)))}
                            className="flex items-center text-blue-600 dark:text-blue-500 text-xs font-medium gap-x-1"
                          >
                            <span>See {seeMoreTypes.includes(d.type) ? 'Less' : 'More'}</span>
                            {!seeMoreTypes.includes(d.type) && <span>({d.data.length - COLLAPSE_SIZE})</span>}
                            {seeMoreTypes.includes(d.type) ? <RxCaretUp size={14} /> : <RxCaretDown size={14} />}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  )
}

export function Block({ height }) {
  const [data, setData] = useState(null)
  const [validatorSets, setValidatorSets] = useState(null)
  const { validators } = useGlobalStore()

  useEffect(() => {
    const getData = async () => {
      const data = await getBlock(height)

      if (data) {
        const { block } = { ...await getBlock(toNumber(height) + 1) }
        const { round, validators } = { ...block?.last_commit }

        if (isNumber(round)) {
          data.round = round
        }

        if (validators) {
          data.validators = validators
        }

        for (const f of BLOCK_EVENTS) {
          if (data[f]) {
            data[f] = Object.entries(_.groupBy(data[f], 'type')).map(([k, v]) => ({
              type: k,
              data: toArray(v).map(e => Object.fromEntries(toArray(e.attributes).map(a => [a.key, removeDoubleQuote(toJson(a.value) || toHex(a.value))]))),
            }))
          }
        }

        console.log('[data]', data)
        setData(data)
      }
    }

    getData()
  }, [height, setData])

  useEffect(() => {
    const getData = async () => {
      if (height && data && validators) {
        const { result } = { ...await getValidatorSets(height) }
        setValidatorSets(toArray(result?.validators).map(d => ({ ...d, ...validators.find(v => equalsIgnoreCase(v.consensus_address, d.address)) })))
      }
    }

    getData()
  }, [height, data, validators])

  return (
    <Container className="sm:mt-8">
      {!data ? <Spinner /> :
        <div className="grid sm:grid-cols-3 sm:gap-x-4 gap-y-8 sm:gap-y-12">
          <Info
            data={data}
            height={height}
            validatorSets={validatorSets}
          />
          <div className="sm:col-span-2 overflow-x-auto">
            <Transactions height={height} />
          </div>
          <div className="sm:col-span-3 overflow-x-auto">
            <BlockEvents data={data} />
          </div>
        </div>
      }
    </Container>
  )
}
