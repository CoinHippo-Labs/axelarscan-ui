import Link from 'next/link'
import { useRouter } from 'next/router'
import { useState } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import { ProgressBar } from 'react-loader-spinner'
import { BiErrorCircle, BiCheckCircle, BiXCircle, BiEdit } from 'react-icons/bi'
import { IoCaretUpCircle, IoCaretDownCircle } from 'react-icons/io5'

import Datatable from '../datatable'
import ValidatorProfile from '../validator-profile'
import Copy from '../copy'
import { number_format, name, ellipse, equals_ignore_case, loader_color } from '../../lib/utils'

const COLLAPSE_VALIDATORS_SIZE = 5

export default ({
  table,
  _data,
  corruption_signing_threshold,
  className = '',
}) => {
  const { preferences } = useSelector(state => ({ preferences: state.preferences }), shallowEqual)
  const { theme } = { ...preferences }

  const router = useRouter()
  const { pathname, query } = { ...router }
  const { address } = { ...query }

  const [seeMoreKeyIds, setSeeMoreKeyIds] = useState([])
  const [seeMoreKeyIdsNon, setSeeMoreKeyIdsNon] = useState([])

  const { data } = { ..._data }
  const is_validator_path = ['/validator'].findIndex(p => pathname?.includes(p)) > -1

  return (
    data ?
      <Datatable
        columns={[
          {
            Header: 'Key ID',
            accessor: 'key_id',
            sortType: (a, b) => a.original.key_id > b.original.key_id ? 1 : -1,
            Cell: props => (
              <div className="flex flex-col items-start space-y-1">
                <div className="flex items-center space-x-1.5">
                  {['keygens_failed'].includes(table) && (
                    <BiErrorCircle size={16} className="text-red-500 dark:text-red-600" />
                  )}
                  {props.value && (
                    <Copy
                      value={props.value}
                      title={<span className="cursor-pointer text-black dark:text-white font-bold">
                        {ellipse(props.value, 16)}
                      </span>}
                      size={18}
                    />
                  )}
                </div>
                {props.row.original.sig_id && (
                  <div className="flex flex-col items-start space-y-0.5">
                    <div className="text-slate-400 dark:text-slate-600 text-xs font-medium">
                      Signature ID
                    </div>
                    <Copy
                      value={props.row.original.sig_id}
                      title={<span className="cursor-pointer text-slate-400 dark:text-slate-200 text-xs font-semibold">
                        {ellipse(props.row.original.sig_id, 12)}
                      </span>}
                      size={16}
                    />
                  </div>
                )}
                {props.row.original.reason && (
                  <div className="max-w-xs whitespace-pre-wrap text-slate-400 dark:text-slate-600 text-xs font-medium">
                    {props.row.original.reason}
                  </div>
                )}
              </div>
            ),
            headerClassName: 'whitespace-nowrap',
          },
          {
            Header: 'Key Role',
            accessor: 'key_role',
            sortType: (a, b) => a.original.key_role?.replace('KEY_ROLE_', '') > b.original.key_role?.replace('KEY_ROLE_', '') ? 1 : -1,
            Cell: props => (
              <div className="max-w-min bg-slate-100 dark:bg-slate-900 rounded-lg capitalize text-xs font-semibold -mt-0.5 py-1 px-1.5">
                {name(props.value?.replace('KEY_ROLE_', '')) || '-'}
              </div>
            ),
          },
          {
            Header: 'Block',
            accessor: is_validator_path ? 'snapshot_block_number' : 'height',
            sortType: (a, b) => (is_validator_path ? a.original.snapshot_block_number > b.original.snapshot_block_number : a.original.height > b.original.height) ? 1 : -1,
            Cell: props => (
              <div className="flex flex-col text-left sm:text-right">
                {props.value > 0 ?
                  <Link href={`/block/${props.value}`}>
                    <a
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-white text-xs font-semibold"
                    >
                      {number_format(props.value, '0,0')}
                    </a>
                  </Link>
                  :
                  <span className="text-xs font-semibold">
                    {number_format(props.value, '0,0')}
                  </span>
                }
              </div>
            ),
            headerClassName: 'justify-start sm:justify-end text-left sm:text-right',
          },
          {
            Header: 'Share',
            accessor: 'num_validator_shares',
            sortType: (a, b) => a.original.num_validator_shares > b.original.num_validator_shares ? 1 : -1,
            Cell: props => (
              <div className="flex flex-col text-left sm:text-right">
                <div className="flex flex-col items-start sm:items-end text-xs font-semibold space-y-0.5">
                  {typeof props.value === 'number' ?
                    <>
                      <span className="font-bold">
                        {number_format(props.value, '0,0')} / {number_format(props.row.original.num_total_shares, '0,0')}
                      </span>
                      <span className="text-slate-400 dark:text-slate-200 text-2xs">
                        ({number_format(props.value * 100 / props.row.original.num_total_shares, '0,0.00')}%)
                      </span>
                    </>
                    :
                    <span>
                      -
                    </span>
                  }
                </div>
              </div>
            ),
            headerClassName: 'justify-start sm:justify-end text-left sm:text-right',
          },
          {
            Header: 'Keygen Threshold',
            accessor: 'keygen_threshold',
            disableSortBy: true,
            Cell: props => (
              <div className="flex flex-col text-left sm:text-right">
                <div className="flex flex-col items-start sm:items-end text-xs font-semibold space-y-0.5">
                  {props.value ?
                    <span className="font-bold">
                      {props.value}
                    </span> :
                    <span>
                      -
                    </span>
                  }
                </div>
              </div>
            ),
            headerClassName: 'whitespace-nowrap justify-start sm:justify-end text-left sm:text-right',
          },
          {
            Header: 'Signing Threshold',
            accessor: 'signing_threshold',
            disableSortBy: true,
            Cell: props => (
              <div className="flex flex-col text-left sm:text-right">
                <div className="flex flex-col items-start sm:items-end text-xs font-semibold space-y-0.5">
                  {props.value ?
                    <span className="font-bold">
                      {props.value}
                    </span> :
                    <span>
                      -
                    </span>
                  }
                </div>
              </div>
            ),
            headerClassName: 'whitespace-nowrap justify-start sm:justify-end text-left sm:text-right',
          },
          {
            Header: 'Participated Validators',
            accessor: 'validators',
            disableSortBy: true,
            Cell: props => (
              <div className="flex flex-col space-y-1.5">
                {props.value?.length > 0 ?
                  <>
                    {!props.row.original.participant_addresses && (
                      <div className="flex items-center space-x-1">
                        {typeof props.row.original.snapshot === 'number' && (
                          <div className="uppercase text-xs font-bold">
                            #{number_format(props.row.original.snapshot, '0,0')}
                          </div>
                        )}
                        <span className="text-xs font-semibold">
                          Participants:
                        </span>
                        <span className="text-xs font-bold">
                          {number_format(props.value.length, '0,0')}
                        </span>
                        {props.value.findIndex(v => typeof v?.share === 'number') > -1 && (
                          <span className="text-xs font-bold">
                            [{number_format(_.sumBy(props.value, 'share'), '0,0')}]
                          </span>
                        )}
                      </div>
                    )}
                    {_.slice(props.value, 0, seeMoreKeyIds.includes(props.row.original.id) ? props.value.length : COLLAPSE_VALIDATORS_SIZE).map((v, i) => {
                      const {
                        address,
                        operator_address,
                        description,
                      } = { ...v }
                      const {
                        moniker,
                      } = { ...description }

                      return (
                        <div
                          key={i}
                          className="flex items-center text-xs space-x-1.5"
                        >
                          {description ?
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
                                {moniker && (
                                  <Link href={`/validator/${operator_address}`}>
                                    <a
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-500 dark:text-blue-500 font-medium"
                                    >
                                      {ellipse(moniker, 12)}
                                    </a>
                                  </Link>
                                )}
                                <div className="flex items-center space-x-1">
                                  <Link href={`/validator/${operator_address}`}>
                                    <a
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-slate-400 dark:text-slate-600 font-medium"
                                    >
                                      {ellipse(operator_address, 8, process.env.NEXT_PUBLIC_PREFIX_VALIDATOR)}
                                    </a>
                                  </Link>
                                  <Copy
                                    value={operator_address}
                                  />
                                </div>
                              </div>
                            </div> :
                            address ?
                              <div className="flex items-center space-x-1">
                                <Link href={`/validator/${props.value}`}>
                                  <a
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 dark:text-white font-medium"
                                  >
                                    {ellipse(address, 8, process.env.NEXT_PUBLIC_PREFIX_VALIDATOR)}
                                  </a>
                                </Link>
                                <Copy
                                  value={address}
                                />
                              </div>
                              :
                              <span>
                                -
                              </span>
                          }
                          {typeof v?.share === 'number' && (
                            <span className="text-slate-400 dark:text-slate-200 font-semibold">
                              [{number_format(v.share, '0,0')}]
                            </span>
                          )}
                        </div>
                      )
                    })}
                    {(props.value.length > COLLAPSE_VALIDATORS_SIZE || seeMoreKeyIds.includes(props.row.original.id)) && (
                      <button
                        onClick={() => setSeeMoreKeyIds(seeMoreKeyIds.includes(props.row.original.id) ? seeMoreKeyIds.filter(id => id !== props.row.original.id) : _.uniq(_.concat(seeMoreKeyIds, props.row.original.id)))}
                        className="max-w-min flex items-center capitalize text-blue-500 dark:text-white text-xs font-semibold space-x-0.5"
                      >
                        <span>
                          See {seeMoreKeyIds.includes(props.row.original.id) ? 'Less' : 'More'}
                        </span>
                        {!seeMoreKeyIds.includes(props.row.original.id) && (
                          <span>
                            ({number_format(props.value.length - COLLAPSE_VALIDATORS_SIZE, '0,0')})
                          </span>
                        )}
                        {!seeMoreKeyIds.includes(props.row.original.id) && props.value.findIndex(v => typeof v?.share === 'number') > -1 && (
                          <span>
                            [{number_format(_.sumBy(_.slice(props.value, COLLAPSE_VALIDATORS_SIZE), 'share'), '0,0')}]
                          </span>
                        )}
                        {seeMoreKeyIds.includes(props.row.original.id) ?
                          <IoCaretUpCircle size={16} className="mt-0.5" /> :
                          <IoCaretDownCircle size={16} className="mt-0.5" />
                        }
                      </button>
                    )}
                  </> :
                  <span>
                    -
                  </span>
                }
              </div>
            ),
            headerClassName: 'whitespace-nowrap',
          },
          {
            Header: 'Non-Participated Validators',
            accessor: 'non_participant_validators',
            disableSortBy: true,
            Cell: props => (
              <div className="flex flex-col space-y-1.5">
                {props.value?.length > 0 ?
                  <>
                    {!props.row.original.participant_addresses && (
                      <div className="flex items-center space-x-1">
                        {typeof props.row.original.snapshot === 'number' && (
                          <div className="uppercase text-xs font-bold">
                            #{number_format(props.row.original.snapshot, '0,0')}
                          </div>
                        )}
                        <span className="text-xs font-semibold">
                          Non-Participants:
                        </span>
                        <span className="text-xs font-bold">
                          {number_format(props.value.length, '0,0')}
                        </span>
                        {props.value.findIndex(v => typeof v?.share === 'number') > -1 && (
                          <span className="text-xs font-bold">
                            [{number_format(_.sumBy(props.value, 'share'), '0,0')}]
                          </span>
                        )}
                      </div>
                    )}
                    {_.slice(props.value, 0, seeMoreKeyIdsNon.includes(props.row.original.id) ? props.value.length : COLLAPSE_VALIDATORS_SIZE).map((v, i) => {
                      const {
                        address,
                        operator_address,
                        description,
                      } = { ...v }
                      const {
                        moniker,
                      } = { ...description }

                      return (
                        <div
                          key={i}
                          className="flex items-center text-xs space-x-1.5"
                        >
                          {description ?
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
                                {moniker && (
                                  <Link href={`/validator/${operator_address}`}>
                                    <a
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-500 dark:text-blue-500 font-medium"
                                    >
                                      {ellipse(moniker, 12)}
                                    </a>
                                  </Link>
                                )}
                                <div className="flex items-center space-x-1">
                                  <Link href={`/validator/${operator_address}`}>
                                    <a
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-slate-400 dark:text-slate-600 font-medium"
                                    >
                                      {ellipse(operator_address, 8, process.env.NEXT_PUBLIC_PREFIX_VALIDATOR)}
                                    </a>
                                  </Link>
                                  <Copy
                                    value={operator_address}
                                  />
                                </div>
                              </div>
                            </div> :
                            address ?
                              <div className="flex items-center space-x-1">
                                <Link href={`/validator/${props.value}`}>
                                  <a
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 dark:text-white font-medium"
                                  >
                                    {ellipse(address, 8, process.env.NEXT_PUBLIC_PREFIX_VALIDATOR)}
                                  </a>
                                </Link>
                                <Copy
                                  value={address}
                                />
                              </div> :
                              <span>
                                -
                              </span>
                          }
                          {typeof v?.share === 'number' && (
                            <span className="text-slate-400 dark:text-slate-200 font-semibold">
                              [{number_format(v.share, '0,0')}]
                            </span>
                          )}
                        </div>
                      )
                    })}
                    {(props.value.length > COLLAPSE_VALIDATORS_SIZE || seeMoreKeyIdsNon.includes(props.row.original.id)) && (
                      <button
                        onClick={() => setSeeMoreKeyIdsNon(seeMoreKeyIdsNon.includes(props.row.original.id) ? seeMoreKeyIdsNon.filter(id => id !== props.row.original.id) : _.uniq(_.concat(seeMoreKeyIdsNon, props.row.original.id)))}
                        className="max-w-min flex items-center capitalize text-blue-500 dark:text-white text-xs font-semibold space-x-0.5"
                      >
                        <span>
                          See {seeMoreKeyIdsNon.includes(props.row.original.id) ? 'Less' : 'More'}
                        </span>
                        {!seeMoreKeyIdsNon.includes(props.row.original.id) && (
                          <span>
                            ({number_format(props.value.length - COLLAPSE_VALIDATORS_SIZE, '0,0')})
                          </span>
                        )}
                        {!seeMoreKeyIdsNon.includes(props.row.original.id) && props.value.findIndex(v => typeof v?.share === 'number') > -1 && (
                          <span>
                            [{number_format(_.sumBy(_.slice(props.value, COLLAPSE_VALIDATORS_SIZE), 'share'), '0,0')}]
                          </span>
                        )}
                        {seeMoreKeyIdsNon.includes(props.row.original.id) ?
                          <IoCaretUpCircle size={16} className="mt-0.5" /> :
                          <IoCaretDownCircle size={16} className="mt-0.5" />
                        }
                      </button>
                    )}
                  </> :
                  <span>
                    -
                  </span>
                }
              </div>
            ),
            headerClassName: 'whitespace-nowrap',
          },
          {
            Header: 'Result',
            accessor: 'result',
            sortType: (a, b) => a.original.result > b.original.result ? 1 : -1,
            Cell: props => (
              <div className="flex flex-col text-left sm:text-right">
                <div className="flex items-center justify-start sm:justify-end space-x-0.5">
                  {props.value ?
                    <BiCheckCircle size={16} className="text-green-400 dark:text-green-300" /> :
                    <BiXCircle size={16} className="text-red-500 dark:text-red-600" />
                  }
                  <span className={`uppercase ${props.value ? 'text-green-400 dark:text-green-300' : 'text-red-500 dark:text-red-600'} text-xs font-semibold`}>
                    {props.value ?
                      'success' : 'failed'
                    }
                  </span>
                </div>
              </div>
            ),
            headerClassName: 'justify-start sm:justify-end text-left sm:text-right',
          },
          {
            Header: (<BiEdit size={20} title="Participated" />),
            accessor: 'participated',
            sortType: (a, b) => a.original.participated > b.original.participated ? 1 : -1,
            Cell: props => (
              <div className="flex flex-col text-left sm:text-right">
                <div className="flex items-center justify-start sm:justify-end space-x-0.5">
                  <span className={`uppercase ${props.value ? 'text-green-400 dark:text-green-300' : 'text-red-500 dark:text-red-600'} text-xs font-semibold`}>
                    {props.value ?
                      'yes' : 'no'
                    }
                  </span>
                </div>
              </div>
            ),
            headerClassName: 'justify-start sm:justify-end text-left sm:text-right',
          },
        ].filter(c => ['/validator/[address]'].includes(pathname) ?
          !['key_role', table?.startsWith('keyshares') ? 'height' : 'snapshot_block_number', 'num_validator_shares', 'keygen_threshold', 'signing_threshold', 'validators', 'non_participant_validators', 'result', 'participated'].filter(a => !(table?.startsWith('keyshares') ? ['num_validator_shares'] : ['result', 'participated']).includes(a)).includes(c.accessor) :
          !['key_role', 'snapshot_block_number', 'num_validator_shares', 'keygen_threshold', 'signing_threshold', 'result', 'participated'].filter(a => !(table?.startsWith('keygens_success') ? ['keygen_threshold', 'signing_threshold'] : table?.startsWith('signs_') ? ['key_role'] : []).includes(a)).includes(c.accessor)
        )}
        data={data.map((d, i) => {
          const {
            height,
            result,
            failed,
            participated,
            validators,
          } = { ...d }
          return {
            ...d,
            i,
            height: height || -1,
            result: typeof result === 'boolean' ?
              result : !failed,
            participated: typeof participated === 'boolean' ?
              participated :
              validators?.findIndex(v => equals_ignore_case(v?.address, address)) > -1,
          }
        })}
        noPagination={data.length <= 10}
        noRecordPerPage={!['/participations'].includes(pathname)}
        defaultPageSize={['/participations'].includes(pathname) ? 25 : 10}
        className={`no-border ${className}`}
      /> :
      <ProgressBar
        borderColor={loader_color(theme)}
        width="36"
        height="36"
      />
  )
}