import { useState, useEffect } from 'react'
import { useSelector, useDispatch, shallowEqual } from 'react-redux'

import Image from '../image'
import Copy from '../copy'
import { ens as getEns } from '../../lib/api/ens'
import { equalsIgnoreCase, ellipse } from '../../lib/utils'
import accounts from '../../data/accounts'
import { ENS_DATA } from '../../reducers/types'

export default (
  {
    address,
    no_copy = false,
    no_image = false,
    fallback,
    className = '',
  },
) => {
  const dispatch = useDispatch()
  const {
    ens,
  } = useSelector(state =>
    (
      {
        ens: state.ens,
      }
    ),
    shallowEqual,
  )
  const {
    ens_data,
  } = { ...ens }

  const [noImage, setNoImage] = useState(no_image)

  useEffect(
    () => {
      const getData = async () => {
        if (address) {
          const addresses =
            [
              address.toLowerCase()
            ]
            .filter(a =>
              a &&
              !ens_data?.[a]
            )

          if (addresses.length > 0) {
            let _ens_data

            addresses
              .forEach(a => {
                if (!_ens_data?.[a]) {
                  _ens_data = {
                    ..._ens_data,
                    [`${a}`]: {},
                  }
                }
              })

            dispatch(
              {
                type: ENS_DATA,
                value: {
                  ..._ens_data,
                },
              }
            )

            _ens_data = await getEns(addresses)

            addresses
              .forEach(a => {
                if (!_ens_data?.[a]) {
                  _ens_data = {
                    ..._ens_data,
                    [`${a}`]: {},
                  }
                }
              })

            dispatch(
              {
                type: ENS_DATA,
                value: {
                  ..._ens_data,
                },
              }
            )
          }
        }
      }

      getData()
    },
    [address, ens_data],
  )

  address = address?.toLowerCase()

  const {
    name,
  } = { ...ens_data?.[address] }

  const ens_name =
    name &&
    (
      <span
        title={name}
        className={
          className ||
          'normal-case tracking-wider text-black dark:text-white text-base font-medium'
        }
      >
        <span className="xl:hidden">
          {ellipse(
            name,
            12,
          )}
        </span>
        <span className="hidden xl:block">
          {ellipse(
            name,
            12,
          )}
        </span>
      </span>
    )

  const environment = process.env.NEXT_PUBLIC_ENVIRONMENT

  const account =
    !ens_name &&
    accounts
      .find(a =>
        equalsIgnoreCase(
          a?.address,
          address,
        ) &&
        (
          !a?.environment ||
          equalsIgnoreCase(
            a.environment,
            environment,
          )
        )
      )

  return (
    ens_name ?
      <div className="flex items-center space-x-2">
        {
          !noImage &&
          (
            <img
              src={`${process.env.NEXT_PUBLIC_ENS_AVATAR_URL}/${name}`}
              onError={() => setNoImage(true)}
              className="w-6 h-6 rounded-full"
            />
          )
        }
        {no_copy ?
          ens_name :
          <Copy
            value={name}
            title={ens_name}
          />
        }
      </div> :
      account ?
        <div
          className={
            `min-w-max flex ${
              no_copy ?
                'items-center' :
                'items-start'
            } space-x-2`
          }
        >
          {
            account.image &&
            (
              <Image
                src={account.image}
                className="w-6 h-6 rounded-full"
              />
            )
          }
          <div className="flex flex-col">
            <div className="tracking-wider text-blue-500 dark:text-blue-500 font-medium">
              <span className="xl:hidden">
                {ellipse(
                  account.name,
                  20,
                )}
              </span>
              <span className="hidden xl:block">
                {ellipse(
                  account.name,
                  20,
                )}
              </span>
            </div>
            {
              !no_copy &&
              (
                <Copy
                  value={address}
                  title={
                    <div className="cursor-pointer text-slate-400 dark:text-slate-600">
                      {ellipse(
                        address,
                        10,
                      )}
                    </div>
                  }
                />
              )
            }
          </div>
        </div> :
        fallback
  )
}