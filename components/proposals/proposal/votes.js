import Link from 'next/link'
import { useSelector, shallowEqual } from 'react-redux'
import { Chip } from '@material-tailwind/react'
import _ from 'lodash'

import Datatable from '../../datatable'
import NumberDisplay from '../../number'
import Copy from '../../copy'
import ValidatorProfile from '../../profile/validator'
import { toArray, ellipse, getTitle } from '../../../lib/utils'

const PAGE_SIZE = 25

export default ({ data }) => {
  const { validators } = useSelector(state => ({ validators: state.validators }), shallowEqual)
  const { validators_data } = { ...validators }

  return data && (
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
          sortType: (a, b) => a.original.voter > b.original.voter ? 1 : -1,
          Cell: props => (
            <div className="flex items-center space-x-1">
              <Link
                href={`/account/${props.value}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 dark:text-white font-medium"
              >
                {ellipse(props.value, 10, 'axelar')}
              </Link>
              <Copy value={props.value} />
            </div>
          ),
        },
        {
          Header: 'Validator',
          accessor: 'validator_data.operator_address',
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
                      {ellipse(value, 10, 'axelarvaloper')}
                    </Link>
                    <Copy value={value} />
                  </div> :
                  '-'
            )
          },
        },
        {
          Header: 'Voting Power',
          accessor: 'voting_power',
          sortType: (a, b) => a.original.voting_power > b.original.voting_power ? 1 : -1,
          Cell: props => {
            const { value } = { ...props }
            const total_voting_power = _.sumBy(toArray(validators_data).filter(v => !v.jailed && v.status === 'BOND_STATUS_BONDED'), 'tokens')
            return value > 0 && (
              <div className="flex flex-col items-start sm:items-end text-left sm:text-right">
                <NumberDisplay
                  value={value}
                  format="0,0.00a"
                  noTooltip={true}
                />
                {total_voting_power > 0 && (
                  <NumberDisplay
                    value={value * 100 / total_voting_power}
                    format="0,0.000000"
                    suffix="%"
                    className="text-slate-400 dark:text-slate-500 text-sm font-medium"
                  />
                )}
              </div>
            )
          },
          headerClassName: 'whitespace-nowrap justify-start sm:justify-end text-left sm:text-right',
        },
        {
          Header: 'Vote',
          accessor: 'option',
          sortType: (a, b) => a.original.status > b.original.status ? 1 : -1,
          Cell: props => {
            const { value } = { ...props }
            return (
              <div className="flex flex-col items-end text-right">
                {value ?
                  <Chip
                    color={['NO'].includes(value) ? 'red' : ['YES'].includes(value) ? 'green' : 'cyan'}
                    value={getTitle(value).toLowerCase()}
                    className="chip capitalize font-medium"
                  /> :
                  '-'
                }
              </div>
            )
          },
          headerClassName: 'justify-end text-right',
        },
      ]}
      data={data}
      defaultPageSize={PAGE_SIZE}
      noPagination={data.length <= 10}
      className="no-border no-shadow"
    />
  )
}