import Link from 'next/link'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import { TailSpin } from 'react-loader-spinner'

import Datatable from '../datatable'
import ValidatorProfile from '../validator-profile'
import Copy from '../copy'
import { denom_manager } from '../../lib/object/denom'
import { number_format, ellipse, loader_color } from '../../lib/utils'

export default ({ data }) => {
  const { preferences, assets, validators } = useSelector(state => ({ preferences: state.preferences, assets: state.assets, validators: state.data }), shallowEqual)
  const { theme } = { ...preferences }
  const { assets_data } = { ...assets }
  const { validators_data } = { ...validators }

  return (
    data ?
      <Datatable
        columns={[
          {
            Header: '#',
            accessor: 'i',
            sortType: (a, b) => a.original.i > b.original.i ? 1 : -1,
            Cell: props => (
              <span className="font-mono font-semibold">
                {number_format((props.flatRows?.indexOf(props.row) > -1 ?
                  props.flatRows.indexOf(props.row) : props.value
                ) + 1, '0,0')}
              </span>
            ),
          },
          {
            Header: 'Voter',
            accessor: 'voter',
            sortType: (a, b) => a.original.voter > b.original.voter ? 1 : -1,
            Cell: props => (
              <div className="flex items-center space-x-1">
                <Link href={`/account/${props.value}`}>
                  <a className="text-blue-600 dark:text-white font-medium">
                    {ellipse(props.value, 12, process.env.NEXT_PUBLIC_PREFIX_ACCOUNT)}
                  </a>
                </Link>
                <Copy value={props.value} />
              </div>
            ),
          },
          {
            Header: 'Validator',
            accessor: 'validator_data.description.moniker',
            sortType: (a, b) => a.original.validator_data?.description?.moniker > b.original.validator_data?.description?.moniker ? 1 : -1,
            Cell: props => (
              <div className={`min-w-max flex items-${props.value ? 'start' : 'center'} space-x-2`}>
                <Link href={`/validator/${props.row.original.validator_data?.operator_address}`}>
                  <a>
                    <ValidatorProfile validator_description={props.row.original.validator_data?.description} />
                  </a>
                </Link>
                <div className="flex flex-col">
                  {props.value && (
                    <Link href={`/validator/${props.row.original.validator_data?.operator_address}`}>
                      <a className="text-blue-600 dark:text-white font-bold">
                        {ellipse(props.value, 16)}
                      </a>
                    </Link>
                  )}
                  <div className="flex items-center space-x-1">
                    <Link href={`/validator/${props.row.original.validator_data?.operator_address}`}>
                      <a className="text-slate-400 dark:text-slate-600 font-medium">
                        {ellipse(props.row.original.validator_data?.operator_address, 12, process.env.NEXT_PUBLIC_PREFIX_VALIDATOR)}
                      </a>
                    </Link>
                    <Copy value={props.row.original.validator_data?.operator_address} />
                  </div>
                </div>
              </div>
            ),
          },
          {
            Header: 'Voting Power',
            accessor: 'validator_data.tokens',
            sortType: (a, b) => a.original.validator_data?.tokens > b.original.validator_data?.tokens ? 1 : -1,
            Cell: props => (
              <div className="flex flex-col text-left sm:text-right">
                <span className="font-semibold">
                  {props.value > 0 ?
                    number_format(Math.floor(denom_manager.amount(props.value, assets_data?.[0]?.id, assets_data)), '0,0.00') : '-'
                  }
                </span>
                {props.value > 0 && validators_data && (
                  <span className="text-slate-400 dark:text-slate-600 font-medium">
                    {number_format(props.value * 100 / _.sumBy(validators_data.filter(v => !v.jailed && ['BOND_STATUS_BONDED'].includes(v.status)), 'tokens'), '0,0.000')}%
                  </span>
                )}
              </div>
            ),
            headerClassName: 'min-w-max justify-start sm:justify-end text-left sm:text-right',
          },
          {
            Header: 'Vote',
            accessor: 'option',
            sortType: (a, b) => a.original.status > b.original.status ? 1 : -1,
            Cell: props => (
              <div className="flex flex-col items-end text-right">
                {props.value ?
                  <div className={`max-w-min ${['YES'].includes(props.value) ? 'bg-green-500 dark:bg-green-600 text-white' : ['NO'].includes(props.value) ? 'bg-red-500 dark:bg-red-600 text-white' : 'bg-slate-100 dark:bg-slate-900'} rounded-lg font-semibold -mt-0.5 py-1 px-2`}>
                    {props.value?.replace('_', ' ')}
                  </div>
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
        data={data}
        noPagination={data.length <= 10}
        defaultPageSize={25}
        className="no-border"
      />
      :
      <TailSpin color={loader_color(theme)} width="32" height="32" />
  )
}