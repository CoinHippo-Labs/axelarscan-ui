import Link from 'next/link'
import { useSelector, shallowEqual } from 'react-redux'
import { TailSpin } from 'react-loader-spinner'

import Datatable from '../datatable'
import Copy from '../copy'
import { number_format, ellipse, loader_color } from '../../lib/utils'

export default ({ data }) => {
  const { preferences } = useSelector(state => ({ preferences: state.preferences }), shallowEqual)
  const { theme } = { ...preferences }

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
            Header: 'Address',
            accessor: 'delegator_address',
            disableSortBy: true,
            Cell: props => (
              <div className="flex items-center space-x-1">
                <Link href={`/account/${props.value}`}>
                  <a className="font-medium">
                    {ellipse(props.value, 16, process.env.NEXT_PUBLIC_PREFIX_ACCOUNT)}
                  </a>
                </Link>
                <Copy value={props.value} />
                {props.row.original.self && (
                  <span className="bg-blue-600 rounded-lg capitalize text-white text-xs font-semibold px-2 py-0.5">
                    Self
                  </span>
                )}
              </div>
            ),
          },
          {
            Header: 'Amount',
            accessor: 'amount',
            sortType: (a, b) => a.original.amount > b.original.amount ? 1 : -1,
            Cell: props => (
              <div className="flex flex-col text-left sm:text-right">
                <div className="flex flex-col items-start sm:items-end space-y-1.5">
                  {typeof props.value === 'number' ?
                    <div className="font-semibold">
                      {number_format(props.value, '0,0.00000000')} {props.row.original.denom}
                    </div>
                    :
                    <div>
                      -
                    </div>
                  }
                </div>
              </div>
            ),
            headerClassName: 'justify-start sm:justify-end text-left sm:text-right',
          },
        ]}
        data={data}
        noPagination={data.length <= 10}
        defaultPageSize={10}
        className="no-border"
        style={{ minHeight: 'calc(100% - 48px)' }}
      />
      :
      <TailSpin color={loader_color(theme)} width="32" height="32" />
  )
}