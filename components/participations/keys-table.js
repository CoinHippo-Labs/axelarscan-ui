import Link from 'next/link'
import { useState } from 'react'
import { useSelector, shallowEqual } from 'react-redux'

import _ from 'lodash'
import moment from 'moment'
import Loader from 'react-loader-spinner'
import { FiKey } from 'react-icons/fi'
import { MdCancel } from 'react-icons/md'
import { BiEdit } from 'react-icons/bi'
import { FaSignature, FaCheckCircle, FaTimesCircle } from 'react-icons/fa'
import { IoCaretUpOutline, IoCaretDownOutline } from 'react-icons/io5'

import Datatable from '../datatable'
import Copy from '../copy'

import { numberFormat, getName, ellipseAddress } from '../../lib/utils'

const COLLAPSE_VALIDATORS_SIZE = 5

export default function KeysTable({ data, corruption_signing_threshold, page, className = '' }) {
  const { preferences } = useSelector(state => ({ preferences: state.preferences }), shallowEqual)
  const { theme } = { ...preferences }

  const [keyIdsSeeMore, setKeyIdsSeeMore] = useState([])
  const [keyIdsSeeMoreForNon, setKeyIdsSeeMoreForNon] = useState([])

  return (
    <>
      <Datatable
        columns={[
          {
            Header: 'Key ID',
            accessor: 'key_id',
            sortType: (rowA, rowB) => rowA.original.key_id > rowB.original.key_id ? 1 : -1,
            Cell: props => (
              !props.row.original.skeleton ?
                <div className="my-1">
                  <div className="flex items-center text-gray-900 dark:text-gray-100 space-x-1">
                    {['keygen_failed'].includes(page) ? <MdCancel size={16} className="text-red-500" /> : <FiKey size={16} />}
                    <span className="font-medium">{ellipseAddress(props.value, ['validator-keygen', 'validator-sign'].includes(page) ? 8 : ['validator'].includes(page) ? 12 : 20)}</span>
                    {props.value && (<Copy text={props.value} />)}
                  </div>
                  {['sign_success', 'sign_failed'].includes(page) && props.row.original.sig_id && (
                    <>
                      <div className="text-gray-400 dark:text-gray-600 text-xs font-normal mt-2">Signature ID</div>
                      <div className="flex items-center text-gray-900 dark:text-gray-100 space-x-1">
                        {['sign_failed'].includes(page) ? <MdCancel size={16} className="text-red-500" /> : <FaSignature size={16} />}
                        <span className="font-medium">{ellipseAddress(props.row.original.sig_id, 16)}</span>
                        <Copy text={props.row.original.sig_id} />
                      </div>
                    </>
                  )}
                  {props.row.original.reason && (
                    <div className="max-w-xs whitespace-pre-wrap text-gray-400 dark:text-gray-600 text-xs font-normal mt-2">
                      {props.row.original.reason}
                    </div>
                  )}
                </div>
                :
                <div className="skeleton w-40 h-5 my-1" />
            ),
            headerClassName: 'whitespace-nowrap',
          },
          /*{
            Header: 'Key Chain',
            accessor: 'key_chain',
            sortType: (rowA, rowB) => rowA.original.key_chain > rowB.original.key_chain ? 1 : -1,
            Cell: props => (
              !props.row.original.skeleton ?
                <div className="my-1">
                  {props.value ?
                    <span className="bg-gray-100 dark:bg-gray-900 rounded capitalize text-gray-900 dark:text-gray-100 font-semibold px-1.5 py-0.5" style={{ fontSize: ['validator'].includes(page) ? '.65rem' : '.85rem' }}>
                      {props.value}
                    </span>
                    :
                    props.row.original.key_chain_loading ?
                      <Loader type="Oval" color={theme === 'dark' ? 'white' : '#3B82F6'} width="20" height="20" />
                      :
                      '-'
                  }
                </div>
                :
                <div className="skeleton w-12 h-5 my-1" />
            ),
            headerClassName: 'whitespace-nowrap',
          },*/
          {
            Header: 'Key Role',
            accessor: 'key_role',
            sortType: (rowA, rowB) => rowA.original.key_role?.replace('KEY_ROLE_', '') > rowB.original.key_role?.replace('KEY_ROLE_', '') ? 1 : -1,
            Cell: props => (
              !props.row.original.skeleton ?
                <div className="my-1">
                  {props.value ?
                    <span className="bg-gray-100 dark:bg-gray-900 rounded capitalize text-gray-900 dark:text-gray-100 font-semibold px-1.5 py-0.5" style={{ fontSize: ['validator'].includes(page) ? '.65rem' : '.85rem' }}>
                      {props.value.replace('KEY_ROLE_', '')}
                    </span>
                    :
                    '-'
                  }
                </div>
                :
                <div className="whitespace-nowrap skeleton w-12 h-5 my-1" />
            ),
          },
          {
            Header: ['validator'].includes(page) ? 'Height' : 'Snapshot Block',
            accessor: 'snapshot_block_number',
            sortType: (rowA, rowB) => rowA.original.snapshot_block_number > rowB.original.snapshot_block_number ? 1 : -1,
            Cell: props => (
              !props.row.original.skeleton ?
                <div className="text-right my-1">
                  {props.value ?
                    <Link href={`/block/${props.value}`}>
                      <a className="text-blue-600 dark:text-white">
                        {numberFormat(props.value, '0,0')}
                      </a>
                    </Link>
                    :
                    '-'
                  }
                </div>
                :
                <div className="skeleton w-16 h-5 my-1 ml-auto" />
            ),
            headerClassName: 'justify-end text-right',
          },
          {
            Header: 'Height',
            accessor: 'height',
            sortType: (rowA, rowB) => rowA.original.height > rowB.original.height ? 1 : -1,
            Cell: props => (
              !props.row.original.skeleton ?
                <div className="text-right my-1">
                  {props.value > -1 ?
                    <>
                      <Link href={`/block/${props.value}`}>
                        <a className="text-blue-600 dark:text-white font-medium">
                          {numberFormat(props.value, '0,0')}
                        </a>
                      </Link>
                      {/*props.row.original.timestamp && (
                        <div className="text-gray-400 dark:text-gray-600 text-xs font-normal mt-1" style={{ fontSize: '.65rem' }}>
                          {moment(props.row.original.timestamp * 1000).format('MMM D, YYYY h:mm:ss A z')}
                        </div>
                      )*/}
                    </>
                    :
                    '-'
                  }
                </div>
                :
                <div className="skeleton w-16 h-5 my-1 ml-auto" />
            ),
            headerClassName: 'justify-end text-right',
          },
          {
            Header: 'Share',
            accessor: 'num_validator_shares',
            sortType: (rowA, rowB) => rowA.original.num_validator_shares > rowB.original.num_validator_shares ? 1 : -1,
            Cell: props => (
              !props.row.original.skeleton ?
                <div className="flex flex-col text-right space-y-0.5 my-1">
                  {typeof props.value === 'number' ?
                    <>
                      <span className="font-semibold">{numberFormat(props.value, '0,0')} / {numberFormat(props.row.original.num_total_shares, '0,0')}</span>
                      <span className="text-gray-400 dark:text-gray-500 text-xs">({numberFormat(props.value * 100 / props.row.original.num_total_shares, '0,0.00')}%)</span>
                    </>
                    :
                    '-'
                  }
                </div>
                :
                <div className="skeleton w-12 h-5 my-1 ml-auto" />
            ),
            headerClassName: 'justify-end text-right',
          },
          {
            Header: 'Signing Threshold',
            accessor: 'corruption_signing_threshold',
            disableSortBy: corruption_signing_threshold ? false : true,
            sortType: (rowA, rowB) => rowA.original.corruption_signing_threshold > rowB.original.corruption_signing_threshold ? 1 : -1,
            Cell: props => (
              !props.row.original.skeleton && corruption_signing_threshold ?
                <div className="flex flex-col text-right space-y-0.5 my-1">
                  {props.value > -1 ?
                    <>
                      <span className="font-semibold">{numberFormat(props.value + 1, '0,0')} / {numberFormat(_.sumBy(props.row.original.validator_shares || props.row.original.validators, 'share'), '0,0')}</span>
                      <span className="text-gray-400 dark:text-gray-500 text-xs">({numberFormat((props.value + 1) * 100 / _.sumBy(props.row.original.validator_shares || props.row.original.validators, 'share'), '0,0.00')}%)</span>
                    </>
                    :
                    '-'
                  }
                </div>
                :
                <div className="skeleton w-12 h-5 my-1 ml-auto" />
            ),
            headerClassName: 'whitespace-nowrap justify-end text-right',
          },
          {
            Header: 'Participated Validators',
            accessor: 'validators',
            disableSortBy: true,
            Cell: props => (
              !props.row.original.skeleton ?
                <div className={`flex flex-col space-y-2 my-1 mb-${props.value?.length > COLLAPSE_VALIDATORS_SIZE ? 0.5 : 4}`}>
                  {typeof props.row.original.snapshot === 'number' && (
                    <div className="uppercase text-gray-400 dark:text-gray-600 text-xs font-semibold">
                      Snapshot: #{props.row.original.snapshot}
                    </div>
                  )}
                  {props.value?.length > 0 ?
                    <>
                      {['keygen_success', 'keygen_failed', 'sign_success', 'sign_failed'].includes(page) && (
                        <div className="space-x-1.5">
                          <span className="font-medium">Participants:</span>
                          <span className="font-medium">{numberFormat(props.value.length, '0,0')}</span>
                          {props.value.findIndex(validator => typeof validator.share === 'number') > -1 && (
                            <span className="font-bold">[{numberFormat(_.sumBy(props.value, 'share'), '0,0')}]</span>
                          )}
                        </div>
                      )}
                      {_.slice(props.value, 0, keyIdsSeeMore.includes(props.row.original.id) ? props.value.length : COLLAPSE_VALIDATORS_SIZE).map((validator, i) => (
                        <div key={i} className="flex items-center text-xs space-x-1.5">
                          <div className="flex flex-col space-y-0.5">
                            {validator.description?.moniker && (
                              <span className="flex items-center space-x-1.5">
                                <Link href={`/validator/${validator.address}`}>
                                  <a className="text-blue-600 dark:text-white font-medium">
                                    {ellipseAddress(validator.description.moniker, 16)}
                                  </a>
                                </Link>
                                {validator.status && !(['BOND_STATUS_BONDED'].includes(validator.status)) && (
                                  <span className={`bg-${validator.status.includes('UN') ? validator.status.endsWith('ED') ? 'gray-400 dark:bg-gray-900' : 'yellow-400 dark:bg-yellow-500' : 'green-600 dark:bg-green-700'} rounded-xl capitalize text-white font-semibold px-1.5 py-0.5`} style={{ fontSize: '.65rem' }}>
                                    {validator.status.replace('BOND_STATUS_', '')}
                                  </span>
                                )}
                                {validator.deregistering && (
                                  <span className="bg-blue-300 dark:bg-blue-700 rounded-xl capitalize text-white font-semibold px-1.5 py-0.5" style={{ fontSize: '.65rem' }}>
                                    De-registering
                                  </span>
                                )}
                              </span>
                            )}
                            <span className="flex items-center space-x-1">
                              <Link href={`/validator/${validator.address}`}>
                                <a className={`${validator.description?.moniker ? 'text-gray-400 dark:text-gray-600' : 'text-blue-600 dark:text-white font-medium'}`}>
                                  {process.env.NEXT_PUBLIC_PREFIX_VALIDATOR}{ellipseAddress(validator.address?.replace(process.env.NEXT_PUBLIC_PREFIX_VALIDATOR, ''), 8)}
                                </a>
                              </Link>
                              <Copy text={validator.address} />
                            </span>
                            {!(validator.description?.moniker) && (
                              <span className="flex items-center space-x-1.5">
                                {validator.status && !(['BOND_STATUS_BONDED'].includes(validator.status)) && (
                                  <span className={`bg-${validator.status.includes('UN') ? validator.status.endsWith('ED') ? 'gray-400 dark:bg-gray-900' : 'yellow-400 dark:bg-yellow-500' : 'green-600 dark:bg-green-700'} rounded-xl capitalize text-white font-semibold px-1.5 py-0.5`} style={{ fontSize: '.65rem' }}>
                                    {validator.status.replace('BOND_STATUS_', '')}
                                  </span>
                                )}
                                {validator.deregistering && (
                                  <span className="bg-blue-300 dark:bg-blue-700 rounded-xl capitalize text-white font-semibold px-1.5 py-0.5" style={{ fontSize: '.65rem' }}>
                                    De-registering
                                  </span>
                                )}
                              </span>
                            )}
                          </div>
                          {typeof validator.share === 'number' && (
                            <span className="text-gray-600 dark:text-gray-400 font-semibold">[{numberFormat(validator.share, '0,0')}]</span>
                          )}
                        </div>
                      ))}
                      {(props.value.length > COLLAPSE_VALIDATORS_SIZE || keyIdsSeeMore.includes(props.row.original.id)) && (
                        <div
                          onClick={() => setKeyIdsSeeMore(keyIdsSeeMore.includes(props.row.original.id) ? keyIdsSeeMore.filter(id => id !== props.row.original.id) : _.uniq(_.concat(keyIdsSeeMore, props.row.original.id)))}
                          className={`max-w-min flex items-center cursor-pointer rounded capitalize text-${keyIdsSeeMore.includes(props.row.original.id) ? 'red-500' : 'gray-500 dark:text-white'} text-xs font-medium space-x-0.5`}
                        >
                          <span>See {keyIdsSeeMore.includes(props.row.original.id) ? 'Less' : 'More'}</span>
                          {!(keyIdsSeeMore.includes(props.row.original.id)) && (
                            <span>({numberFormat(props.value.length - COLLAPSE_VALIDATORS_SIZE, '0,0')})</span>
                          )}
                          {keyIdsSeeMore.includes(props.row.original.id) ? <IoCaretUpOutline /> : <IoCaretDownOutline />}
                          {!(keyIdsSeeMore.includes(props.row.original.id)) && props.value.findIndex(validator => typeof validator.share === 'number') > -1 && (
                            <span>[{numberFormat(_.sumBy(_.slice(props.value, COLLAPSE_VALIDATORS_SIZE), 'share'), '0,0')}]</span>
                          )}
                        </div>
                      )}
                    </>
                    :
                    '-'
                  }
                </div>
                :
                <div className="flex flex-col space-y-2 my-1 mb-4">
                  {[...Array(5).keys()].map(i => (
                    <div key={i} className="skeleton w-48 h-5" />
                  ))}
                </div>
            ),
            headerClassName: 'whitespace-nowrap',
          },
          {
            Header: 'Non-Participated Validators',
            accessor: 'non_participant_validators',
            disableSortBy: true,
            Cell: props => (
              !props.row.original.skeleton ?
                <div className={`flex flex-col space-y-2 my-1 mb-${props.value?.length > COLLAPSE_VALIDATORS_SIZE ? 0.5 : 4}`}>
                  {typeof props.row.original.snapshot === 'number' && (
                    <div className="uppercase text-gray-400 dark:text-gray-600 text-xs font-semibold">
                      Snapshot: #{props.row.original.snapshot}
                    </div>
                  )}
                  {props.value?.length > 0 ?
                    <>
                      {['keygen_success', 'keygen_failed', 'sign_success', 'sign_failed'].includes(page) && (
                        <div className="space-x-1.5">
                          <span className="font-medium">Non-Participants:</span>
                          <span className="font-medium">{numberFormat(props.value.length, '0,0')}</span>
                          {props.value.findIndex(validator => typeof validator.share === 'number') > -1 && (
                            <span className="font-bold">[{numberFormat(_.sumBy(props.value, 'share'), '0,0')}]</span>
                          )}
                        </div>
                      )}
                      {_.slice(props.value, 0, keyIdsSeeMoreForNon.includes(props.row.original.id) ? props.value.length : COLLAPSE_VALIDATORS_SIZE).map((validator, i) => (
                        <div key={i} className="flex items-center text-xs space-x-1.5">
                          <div className="flex flex-col space-y-0.5">
                            {validator.description?.moniker && (
                              <span className="flex items-center space-x-1.5">
                                <Link href={`/validator/${validator.address}`}>
                                  <a className="text-blue-600 dark:text-white font-medium">
                                    {ellipseAddress(validator.description.moniker, 16)}
                                  </a>
                                </Link>
                                {validator.status && !(['BOND_STATUS_BONDED'].includes(validator.status)) && (
                                  <span className={`bg-${validator.status.includes('UN') ? validator.status.endsWith('ED') ? 'gray-400 dark:bg-gray-900' : 'yellow-400 dark:bg-yellow-500' : 'green-600 dark:bg-green-700'} rounded capitalize text-white font-semibold px-1.5 py-0.5`} style={{ fontSize: '.65rem' }}>
                                    {validator.status.replace('BOND_STATUS_', '')}
                                  </span>
                                )}
                                {validator.deregistering && (
                                  <span className="bg-blue-300 dark:bg-blue-700 rounded capitalize text-white font-semibold px-1.5 py-0.5" style={{ fontSize: '.65rem' }}>
                                    De-registering
                                  </span>
                                )}
                              </span>
                            )}
                            <span className="flex items-center space-x-1">
                              <Link href={`/validator/${validator.address}`}>
                                <a className={`${validator.description?.moniker ? 'text-gray-400 dark:text-gray-600' : 'text-blue-600 dark:text-white font-medium'}`}>
                                  {process.env.NEXT_PUBLIC_PREFIX_VALIDATOR}{ellipseAddress(validator.address?.replace(process.env.NEXT_PUBLIC_PREFIX_VALIDATOR, ''), 8)}
                                </a>
                              </Link>
                              <Copy text={validator.address} />
                            </span>
                            {!(validator.description?.moniker) && (
                              <span className="flex items-center space-x-1.5">
                                {validator.status && !(['BOND_STATUS_BONDED'].includes(validator.status)) && (
                                  <span className={`bg-${validator.status.includes('UN') ? validator.status.endsWith('ED') ? 'gray-400 dark:bg-gray-900' : 'yellow-400 dark:bg-yellow-500' : 'green-600 dark:bg-green-700'} rounded capitalize text-white font-semibold px-1.5 py-0.5`} style={{ fontSize: '.65rem' }}>
                                    {validator.status.replace('BOND_STATUS_', '')}
                                  </span>
                                )}
                                {validator.deregistering && (
                                  <span className="bg-blue-300 dark:bg-blue-700 rounded capitalize text-white font-semibold px-1.5 py-0.5" style={{ fontSize: '.65rem' }}>
                                    De-registering
                                  </span>
                                )}
                              </span>
                            )}
                            {validator.illegible && validator.tss_illegibility_info && (
                              <div className="flex flex-wrap items-center">
                                {Object.entries(validator.tss_illegibility_info).filter(([key, value]) => value).map(([key, value]) => (
                                  <span key={key} className="max-w-min bg-gray-100 dark:bg-gray-800 rounded-xl capitalize text-gray-800 dark:text-gray-200 text-xs font-semibold mt-0.5 mr-0.5 px-1.5 py-0.5">
                                    {getName(key)}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          {typeof validator.share === 'number' && (
                            <span className="text-gray-600 dark:text-gray-400 font-semibold">[{numberFormat(validator.share, '0,0')}]</span>
                          )}
                        </div>
                      ))}
                      {(props.value.length > COLLAPSE_VALIDATORS_SIZE || keyIdsSeeMoreForNon.includes(props.row.original.id)) && (
                        <div
                          onClick={() => setKeyIdsSeeMoreForNon(keyIdsSeeMoreForNon.includes(props.row.original.id) ? keyIdsSeeMoreForNon.filter(id => id !== props.row.original.id) : _.uniq(_.concat(keyIdsSeeMoreForNon, props.row.original.id)))}
                          className={`max-w-min flex items-center cursor-pointer rounded capitalize text-${keyIdsSeeMoreForNon.includes(props.row.original.id) ? 'red-500' : 'gray-500 dark:text-white'} text-xs font-medium space-x-0.5`}
                        >
                          <span>See {keyIdsSeeMoreForNon.includes(props.row.original.id) ? 'Less' : 'More'}</span>
                          {!(keyIdsSeeMoreForNon.includes(props.row.original.id)) && (
                            <span>({numberFormat(props.value.length - COLLAPSE_VALIDATORS_SIZE, '0,0')})</span>
                          )}
                          {keyIdsSeeMoreForNon.includes(props.row.original.id) ? <IoCaretUpOutline /> : <IoCaretDownOutline />}
                          {!(keyIdsSeeMoreForNon.includes(props.row.original.id)) && props.value.findIndex(validator => typeof validator.share === 'number') > -1 && (
                            <span>[{numberFormat(_.sumBy(_.slice(props.value, COLLAPSE_VALIDATORS_SIZE), 'share'), '0,0')}]</span>
                          )}
                        </div>
                      )}
                    </>
                    :
                    '-'
                  }
                </div>
                :
                <div className="flex flex-col space-y-2 my-1 mb-4">
                  {[...Array(5).keys()].map(i => (
                    <div key={i} className="skeleton w-48 h-5" />
                  ))}
                </div>
            ),
            headerClassName: 'whitespace-nowrap',
          },
          {
            Header: 'Result',
            accessor: 'success',
            sortType: (rowA, rowB) => rowA.original.success > rowB.original.success ? 1 : -1,
            Cell: props => (
              !props.row.original.skeleton ?
                <div className="flex items-center justify-end space-x-1 my-1">
                  {props.value ?
                    <FaCheckCircle size={16} className="text-green-500" />
                    :
                    <FaTimesCircle size={16} className="text-red-500" />
                  }
                  <span className="capitalize">{props.value ? 'success' : 'failed'}</span>
                </div>
                :
                <div className="skeleton w-16 h-5 my-1 ml-auto" />
            ),
            headerClassName: 'justify-end text-right',
          },
          {
            Header: <BiEdit title="Participated" size={20} />,
            accessor: 'participated',
            sortType: (rowA, rowB) => rowA.original.participated > rowB.original.participated ? 1 : -1,
            Cell: props => (
              !props.row.original.skeleton ?
                <div className="flex items-center justify-end space-x-1 my-1">
                  {/*props.value ?
                    <FaCheckCircle size={16} className="text-green-500" />
                    :
                    <FaTimesCircle size={16} className="text-red-500" />
                  */}
                  <span className="capitalize">{props.value ? 'Yes' : 'No'}</span>
                </div>
                :
                <div className="skeleton w-10 h-5 my-1 ml-auto" />
            ),
            headerClassName: 'justify-end text-right',
          },
        ].filter(column => ['validator'].includes(page) ?
          !(['key_chain', 'key_role', 'validators', 'corruption_signing_threshold', 'height', 'non_participant_validators', 'success', 'participated'].includes(column.accessor))
          :
          ['validator-keygen', 'validator-sign'].includes(page) ?
            !(['key_chain', 'key_role', 'num_validator_shares', 'snapshot_block_number', 'corruption_signing_threshold', 'validators', 'corruption_signing_threshold', 'non_participant_validators'].includes(column.accessor))
            :
            ['keygen_failed'].includes(page) ?
              !(['num_validator_shares', 'snapshot_block_number', 'corruption_signing_threshold', 'success', 'participated'].includes(column.accessor))
              :
              ['sign_success', 'sign_failed'].includes(page) ?
                !(['num_validator_shares', 'snapshot_block_number', 'corruption_signing_threshold', 'success', 'participated'].includes(column.accessor))
                :
                !(['num_validator_shares', 'snapshot_block_number'/*'height', 'non_participant_validators'*/, 'success', 'participated'].includes(column.accessor))
        )}
        data={data ?
          data.data?.map((key, i) => { return { ...key, i, corruption_signing_threshold: typeof corruption_signing_threshold?.[key?.key_id] === 'number' ? corruption_signing_threshold[key.key_id] : typeof key?.threshold === 'number' ? key.threshold : -1, height: key?.height || -1 } })
          :
          [...Array(10).keys()].map(i => { return { i, skeleton: true } })
        }
        noPagination={data?.data?.length > 10 ? false : true}
        noRecordPerPage={['validator', 'validator-keygen', 'validator-sign'].includes(page)}
        defaultPageSize={['validator', 'validator-keygen', 'validator-sign'].includes(page) ? 10 : 100}
        className={`${[].includes(page) ? 'small' : ''} ${className}`}
      />
      {data && !(data.data?.length > 0) && (
        <div className={`bg-${['validator', 'validator-keygen', 'validator-sign'].includes(page) ? 'gray-50' : 'white'} dark:bg-gray-900 text-gray-300 dark:text-gray-500 text-base font-medium italic text-center my-${['validator', 'validator-keygen', 'validator-sign'].includes(page) ? 2 : 4} py-2`}>
          No Participations
        </div>
      )}
    </>
  )
}