import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import moment from 'moment'
import { ProgressBar, ColorRing } from 'react-loader-spinner'

import Datatable from '../datatable'
import ValidatorProfile from '../validator-profile'
import Copy from '../copy'
import TimeAgo from '../time-ago'
import { blocks as getBlocks } from '../../lib/api/index'
import { number_format, ellipse, equalsIgnoreCase, loader_color } from '../../lib/utils'

const LIMIT = 50

export default (
  {
    n,
  },
) => {
  const {
    preferences,
    validators,
  } = useSelector(state =>
    (
      {
        preferences: state.preferences,
        validators: state.validators,
      }
    ),
    shallowEqual,
  )
  const {
    theme,
  } = { ...preferences }
  const {
    validators_data,
  } = { ...validators }

  const [data, setData] = useState(null)
  const [offset, setOffet] = useState(0)
  const [fetchTrigger, setFetchTrigger] = useState(null)
  const [fetching, setFetching] = useState(false)

  useEffect(
    () => {
      const triggering = is_interval => {
        setFetchTrigger(
          is_interval ?
            moment()
              .valueOf() :
            typeof fetchTrigger === 'number' ?
              null :
              0
        )
      }

      triggering()

      const interval =
        setInterval(() =>
          triggering(true),
          0.1 * 60 * 1000,
        )

      return () => clearInterval()
    },
    [],
  )

  useEffect(
    () => {
      const getData = async () => {
        setFetching(true)

        if (!fetchTrigger) {
          setData(null)
          setOffet(0)
        }

        const _data =
          !fetchTrigger ?
            [] :
            data ||
            []

        const size =
          n ||
          LIMIT

        const from =
          fetchTrigger === true ||
          fetchTrigger === 1 ?
            _data.length :
            0

        const response =
          await getBlocks(
            {
              size,
              from,
              sort: [{ height: 'desc' }],
            },
          )

        if (response) {
          const {
            data,
          } = { ...response }

          setData(
            _.orderBy(
              _.uniqBy(
                _.concat(
                  data ||
                  [],
                  _data,
                ),
                'height',
              ),
              ['height'],
              ['desc'],
            )
          )
        }
        else if (!fetchTrigger) {
          setData([])
        }

        setFetching(false)
      }

      getData()
    },
    [fetchTrigger],
  )

  return (
    data ?
      <div className="w-full space-y-2">
        <Datatable
          columns={
            [
              {
                Header: 'Height',
                accessor: 'height',
                disableSortBy: true,
                Cell: props => (
                  <Link href={`/block/${props.value}`}>
                    <a
                      target="_blank"
                      rel="noopener noreferrer"
                      className="tracking-wider text-blue-500 hover:text-blue-600 dark:text-blue-500 dark:hover:text-blue-400 font-normal hover:font-medium"
                    >
                      {number_format(
                        props.value,
                        '0,0',
                      )}
                    </a>
                  </Link>
                ),
              },
              {
                Header: 'Block Hash',
                accessor: 'hash',
                disableSortBy: true,
                Cell: props => {
                  const {
                    height,
                  } = { ...props.row.original }

                  return (
                    <Link href={`/block/${height}`}>
                      <a
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-400 dark:text-slate-600"
                      >
                        {ellipse(
                          props.value,
                          8,
                        )}
                      </a>
                    </Link>
                  )
                },
              },
              {
                Header: 'Proposer',
                accessor: 'proposer_address',
                disableSortBy: true,
                Cell: props => {
                  const {
                    operator_address,
                    validator_description,
                  } = { ...props.row.original }
                  const {
                    moniker,
                  } = { ...validator_description }

                  return (
                    operator_address ?
                      <div className={`min-w-max flex items-${moniker ? 'start' : 'center'} space-x-2`}>
                        <Link href={`/validator/${operator_address}`}>
                          <a
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ValidatorProfile
                              validator_description={validator_description}
                            />
                          </a>
                        </Link>
                        <div className="flex flex-col">
                          {
                            moniker &&
                            (
                              <Link href={`/validator/${operator_address}`}>
                                <a
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="tracking-wider text-blue-500 hover:text-blue-600 dark:text-blue-500 dark:hover:text-blue-400 font-medium"
                                >
                                  {ellipse(
                                    moniker,
                                    16,
                                  )}
                                </a>
                              </Link>
                            )
                          }
                          <div className="flex items-center space-x-1">
                            <Link href={`/validator/${operator_address}`}>
                              <a
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-slate-400 dark:text-slate-600"
                              >
                                {ellipse(
                                  operator_address,
                                  12,
                                  process.env.NEXT_PUBLIC_PREFIX_VALIDATOR,
                                )}
                              </a>
                            </Link>
                            <Copy
                              value={operator_address}
                            />
                          </div>
                        </div>
                      </div> :
                      <Copy
                        value={props.value}
                        title={
                          <span className="cursor-pointer text-slate-400 dark:text-slate-600">
                            {ellipse(
                              props.value,
                              12,
                              process.env.NEXT_PUBLIC_PREFIX_CONSENSUS,
                            )}
                          </span>
                        }
                      />
                  )
                },
              },
              {
                Header: 'TXs',
                accessor: 'num_txs',
                disableSortBy: true,
                Cell: props => (
                  <div className="text-right">
                    {props.value > -1 ?
                      number_format(
                        props.value,
                        '0,0',
                      ) :
                      '-'
                    }
                  </div>
                ),
                headerClassName: 'justify-end text-right',
              },
              {
                Header: 'Time',
                accessor: 'time',
                disableSortBy: true,
                Cell: props => {
                  const {
                    height,
                  } = { ...props.row.original }

                  return (
                    <TimeAgo
                      time={props.value}
                      title={
                        `Block: ${
                          number_format(
                            height,
                            '0,0',
                          )
                        }`
                      }
                      className="ml-auto"
                    />
                  )
                },
                headerClassName: 'justify-end text-right',
              },
            ]
            .filter(c =>
              !(
                !isNaN(n) ?
                ['hash'] :
                []
              ).includes(c.accessor)
            )
          }
          data={
            data
              .filter((d, i) =>
                !n ||
                i < n
              )
              .map((d, i) => {
                const {
                  proposer_address,
                } = { ...d }
                const {
                  operator_address,
                  description,
                } = {
                  ...(
                    (validators_data || [])
                      .find(v =>
                        equalsIgnoreCase(
                          v?.consensus_address,
                          proposer_address,
                        )
                      )
                  ),
                }

                return {
                  ...d,
                  operator_address,
                  validator_description: description,
                }
              })
          }
          noPagination={true}
          defaultPageSize={50}
          className="min-h-full no-border"
        />
        {
          data.length > 0 &&
          !n &&
          (
            <div className="w-full flex justify-center">
              {!fetching ?
                <button
                  onClick={() => {
                    setOffet(data.length)
                    setFetchTrigger(
                      typeof fetchTrigger === 'number' ?
                        true :
                        1
                    )
                  }}
                  className="max-w-min whitespace-nowrap text-slate-400 hover:text-blue-500 dark:text-slate-600 dark:hover:text-blue-500 font-normal hover:font-medium mx-auto"
                >
                  Load more
                </button> :
                <div className="flex justify-center">
                  <ColorRing
                    color={loader_color(theme)}
                    width="32"
                    height="32"
                  />
                </div>
              }
            </div>
          )
        }
      </div> :
      <ProgressBar
        borderColor={loader_color(theme)}
        width="36"
        height="36"
      />
  )
}