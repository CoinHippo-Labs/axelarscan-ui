import Link from 'next/link'
import PropTypes from 'prop-types'
import { useSelector, shallowEqual } from 'react-redux'

import _ from 'lodash'
import { BiServer } from 'react-icons/bi'

import Widget from '../widget'

import { denomer } from '../../lib/object/denom'
import { chain_manager } from '../../lib/object/chain'
import { numberFormat } from '../../lib/utils'

const Summary = ({ data, successKeygens, failedKeygens, successSignAttempts, failedSignAttempts }) => {
  const { chains, denoms, validators, validators_chains } = useSelector(state => ({ chains: state.chains, denoms: state.denoms, validators: state.validators, validators_chains: state.validators_chains }), shallowEqual)
  const { chains_data } = { ...chains }
  const { denoms_data } = { ...denoms }
  const { validators_data } = { ...validators }
  const { validators_chains_data } = { ...validators_chains }

  const keyRequirements = _.groupBy(data?.tss?.params?.key_requirements || [], 'key_type')
  const activeValidators = validators_data?.filter(v => ['BOND_STATUS_BONDED'].includes(v.status)).map(v => {
    return {
      ...v,
      supported_chains: _.uniq(_.concat(v?.supported_chains || [], Object.entries(validators_chains_data || {}).filter(([key, value]) => value?.includes(v?.operator_address)).map(([key, value]) => key))),
    }
  })

  let evmVotingThreshold = data?.evm?.chains
  if (evmVotingThreshold?.length > 0 && chains_data) {
    for (let i = 0; i < chains_data.length; i++) {
      const chain = chains_data[i]

      if (evmVotingThreshold.findIndex(c => c?.params?.chain?.toLowerCase() === chain?.id) < 0) {
        evmVotingThreshold.push({ ...evmVotingThreshold[0], params: { ...evmVotingThreshold[0]?.params, chain: chain?.id } })
      }
    }
  }

  evmVotingThreshold = evmVotingThreshold?.map(c => {
    const maintainValidators = activeValidators?.findIndex(v => v.supported_chains?.includes(chain_manager.maintainer_id(c?.params?.chain, chains_data))) > -1 && activeValidators.filter(v => v.supported_chains?.includes(chain_manager.maintainer_id(c?.params?.chain, chains_data)))

    return {
      ...c,
      num_maintain_validators: maintainValidators?.length,
      maintain_staking: denoms_data && maintainValidators && denomer.amount(_.sumBy(maintainValidators, 'tokens'), 'uaxl', denoms_data),
      total_staking: denoms_data && activeValidators && denomer.amount(_.sumBy(activeValidators, 'tokens'), 'uaxl', denoms_data),
      denom: denoms_data && denomer.symbol(denoms_data?.[0]?.id, denoms_data),
    }
  }).map(c => {
    return {
      ...c,
      staking_percentage: typeof c.maintain_staking === 'number' && typeof c.total_staking === 'number' && (c.maintain_staking * 100 / c.total_staking),
    }
  })

  return (
    <div className="w-full grid grid-flow-row grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-12 gap-4 my-4">
      <Widget
        title="Keygen Min Participation Requirement"
        className="xl:col-span-3 bg-transparent sm:bg-white sm:dark:bg-gray-900 border-0 sm:border border-gray-100 dark:border-gray-900 p-0 sm:p-4"
      >
        <span className="flex flex-col space-y-1 mt-1">
          <div className="grid grid-flow-row grid-cols-2 gap-4">
            {data ?
              Object.keys(keyRequirements).length > 0 ?
                Object.entries(keyRequirements).map(([key, value]) => (
                  <div key={key} className="col-span-2">
                    <div className="text-gray-400 dark:text-gray-600 text-xs">{key?.replace('KEY_TYPE_', '')}</div>
                    <div className="grid grid-flow-row grid-cols-2 gap-2">
                      {value.map((_key, i) => (
                        <span key={i} className="h-8 text-3xl lg:text-2xl xl:text-3xl font-semibold">
                          {_key.min_keygen_threshold?.denominator > 0 ? numberFormat(_key.min_keygen_threshold.numerator * 100 / _key.min_keygen_threshold.denominator, '0,0.00') : '-'}
                          <span className="text-lg font-normal">%</span>
                        </span>
                      ))}
                    </div>
                  </div>
                ))
                :
                <span className="h-8 text-3xl font-semibold">
                  {typeof data.active_keygen_threshold === 'number' ? numberFormat(data.active_keygen_threshold, '0,0.00') : 'N/A'}
                  <span className="text-lg font-normal">%</span>
                </span>
              :
              <>
                <div className="skeleton w-16 h-7 mt-1" />
                <div className="skeleton w-16 h-7 mt-1" />
              </>
            }
          </div>
          <div className="grid grid-flow-row grid-cols-2 gap-4">
            {data ?
              Object.keys(keyRequirements).length > 0 ?
                _.uniq(Object.values(keyRequirements).flatMap(value => value?.map(_value => _value.key_role))).map((key_role, i) => (
                  <span key={i} className="text-gray-400 dark:text-gray-600 text-xs font-normal mt-1">
                    {key_role?.replace('KEY_ROLE_', '')}
                  </span>
                ))
                :
                null
              :
              <>
                <div className="skeleton w-20 h-4 mt-1" />
                <div className="skeleton w-20 h-4 mt-1" />
              </>
            }
          </div>
        </span>
      </Widget>
      <Widget
        title="Sign Safety Threshold"
        className="xl:col-span-3 bg-transparent sm:bg-white sm:dark:bg-gray-900 border-0 sm:border border-gray-100 dark:border-gray-900 p-0 sm:p-4"
      >
        <span className="flex flex-col space-y-1 mt-1">
          <div className="grid grid-flow-row grid-cols-2 gap-4">
            {data ?
              Object.keys(keyRequirements).length > 0 ?
                Object.entries(keyRequirements).map(([key, value]) => (
                  <div key={key} className="col-span-2">
                    <div className="text-gray-400 dark:text-gray-600 text-xs">{key?.replace('KEY_TYPE_', '')}</div>
                    <div className="grid grid-flow-row grid-cols-2 gap-2">
                      {value.map((_key, i) => (
                        <span key={i} className="h-8 text-3xl lg:text-2xl xl:text-3xl font-semibold">
                          {_key.safety_threshold?.denominator > 0 ? numberFormat(_key.safety_threshold.numerator * 100 / _key.safety_threshold.denominator, '0,0.00') : '-'}
                          <span className="text-lg font-normal">%</span>
                        </span>
                      ))}
                    </div>
                  </div>
                ))
                :
                <span className="h-8 text-3xl font-semibold">N/A</span>
              :
              <>
                <div className="skeleton w-16 h-7 mt-1" />
                <div className="skeleton w-16 h-7 mt-1" />
              </>
            }
          </div>
          <div className="grid grid-flow-row grid-cols-2 gap-4">
            {data ?
              Object.keys(keyRequirements).length > 0 ?
                _.uniq(Object.values(keyRequirements).flatMap(value => value?.map(_value => _value.key_role))).map((key_role, i) => (
                  <span key={i} className="text-gray-400 dark:text-gray-600 text-xs font-normal mt-1">
                    {key_role?.replace('KEY_ROLE_', '')}
                  </span>
                ))
                :
                null
              :
              <>
                <div className="skeleton w-20 h-4 mt-1" />
                <div className="skeleton w-20 h-4 mt-1" />
              </>
            }
          </div>
        </span>
      </Widget>
      <Widget
        title="Keygen Participation"
        className="xl:col-span-2 bg-transparent sm:bg-white sm:dark:bg-gray-900 border-0 sm:border border-gray-100 dark:border-gray-900 p-0 sm:p-4"
      >
        <span className="flex flex-col space-y-1 mt-1.5">
          <div className="flex flex-row space-x-1.5">
            {typeof successKeygens === 'number' ?
              <span className="h-8 text-3xl font-semibold">{numberFormat(successKeygens, '0,0')}</span>
              :
              <div className="skeleton w-12 h-7 mt-1" />
            }
            <span className="h-8 text-gray-600 dark:text-gray-400 text-3xl font-light">/</span>
            {typeof failedKeygens === 'number' ?
              <span className="h-8 text-3xl font-semibold">{numberFormat(failedKeygens, '0,0')}</span>
              :
              <div className="skeleton w-12 h-7 mt-1" />
            }
          </div>
          <div className="grid">
            <span className="text-gray-400 dark:text-gray-600 text-xs font-normal mt-1">
              Success / Failed
            </span>
          </div>
        </span>
      </Widget>
      <Widget
        title="Sign Attempts"
        className="xl:col-span-2 bg-transparent sm:bg-white sm:dark:bg-gray-900 border-0 sm:border border-gray-100 dark:border-gray-900 p-0 sm:p-4"
      >
        <span className="flex flex-col space-y-1 mt-1.5">
          <div className="flex flex-row space-x-1.5">
            {typeof successSignAttempts === 'number' ?
              <span className="h-8 text-3xl font-semibold">{numberFormat(successSignAttempts, '0,0')}</span>
              :
              <div className="skeleton w-12 h-7 mt-1" />
            }
            <span className="h-8 text-gray-600 dark:text-gray-400 text-3xl font-light">/</span>
            {typeof failedSignAttempts === 'number' ?
              <span className="h-8 text-3xl font-semibold">{numberFormat(failedSignAttempts, '0,0')}</span>
              :
              <div className="skeleton w-12 h-7 mt-1" />
            }
          </div>
          <div className="grid">
            <span className="text-gray-400 dark:text-gray-600 text-xs font-normal mt-1">
              Success / Failed
            </span>
          </div>
        </span>
      </Widget>
      {evmVotingThreshold ?
        evmVotingThreshold.map((c, i) => (
          <Widget
            key={i}
            title={<div className="flex items-center">
              <img
                src={chain_manager.image(c?.params?.chain, chains_data)}
                alt=""
                className="w-6 h-6 rounded-full mr-1.5"
              />
              <span className="capitalize">{chain_manager.title(c?.params?.chain, chains_data)}</span>
            </div>}
            className="xl:col-span-2 bg-transparent sm:bg-white sm:dark:bg-gray-900 border-0 sm:border border-gray-100 dark:border-gray-900 p-0 sm:p-4"
          >
            <span className="flex flex-col space-y-1 mt-1">
              <div className="grid grid-flow-row grid-cols-1 gap-4">
                <div className="col-span-1">
                  <div className="uppercase text-gray-400 dark:text-gray-600 text-xs">Threshold</div>
                  <div className="grid grid-flow-row grid-cols-2 gap-2">
                    <span key={i} className="h-8 text-3xl lg:text-2xl xl:text-3xl font-semibold">
                      {c?.params?.voting_threshold?.denominator > 0 ? numberFormat(c.params.voting_threshold.numerator * 100 / c.params.voting_threshold.denominator, '0,0.00') : '-'}
                      <span className="text-lg font-normal">%</span>
                    </span>
                  </div>
                </div>
                <div className="col-span-1">
                  <div className="uppercase text-gray-400 dark:text-gray-600 text-xs">Stake Maintaining</div>
                  <div className="grid grid-flow-row grid-cols-1 gap-2">
                    {typeof c.staking_percentage === 'number' ?
                      <span className="h-8 flex items-center text-3xl lg:text-2xl xl:text-3xl font-semibold">
                        <span>{numberFormat(c.staking_percentage, '0,0.00')}</span>
                        <span className="text-lg font-normal mr-1 pt-2">%</span>
                        <span className="flex items-center text-gray-400 dark:text-gray-600 text-2xs space-x-1 pt-2">
                          (
                          <span>{numberFormat(c.num_maintain_validators, '0,0')} / {numberFormat(activeValidators?.length, '0,0')}</span>
                          <BiServer size={12} className="stroke-current" className="mb-0.5" />
                          )
                        </span>
                      </span>
                      :
                      <div className="skeleton w-16 h-7 mt-1" />
                    }
                  </div>
                </div>
              </div>
              <div className="grid grid-flow-row grid-cols-2 gap-4">
                <div className="col-span-1">
                  {typeof c.staking_percentage === 'number' ?
                    <span className="text-gray-400 dark:text-gray-600 text-xs font-normal mt-1">
                      <span className="uppercase mr-1">{numberFormat(c.maintain_staking, '0,0.00a')}</span>
                      <span className="mr-1">/</span>
                      <span className="uppercase mr-1">{numberFormat(c.total_staking, '0,0.00a')}</span>
                      <span className="uppercase font-medium mr-1">{c.denom}</span>
                    </span>
                    :
                    <div className="skeleton w-20 h-4 mt-1" />
                  }
                </div>
              </div>
            </span>
          </Widget>
        ))
        :
        [...Array(6).keys()].map(i => (
          <Widget
            key={i}
            title="Chain Maintaining"
            className="xl:col-span-2 bg-transparent sm:bg-white sm:dark:bg-gray-900 border-0 sm:border border-gray-100 dark:border-gray-900 p-0 sm:p-4"
          >
            <span className="flex flex-col space-y-1 mt-1">
              <div className="grid">
                <div className="skeleton w-16 h-7 mt-1" />
              </div>
              <div className="grid">
                <div className="skeleton w-20 h-4 mt-1" />
              </div>
            </span>
          </Widget>
        ))
      }
    </div>
  )
}

Summary.propTypes = {
  data: PropTypes.any,
  successKeygens: PropTypes.any,
  failedKeygens: PropTypes.any,
  successSignAttempts: PropTypes.any,
  failedSignAttempts: PropTypes.any,
}

export default Summary