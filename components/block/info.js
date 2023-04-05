import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import moment from 'moment'
import { ProgressBar } from 'react-loader-spinner'

import Copy from '../copy'
import ValidatorProfile from '../validator-profile'
import Popover from '../popover'
import { validator_sets } from '../../lib/api/lcd'
import { number_format, ellipse, equalsIgnoreCase, loader_color } from '../../lib/utils'

export default (
  {
    data,
  },
) => {
  const {
    preferences,
    validators,
  } = useSelector(state =>
    (
      {
        preferences: state.preferences,
        validators: state.validators,
      }
    ),
    shallowEqual,
  )
  const {
    theme,
  } = { ...preferences }
  const {
    validators_data,
  } = { ...validators }

  const [validatorsData, setValidatorsData] = useState(null)

  useEffect(
    () => {
      const getData = async () => {
        const {
          height,
        } = { ...data }

        if (
          height &&
          validators_data
        ) {
          const response = await validator_sets(height)

          const {
            validators,
          } = { ...response?.result }

          if (response) {
            setValidatorsData(
              (validators || [])
                .map(v => {
                  const {
                    address,
                  } = { ...v }

                  return {
                    ...v,
                    ...(
                      validators_data
                        .find(_v =>
                          equalsIgnoreCase(
                            _v?.consensus_address,
                            address,
                          )
                        )
                    ),
                  }
                })
            )
          }
        }
      }

      getData()
    },
    [data, validators_data],
  )

  const {
    block,
    height,
    round,
    validator_addresses,
  } = { ...data }
  const {
    hash,
    time,
    num_txs,
    proposer_address,
  } = { ...data?.block?.header }

  const validator_data = (validators_data || [])
    .find(v =>
      equalsIgnoreCase(
        v?.consensus_address,
        proposer_address,
      )
    )
  const {
    operator_address,
    description,
  } = { ...validator_data }
  const {
    moniker,
  } = { ...description }

  const signed_validators_data =
    validatorsData &&
    validatorsData
      .filter(v =>
        validator_addresses?.includes(v?.address)
      )

  const unsigned_validators_data =
    validatorsData &&
    validatorsData
      .filter(v =>
        !validator_addresses?.includes(v?.address)
      )

  const rowClassName = 'flex flex-col md:flex-row items-start space-y-2 md:space-y-0 space-x-0 md:space-x-2'
  const titleClassName = 'w-40 lg:w-64 tracking-wider text-slate-600 dark:text-slate-300 text-sm lg:text-base font-medium'

  return (
    <div className="bg-slate-100 dark:bg-slate-900 bg-opacity-75 dark:bg-opacity-75 w-fit flex flex-col rounded-lg space-y-4 py-6 px-5">
      <div className={rowClassName}>
        <span className={titleClassName}>
          Height:
        </span>
        {data ?
          height &&
          (
            <span className="text-sm lg:text-base font-medium">
              {number_format(
                height,
                '0,0',
              )}
            </span>
          ) :
          <ProgressBar
            borderColor={loader_color(theme)}
            width="24"
            height="24"
          />
        }
      </div>
      <div className={rowClassName}>
        <span className={titleClassName}>
          Block Hash:
        </span>
        {data ?
          hash &&
          (
            <Copy
              size={20}
              value={hash}
              title={
                <span className="cursor-pointer break-all text-black dark:text-white text-sm lg:text-base font-medium">
                  {hash}
                </span>
              }
            />
          ) :
          <ProgressBar
            borderColor={loader_color(theme)}
            width="24"
            height="24"
          />
        }
      </div>
      <div className={rowClassName}>
        <span className={titleClassName}>
         Block Time:
        </span>
        {data ?
          time &&
          (
            <span className="whitespace-nowrap text-slate-400 dark:text-slate-600 text-sm lg:text-base font-normal">
              {
                moment(time)
                  .fromNow()
              } ({
                moment(time)
                  .format('MMM D, YYYY h:mm:ss A')
              })
            </span>
          ) :
          <ProgressBar
            borderColor={loader_color(theme)}
            width="24"
            height="24"
          />
        }
      </div>
      <div className={rowClassName}>
        <span className={titleClassName}>
          Proposer:
        </span>
        {data ?
          validator_data ?
            <div className={`min-w-max flex items-${moniker ? 'start' : 'center'} space-x-2`}>
              <Link href={`/validator/${operator_address}`}>
                <a
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ValidatorProfile
                    validator_description={description}
                  />
                </a>
              </Link>
              <div className="flex flex-col">
                {
                  moniker &&
                  (
                    <Link href={`/validator/${operator_address}`}>
                      <a
                        target="_blank"
                        rel="noopener noreferrer"
                        className="tracking-wider text-blue-500 hover:text-blue-600 dark:text-blue-500 dark:hover:text-blue-400 font-medium"
                      >
                        {ellipse(
                          moniker,
                          16,
                        )}
                      </a>
                    </Link>
                  )
                }
                <div className="flex items-center space-x-1">
                  <Link href={`/validator/${operator_address}`}>
                    <a
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-slate-400 dark:text-slate-600"
                    >
                      {ellipse(
                        operator_address,
                        10,
                        process.env.NEXT_PUBLIC_PREFIX_VALIDATOR,
                      )}
                    </a>
                  </Link>
                  <Copy
                    value={operator_address}
                  />
                </div>
              </div>
            </div> :
            proposer_address ?
              <Copy
                value={proposer_address}
                title={
                  <span className="cursor-pointer text-slate-400 dark:text-slate-600 text-sm lg:text-base font-medium">
                    {ellipse(
                      proposer_address,
                      8,
                      process.env.NEXT_PUBLIC_PREFIX_CONSENSUS,
                    )}
                  </span>
                }
              /> :
              <span>
                -
              </span> :
          <ProgressBar
            borderColor={loader_color(theme)}
            width="24"
            height="24"
          />
        }
      </div>
      {
        typeof round === 'number' &&
        (
          <div className={rowClassName}>
            <span className={titleClassName}>
              Round:
            </span>
            <span className="text-sm lg:text-base font-medium">
              {number_format(
                round,
                '0,0',
              )}
            </span>
          </div>
        )
      }
      {
        validator_addresses &&
        validatorsData &&
        (
          <div className={rowClassName}>
            <span className={titleClassName}>
              Signer / Absent:
            </span>
            <div className="flex items-center space-x-2">
              <Popover
                placement="bottom"
                title="Signed by"
                content={
                  <div className="overflow-y-auto grid grid-flow-row grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                    {signed_validators_data?.length > 0 ?
                      signed_validators_data
                        .map((v, i) => {
                          const {
                            operator_address,
                            description,
                          } = { ...v }
                          const {
                            moniker,
                          } = { ...description }

                          return (
                            moniker ?
                              <div
                                key={i}
                                className={`min-w-max flex items-${moniker ? 'start' : 'center'} space-x-2`}
                              >
                                <Link href={`/validator/${operator_address}`}>
                                  <a
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <ValidatorProfile
                                      validator_description={description}
                                    />
                                  </a>
                                </Link>
                                <div className="flex flex-col">
                                  <Link href={`/validator/${operator_address}`}>
                                    <a
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="tracking-wider text-blue-500 hover:text-blue-600 dark:text-blue-500 dark:hover:text-blue-400 font-medium"
                                    >
                                      {ellipse(
                                        moniker,
                                        12,
                                      )}
                                    </a>
                                  </Link>
                                  <div className="flex items-center space-x-1">
                                    <Link href={`/validator/${operator_address}`}>
                                      <a
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-slate-400 dark:text-slate-600"
                                      >
                                        {ellipse(
                                          operator_address,
                                          8,
                                          process.env.NEXT_PUBLIC_PREFIX_VALIDATOR,
                                        )}
                                      </a>
                                    </Link>
                                    <Copy
                                      value={operator_address}
                                    />
                                  </div>
                                </div>
                              </div> :
                              operator_address ?
                                <div
                                  key={i}
                                  className="flex items-center space-x-1"
                                >
                                  <Link href={`/validator/${operator_address}`}>
                                    <a
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-500 hover:text-blue-600 dark:text-blue-500 dark:hover:text-blue-400 font-medium"
                                    >
                                      {ellipse(
                                        operator_address,
                                        8,
                                        process.env.NEXT_PUBLIC_PREFIX_VALIDATOR,
                                      )}
                                    </a>
                                  </Link>
                                  <Copy
                                    value={operator_address}
                                  />
                                </div> :
                                <span
                                  key={i}
                                >
                                  -
                                </span>
                          )
                        }) :
                      <span>
                        -
                      </span>
                    }
                  </div>
                }
                titleClassName="normal-case py-1.5"
              >
                <span className="text-sm lg:text-base font-medium">
                  {signed_validators_data ?
                    `${
                      number_format(
                        signed_validators_data.length,
                        '0,0',
                      )
                    } (${
                      number_format(
                        _.sumBy(
                          signed_validators_data,
                          'tokens',
                        )
                        * 100
                        /
                        _.sumBy(
                          _.concat(
                            signed_validators_data,
                            unsigned_validators_data ||
                            [],
                          ),
                          'tokens',
                        ),
                        '0,0.000',
                      )
                    } %)` :
                    '-'
                  }
                </span>
              </Popover>
              <span>
                /
              </span>
              <Popover
                placement="bottom"
                title="Missing"
                content={
                  <div className="overflow-y-auto grid grid-flow-row grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                    {unsigned_validators_data?.length > 0 ?
                      unsigned_validators_data
                        .map((v, i) => {
                          const {
                            operator_address,
                            description,
                          } = { ...v }
                          const {
                            moniker,
                          } = { ...description }

                          return (
                            moniker ?
                              <div
                                key={i}
                                className={`min-w-max flex items-${moniker ? 'start' : 'center'} space-x-2`}
                              >
                                <Link href={`/validator/${operator_address}`}>
                                  <a
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <ValidatorProfile
                                      validator_description={description}
                                    />
                                  </a>
                                </Link>
                                <div className="flex flex-col">
                                  <Link href={`/validator/${operator_address}`}>
                                    <a
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="tracking-wider text-blue-500 hover:text-blue-600 dark:text-blue-500 dark:hover:text-blue-400 font-medium"
                                    >
                                      {ellipse(
                                        moniker,
                                        12,
                                      )}
                                    </a>
                                  </Link>
                                  <div className="flex items-center space-x-1">
                                    <Link href={`/validator/${operator_address}`}>
                                      <a
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-slate-400 dark:text-slate-600"
                                      >
                                        {ellipse(
                                          operator_address,
                                          8,
                                          process.env.NEXT_PUBLIC_PREFIX_VALIDATOR,
                                        )}
                                      </a>
                                    </Link>
                                    <Copy
                                      value={operator_address}
                                    />
                                  </div>
                                </div>
                              </div> :
                              operator_address ?
                                <div
                                  key={i}
                                  className="flex items-center space-x-1"
                                >
                                  <Link href={`/validator/${operator_address}`}>
                                    <a
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-500 hover:text-blue-600 dark:text-blue-500 dark:hover:text-blue-400 font-medium"
                                    >
                                      {ellipse(
                                        operator_address,
                                        8,
                                        process.env.NEXT_PUBLIC_PREFIX_VALIDATOR,
                                      )}
                                    </a>
                                  </Link>
                                  <Copy
                                    value={operator_address}
                                  />
                                </div> :
                                <span
                                  key={i}
                                >
                                  -
                                </span>
                          )
                        }) :
                      <span>
                        -
                      </span>
                    }
                  </div>
                }
                titleClassName="normal-case py-1.5"
              >
                <span className="text-sm lg:text-base font-medium">
                  {unsigned_validators_data ?
                    number_format(
                      unsigned_validators_data.length,
                      '0,0',
                    ) :
                    '-'
                  }
                </span>
              </Popover>
            </div>
          </div>
        )
      }
      <div className={rowClassName}>
        <span className={titleClassName}>
          Transactions:
        </span>
        {data ?
          <span className="text-sm lg:text-base font-medium">
            {num_txs > -1 ?
              number_format(
                num_txs,
                '0,0',
              ) :
              '-'
            }
          </span> :
          <ProgressBar
            borderColor={loader_color(theme)}
            width="24"
            height="24"
          />
        }
      </div>
    </div>
  )
}