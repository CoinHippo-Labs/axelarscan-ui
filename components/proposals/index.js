import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import moment from 'moment'
import { TailSpin } from 'react-loader-spinner'

import Datatable from '../datatable'
import { all_proposals } from '../../lib/api/cosmos'
import { number_format, name, loader_color } from '../../lib/utils'

export default () => {
  const { preferences, assets } = useSelector(state => ({ preferences: state.preferences, assets: state.assets }), shallowEqual)
  const { theme } = { ...preferences }
  const { assets_data } = { ...assets }

  const [proposals, setProposals] = useState(null)

  useEffect(() => {
    const controller = new AbortController()
    const getData = async () => {
      if (assets_data) {
        if (!controller.signal.aborted) {
          const response = await all_proposals(null, assets_data)
          setProposals(response?.data || [])
        }
      }
    }
    getData()
    return () => {
      controller?.abort()
    }
  }, [assets_data])

  return (
    <div className="pt-2 pb-6">
      {proposals ?
        <Datatable
          columns={[
            {
              Header: 'ID',
              accessor: 'proposal_id',
              sortType: (a, b) => a.original.proposal_id > b.original.proposal_id ? 1 : -1,
              Cell: props => (
                <span className="font-mono font-semibold">
                  {number_format(props.value, '0,0')}
                </span>
              ),
            },
            {
              Header: 'Proposal',
              accessor: 'content.title',
              sortType: (a, b) => a.original.content?.title > b.original.content?.title ? 1 : -1,
              Cell: props => (
                <div className="flex flex-col items-start space-y-1">
                  <Link href={`/proposal/${props.row.original.proposal_id}`}>
                    <a className="text-blue-600 dark:text-white font-semibold">
                      {props.value || props.row.original.content?.plan?.name}
                    </a>
                  </Link>
                  <span className="max-w-sm break-words whitespace-pre-wrap text-slate-400 dark:text-slate-600 font-medium">
                    {props.row.original.content?.description}
                  </span>
                </div>
              ),
            },
            {
              Header: 'Height',
              accessor: 'content.plan.height',
              sortType: (a, b) => a.original.content?.plan?.height > b.original.content?.plan?.height ? 1 : -1,
              Cell: props => (
                <div className="flex flex-col text-left sm:text-right">
                  <span className="font-semibold">
                    {props.value > 0 ?
                      number_format(props.value, '0,0') : '-'
                    }
                  </span>
                </div>
              ),
              headerClassName: 'justify-start sm:justify-end text-left sm:text-right',
            },
            {
              Header: 'Type',
              accessor: 'type',
              sortType: (a, b) => a.original.type > b.original.type ? 1 : -1,
              Cell: props => (
                <div className="flex flex-col items-start sm:items-end text-left sm:text-right">
                  {props.value ?
                    <div className="max-w-min bg-slate-100 dark:bg-slate-900 rounded-lg font-semibold -mt-0.5 py-1 px-2">
                      {props.value}
                    </div>
                    :
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
              sortType: (a, b) => a.original.voting_start_time > b.original.voting_start_time ? 1 : -1,
              Cell: props => (
                <div className="flex flex-col items-end text-right">
                  <span className="text-slate-400 dark:text-slate-600 font-medium">
                    {props.value > -1 ?
                      moment(props.value).format('MMM D, YYYY h:mm:ss A z') : '-'
                    }
                  </span>
                </div>
              ),
              headerClassName: 'justify-end text-right',
            },
            {
              Header: 'Voting End',
              accessor: 'voting_end_time',
              sortType: (a, b) => a.original.voting_end_time > b.original.voting_end_time ? 1 : -1,
              Cell: props => (
                <div className="flex flex-col items-end text-right">
                  <span className="text-slate-400 dark:text-slate-600 font-medium">
                    {props.value > -1 ?
                      moment(props.value).format('MMM D, YYYY h:mm:ss A z') : '-'
                    }
                  </span>
                </div>
              ),
              headerClassName: 'justify-end text-right',
            },
            {
              Header: 'Deposit',
              accessor: 'total_deposit',
              sortType: (a, b) => _.sumBy(a.original.total_deposit?.filter(d => d?.denom === 'uaxl') || [], 'amount') > _.sumBy(b.original.total_deposit?.filter(d => d?.denom === 'uaxl') || [], 'amount') ? 1 : -1,
              Cell: props => (
                <div className="flex flex-col text-left sm:text-right">
                  <div className="flex flex-col items-start sm:items-end space-y-1.5">
                    {props.value ?
                      props.value.map((d, i) => (
                        <span
                          key={i}
                          className="font-semibold"
                        >
                          {number_format(d.amount, '0,0.00')} {d.symbol || d.denom}
                        </span>
                      ))
                      :
                      <span>
                        -
                      </span>
                    }
                  </div>
                </div>
              ),
              headerClassName: 'justify-start sm:justify-end text-left sm:text-right',
            },
            {
              Header: 'Status',
              accessor: 'status',
              sortType: (a, b) => a.original.status > b.original.status ? 1 : -1,
              Cell: props => (
                <div className="flex flex-col items-end space-y-1.5">
                  {props.value ?
                    <>
                      <div className={`max-w-min ${['UNSPECIFIED', 'DEPOSIT_PERIOD'].includes(props.value) ? 'bg-slate-100 dark:bg-slate-900' : ['VOTING_PERIOD', 'DEPOSIT_PERIOD'].includes(props.value) ? 'bg-yellow-400 dark:bg-yellow-500 text-white' : ['REJECTED', 'FAILED'].includes(props.value) ? 'bg-red-400 dark:bg-red-500 text-white' : 'bg-green-400 dark:bg-green-500 text-white'} rounded-lg capitalize font-bold -mt-0.5 py-0.5 px-1.5`}>
                        {props.value?.replace('_', ' ')}
                      </div>
                      {['PASSED', 'REJECTED'].includes(props.value) && props.row.original.final_tally_result && (
                        <div className="flex flex-col items-end space-y-1">
                          {Object.entries(props.row.original.final_tally_result).filter(([k, v]) => v).map(([k, v]) => (
                            <div
                              key={k}
                              className="max-w-min bg-slate-100 dark:bg-slate-900 rounded-lg uppercase text-xs font-semibold py-1 px-1.5"
                            >
                              {name(k)}: {number_format(v, '0,0.00a')}
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                    :
                    <span>
                      -
                    </span>
                  }
                </div>
              ),
              headerClassName: 'justify-end text-right',
            },
          ]}
          data={proposals}
          noPagination={proposals.length <= 10}
          defaultPageSize={25}
          className="no-border"
        />
        :
        <TailSpin color={loader_color(theme)} width="32" height="32" />
      }
    </div>
  )
}