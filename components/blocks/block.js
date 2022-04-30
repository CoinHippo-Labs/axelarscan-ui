import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'

import _ from 'lodash'

import BlockDetail from './block-detail'
import TransactionsTable from '../transactions/transactions-table'
import Widget from '../widget'

import { block as getBlock, transactions as getTransactions } from '../../lib/api/cosmos'
import { numberFormat } from '../../lib/utils'

export default function Block({ height }) {
  const { denoms, validators } = useSelector(state => ({ denoms: state.denoms, validators: state.validators }), shallowEqual)
  const { denoms_data } = { ...denoms }
  const { validators_data } = { ...validators }

  const [block, setBlock] = useState(null)
  const [transactions, setTransactions] = useState(null)

  useEffect(() => {
    const controller = new AbortController()

    const getData = async () => {
      if (height) {

        if (!controller.signal.aborted) {
          const response = await getBlock(height)
          setBlock({ data: response?.data || {}, height })
        }
      }
    }

    getData()

    const interval = setInterval(() => getData(), 5 * 60 * 1000)
    return () => {
      controller?.abort()
      clearInterval(interval)
    }
  }, [height])

  useEffect(() => {
    const controller = new AbortController()

    const getData = async () => {
      if (height && denoms_data) {
        let response, data = [], pageKey = true

        while (pageKey) {
          if (!controller.signal.aborted) {
            response = await getTransactions({ events: `tx.height=${height}`, 'pagination.key': pageKey && typeof pageKey === 'string' ? pageKey : undefined }, null, denoms_data)
            data = _.orderBy(_.uniqBy(_.concat(data, response?.data || []), 'txhash'), ['timestamp'], ['desc'])
            pageKey = response?.pagination?.next_key
          }
          else {
            pageKey = null
          }
        }

        setTransactions({ data, total: response?.total, height })
      }
    }

    getData()

    const interval = setInterval(() => getData(), 5 * 60 * 1000)
    return () => {
      controller?.abort()
      clearInterval(interval)
    }
  }, [height, denoms_data])

  const validator_data = block?.height === height && block?.data?.proposer_address && validators_data && _.head(validators_data.filter(v => v?.consensus_address === block.data.proposer_address))

  return (
    <div className="max-w-6.5xl my-2 xl:my-4 mx-auto">
      <BlockDetail
        data={block?.height === height && block?.data}
        validator_data={validator_data}
      />
      <Widget
        title={<div className="flex items-center text-gray-900 dark:text-white text-lg font-semibold space-x-1">
          <span>Transactions</span>
          {transactions && transactions.height === height && (
            <span>({transactions.total || transactions.data.length})</span>
          )}
        </div>}
        className="mt-4"
      >
        <div className="mt-3">
          <TransactionsTable
            data={transactions}
            noLoad={true}
            location="blocks"
            className="no-border"
          />
        </div>
      </Widget>
    </div>
  )
}