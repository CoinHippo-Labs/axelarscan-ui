import Link from 'next/link'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import { ProgressBar } from 'react-loader-spinner'

import Datatable from '../datatable'
import ValidatorProfile from '../validator-profile'
import Copy from '../copy'
import { native_asset_id, assetManager } from '../../lib/object/asset'
import { number_format, ellipse, loader_color } from '../../lib/utils'

export default (
  {
    data,
  },
) => {
  const {
    preferences,
    assets,
    validators,
  } = useSelector(state =>
    (
      {
        preferences: state.preferences,
        assets: state.assets,
        validators: state.validators,
      }
    ),
    shallowEqual,
  )
  const {
    theme,
  } = { ...preferences }
  const {
    assets_data,
  } = { ...assets }
  const {
    validators_data,
  } = { ...validators }

  return (
    data ?
      <Datatable
        columns={
          [
            {
              Header: '#',
              accessor: 'i',
              sortType: (a, b) =>
                a.original.i > b.original.i ?
                  1 :
                  -1,
              Cell: props => (
                <span className="font-medium">
                  {number_format(
                    (
                      props.flatRows?.indexOf(props.row) > -1 ?
                        props.flatRows.indexOf(props.row) :
                        props.value
                    ) + 1,
                    '0,0',
                  )}
                </span>
              ),
            },
            {
              Header: 'Voter',
              accessor: 'voter',
              sortType: (a, b) =>
                a.original.voter > b.original.voter ?
                  1 :
                  -1,
              Cell: props => (
                <div className="flex items-center space-x-1">
                  <Link href={`/account/${props.value}`}>
                    <a
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:text-blue-600 dark:text-blue-500 dark:hover:text-blue-400 font-medium"
                    >
                      {ellipse(
                        props.value,
                        10,
                        process.env.NEXT_PUBLIC_PREFIX_ACCOUNT,
                      )}
                    </a>
                  </Link>
                  <Copy
                    value={props.value}
                  />
                </div>
              ),
            },
            {
              Header: 'Validator',
              accessor: 'validator_data.operator_address',
              disableSortBy: true,
              Cell: props => {
                const {
                  value,
                } = { ...props }
                const {
                  description,
                } = { ...props.row.original.validator_data }
                const {
                  moniker,
                } = { ...description }

                return (
                  description ?
                    <div className={`min-w-max flex items-${moniker ? 'start' : 'center'} space-x-2`}>
                      <Link href={`/validator/${value}`}>
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
                            <Link href={`/validator/${value}`}>
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
                          <Link href={`/validator/${value}`}>
                            <a
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-slate-400 dark:text-slate-600"
                            >
                              {ellipse(
                                value,
                                10,
                                process.env.NEXT_PUBLIC_PREFIX_VALIDATOR,
                              )}
                            </a>
                          </Link>
                          <Copy
                            value={value}
                          />
                        </div>
                      </div>
                    </div> :
                    value ?
                      <div className="flex items-center space-x-1">
                        <Link href={`/validator/${value}`}>
                          <a
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:text-blue-600 dark:text-blue-500 dark:hover:text-blue-400 font-medium"
                          >
                            {ellipse(
                              value,
                              10,
                              process.env.NEXT_PUBLIC_PREFIX_VALIDATOR,
                            )}
                          </a>
                        </Link>
                        <Copy
                          value={value}
                        />
                      </div> :
                      <span>
                        -
                      </span>
                )
              },
            },
            {
              Header: 'Voting Power',
              accessor: 'validator_data.tokens',
              sortType: (a, b) =>
                a.original.validator_data?.tokens > b.original.validator_data?.tokens ?
                  1 :
                  -1,
              Cell: props => {
                const {
                  value,
                } = { ...props }

                const total_voting_power =
                  assetManager
                    .amount(
                      _.sumBy(
                        (validators_data || [])
                          .filter(v =>
                            !v.jailed &&
                            [
                              'BOND_STATUS_BONDED',
                            ].includes(v.status)
                          ),
                        'tokens',
                      ),
                      native_asset_id,
                      assets_data,
                    )

                return (
                  <div className="flex flex-col items-start sm:items-end text-left sm:text-right">
                    <span
                      title={
                        number_format(
                          value,
                          '0,0',
                        )
                      }
                      className="uppercase text-slate-600 dark:text-slate-200 font-semibold"
                    >
                      {number_format(
                        value,
                        '0,0.00a',
                      )}
                    </span>
                    {
                      value > 0 &&
                      total_voting_power > 0 &&
                      (
                        <span className="text-slate-400 dark:text-slate-600 text-xs lg:text-sm">
                          {number_format(
                            value * 100 / total_voting_power,
                            '0,0.000000',
                          )}
                          %
                        </span>
                      )
                    }
                  </div>
                )
              },
              headerClassName: 'whitespace-nowrap justify-start sm:justify-end text-left sm:text-right',
            },
            {
              Header: 'Vote',
              accessor: 'option',
              sortType: (a, b) =>
                a.original.status > b.original.status ?
                  1 :
                  -1,
              Cell: props => {
                const {
                  value,
                } = { ...props }

                return (
                  <div className="flex flex-col items-end text-right">
                    {value ?
                      <div className={`max-w-min ${['YES'].includes(value) ? 'bg-green-200 dark:bg-green-300 border-2 border-green-400 dark:border-green-600 text-green-500 dark:text-green-700' : ['NO'].includes(value) ? 'bg-red-200 dark:bg-red-300 border-2 border-red-400 dark:border-red-600 text-red-500 dark:text-red-700' : 'bg-slate-100 dark:bg-slate-800'} rounded-xl text-xs font-semibold py-0.5 px-2`}>
                        {
                          value
                            .replace(
                              '_',
                              ' ',
                            )
                        }
                      </div> :
                      <span>
                        -
                      </span>
                    }
                  </div>
                )
              },
              headerClassName: 'justify-end text-right',
            },
          ]
        }
        data={data}
        noPagination={data.length <= 10}
        defaultPageSize={25}
        className="no-border"
      /> :
      <ProgressBar
        borderColor={loader_color(theme)}
        width="32"
        height="32"
      />
  )
}