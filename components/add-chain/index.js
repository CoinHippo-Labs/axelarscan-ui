import { useState, useEffect } from 'react'
import { useSelector, useDispatch, shallowEqual } from 'react-redux'
import Web3 from 'web3'
import { providers } from 'ethers'

import Image from '../image'
import { WALLET_DATA, CHAIN_ID } from '../../reducers/types'

export default ({
  chain_data,
}) => {
  const dispatch = useDispatch()
  const {
    evm_chains,
    wallet,
    _chain_id,
  } = useSelector(state =>
    (
      {
        evm_chains: state.evm_chains,
        wallet: state.wallet,
        _chain_id: state.chain_id,
      }
    ),
    shallowEqual,
  )
  const {
    evm_chains_data,
  } = { ...evm_chains }
  const {
    wallet_data,
  } = { ...wallet }
  const {
    provider,
  } = { ...wallet_data }
  const {
    chain_id,
  } = { ..._chain_id }

  const [web3, setWeb3] = useState(null)

  useEffect(() => {
    if (!web3) {
      setWeb3(
        new Web3(Web3.givenProvider)
      )
    }
    else {
      try {
        web3.currentProvider._handleChainChanged = e => {
          try {
            const chainId = Web3.utils.hexToNumber(e?.chainId)

            dispatch({
              type: CHAIN_ID,
              value: chainId,
            })

            const web3Provider = new providers.Web3Provider(provider)
            const signer = web3Provider.getSigner()

            dispatch({
              type: WALLET_DATA,
              value: {
                chain_id: chainId,
                web3_provider: web3Provider,
                signer,
              },
            })
          } catch (error) {}
        }
      } catch (error) {}
    }
  }, [web3])

  const switchChain = async chain_id => {
    try {
      await web3.currentProvider.request(
        {
          method: 'wallet_switchEthereumChain',
          params: [
            {
              chainId: web3.utils.toHex(chain_id),
            },
          ],
        },
      )
    } catch (error) {
      const {
        code,
      } = { ...error }

      if (code === 4902) {
        try {
          const {
            provider_params,
          } = { ...evm_chains_data?.find(c => c.chain_id === chain_id) }

          await web3.currentProvider.request(
            {
              method: 'wallet_addEthereumChain',
              params: provider_params,
            },
          )
        } catch (error) {}
      }
    }
  }

  return (
    <button
      onClick={() => switchChain(
        chain_data?.chain_id,
      )}
      className="min-w-max bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 shadow rounded cursor-pointer flex items-center py-1.5 px-2"
    >
      <Image
        src="/logos/wallets/metamask.png"
        alt=""
        className="w-4 h-4"
      />
    </button>
  )
}