import Datatable from '../datatable'
import Copy from '../copy'

import { numberFormat, ellipseAddress } from '../../lib/utils'

export default function DelegationsTable({ data }) {
  return (
    <>
      <Datatable
        columns={[
          {
            Header: 'Address',
            accessor: 'delegator_address',
            disableSortBy: true,
            Cell: props => (
              !props.row.original.skeleton ?
                props.value ?
                  <div className="flex items-center">
                    <span className="block lg:hidden font-medium mr-1">{ellipseAddress(props.value, 10)}</span>
                    <span className="hidden lg:block xl:hidden font-medium mr-1">{ellipseAddress(props.value, 16)}</span>
                    <span className="hidden xl:block font-medium mr-1">{ellipseAddress(props.value, 24)}</span>
                    <Copy text={props.value} className="mr-1" />
                    {props.row.original.self && (
                      <span className="bg-indigo-600 rounded-full capitalize text-white text-xs font-semibold px-2 py-0.5">
                        Self
                      </span>
                    )}
                  </div>
                  :
                  '-'
                :
                <div className="skeleton w-48 h-5" />
            ),
          },
          {
            Header: 'Amount',
            accessor: 'amount',
            disableSortBy: true,
            Cell: props => (
              !props.row.original.skeleton ?
                typeof props.value === 'number' ?
                  <span className="flex items-center space-x-1">
                    <span>{numberFormat(props.value, '0,0.00000000')}</span>
                    {props.row.original.denom && (
                      <span className="uppercase font-medium">{props.row.original.denom}</span>
                    )}
                  </span>
                  :
                  '-'
                :
                <div className="skeleton w-16 h-5" />
            ),
          },
        ]}
        data={data ?
          data.map((key, i) => { return { ...key, i } })
          :
          [...Array(10).keys()].map(i => { return { i, skeleton: true } })
        }
        noPagination={data?.length > 10 ? false : true}
        defaultPageSize={10}
        className="no-border"
      />
      {data?.length < 1 && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl text-gray-300 dark:text-gray-500 text-base font-medium italic text-center my-4 py-2">
          No Delegations
        </div>
      )}
    </>
  )
}