import Link from 'next/link'
import { useState, useEffect } from 'react'

import Image from '../image'
import Copy from '../copy'
import { ellipse, equals_ignore_case } from '../../lib/utils'
import accounts from '../../data/accounts'
  
export default ({
  address,
  ellipse_size = 10,
  prefix = process.env.NEXT_PUBLIC_PREFIX_ACCOUNT,
  url,
}) => {
  const [name, setName] = useState(null)

  useEffect(() => {
    if (address) {
      setName(
        accounts.find(a =>
          equals_ignore_case(a?.address, address) &&
          (
            !a?.environment ||
            equals_ignore_case(a.environment, environment)
          )
        )?.name ||
        address
      )
    }
  }, [address])

  const environment = process.env.NEXT_PUBLIC_ENVIRONMENT

  const is_name = !equals_ignore_case(name, address)

  const nameComponent = (
    <>
      <span className="xl:hidden">
        {ellipse(
          name,
          ellipse_size * 2,
        )}
      </span>
      <span className="hidden xl:block">
        {ellipse(
          name,
          ellipse_size * 2,
        )}
      </span>
    </>
  )

  return is_name ?
    <div className="min-w-max flex items-start space-x-2">
      {/*
        <Image
          src={image}
          alt=""
          className="w-6 h-6 rounded-full"
        />
      */}
      <div className="flex flex-col">
        {
          url ?
            <Link
              href={
                typeof url === 'string' ?
                  url :
                  `/account/${address}`
              }
            >
              <a
                target="_blank"
                rel="noopener noreferrer"
                className="tracking-wider text-blue-500 hover:text-blue-600 dark:text-blue-500 dark:hover:text-blue-400 font-medium"
              >
                {nameComponent}
              </a>
            </Link> :
            <div className="tracking-wider text-blue-500 dark:text-blue-500 font-medium">
              {nameComponent}
            </div>
        }
        {
          is_name &&
          (
            <Copy
              value={address}
              title={<div className="cursor-pointer text-slate-400 dark:text-slate-600">
                {ellipse(
                  address,
                  ellipse_size,
                  prefix,
                )}
              </div>}
            />
          )
        }
      </div>
    </div> :
    url ?
      <div className="flex items-center space-x-1">
        <Link
          href={
            typeof url === 'string' ?
              url :
              `/account/${address}`
          }
        >
          <a
            target="_blank"
            rel="noopener noreferrer"
            className="tracking-wider text-blue-500 hover:text-blue-600 dark:text-blue-500 dark:hover:text-blue-400 font-medium"
          >
            {ellipse(
              address,
              ellipse_size,
              prefix,
            )}
          </a>
        </Link>
        <Copy
          value={address}
        />
      </div> :
      <Copy
        value={address}
        title={<div className="cursor-pointer">
          {ellipse(
            address,
            ellipse_size,
            prefix,
          )}
        </div>}
      />
}