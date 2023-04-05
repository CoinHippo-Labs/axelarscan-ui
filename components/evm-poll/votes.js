import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import { ProgressBar, ColorRing } from 'react-loader-spinner'
import { BsFillCheckCircleFill } from 'react-icons/bs'

import Datatable from '../datatable'
import ValidatorProfile from '../validator-profile'
import Copy from '../copy'
import TimeAgo from '../time-ago'
import { native_asset_id, assetManager } from '../../lib/object/asset'
import { number_format, ellipse, equalsIgnoreCase, loader_color } from '../../lib/utils'

export default (
  {
    data,
  },
) => {
  const {
    preferences,
    assets,
    validators,
  } = useSelector(state =>
    (
      {
        preferences: state.preferences,
        assets: state.assets,
        validators: state.validators,
      }
    ),
    shallowEqual,
  )
  const {
    theme,
  } = { ...preferences }
  const {
    assets_data,
  } = { ...assets }
  const {
    validators_data,
  } = { ...validators }

  const [validatorsData, setValidatorsData] = useState(null)
  const [votes, setVotes] = useState(null)

  useEffect(
    () => {
      if (
        assets_data &&
        validators_data
      ) {
        setValidatorsData(
          validators_data
            .map(v => {
              const {
                tokens,
              } = { ...v }

              const _tokens =
                assetManager
                  .amount(
                    tokens,
                    native_asset_id,
                    assets_data,
                  )

              return {
                ...v,
                tokens: _tokens,
                quadratic_voting_power:
                  _tokens > 0 &&
                  Math.floor(
                    Math.sqrt(
                      _tokens,
                    )
                  ),
              }
            })
        )
      }
    },
    [assets_data, validators_data],
  )

  useEffect(
    () => {
      const {
        participants,
        votes,
      } = { ...data }

      if (
        data &&
        validatorsData
      ) {
        const _votes =
          (votes || [])
            .map(v => {
              const {
                voter,
              } = { ...v }

              const validator_data = validatorsData
                .find(_v =>
                  equalsIgnoreCase(
                    _v?.broadcaster_address,
                    voter,
                  )
                )

              return {
                ...v,
                validator_data,
              }
            })

        const unsubmitted_votes =
          (participants || [])
            .filter(p =>
              _votes
                .findIndex(v =>
                  v?.validator_data
                ) > -1 &&
              _votes
                .findIndex(v =>
                  equalsIgnoreCase(
                    v?.validator_data?.operator_address,
                    p,
                  )
                ) < 0
            )
            .map(p => {
              const validator_data = validatorsData
                .find(_v =>
                  equalsIgnoreCase(
                    _v?.operator_address,
                    p,
                  )
                )

              const {
                broadcaster_address,
              } = { ...validator_data }

              return {
                voter:
                  broadcaster_address ||
                  p,
                validator_data,
              }
            })

        setVotes(
          _.concat(
            _votes,
            unsubmitted_votes,
          )
        )
      }
    },
    [data, validatorsData],
  )

  return (
    votes ?
      <Datatable
        columns={
          [
            {
              Header: '#',
              accessor: 'i',
              sortType: (a, b) =>
                a.original.i > b.original.i ?
                  1 :
                  -1,
              Cell: props => (
                <span className="font-medium">
                  {number_format(
                    (
                      props.flatRows?.indexOf(props.row) > -1 ?
                        props.flatRows.indexOf(props.row) :
                        props.value
                    ) + 1,
                    '0,0',
                  )}
                </span>
              ),
            },
            {
              Header: 'Voter',
              accessor: 'voter',
              disableSortBy: true,
              Cell: props => {
                const {
                  value,
                } = { ...props }
                const {
                  description,
                } = { ...props.row.original.validator_data }
                const {
                  moniker,
                } = { ...description }

                return (
                  description ?
                    <div className={`min-w-max flex items-${moniker ? 'start' : 'center'} space-x-2`}>
                      <Link href={`/validator/${value}`}>
                        <a
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ValidatorProfile
                            validator_description={description}
                          />
                        </a>
                      </Link>
                      <div className="flex flex-col">
                        {moniker && (
                          <Link href={`/validator/${value}`}>
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
                        )}
                        <div className="flex items-center space-x-1">
                          <Link href={`/validator/${value}`}>
                            <a
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-slate-400 dark:text-slate-600"
                            >
                              {ellipse(
                                value,
                                10,
                                process.env.NEXT_PUBLIC_PREFIX_VALIDATOR,
                              )}
                            </a>
                          </Link>
                          <Copy
                            value={value}
                          />
                        </div>
                      </div>
                    </div> :
                    value ?
                      <div className="flex items-center space-x-1">
                        <Link href={`/${value.startsWith(process.NEXT_PUBLIC_PREFIX_VALIDATOR) ? 'validator' : 'account'}/${value}`}>
                          <a
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:text-blue-600 dark:text-blue-500 dark:hover:text-blue-400 font-medium"
                          >
                            {ellipse(
                              value,
                              10,
                              value.startsWith(process.NEXT_PUBLIC_PREFIX_VALIDATOR) ?
                                process.env.NEXT_PUBLIC_PREFIX_VALIDATOR :
                                process.env.NEXT_PUBLIC_PREFIX_ACCOUNT,
                            )}
                          </a>
                        </Link>
                        <Copy
                          value={value}
                        />
                      </div> :
                      <span>
                        -
                      </span>
                )
              },
            },
            {
              Header: 'Voting Power',
              accessor: 'validator_data.quadratic_voting_power',
              sortType: (a, b) =>
                a.original.validator_data?.quadratic_voting_power > b.original.validator_data?.quadratic_voting_power ?
                  1 :
                  -1,
              Cell: props => {
                const {
                  value,
                } = { ...props }

                const total_voting_power =
                  _.sumBy(
                    (validatorsData || [])
                      .filter(v =>
                        !v.jailed &&
                        ['BOND_STATUS_BONDED'].includes(v.status)
                      ),
                    'quadratic_voting_power',
                  )

                return (
                  <div className="flex flex-col items-start sm:items-end text-left sm:text-right">
                    {
                      votes
                        .findIndex(v =>
                          v?.validator_data
                        ) > -1 &&
                      validatorsData ?
                      <>
                        <span
                          title={
                            number_format(
                              value,
                              '0,0',
                            )
                          }
                          className="uppercase text-slate-600 dark:text-slate-200 font-semibold"
                        >
                          {number_format(
                            value,
                            '0,0.00a',
                          )}
                        </span>
                        {
                          value > 0 &&
                          total_voting_power > 0 &&
                          (
                            <span className="text-slate-400 dark:text-slate-600 text-xs lg:text-sm">
                              {number_format(
                                value * 100 / total_voting_power,
                                '0,0.000000',
                              )}
                              %
                            </span>
                          )
                          }
                        </> :
                        <ColorRing
                          color={loader_color(theme)}
                          width="24"
                          height="24"
                        />
                    }
                  </div>
                )
              },
              headerClassName: 'whitespace-nowrap justify-start sm:justify-end text-left sm:text-right',
            },
            {
              Header: 'Tx Hash',
              accessor: 'id',
              disableSortBy: true,
              Cell: props => {
                const {
                  value,
                } = { ...props }
                const {
                  confirmed,
                } = { ...props.row.original }

                return (
                  value &&
                  (
                    <div className="flex flex-col mb-3">
                      <div className="flex items-center space-x-0.5">
                        <Link href={`/tx/${value}`}>
                          <a
                            target="_blank"
                            rel="noopener noreferrer"
                            className="tracking-wider text-blue-500 hover:text-blue-600 dark:text-blue-500 dark:hover:text-blue-400 font-normal hover:font-medium"
                          >
                            {ellipse(
                              value,
                              10,
                            )}
                          </a>
                        </Link>
                        <Copy
                          value={value}
                        />
                      </div>
                      {
                        confirmed &&
                        (
                          <Link href={`/tx/${value}`}>
                            <a
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center space-x-1"
                            >
                              <BsFillCheckCircleFill
                                size={16}
                                className="text-green-400 dark:text-green-500"
                              />
                              <span className="text-slate-400 dark:text-slate-500 text-sm font-medium">
                                Confirmation
                              </span>
                            </a>
                          </Link>
                        )
                      }
                    </div>
                  )
                )
              },
            },
            {
              Header: 'Height',
              accessor: 'height',
              disableSortBy: true,
              Cell: props => {
                const {
                  value,
                } = { ...props }

                return (
                  value &&
                  (
                    <Link href={`/block/${value}`}>
                      <a
                        target="_blank"
                        rel="noopener noreferrer"
                        className="tracking-wider text-blue-500 hover:text-blue-600 dark:text-blue-500 dark:hover:text-blue-400 font-normal hover:font-medium"
                      >
                        {number_format(
                          value,
                          '0,0',
                        )}
                      </a>
                    </Link>
                  )
                )
              },
            },
            {
              Header: 'Vote',
              accessor: 'vote',
              sortType: (a, b) =>
                typeof a.original.vote !== 'boolean' ?
                  -1 :
                  typeof b.original.vote !== 'boolean' ?
                    1 :
                    a.original.vote > b.original.vote ?
                      1 :
                      -1,
              Cell: props => {
                let {
                  value,
                } = { ...props }

                value =
                  value ?
                    'yes' :
                    typeof value === 'boolean' ?
                      'no' :
                      'unsubmitted'

                return (
                  <div className="flex flex-col items-end text-right">
                    {value ?
                      <div className={`max-w-min ${['yes'].includes(value) ? 'bg-green-200 dark:bg-green-300 border-2 border-green-400 dark:border-green-600 text-green-500 dark:text-green-700' : ['no'].includes(value) ? 'bg-red-200 dark:bg-red-300 border-2 border-red-400 dark:border-red-600 text-red-500 dark:text-red-700' : 'bg-slate-100 dark:bg-slate-800'} rounded-xl capitalize text-xs font-semibold py-0.5 px-2`}>
                        {value}
                      </div> :
                      <span>
                        -
                      </span>
                    }
                  </div>
                )
              },
              headerClassName: 'justify-end text-right',
            },
            {
              Header: 'Time',
              accessor: 'created_at',
              disableSortBy: true,
              Cell: props => {
                const {
                  value,
                } = { ...props }

                return (
                  value &&
                  (
                    <TimeAgo
                      time={value}
                      className="ml-auto"
                    />
                  )
                )
              },
              headerClassName: 'justify-end text-right',
            },
          ]
        }
        data={votes}
        noPagination={votes.length <= 10}
        defaultPageSize={50}
        className="no-border"
      /> :
      <ProgressBar
        borderColor={loader_color(theme)}
        width="32"
        height="32"
      />
  )
}