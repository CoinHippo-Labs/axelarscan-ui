import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import { IoCheckmarkCircle } from 'react-icons/io5'

import Spinner from '../../spinner'
import Datatable from '../../datatable'
import NumberDisplay from '../../number'
import Copy from '../../copy'
import ValidatorProfile from '../../profile/validator'
import TimeAgo from '../../time/timeAgo'
import { toArray, ellipse, getTitle, equalsIgnoreCase } from '../../../lib/utils'

const PAGE_SIZE = 50

export default ({ data }) => {
  const { validators } = useSelector(state => ({ validators: state.validators }), shallowEqual)
  const { validators_data } = { ...validators }

  const [votes, setVotes] = useState(null)

  useEffect(
    () => {
      if (data && validators_data) {
        const { participants, votes } = { ...data }
        const _votes = toArray(votes).map(v => {
          const { voter } = { ...v }
          return {
            ...v,
            validator_data: validators_data.find(_v => equalsIgnoreCase(_v.broadcaster_address, voter)),
          }
        })

        const unsubmitted_votes =
          toArray(participants)
            .filter(p => _votes.findIndex(v => v.validator_data) > -1 && _votes.findIndex(v => equalsIgnoreCase(v.validator_data?.operator_address, p)) < 0)
            .map(p => {
              const validator_data = validators_data.find(_v => equalsIgnoreCase(_v.operator_address, p))
              const { broadcaster_address } = { ...validator_data }
              return {
                voter: broadcaster_address || p,
                validator_data,
              }
            })

        setVotes(_.concat(_votes, unsubmitted_votes))
      }
    },
    [data, validators_data],
  )

  return (
    votes ?
      <Datatable
        columns={[
          {
            Header: '#',
            accessor: 'i',
            disableSortBy: true,
            Cell: props => (
              <span className="text-black dark:text-white font-medium">
                {props.flatRows?.indexOf(props.row) + 1}
              </span>
            ),
          },
          {
            Header: 'Voter',
            accessor: 'voter',
            disableSortBy: true,
            Cell: props => {
              const { value, row } = { ...props }
              const { description } = { ...row.original.validator_data }
              const { moniker } = { ...description }
              return (
                description ?
                  <div className="min-w-max flex items-start space-x-2">
                    <Link
                      href={`/validator/${value}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ValidatorProfile description={description} />
                    </Link>
                    <div className="flex flex-col">
                      <Link
                        href={`/validator/${value}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 font-medium"
                      >
                        {ellipse(moniker, 16)}
                      </Link>
                      <div className="flex items-center space-x-1">
                        <Link
                          href={`/validator/${value}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-slate-400 dark:text-slate-500"
                        >
                          {ellipse(value, 10, 'axelarvaloper')}
                        </Link>
                        <Copy value={value} />
                      </div>
                    </div>
                  </div> :
                  value ?
                    <div className="flex items-center space-x-1">
                      <Link
                        href={`/validator/${value}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 font-medium"
                      >
                        {ellipse(value, 10, value.startsWith('axelarvaloper') ? 'axelarvaloper' : 'axelar')}
                      </Link>
                      <Copy value={value} />
                    </div> :
                    '-'
              )
            },
          },
          {
            Header: 'Voting Power',
            accessor: 'validator_data.quadratic_voting_power',
            sortType: (a, b) => a.original.validator_data?.quadratic_voting_power > b.original.validator_data?.quadratic_voting_power ? 1 : -1,
            Cell: props => {
              const { value } = { ...props }
              const total_voting_power = _.sumBy(toArray(validators_data).filter(v => !v.jailed && v.status === 'BOND_STATUS_BONDED'), 'quadratic_voting_power')
              return (
                <div className="flex flex-col items-start sm:items-end text-left sm:text-right">
                  <NumberDisplay
                    value={value}
                    format="0,0.00a"
                    noTooltip={true}
                  />
                  {value > 0 && total_voting_power > 0 && (
                    <NumberDisplay
                      value={value * 100 / total_voting_power}
                      format="0,0.000000"
                      suffix="%"
                      className="text-slate-400 dark:text-slate-500 text-sm font-semibold"
                    />
                  )}
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
              const { value, row } = { ...props }
              const { confirmed } = { ...row.original }
              return value && (
                <div>
                  <div className="flex items-center space-x-1">
                    <Link
                      href={`/tx/${value}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 dark:text-blue-500 font-medium"
                    >
                      {ellipse(value, 10)}
                    </Link>
                    <Copy value={value} />
                  </div>
                  {confirmed && (
                    <Link
                      href={`/tx/${value}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center space-x-1"
                    >
                      <IoCheckmarkCircle size={18} className="text-green-400 dark:text-green-500" />
                      <span className="text-slate-400 dark:text-slate-500">
                        Confirmation
                      </span>
                    </Link>
                  )}
                </div>
              )
            },
            headerClassName: 'whitespace-nowrap',
          },
          {
            Header: 'Height',
            accessor: 'height',
            disableSortBy: true,
            Cell: props => {
              const { value } = { ...props }
              return value && (
                <Link
                  href={`/block/${value}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 dark:text-blue-500 font-medium"
                >
                  <NumberDisplay
                    value={value}
                    format="0,0"
                  />
                </Link>
              )
            },
          },
          {
            Header: 'Vote',
            accessor: 'vote',
            sortType: (a, b) => typeof a.original.vote !== 'boolean' ? -1 : typeof b.original.vote !== 'boolean' ? 1 : a.original.vote > b.original.vote ? 1 : -1,
            Cell: props => {
              let { value } = { ...props }
              value = value ? 'yes' : typeof value === 'boolean' ? 'no' : 'unsubmitted'
              return (
                <div className="flex flex-col items-end text-right">
                  {value ?
                    <div className={`${['no'].includes(value) ? 'bg-red-500 dark:bg-red-600 text-white' : ['yes'].includes(value) ? 'bg-green-500 dark:bg-green-600 text-white' : 'bg-slate-50 dark:bg-slate-900 text-slate-400 dark:text-slate-500'} rounded-lg capitalize text-xs py-1 px-2`}>
                      {getTitle(value)}
                    </div> :
                    '-'
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
            Cell: props => props.value && (
              <div className="flex justify-end">
                <TimeAgo time={props.value / 1000} className="text-slate-400 dark:text-slate-500 text-xs font-medium" />
              </div>
            ),
            headerClassName: 'justify-end text-right',
          },
        ]}
        data={votes}
        defaultPageSize={PAGE_SIZE}
        noPagination={votes.length <= 10}
        className="no-border no-shadow"
      /> :
      <Spinner name="ProgressBar" width={36} height={36} />
  )
}