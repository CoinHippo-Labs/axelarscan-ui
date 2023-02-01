import { useState, useEffect, useRef } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'

import Items from './items'
import Image from '../../image'
import { getChain } from '../../../lib/object/chain'

export default (
  {
    value,
    onSelect,
  },
) => {
  const {
    evm_chains,
    cosmos_chains,
  } = useSelector(state =>
    (
      {
        evm_chains: state.evm_chains,
        cosmos_chains: state.cosmos_chains,
      }
    ),
    shallowEqual,
  )
  const {
    evm_chains_data,
  } = { ...evm_chains }
  const {
    cosmos_chains_data,
  } = { ...cosmos_chains }

  const [hidden, setHidden] = useState(true)
  const [chainData, setChainData] = useState(null)

  const buttonRef = useRef(null)
  const dropdownRef = useRef(null)

  useEffect(
    () => {
      const handleClickOutside = e => {
        if (
          hidden ||
          buttonRef.current.contains(e.target) ||
          dropdownRef.current.contains(e.target)
        ) {
          return false
        }

        setHidden(!hidden)
      }

      document
        .addEventListener(
          'mousedown',
          handleClickOutside,
        )

      return () =>
        document
          .removeEventListener(
            'mousedown',
            handleClickOutside,
          )
    },
    [hidden, buttonRef, dropdownRef],
  )

  useEffect(
    () => {
      if (
        evm_chains_data &&
        cosmos_chains_data &&
        value
      ) {
        setChainData(
          getChain(
            value,
            chains_data,
          )
        )
      }
    },
    [evm_chains_data, cosmos_chains_data, value],
  )

  const onClick = () => setHidden(!hidden)

  const chains_data =
    _.concat(
      evm_chains_data,
      cosmos_chains_data,
    )

  const {
    image,
  } = { ...chainData }

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={onClick}
        className="bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded-full flex items-center justify-center p-1"
      >
        {
          value &&
          image &&
          (
            <Image
              src={image}
              width={20}
              height={20}
              className="rounded-full"
            />
          )
        }
        {
          !value &&
          (
            <span className="whitespace-nowrap text-xs px-2">
              Any chain
            </span>
          )
        }
      </button>
      <div
        ref={dropdownRef} 
        className={`dropdown ${hidden ? '' : 'open'} absolute top-0 right-0 mt-8`}
      >
        <div className="bottom-start">
          <Items
            value={value}
            onClick={
              c => {
                if (onSelect) {
                  onSelect(c)
                }

                if (onClick) {
                  onClick()
                }
              }
            }
          />
        </div>
      </div>
    </div>
  )
}