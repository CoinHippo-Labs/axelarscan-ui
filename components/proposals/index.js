import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import moment from 'moment'
import { ProgressBar } from 'react-loader-spinner'

import Datatable from '../datatable'
import { all_proposals } from '../../lib/api/lcd'
import { native_asset_id } from '../../lib/object/asset'
import { number_format, name, loader_color } from '../../lib/utils'

export default () => {
  const {
    preferences,
    assets,
  } = useSelector(state =>
    (
      {
        preferences: state.preferences,
        assets: state.assets,
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

  const [proposals, setProposals] = useState(null)

  useEffect(
    () => {
      const getData = async () => {
        if (assets_data) {
          const response =
            await all_proposals(
              null,
              assets_data,
            )

          const {
            data,
          } = { ...response }

          setProposals(
            Array.isArray(data) ?
              data :
              []
          )
        }
      }

      getData()
    },
    [assets_data],
  )

  return (
    <div className="space-y-4 pt-2 pb-4">
      {proposals ?
        <Datatable
          columns={
            [
              {
                Header: 'ID',
                accessor: 'proposal_id',
                sortType: (a, b) =>
                  a.original.proposal_id > b.original.proposal_id ?
                    1 :
                    -1,
                Cell: props => (
                  <span className="font-medium">
                    {number_format(
                      props.value,
                      '0,0',
                    )}
                  </span>
                ),
              },
              {
                Header: 'Proposal',
                accessor: 'content.title',
                sortType: (a, b) =>
                  a.original.content?.title > b.original.content?.title ?
                    1 :
                    -1,
                Cell: props => {
                  const {
                    proposal_id,
                    content,
                  } = { ...props.row.original }
                  const {
                    plan,
                    description,
                  } = { ...content }
                  const {
                    name,
                  } = { ...plan }

                  return (
                    <div className="flex flex-col items-start space-y-1">
                      <Link href={`/proposal/${proposal_id}`}>
                        <a
                          target="_blank"
                          rel="noopener noreferrer"
                          className="max-w-sm break-words whitespace-pre-wrap text-blue-500 hover:text-blue-600 dark:text-blue-500 dark:hover:text-blue-400 font-medium"
                        >
                          {
                            props.value ||
                            name
                          }
                        </a>
                      </Link>
                      <span className="max-w-sm break-words whitespace-pre-wrap text-slate-400 dark:text-slate-600 font-normal">
                        {description}
                      </span>
                    </div>
                  )
                },
              },
              {
                Header: 'Height',
                accessor: 'content.plan.height',
                sortType: (a, b) =>
                  a.original.content?.plan?.height > b.original.content?.plan?.height ?
                    1 :
                    -1,
                Cell: props => (
                  <div className="font-medium text-left sm:text-right">
                    {props.value > 0 ?
                      number_format(
                        props.value,
                        '0,0',
                      ) :
                      '-'
                    }
                  </div>
                ),
                headerClassName: 'justify-start sm:justify-end text-left sm:text-right',
              },
              {
                Header: 'Type',
                accessor: 'type',
                sortType: (a, b) =>
                  a.original.type > b.original.type ?
                    1 :
                    -1,
                Cell: props => (
                  <div className="flex flex-col items-start sm:items-end text-left sm:text-right">
                    {props.value ?
                      <div className="max-w-min bg-slate-100 dark:bg-slate-900 rounded font-medium -mt-0.5 py-1 px-2">
                        {props.value}
                      </div> :
                      <span>
                        -
                      </span>
                    }
                  </div>
                ),
                headerClassName: 'justify-start sm:justify-end text-left sm:text-right',
              },
              {
                Header: 'Voting Start',
                accessor: 'voting_start_time',
                sortType: (a, b) =>
                  a.original.voting_start_time > b.original.voting_start_time ?
                    1 :
                    -1,
                Cell: props => (
                  <div className="flex flex-col items-end text-right">
                    <span className="text-slate-400 dark:text-slate-600 font-normal">
                      {props.value > -1 ?
                        moment(props.value)
                          .format('MMM D, YYYY h:mm:ss A z') :
                        '-'
                      }
                    </span>
                  </div>
                ),
                headerClassName: 'whitespace-nowrap justify-end text-right',
              },
              {
                Header: 'Voting End',
                accessor: 'voting_end_time',
                sortType: (a, b) =>
                  a.original.voting_end_time > b.original.voting_end_time ?
                    1 :
                    -1,
                Cell: props => (
                  <div className="flex flex-col items-end text-right">
                    <span className="text-slate-400 dark:text-slate-600 font-normal">
                      {props.value > -1 ?
                        moment(props.value)
                          .format('MMM D, YYYY h:mm:ss A z') :
                        '-'
                      }
                    </span>
                  </div>
                ),
                headerClassName: 'whitespace-nowrap justify-end text-right',
              },
              {
                Header: 'Deposit',
                accessor: 'total_deposit',
                sortType: (a, b) =>
                  _.sumBy(
                    (a.original.total_deposit || [])
                      .filter(d =>
                        d?.denom === native_asset_id
                      ),
                    'amount',
                  ) >
                  _.sumBy(
                    (b.original.total_deposit || [])
                      .filter(d =>
                        d?.denom === native_asset_id
                      ),
                    'amount',
                  ) ?
                    1 :
                    -1,
                Cell: props => (
                  <div className="flex flex-col items-start sm:items-end text-left sm:text-right space-y-1.5">
                    {props.value ?
                      props.value
                        .map((d, i) => {
                          const {
                            amount,
                            denom,
                            symbol,
                          } = { ...d }

                          return (
                            <span
                              key={i}
                              className="font-medium space-x-1"
                            >
                              <span>
                                {number_format(
                                  amount,
                                  '0,0.00',
                                )}
                              </span>
                              <span>
                                {
                                  symbol ||
                                  denom
                                }
                              </span>
                            </span>
                          )
                        }) :
                      <span>
                        -
                      </span>
                    }
                  </div>
                ),
                headerClassName: 'justify-start sm:justify-end text-left sm:text-right',
              },
              {
                Header: 'Status',
                accessor: 'status',
                sortType: (a, b) =>
                  a.original.status > b.original.status ?
                    1 :
                    -1,
                Cell: props => {
                  const {
                    final_tally_result,
                  } = { ...props.row.original }
                  const {
                    value,
                  } = { ...props }

                  return (
                    <div className="flex flex-col items-end space-y-1.5">
                      {value ?
                        <>
                          <div className={`max-w-min ${['UNSPECIFIED', 'DEPOSIT_PERIOD'].includes(value) ? 'bg-slate-100 dark:bg-slate-800' : ['VOTING_PERIOD', 'DEPOSIT_PERIOD'].includes(value) ? 'bg-yellow-200 dark:bg-yellow-300 border-2 border-yellow-400 dark:border-yellow-600 text-yellow-500 dark:text-yellow-700' : ['REJECTED', 'FAILED'].includes(value) ? 'bg-red-200 dark:bg-red-300 border-2 border-red-400 dark:border-red-600 text-red-500 dark:text-red-700' : 'bg-green-200 dark:bg-green-300 border-2 border-green-400 dark:border-green-600 text-green-500 dark:text-green-700'} rounded-xl text-xs font-semibold -mt-0.5 py-0.5 px-2`}>
                            {
                              value
                                .replace(
                                  '_',
                                  ' ',
                                )
                            }
                          </div>
                          {
                            [
                              'PASSED',
                              'REJECTED',
                            ].includes(value) &&
                            final_tally_result &&
                            (
                              <div className="flex flex-col items-end space-y-1">
                                {Object.entries(final_tally_result)
                                  .filter(([k, v]) => v)
                                  .map(([k, v]) => (
                                    <div
                                      key={k}
                                      className="max-w-min bg-slate-100 dark:bg-slate-900 rounded uppercase whitespace-nowrap text-xs font-medium space-x-1 py-1 px-1.5"
                                    >
                                      <span>
                                        {name(k)}:
                                      </span>
                                      <span>
                                        {number_format(
                                          v,
                                          '0,0.00a',
                                        )}
                                      </span>
                                    </div>
                                  ))
                                }
                              </div>
                            )
                          }
                        </> :
                        <span>
                          -
                        </span>
                      }
                    </div>
                  )
                },
                headerClassName: 'justify-end text-right',
              },
            ]
          }
          data={proposals}
          noPagination={proposals.length <= 10}
          defaultPageSize={25}
          className="no-border"
        /> :
        <ProgressBar
          borderColor={loader_color(theme)}
          width="36"
          height="36"
        />
      }
    </div>
  )
}