import Link from 'next/link'
import { useState, useEffect } from 'react'
import { Chip } from '@material-tailwind/react'
import _ from 'lodash'
import moment from 'moment'

import Spinner from '../spinner'
import Datatable from '../datatable'
import NumberDisplay from '../number'
import { getProposals } from '../../lib/api/proposals'
import { toArray, getTitle } from '../../lib/utils'

const PAGE_SIZE = 25
const TIME_FORMAT = 'MMM D, YYYY h:mm:ss A z'

export default () => {
  const [data, setData] = useState(null)

  useEffect(
    () => {
      const getData = async () => {
        const { data } = { ...await getProposals() }
        setData(toArray(data))
      }
      getData()
    },
    [],
  )

  return (
    <div className="children">
      {data ?
        <Datatable
          columns={[
            {
              Header: 'ID',
              accessor: 'proposal_id',
              sortType: (a, b) => a.original.proposal_id > b.original.proposal_id ? 1 : -1,
              Cell: props => (
                <span className="font-medium">
                  {props.value}
                </span>
              ),
            },
            {
              Header: 'Proposal',
              accessor: 'content.title',
              sortType: (a, b) => a.original.content?.title > b.original.content?.title ? 1 : -1,
              Cell: props => {
                const { proposal_id, content } = { ...props.row.original }
                const { plan, description } = { ...content }
                const { name } = { ...plan }
                return (
                  <div className="flex flex-col space-y-1">
                    <Link
                      href={`/proposal/${proposal_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="max-w-sm break-words whitespace-pre-wrap text-blue-400 dark:text-white font-semibold"
                    >
                      {props.value || name}
                    </Link>
                    <span className="max-w-sm break-words whitespace-pre-wrap text-slate-400 dark:text-slate-500">
                      {description}
                    </span>
                  </div>
                )
              },
            },
            {
              Header: 'Height',
              accessor: 'content.plan.height',
              sortType: (a, b) => a.original.content?.plan?.height || 0 > b.original.content?.plan?.height || 0 ? 1 : -1,
              Cell: props => (
                <NumberDisplay
                  value={props.value}
                  format="0,0"
                  noTooltip={true}
                />
              ),
            },
            {
              Header: 'Type',
              accessor: 'type',
              sortType: (a, b) => a.original.type > b.original.type ? 1 : -1,
              Cell: props => (
                props.value ?
                  <Chip
                    value={props.value}
                    className="chip font-medium"
                  /> :
                  '-'
              ),
            },
            {
              Header: 'Voting Start',
              accessor: 'voting_start_time',
              sortType: (a, b) => a.original.voting_start_time > b.original.voting_start_time ? 1 : -1,
              Cell: props => (
                <div className="flex justify-end text-slate-400 dark:text-slate-500 text-right">
                  {props.value > -1 ? moment(props.value).format(TIME_FORMAT) : '-'}
                </div>
              ),
              headerClassName: 'whitespace-nowrap justify-end text-right',
            },
            {
              Header: 'Voting End',
              accessor: 'voting_end_time',
              sortType: (a, b) => a.original.voting_end_time > b.original.voting_end_time ? 1 : -1,
              Cell: props => (
                <div className="flex justify-end text-slate-400 dark:text-slate-500 text-right">
                  {props.value > -1 ? moment(props.value).format(TIME_FORMAT) : '-'}
                </div>
              ),
              headerClassName: 'whitespace-nowrap justify-end text-right',
            },
            {
              Header: 'Deposit',
              accessor: 'total_deposit',
              sortType: (a, b) => _.sumBy(a.original.total_deposit, 'amount') > _.sumBy(b.original.total_deposit, 'amount') ? 1 : -1,
              Cell: props => (
                <div className="flex flex-col items-start sm:items-end text-left sm:text-right space-y-1">
                  {toArray(props.value).map((d, i) => {
                    const { symbol, amount } = { ...d }
                    return (
                      <NumberDisplay
                        key={i}
                        value={amount}
                        suffix={` ${symbol}`}
                        noTooltip={true}
                      />
                    )
                  })}
                </div>
              ),
              headerClassName: 'whitespace-nowrap justify-start sm:justify-end text-left sm:text-right',
            },
            {
              Header: 'Status',
              accessor: 'status',
              sortType: (a, b) => a.original.status > b.original.status ? 1 : -1,
              Cell: props => {
                const { value, row } = { ...props }
                const { final_tally_result } = { ...row.original }
                return (
                  <div className="flex flex-col items-end space-y-1">
                    {value && (
                      <>
                        <Chip
                          color={['UNSPECIFIED', 'DEPOSIT_PERIOD'].includes(value) ? 'cyan' : ['VOTING_PERIOD'].includes(value) ? 'amber' : ['REJECTED', 'FAILED'].includes(value) ? 'red' : 'green'}
                          value={getTitle(value)}
                          className="chip font-medium"
                        />
                        {['PASSED', 'REJECTED'].includes(value) && (
                          Object.entries({ ...final_tally_result })
                            .filter(([k, v]) => Number(v) > 0)
                            .map(([k, v]) => (
                              <NumberDisplay
                                key={k}
                                value={v}
                                format="0,0.00a"
                                prefix={`${getTitle(k).toLowerCase()}: `}
                                noTooltip={true}
                                className="capitalize text-slate-400 dark:text-slate-500 text-xs font-medium"
                              />
                            ))
                        )}
                      </>
                    )}
                  </div>
                )
              },
              headerClassName: 'whitespace-nowrap justify-end text-right',
            },
          ]}
          data={data}
          defaultPageSize={PAGE_SIZE}
          noPagination={data.length <= 10}
          className="no-border no-shadow"
        /> :
        <div className="loading">
          <Spinner name="Blocks" />
        </div>
      }
    </div>
  )
}