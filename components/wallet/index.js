import { useState, useEffect, useCallback } from 'react'
import { useSelector, useDispatch, shallowEqual } from 'react-redux'
import Web3Modal from 'web3modal'
import { providers, utils } from 'ethers'
import { Img } from 'react-image'

import { WALLET_DATA, WALLET_RESET } from '../../reducers/types'

const providerOptions = {}

const getNetwork = chain_id => {
  return {
    1: 'mainnet',
    137: 'matic',
    43114: 'avalanche-fuji-mainnet',
    250: 'fantom',
    1284: 'moonbeam',
    3: 'ropsten',
    80001: 'mumbai',
    43113: 'avalanche-fuji-testnet',
    // 4002: 'fantom-tesnet',
    // 1287: 'moonbase',
  }[chain_id]
}

let web3Modal

export default function Wallet({
  mainController = false,
  hidden = false,
  disabled = false, 
  connectChainId,
  connectButton,
  disconnectButton,
  onSwitch,
  children,
}) {
  const dispatch = useDispatch()
  const { preferences, chains, wallet } = useSelector(state => ({ preferences: state.preferences, chains: state.chains, wallet: state.wallet }), shallowEqual)
  const { theme } = { ...preferences }
  const { chains_data } = { ...chains }
  const { wallet_data } = { ...wallet }
  const { chain_id, provider, web3_provider } = { ...wallet_data }

  const [defaultChainId, setDefaultChainId] = useState(null)

  useEffect(() => {
    if (connectChainId && connectChainId !== defaultChainId) {
      setDefaultChainId(connectChainId)
    }
  }, [connectChainId])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (web3_provider) {
        dispatch({
          type: WALLET_DATA,
          value: { default_chain_id: defaultChainId },
        })
      }
      web3Modal = new Web3Modal({
        network: getNetwork(defaultChainId) || 'mainnet',
        cacheProvider: true,
        providerOptions,
      })
    }
  }, [defaultChainId])

  useEffect(() => {
    if (web3Modal?.cachedProvider) {
      connect()
    }
  }, [web3Modal])

  useEffect(async () => {
    if (web3Modal) {
      await web3Modal.updateTheme(theme)
    }
  }, [theme])

  const connect = useCallback(async () => {
    const provider = await web3Modal.connect()
    const web3Provider = new providers.Web3Provider(provider)
    const network = await web3Provider.getNetwork()
    const signer = web3Provider.getSigner()
    const address = await signer.getAddress()
    dispatch({
      type: WALLET_DATA,
      value: {
        chain_id: network.chainId,
        provider,
        web3_provider: web3Provider,
        address,
        signer,
      },
    })
  }, [web3Modal])

  const disconnect = useCallback(async (e, is_reestablish) => {
    if (web3Modal && !is_reestablish) {
      await web3Modal.clearCachedProvider()
    }
    if (provider?.disconnect && typeof provider.disconnect === 'function') {
      await provider.disconnect()
    }
    dispatch({
      type: WALLET_RESET,
    })
  }, [web3Modal, provider])

  const switchChain = async () => {
    if (connectChainId && connectChainId !== chain_id && provider) {
      try {
        await provider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: utils.hexValue(connectChainId) }],
        })
      } catch (error) {
        if (error.code === 4902) {
          try {
            await provider.request({
              method: 'wallet_addEthereumChain',
              params: chains_data?.find(c => c.chain_id === connectChainId)?.provider_params,
            })
          } catch (error) {}
        }
      }
    }
  }

  useEffect(() => {
    if (provider?.on) {
      const handleChainChanged = chainId => {
        if (!chainId) {
          disconnect()
        }
        else {
          connect()
        }
      }
      const handleAccountsChanged = accounts => {
        if (!accounts[0]) {
          disconnect()
        }
        else {
          dispatch({
            type: WALLET_DATA,
            value: {
              address: accounts[0],
            },
          })
        }
      }
      const handleDisconnect = e => {
        disconnect(e, e.code === 1013)
        if (e.code === 1013) {
          connect()
        }
      }
      provider.on('chainChanged', handleChainChanged)
      provider.on('accountsChanged', handleAccountsChanged)
      provider.on('disconnect', handleDisconnect)
      return () => {
        if (provider.removeListener) {
          provider.removeListener('chainChanged', handleChainChanged)
          provider.removeListener('accountsChanged', handleAccountsChanged)
          provider.removeListener('disconnect', handleDisconnect)
        }
      }
    }
  }, [provider, disconnect])

  return !hidden && (
    <>
      {web3_provider ?
        !mainController && connectChainId ?
          <button
            disabled={disabled}
            onClick={() => {
              switchChain()
              if (onSwitch) {
                onSwitch()
              }
            }}
          >
            {children || (
              <div className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-lg whitespace-nowrap font-medium py-1 px-2">
                Switch Network
              </div>
            )}
          </button>
          :
          <button
            disabled={disabled}
            onClick={disconnect}
          >
            {children || (
              <div className="bg-gray-100 hover:bg-gray-200 dark:bg-red-600 dark:hover:bg-red-700 rounded-lg whitespace-nowrap font-medium py-1 px-2">
                Disconnect
              </div>
            )}
          </button>
        :
        <button
          disabled={disabled}
          onClick={connect}
        >
          {children || (
            <div className="min-w-max bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 rounded-lg whitespace-nowrap flex items-center text-white font-medium space-x-1.5 py-1 px-2">
              <span>Connect</span>
              <Img
                src="/logos/wallets/metamask.png"
                alt=""
                className="w-4 h-4"
              />
            </div>
          )}
        </button>
      }
    </>
  )
}