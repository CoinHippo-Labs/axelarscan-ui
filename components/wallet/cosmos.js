import { useSelector, useDispatch, shallowEqual } from 'react-redux'

import Image from '../image'
import { toArray } from '../../lib/utils'
import { COSMOS_WALLET_DATA, COSMOS_WALLET_RESET } from '../../reducers/types'

const ENVIRONMENT = process.env.NEXT_PUBLIC_ENVIRONMENT

export default (
  {
    hidden = false,
    disabled = false,
    connectChainId,
    children,
    className = '',
  },
) => {
  const dispatch = useDispatch()
  const { cosmos_wallet } = useSelector(state => ({ cosmos_wallet: state.cosmos_wallet }), shallowEqual)
  const { cosmos_wallet_data } = { ...cosmos_wallet }
  const { chain_id, provider } = { ...cosmos_wallet_data }

  const chainId = connectChainId

  const enable = async (chainId = connectChainId) => {
    try {
      if (chainId) {
        await window.keplr.enable(chainId)
      }
    } catch (error) {
      const message = error?.toString()
      if (!message?.includes('Request rejected')) {
        try {
          const response = await fetch(`https://${ENVIRONMENT !== 'mainnet' ? 'testnet.' : ''}api.0xsquid.com/v1/chains`).catch(error => { return null })
          const { chains } = { ...await response.json() }
          const chain_data = toArray(chains).find(d => d.chainId === chainId)

          await window.keplr.experimentalSuggestChain(chain_data)
          await window.keplr.enable(chainId)
        } catch (error) {}
      }
    }
  }

  const getSigner = async (chainId = connectChainId) => {
    if (!chainId) return
    await enable(chainId)
    try {
      return await window.keplr.getOfflineSignerAuto(chainId)
    } catch (error) {
      return null
    }
  }

  const getAddress = async (chainId = connectChainId) => {
    if (!chainId) return
    const signer = await getSigner(chainId)
    if (!signer) return
    const [account] = await signer.getAccounts()
    return account.address
  }

  const connect = async (chainId = connectChainId) => {
    const signer = await getSigner(chainId)
    const address = signer && await getAddress(chainId)
    if (chainId && signer && address) {
      dispatch({
        type: COSMOS_WALLET_DATA,
        value: {
          chain_id: chainId,
          provider: window?.keplr,
          signer,
          address,
        },
      })
    }
    else {
      dispatch({ type: COSMOS_WALLET_RESET })
    }
  }

  const disconnect = () => dispatch({ type: COSMOS_WALLET_RESET })

  return !hidden && (
    <>
      {provider ?
        connectChainId && connectChainId !== chain_id ?
          <button
            disabled={disabled}
            onClick={() => connect(chainId)}
            className={className}
          >
            {children || (
              <div className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded whitespace-nowrap text-slate-600 dark:text-slate-200 py-1 px-2">
                Connect
              </div>
            )}
          </button> :
          <button
            disabled={disabled}
            onClick={disconnect}
            className={className}
          >
            {children || (
              <div className="bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-500 rounded whitespace-nowrap text-white py-1 px-2">
                Disconnect
              </div>
            )}
          </button> :
        <button
          disabled={disabled}
          onClick={() => connect(chainId)}
          className={className}
        >
          {children || (
            <div className="bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-500 rounded flex items-center whitespace-nowrap text-white space-x-1.5 py-1 px-2">
              <span>Connect</span>
              <Image
                src="/logos/wallets/keplr.png"
                width={16}
                height={16}
              />
            </div>
          )}
        </button>
      }
    </>
  )
}