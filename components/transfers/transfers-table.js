import _ from 'lodash'
import moment from 'moment'
import { Img } from 'react-image'

import Datatable from '../datatable'
import Copy from '../copy'

import { currency_symbol } from '../../lib/object/currency'
import { numberFormat, randImage } from '../../lib/utils'

export default function TransfersTable({ data, className = '' }) {
  return (
    <>
      <Datatable
        columns={[
          {
            Header: '#',
            accessor: 'i',
            sortType: (rowA, rowB) => rowA.original.i > rowB.original.i ? 1 : -1,
            Cell: props => (
              !props.row.original.skeleton ?
                <div className="my-1">
                  {numberFormat((props.flatRows?.indexOf(props.row) > -1 ? props.flatRows.indexOf(props.row) : props.value) + 1, '0,0')}
                </div>
                :
                <div className="skeleton w-4 h-4 my-1" />
            ),
          },
          {
            Header: 'Asset',
            accessor: 'asset.title',
            disableSortBy: true,
            Cell: props => (
              !props.row.original.skeleton ?
                <div className={`min-w-max flex items-start space-x-2 my-0.5`}>
                  <Img
                    src={props.row.original.asset?.image || randImage(props.row.original.i)}
                    alt=""
                    className="w-6 h-6 rounded-full"
                  />
                  <div className="flex flex-col">
                    <span className="font-semibold">{props.value}</span>
                    <span className="flex items-center space-x-1">
                      <span className="text-xs text-gray-400 dark:text-gray-600 font-medium">
                        {props.row.original.asset?.symbol}
                      </span>
                    </span>
                  </div>
                </div>
                :
                <div className="flex items-start space-x-2 my-0.5">
                  <div className="skeleton w-6 h-6 rounded-full"/>
                  <div className="flex flex-col space-y-1.5">
                    <div className="skeleton w-20 h-4" />
                    <div className="skeleton w-12 h-3" />
                  </div>
                </div>
            ),
          },
          {
            Header: 'From Chain',
            accessor: 'from_chain.title',
            disableSortBy: true,
            Cell: props => (
              !props.row.original.skeleton ?
                <div className="min-w-max flex items-center space-x-2.5 -my-0.5">
                  <Img
                    src={props.row.original.from_chain?.image || randImage(props.row.original.i)}
                    alt=""
                    className="w-7 h-7 rounded-full"
                  />
                  <span className="font-semibold">{props.value}</span>
                </div>
                :
                <div className="flex items-center space-x-2 -my-1">
                  <div className="skeleton w-7 h-7 rounded-full" />
                  <div className="skeleton w-20 h-5" />
                </div>
            ),
            headerClassName: 'whitespace-nowrap',
          },
          {
            Header: 'To Chain',
            accessor: 'to_chain.title',
            disableSortBy: true,
            Cell: props => (
              !props.row.original.skeleton ?
                <div className="min-w-max flex items-center space-x-2.5 -my-0.5">
                  <Img
                    src={props.row.original.to_chain?.image || randImage(props.row.original.i)}
                    alt=""
                    className="w-7 h-7 rounded-full"
                  />
                  <span className="font-semibold">{props.value}</span>
                </div>
                :
                <div className="flex items-center space-x-2 -my-1">
                  <div className="skeleton w-7 h-7 rounded-full" />
                  <div className="skeleton w-20 h-5" />
                </div>
            ),
            headerClassName: 'whitespace-nowrap',
          },
          {
            Header: 'Transactions',
            accessor: 'tx',
            sortType: (rowA, rowB) => rowA.original.tx > rowB.original.tx ? 1 : -1,
            Cell: props => (
              !props.row.original.skeleton ?
                <div className="text-right my-1">
                  {props.value ?
                    <span className="font-semibold">{numberFormat(props.value, '0,0')}</span>
                    :
                    '-'
                  }
                </div>
                :
                <div className="skeleton w-16 h-5 my-1 ml-auto" />
            ),
            headerClassName: 'justify-end text-right',
          },
          {
            Header: 'Volume',
            accessor: 'amount',
            sortType: (rowA, rowB) => rowA.original.value > rowB.original.value ? 1 : rowA.original.value < rowB.original.value ? -1 : rowA.original.amount > rowB.original.amount ? 1 : -1,
            Cell: props => (
              !props.row.original.skeleton ?
                <div className="text-right my-1.5">
                  {props.value ?
                    <div className="flex flex-col space-y-1.5">
                      <span className="text-xs space-x-1.5">
                        <span className="font-mono uppercase font-semibold">{numberFormat(props.value, props.value >= 100000 ? '0,0.00a' : '0,0.000')}</span>
                        <span className="text-gray-400 dark:text-gray-600">{props.row.original.asset?.symbol}</span>
                      </span>
                      {props.row.original.value > 0 && (
                        <span className="font-mono text-gray-400 dark:text-gray-600 text-2xs font-medium">
                          {currency_symbol}{numberFormat(props.row.original.value, '0,0.00')}
                        </span>
                      )}
                    </div>
                    :
                    '-'
                  }
                </div>
                :
                <div className="flex flex-col items-end space-y-2 my-1">
                  <div className="skeleton w-24 h-5" />
                  <div className="skeleton w-16 h-4" />
                </div>
            ),
            headerClassName: 'justify-end text-right',
          },
          {
            Header: 'Avg. Size',
            accessor: 'avg_amount',
            sortType: (rowA, rowB) => rowA.original.avg_value > rowB.original.avg_value ? 1 : rowA.original.avg_value < rowB.original.avg_value ? -1 : rowA.original.avg_amount > rowB.original.avg_amount ? 1 : -1,
            Cell: props => (
              !props.row.original.skeleton ?
                <div className="text-right my-1.5">
                  {props.value ?
                    <div className="flex flex-col space-y-1.5">
                      <span className="text-xs space-x-1.5">
                        <span className="font-mono uppercase font-semibold">{numberFormat(props.value, props.value >= 100000 ? '0,0.00a' : '0,0.000')}</span>
                        <span className="text-gray-400 dark:text-gray-600">{props.row.original.asset?.symbol}</span>
                      </span>
                      {props.row.original.avg_value > 0 && (
                        <span className="font-mono text-gray-400 dark:text-gray-600 text-2xs font-medium">
                          {currency_symbol}{numberFormat(props.row.original.avg_value, '0,0.00')}
                        </span>
                      )}
                    </div>
                    :
                    '-'
                  }
                </div>
                :
                <div className="flex flex-col items-end space-y-2 my-1">
                  <div className="skeleton w-24 h-5" />
                  <div className="skeleton w-16 h-4" />
                </div>
            ),
            headerClassName: 'whitespace-nowrap justify-end text-right',
          },
          {
            Header: 'Highest',
            accessor: 'max_amount',
            sortType: (rowA, rowB) => rowA.original.max_value > rowB.original.max_value ? 1 : rowA.original.max_value < rowB.original.max_value ? -1 : rowA.original.max_amount > rowB.original.max_amount ? 1 : -1,
            Cell: props => (
              !props.row.original.skeleton ?
                <div className="text-right my-1.5">
                  {props.value ?
                    <div className="flex flex-col space-y-1.5">
                      <span className="text-xs space-x-1.5">
                        <span className="font-mono uppercase font-semibold">{numberFormat(props.value, props.value >= 100000 ? '0,0.00a' : '0,0.000')}</span>
                        <span className="text-gray-400 dark:text-gray-600">{props.row.original.asset?.symbol}</span>
                      </span>
                      {props.row.original.max_value > 0 && (
                        <span className="font-mono text-gray-400 dark:text-gray-600 text-2xs font-medium">
                          {currency_symbol}{numberFormat(props.row.original.max_value, '0,0.00')}
                        </span>
                      )}
                    </div>
                    :
                    '-'
                  }
                </div>
                :
                <div className="flex flex-col items-end space-y-2 my-1">
                  <div className="skeleton w-24 h-5" />
                  <div className="skeleton w-16 h-4" />
                </div>
            ),
            headerClassName: 'justify-end text-right',
          },
          {
            Header: 'Since',
            accessor: 'since',
            sortType: (rowA, rowB) => rowA.original.since > rowB.original.since ? 1 : -1,
            Cell: props => (
              !props.row.original.skeleton ?
                <div className="text-right my-1">
                  {props.value > -1 ?
                    <span className="text-gray-400 dark:text-gray-500 text-2xs">
                      {moment(props.value).format('MMM D, YYYY h:mm:ss A z')}
                    </span>
                    :
                    '-'
                  }
                </div>
                :
                <div className="skeleton w-16 h-5 my-1 ml-auto" />
            ),
            headerClassName: 'justify-end text-right',
          },
        ]}
        data={data ?
          data.data?.map((key, i) => { return { ...key, i } }) || []
          :
          [...Array(7).keys()].map(i => { return { i, skeleton: true } })
        }
        noPagination={data?.data?.length > 10 ? false : true}
        defaultPageSize={10}
        className={`no-border ${className}`}
      />
      {data && !(data.data?.length > 0) && (
        <div className="bg-white dark:bg-gray-900 rounded-xl text-gray-300 dark:text-gray-500 text-base font-medium italic text-center my-4 mx-2 py-2">
          No Transfers Found
        </div>
      )}
    </>
  )
}