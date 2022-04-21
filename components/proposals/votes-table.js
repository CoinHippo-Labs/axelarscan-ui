import Link from 'next/link'
import { useSelector, shallowEqual } from 'react-redux'

import _ from 'lodash'
import { Img } from 'react-image'

import Datatable from '../datatable'
import Copy from '../copy'

import { denomer } from '../../lib/object/denom'
import { numberFormat, ellipseAddress } from '../../lib/utils'

export default function VotesTable({ data, className = '' }) {
  const { denoms, validators } = useSelector(state => ({ denoms: state.denoms, validators: state.data }), shallowEqual)
  const { denoms_data } = { ...denoms }
  const { validators_data } = { ...validators }

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
                <div className="skeleton w-6 h-4 my-0.5" />
            ),
          },
          {
            Header: 'Voter',
            accessor: 'voter',
            sortType: (rowA, rowB) => rowA.original.voter > rowB.original.voter ? 1 : -1,
            Cell: props => (
              !props.row.original.skeleton ?
                <div className="min-w-max flex items-center space-x-2 my-1">
                  <div className="flex flex-col">
                    <span className="flex items-center space-x-1">
                      <Link href={`/account/${props.value}`}>
                        <a className="text-blue-600 dark:text-white">
                          {ellipseAddress(props.value, 16)}
                        </a>
                      </Link>
                      <Copy text={props.value} />
                    </span>
                  </div>
                </div>
                :
                <div className="flex items-start space-x-2 my-0.5">
                  <div className="flex flex-col space-y-1.5">
                    <div className="skeleton w-48 h-5" />
                  </div>
                </div>
            ),
          },
          {
            Header: 'Validator',
            accessor: 'validator_data.description.moniker',
            sortType: (rowA, rowB) => (rowA.original.validator_data?.description?.moniker || rowA.original.i) > (rowB.original.validator_data?.description?.moniker || rowB.original.i) ? 1 : -1,
            Cell: props => (
              !props.row.original.skeleton ?
                <div className={`min-w-max flex items-${props.value ? 'start' : 'center'} space-x-2`}>
                  <Link href={`/validator/${props.row.original.validator_data?.operator_address}`}>
                    <a>
                      {props.row.original.validator_data?.description?.image ?
                        <Img
                          src={props.row.original.validator_data.description.image}
                          alt=""
                          className="w-6 h-6 rounded-full"
                        />
                        :
                        <div className="skeleton w-6 h-6 rounded-full" />
                      }
                    </a>
                  </Link>
                  <div className="flex flex-col">
                    {props.value && (
                      <Link href={`/validator/${props.row.original.validator_data?.operator_address}`}>
                        <a className="text-blue-600 dark:text-white font-medium">
                          {ellipseAddress(props.value, 16) || props.row.original.validator_data?.operator_address}
                        </a>
                      </Link>
                    )}
                    <span className="flex items-center space-x-1">
                      <Link href={`/validator/${props.row.original.validator_data?.operator_address}`}>
                        <a className="text-gray-500 font-light">
                          {process.env.NEXT_PUBLIC_PREFIX_VALIDATOR}{ellipseAddress(props.row.original.validator_data?.operator_address?.replace(process.env.NEXT_PUBLIC_PREFIX_VALIDATOR, ''), 8)}
                        </a>
                      </Link>
                      <Copy text={props.row.original.validator_data?.operator_address} />
                    </span>
                  </div>
                </div>
                :
                <div className="flex items-start space-x-2">
                  <div className="skeleton w-6 h-6 rounded-full" />
                  <div className="flex flex-col space-y-1.5">
                    <div className="skeleton w-32 h-4" />
                    <div className="skeleton w-48 h-3" />
                  </div>
                </div>
            ),
          },
          {
            Header: 'Voting Power',
            accessor: 'validator_data.tokens',
            sortType: (rowA, rowB) => rowA.original.validator_data?.tokens > rowB.original.validator_data?.tokens ? 1 : -1,
            Cell: props => (
              !props.row.original.skeleton ?
                <div className="flex flex-col justify-center text-left sm:text-right">
                  {props.value > 0 ?
                    <>
                      <span className="font-medium">{numberFormat(Math.floor(denomer.amount(props.value, denoms_data?.[0]?.id, denoms_data)), '0,0.00')}</span>
                      {validators_data && (
                        <span className="text-gray-400 dark:text-gray-600">{numberFormat(props.value * 100 / _.sumBy(validators_data.filter(v => !v.jailed && ['BOND_STATUS_BONDED'].includes(v.status)), 'tokens'), '0,0.000')}%</span>
                      )}
                    </>
                    :
                    <span className="text-gray-400 dark:text-gray-600">-</span>
                  }
                </div>
                :
                <div className="flex flex-col justify-center space-y-1">
                  <div className="skeleton w-16 h-4 ml-0 sm:ml-auto" />
                  <div className="skeleton w-8 h-4 ml-0 sm:ml-auto" />
                </div>
            ),
            headerClassName: 'min-w-max justify-start sm:justify-end text-left sm:text-right',
          },
          {
            Header: 'Vote',
            accessor: 'option',
            sortType: (rowA, rowB) => rowA.original.status > rowB.original.status ? 1 : -1,
            Cell: props => (
              !props.row.original.skeleton ?
                <div className="text-right my-1">
                  {props.value ?
                    <span className={`bg-${['YES'].includes(props.value) ? 'green-600 dark:bg-green-700' : ['NO'].includes(props.value) ? 'red-600 dark:bg-red-700' : 'gray-400 dark:bg-gray-900'} rounded-xl capitalize text-white font-semibold px-2 py-1`}>
                      {props.value?.replace('_', ' ')}
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
        ]}
        data={data ?
          data?.map((vote, i) => { return { ...vote, i } }) || []
          :
          [...Array(25).keys()].map(i => { return { i, skeleton: true } })
        }
        noPagination={data ? data.length <= 10 : true}
        defaultPageSize={100}
        className="small no-border mt-2"
      />
      {data?.length < 1 && (
        <div className="bg-white dark:bg-gray-900 rounded-xl text-gray-300 dark:text-gray-500 text-base font-medium italic text-center my-4 mx-2 py-2">
          No Votes
        </div>
      )}
    </>
  )
}