import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'

import Image from '../../image'
import Wallet from '../../wallet'
import { equalsIgnoreCase } from '../../../lib/utils'

export default (
  {
    value,
    onClick,
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

  const [menus, setMenus] = useState(null)

  useEffect(
    () => {
      if (
        evm_chains_data &&
        cosmos_chains_data
      ) {
        setMenus(
          _.concat(
            {
              name: 'Any chain',
            },
            _.concat(
              evm_chains_data,
              cosmos_chains_data,
            )
            .filter(c =>
              c?.id &&
              !c.deprecated
            ),
          )
        )
      }
    },
    [evm_chains_data, cosmos_chains_data],
  )

  return (
    menus &&
    (
      <div
        className="w-40 h-64 overflow-y-auto shadow dark:shadow-slate-700 rounded-lg flex flex-col py-1"
      >
        {menus
          .map((m, i) => {
            const {
              id,
              name,
              image,
            } = { ...m }

            const selected =
              equalsIgnoreCase(
                id,
                value,
              )

            const disabled = selected

            const item =
              (
                <div className="flex items-center space-x-2">
                  {
                    image &&
                    (
                      <Image
                        src={image}
                        width={24}
                        height={24}
                        className="rounded-full"
                      />
                    )
                  }
                  <span
                    className={
                      `whitespace-nowrap normal-case ${
                        selected ?
                          'font-semibold' :
                          'font-medium'
                      }`
                    }
                  >
                    {name}
                  </span>
                </div>
              )

            const className =
              `w-full ${
                i === 0 ?
                  'rounded-t-lg' :
                  i === menus.length - 1 ?
                    'rounded-b-lg' :
                    ''
              } ${
                disabled ?
                  'cursor-default' :
                  'cursor-pointer'
              } flex items-center uppercase ${
                selected ?
                  'bg-white hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-blue-500 dark:text-blue-500 text-sm font-bold' :
                  'bg-white hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-slate-600 hover:text-slate-700 dark:text-slate-300 dark:hover:text-slate-200 text-sm font-normal hover:font-semibold'
              } space-x-1.5 py-2 px-3`

            return (
              <div
                key={i}
                disabled={disabled}
                onClick={
                  () => {
                    if (onClick) {
                      onClick(id)
                    }
                  }
                }
                className={className}
              >
                {item}
              </div>
            )
          })
        }
      </div>
    )
  )
}