import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'

import _ from 'lodash'
import moment from 'moment'
import { Img } from 'react-image'
import Loader from 'react-loader-spinner'

import Datatable from '../datatable'
import Copy from '../copy'
import Popover from '../popover'

import { blocks as getBlocks } from '../../lib/api/opensearch'
import { numberFormat, ellipseAddress } from '../../lib/utils'

const LATEST_SIZE = 100
const MAX_PAGE = 10

export default function BlocksTable({ n, className = '' }) {
  const { preferences, denoms, validators } = useSelector(state => ({ preferences: state.preferences, denoms: state.denoms, validators: state.validators }), shallowEqual)
  const { theme } = { ...preferences }
  const { denoms_data } = { ...denoms }
  const { validators_data } = { ...validators }
  
  const [page, setPage] = useState(0)
  const [moreLoading, setMoreLoading] = useState(false)
  const [blocks, setBlocks] = useState(null)

  useEffect(() => {
    const controller = new AbortController()

    const getData = async is_interval => {
      if (!controller.signal.aborted) {
        if (!n && page && !is_interval) {
          setMoreLoading(true)
        }

        let _data, _page = 0

        while (_page <= page) {
          if (!controller.signal.aborted) {
            const response = await getBlocks({ size: n || LATEST_SIZE, from: _page * (n || LATEST_SIZE), sort: [{ height: 'desc' }] })

            _data = _.uniqBy(_.concat(_data || [], response?.data || []), 'height')
          }

          _page++
        }

        setBlocks({ data: _data || [] })

        if (!n && page && !is_interval) {
          setMoreLoading(false)
        }
      }
    }

    getData()

    const interval = setInterval(() => getData(true), 5 * 1000)
    return () => {
      controller?.abort()
      clearInterval(interval)
    }
  }, [page])

  return (
    <>
      <Datatable
        columns={[
          {
            Header: 'Height',
            accessor: 'height',
            disableSortBy: true,
            Cell: props => (
              !props.row.original.skeleton ?
                <Link href={`/block/${props.value}`}>
                  <a className="text-blue-600 dark:text-white font-medium">
                    {numberFormat(props.value, '0,0')}
                  </a>
                </Link>
                :
                <div className="skeleton w-16 h-4" />
            ),
          },
          {
            Header: 'Block Hash',
            accessor: 'hash',
            disableSortBy: true,
            Cell: props => (
              !props.row.original.skeleton ?
                <Link href={`/block/${props.row.original.height}`}>
                  <a className="uppercase text-gray-600 dark:text-gray-400 font-medium">
                    {ellipseAddress(props.value, n ? 6 : 10)}
                  </a>
                </Link>
                :
                <div className={`skeleton w-${n ? 24 : 48} h-4`} />
            ),
          },
          {
            Header: 'Proposer',
            accessor: 'proposer_address',
            disableSortBy: true,
            Cell: props => (
              !props.row.original.skeleton && validators_data ?
                props.row.original.operator_address ?
                  <div className={`min-w-max flex items-${props.row.original.proposer_name ? 'start' : 'center'} space-x-2`}>
                    <Link href={`/validator/${props.row.original.operator_address}`}>
                      <a>
                        {props.row.original.proposer_image ?
                          <Img
                            src={props.row.original.proposer_image}
                            alt=""
                            className="w-6 h-6 rounded-full"
                          />
                          :
                          <div className="skeleton w-6 h-6 rounded-full" />
                        }
                      </a>
                    </Link>
                    <div className="flex flex-col">
                      {props.row.original.proposer_name && (
                        <Link href={`/validator/${props.row.original.operator_address}`}>
                          <a className="text-blue-600 dark:text-white font-medium">
                            {ellipseAddress(props.row.original.proposer_name, 16) || props.row.original.operator_address}
                          </a>
                        </Link>
                      )}
                      <span className="flex items-center space-x-1">
                        <Link href={`/validator/${props.row.original.operator_address}`}>
                          <a className="text-gray-500 font-light">
                            {process.env.NEXT_PUBLIC_PREFIX_VALIDATOR}{ellipseAddress(props.row.original.operator_address?.replace(process.env.NEXT_PUBLIC_PREFIX_VALIDATOR, ''), 8)}
                          </a>
                        </Link>
                        <Copy text={props.row.original.operator_address} />
                      </span>
                    </div>
                  </div>
                  :
                  '-'
                :
                <div className="flex items-start space-x-2">
                  <div className="skeleton w-6 h-6 rounded-full" />
                  <div className="flex flex-col space-y-2.5">
                    <div className="skeleton w-24 h-4" />
                    <div className="skeleton w-56 h-3" />
                  </div>
                </div>
            ),
          },
          {
            Header: 'TXs',
            accessor: 'txs',
            disableSortBy: true,
            Cell: props => (
              !props.row.original.skeleton ?
                <div className="text-right">
                  {props.value > -1 ?
                    <span>{numberFormat(props.value, '0,0')}</span>
                    :
                    '-'
                  }
                </div>
                :
                <div className={`skeleton w-${n ? 8 : 12} h-4 ml-auto`} />
            ),
            headerClassName: 'justify-end text-right',
          },
          {
            Header: 'Time',
            accessor: 'time',
            disableSortBy: true,
            Cell: props => (
              !props.row.original.skeleton ?
                <Popover
                  placement="top"
                  title={<div className="flex items-center space-x-1">
                    <span>Block:</span>
                    <span className="font-mono">{numberFormat(props.row.original.height, '0,0')}</span>
                  </div>}
                  content={<div className="w-36 text-xs">{moment(props.value).format('MMM D, YYYY h:mm:ss A')}</div>}
                  titleClassName="h-8"
                  className="ml-auto"
                >
                  <div className="text-right">
                    <span className="normal-case text-gray-400 dark:text-gray-600 font-normal">
                      {Number(moment().diff(moment(props.value), 'second')) > 59 ?
                        moment(props.value).fromNow()
                        :
                        <>{moment().diff(moment(props.value), 'second')}s ago</>
                      }
                    </span>
                  </div>
                </Popover>
                :
                <div className={`skeleton w-${n ? 16 : 24} h-4 ml-auto`} />
            ),
            headerClassName: 'justify-end text-right',
          },
        ]}
        data={blocks ?
          blocks.data.filter((block, i) => !n || i < n).map((block, i) => {
            let proposer_name, proposer_image, operator_address

            if (block?.proposer_address && validators_data?.findIndex(v => v.consensus_address === block.proposer_address) > -1) {
              const validator_data = validators_data.find(v => v.consensus_address === block.proposer_address)

              operator_address = validator_data.operator_address

              if (validator_data.description) {
                proposer_name = validator_data.description.moniker
                proposer_image = validator_data.description.image
              }
            }

            return { ...block, i, operator_address, proposer_name, proposer_image }
          })
          :
          [...Array(n || 25).keys()].map(i => { return { i, skeleton: true } })
        }
        noPagination={true}
        defaultPageSize={100}
        className={`min-h-full ${className}`}
      />
      {blocks && !(blocks.data?.length > 0) && (
        <div className={`bg-${!n ? 'white' : 'gray-50'} dark:bg-gray-900 rounded-xl text-gray-300 dark:text-gray-500 text-base font-medium italic text-center my-4 py-2`}>
          No Blocks
        </div>
      )}
      {!n && blocks?.data?.length >= LATEST_SIZE * (page + 1) && page < MAX_PAGE && (
        <div
          onClick={() => setPage(page + 1)}
          className="btn btn-default btn-rounded max-w-max bg-trasparent bg-gray-100 dark:bg-gray-900 hover:bg-gray-200 dark:hover:bg-gray-800 cursor-pointer text-gray-900 dark:text-white font-semibold mb-8 mx-auto"
        >
          Load More
        </div>
      )}
      {moreLoading && (
        <div className="flex justify-center mb-8">
          <Loader type="ThreeDots" color={theme === 'dark' ? 'white' : '#3B82F6'} width="32" height="32" />
        </div>
      )}
    </>
  )
}