import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import { Alert } from '@material-tailwind/react'
import { AxelarRecoveryApi } from '@axelar-network/axelarjs-sdk'
import _ from 'lodash'
import { IoCheckmarkCircleOutline, IoCloseCircleOutline, IoTimeOutline } from 'react-icons/io5'

import Info from './info'
import Details from './details'
import Spinner from '../../spinner'
import ExplorerLink from '../../explorer/link'
import { searchTransfers } from '../../../lib/api/transfers'
import { getChainData } from '../../../lib/config'
import { toArray, equalsIgnoreCase, sleep, parseError } from '../../../lib/utils'

const ENVIRONMENT = process.env.NEXT_PUBLIC_ENVIRONMENT

export default () => {
  const { chains, assets } = useSelector(state => ({ chains: state.chains, assets: state.assets }), shallowEqual)
  const { chains_data } = { ...chains }
  const { assets_data } = { ...assets }

  const router = useRouter()
  const { query } = { ...router }
  const { tx, transfer_id } = { ...query }

  const [api, setAPI] = useState(null)
  const [data, setData] = useState(null)

  const [processing, setProcessing] = useState(null)
  const [response, setResponse] = useState(null)

  useEffect(
    () => {
      if (!api) {
        try {
          setAPI(new AxelarRecoveryApi({ environment: ENVIRONMENT, axelarRpcUrl: process.env.NEXT_PUBLIC_RPC_URL, axelarLcdUrl: process.env.NEXT_PUBLIC_LCD_URL }))
        } catch (error) {
          setAPI(undefined)
        }
      }
    },
    [],
  )

  useEffect(
    () => {
      setProcessing(null)
      setResponse(null)
    },
    [tx],
  )

  useEffect(
    () => {
      getData()
      const interval = setInterval(() => getData(), 0.5 * 60 * 1000)
      return () => clearInterval(interval)
    },
    [tx, transfer_id, assets_data, api, processing],
  )

  const getData = async () => {
    if (tx && assets_data && !(matched && ['received', 'failed'].includes(data.simplified_status))) {
      const response = await searchTransfers({ txHash: tx, size: 1 })
      const _data = _.head(response?.data)
      console.log('[data]', _data)
      setData(_data)
      return _data
    }
    else if (transfer_id) {
      const response = await searchTransfers({ transferId: transfer_id, size: 1 })
      const { send } = { ..._.head(response?.data) }
      const { txhash } = { ...send }
      if (txhash) {
        router.push(`/transfer/${txhash}`)
      }
      else {
        setData({})
      }
    }
    return null
  }

  const sendIBC = async data => {
    if (api && data) {
      setProcessing(true)
      try {
        setResponse({ status: 'pending', message: 'Executing' })

        // const { send } = { ...data }
        // const { txhash } = { ...send }

        // console.log('[sendIBC request]', { transactionHash: txhash })
        // const response = await api.manualRelayToDestChain(txhash)
        // console.log('[sendIBC response]', response)
        // const { success, error, routeMessageTx } = { ...response }
        // const { message } = { ...error }

        // if (success) {
        //   await sleep(10 * 1000)
        // }
        // if (success) {
        //   setResponse({
        //     status: success || !error ? 'success' : 'failed',
        //     message: message || error || 'Execute successful',
        //     hash: routeMessageTx?.transactionHash,
        //     chain: 'axelarnet',
        //   })
        // }
      } catch (error) {
        setResponse({ status: 'failed', ...parseError(error) })
      }
      setProcessing(false)
    }
  }

  const { ibc_send } = { ...data }
  const { status, message, hash } = { ...response }
  const { explorer } = { ...getChainData(response?.chain, chains_data) }

  const executeButton = null && !ibc_send?.ack_txhash && ibc_send?.failed_txhash && (
    <div key="execute" className="flex items-center space-x-1">
      <button
        disabled={processing}
        onClick={() => sendIBC(data)}
        className={`bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-500 ${processing ? 'pointer-events-none' : ''} rounded flex items-center text-white py-1 px-2`}
      >
        <span className="font-medium">
          Execute
        </span>
      </button>
    </div>
  )

  const matched = toArray([
    data?.send?.txhash,
    data?.wrap?.txhash,
    data?.wrap?.tx_hash_wrap,
    data?.command?.transactionHash,
    data?.unwrap?.txhash,
    data?.unwrap?.tx_hash_wrap,
    data?.erc20_transfer?.txhash,
    data?.erc20_transfer?.tx_hash_transfer,
  ]).findIndex(h => equalsIgnoreCase(tx, h)) > -1

  return (
    <div className="children px-3">
      {data && matched ?
        <div className="max-w-6xl space-y-8 sm:space-y-12 pt-6 sm:pt-8 mx-auto">
          {!tx ?
            <span className="text-slate-400 dark:text-slate-500 text-base">
              Transaction not found
            </span> :
            <>
              <div className="space-y-4 sm:space-y-6">
                <Info
                  data={data}
                  buttons={
                    Object.fromEntries(
                      toArray([
                        executeButton && ['ibc_send', executeButton],
                      ])
                    )
                  }
                />
                {response && (
                  <Alert
                    show={!!response}
                    color={status === 'success' ? 'green' : status === 'failed' ? 'red' : 'blue'}
                    icon={status === 'success' ? <IoCheckmarkCircleOutline size={26} /> : status === 'failed' ? <IoCloseCircleOutline size={26} /> : <IoTimeOutline size={26} />}
                    animate={{ mount: { y: 0 }, unmount: { y: 32 } }}
                    onClose={() => setResponse(null)}
                    className="alert-box flex"
                  >
                    <div className="flex flex-col text-base">
                      <span>{message}</span>
                      {hash && (
                        <ExplorerLink
                          value={hash}
                          explorer={explorer}
                          width={18}
                          height={18}
                          iconOnly={false}
                          viewOnClassName="font-semibold pr-0.5"
                        />
                      )}
                    </div>
                  </Alert>
                )}
              </div>
              <Details data={data} />
            </>
          }
        </div> :
        <div className="loading">
          <Spinner name="Blocks" />
        </div>
      }
    </div>
  )
}