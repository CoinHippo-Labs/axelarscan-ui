import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'

import _ from 'lodash'
import moment from 'moment'

import Datatable from '../datatable'

import { allProposals } from '../../lib/api/cosmos'
import { numberFormat, getName } from '../../lib/utils'

export default function ProposalsTable({ className = '' }) {
  const { denoms } = useSelector(state => ({ denoms: state.denoms }), shallowEqual)
  const { denoms_data } = { ...denoms }

  const [proposals, setProposals] = useState(null)

  useEffect(() => {
    const controller = new AbortController()

    const getData = async () => {
      if (denoms_data) {
        if (!controller.signal.aborted) {
          const response = await allProposals({}, denoms_data)
          setProposals(response?.data || [])
        }
      }
    }

    getData()

    return () => {
      controller?.abort()
    }
  }, [denoms_data])

  return (
    <>
      <Datatable
        columns={[
          {
            Header: 'ID',
            accessor: 'proposal_id',
            sortType: (rowA, rowB) => rowA.original.proposal_id > rowB.original.proposal_id ? 1 : -1,
            Cell: props => (
              !props.row.original.skeleton ?
                numberFormat(props.value, '0,0')
                :
                <div className="skeleton w-4 h-4" />
            ),
          },
          {
            Header: 'Proposal',
            accessor: 'content.title',
            sortType: (rowA, rowB) => rowA.original.content?.title > rowB.original.content?.title ? 1 : -1,
            Cell: props => (
              !props.row.original.skeleton ?
                <div className="min-w-max flex items-center space-x-2">
                  <div className="flex flex-col">
                    <Link href={`/proposal/${props.row.original.proposal_id}`}>
                      <a className="text-blue-600 dark:text-white font-medium">
                        {props.value || props.row.original.content?.plan?.name}
                      </a>
                    </Link>
                    <span className="max-w-xs break-words whitespace-pre-wrap text-gray-400 dark:text-gray-500 text-xs">
                      {props.row.original.content?.description}
                    </span>
                  </div>
                </div>
                :
                <div className="flex items-center space-x-2">
                  <div className="flex flex-col space-y-1.5">
                    <div className="skeleton w-32 h-4" />
                    <div className="skeleton w-48 h-3" />
                  </div>
                </div>
            ),
          },
          {
            Header: 'Height',
            accessor: 'content.plan.height',
            sortType: (rowA, rowB) => rowA.original.content?.plan?.height > rowB.original.content?.plan?.height ? 1 : -1,
            Cell: props => (
              !props.row.original.skeleton ?
                <div className="flex flex-col justify-center text-left sm:text-right my-1">
                  {props.value > 0 ?
                    <span className="font-medium">{numberFormat(props.value, '0,0')}</span>
                    :
                    <span className="text-gray-400 dark:text-gray-600">-</span>
                  }
                </div>
                :
                <div className="flex flex-col justify-center space-y-1 my-0.5">
                  <div className="skeleton w-16 h-5 ml-0 sm:ml-auto" />
                </div>
            ),
            headerClassName: 'min-w-max justify-start sm:justify-end text-left sm:text-right',
          },
          {
            Header: 'Type',
            accessor: 'type',
            sortType: (rowA, rowB) => rowA.original.type > rowB.original.type ? 1 : -1,
            Cell: props => (
              !props.row.original.skeleton ?
                <div className="text-right my-1">
                  {props.value ?
                    <span className="bg-gray-100 dark:bg-gray-900 rounded-xl text-gray-900 dark:text-gray-200 font-semibold px-2.5 py-1.5">
                      {props.value}
                    </span>
                    :
                    <span className="text-gray-400 dark:text-gray-600">-</span>
                  }
                </div>
                :
                <div className="skeleton w-16 h-6 my-0.5 ml-auto" />
            ),
            headerClassName: 'justify-end text-right',
          },
          {
            Header: 'Voting Start',
            accessor: 'voting_start_time',
            sortType: (rowA, rowB) => rowA.original.voting_start_time > rowB.original.voting_start_time ? 1 : -1,
            Cell: props => (
              !props.row.original.skeleton ?
                <div className="text-right my-1">
                  {props.value > -1 ?
                    <span className="text-gray-400 dark:text-gray-500 text-xs">
                      {moment(props.value).format('MMM D, YYYY h:mm:ss A z')}
                    </span>
                    :
                    '-'
                  }
                </div>
                :
                <div className="skeleton w-24 h-5 my-0.5 ml-auto" />
            ),
            headerClassName: 'justify-end text-right',
          },
          {
            Header: 'Voting End',
            accessor: 'voting_end_time',
            sortType: (rowA, rowB) => rowA.original.voting_end_time > rowB.original.voting_end_time ? 1 : -1,
            Cell: props => (
              !props.row.original.skeleton ?
                <div className="text-right my-1">
                  {props.value > -1 ?
                    <span className="text-gray-400 dark:text-gray-500 text-xs">
                      {moment(props.value).format('MMM D, YYYY h:mm:ss A z')}
                    </span>
                    :
                    '-'
                  }
                </div>
                :
                <div className="skeleton w-24 h-5 my-0.5 ml-auto" />
            ),
            headerClassName: 'justify-end text-right',
          },
          {
            Header: 'Deposit',
            accessor: 'total_deposit',
            sortType: (rowA, rowB) => _.sumBy(rowA.original.total_deposit?.filter(_deposit => _deposit?.denom === 'uaxl') || [], 'amount') > _.sumBy(rowB.original.total_deposit?.filter(_deposit => _deposit?.denom === 'uaxl') || [], 'amount') ? 1 : -1,
            Cell: props => (
              !props.row.original.skeleton ?
                <div className="text-right my-0.5">
                  {props.value ?
                    <div className="flex flex-col items-end space-y-1.5">
                      {props.value.map((_deposit, i) => (
                        <span key={i} className="max-w-min bg-gray-100 dark:bg-gray-900 rounded-xl uppercase text-gray-900 dark:text-gray-200 text-xs font-semibold px-2 py-1">
                          {numberFormat(_deposit.amount, '0,0.00')} {_deposit.symbol || _deposit.denom}
                        </span>
                      ))}
                    </div>
                    :
                    <span className="text-gray-400 dark:text-gray-600">-</span>
                  }
                </div>
                :
                <div className="skeleton w-16 h-5 my-0.5 ml-auto" />
            ),
            headerClassName: 'justify-end text-right',
          },
          {
            Header: 'Status',
            accessor: 'status',
            sortType: (rowA, rowB) => rowA.original.status > rowB.original.status ? 1 : -1,
            Cell: props => (
              !props.row.original.skeleton ?
                <div className="text-right my-1">
                  {props.value ?
                    <>
                      <span className={`bg-${['UNSPECIFIED', 'DEPOSIT_PERIOD'].includes(props.value) ? 'gray-400 dark:bg-gray-900' : ['VOTING_PERIOD', 'DEPOSIT_PERIOD'].includes(props.value) ? 'yellow-400 dark:bg-yellow-500' : ['REJECTED', 'FAILED'].includes(props.value) ? 'red-600 dark:bg-red-700' : 'green-600 dark:bg-green-700'} rounded-xl capitalize text-white font-semibold px-2 py-1`}>
                        {props.value?.replace('_', ' ')}
                      </span>
                      {['PASSED', 'REJECTED'].includes(props.value) && props.row.original.final_tally_result && (
                        <div className="flex flex-col items-end space-y-1.5 mt-2">
                          {Object.entries(props.row.original.final_tally_result).map(([key, value]) => (
                            <span key={key} className="max-w-min bg-gray-100 dark:bg-gray-900 rounded-xl capitalize text-gray-900 dark:text-gray-200 text-xs font-semibold px-1.5 py-0.5">
                              {getName(key)}: {numberFormat(value, '0,0')}
                            </span>
                          ))}
                        </div>
                      )}
                    </>
                    :
                    <span className="text-gray-400 dark:text-gray-600">-</span>
                  }
                </div>
                :
                <div className="skeleton w-24 h-6 my-0.5 ml-auto" />
            ),
            headerClassName: 'justify-end text-right',
          },
        ]}
        data={proposals ?
          proposals.map((proposal, i) => { return { ...proposal, i } })
          :
          [...Array(25).keys()].map(i => { return { i, skeleton: true } })
        }
        noPagination={proposals ? proposals.length <= 10 : true}
        defaultPageSize={100}
        className="no-border"
      />
      {proposals?.length < 1 && (
        <div className="bg-white dark:bg-gray-900 rounded-xl text-gray-300 dark:text-gray-500 text-base font-medium italic text-center my-4 mx-2 py-2">
          No Proposals
        </div>
      )}
    </>
  )
}