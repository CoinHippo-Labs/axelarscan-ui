import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import { ThreeDots } from 'react-loader-spinner'

import Image from '../image'
import { chain_manager } from '../../lib/object/chain'
import { denom_manager } from '../../lib/object/denom'
import { number_format, equals_ignore_case, loader_color } from '../../lib/utils'

export default ({ data }) => {
  const { preferences, evm_chains, assets, validators, validators_chains } = useSelector(state => ({ preferences: state.preferences, evm_chains: state.evm_chains, assets: state.assets, validators: state.validators, validators_chains: state.validators_chains }), shallowEqual)
  const { theme } = { ...preferences }
  const { evm_chains_data } = { ...evm_chains }
  const { assets_data } = { ...assets }
  const { validators_data } = { ...validators }
  const { validators_chains_data } = { ...validators_chains }

  const { info, keygensSuccess, keygensFailed, signsSuccess, signsFailed } = { ...data }
  const { tss, evm } = { ...info }
  const key_requirements = _.groupBy(tss?.params?.key_requirements || [], 'key_type')
  const active_validators_data = validators_data?.filter(v => ['BOND_STATUS_BONDED'].includes(v?.status)).map(v => {
    return {
      ...v,
      supported_chains: _.uniq(_.concat(
        v.supported_chains || [], Object.entries({ ...validators_chains_data }).filter(([k, _v]) => _v?.includes(v.operator_address)).map(([k, _v]) => k)
      )),
    }
  })
  let evm_votes_thresholds = evm?.chains
  if (evm_votes_thresholds?.length > 0 && evm_chains_data) {
    evm_chains_data.forEach(c => {
      if (evm_votes_thresholds.findIndex(_c => equals_ignore_case(_c?.params?.chain, c?.id)) < 0) {
        const template = _.head(evm_votes_thresholds)
        evm_votes_thresholds.push({
          ...template,
          params: {
            ...template?.params,
            chain: c?.id,
          }
        })
      }
    })
  }
  evm_votes_thresholds = evm_votes_thresholds?.map(c => {
    const maintaining_validators_data = active_validators_data?.filter(v => v?.supported_chains?.includes(chain_manager.maintainer_id(c?.params?.chain, evm_chains_data)))
    return {
      ...c,
      num_maintaining_validators: maintaining_validators_data?.length,
      maintain_staking: assets_data && maintaining_validators_data &&
        denom_manager.amount(_.sumBy(maintaining_validators_data, 'tokens'), 'uaxl', assets_data),
      total_staking: assets_data && active_validators_data &&
        denom_manager.amount(_.sumBy(active_validators_data, 'tokens'), 'uaxl', assets_data),
      denom: assets_data && denom_manager.symbol(assets_data[0]?.id, assets_data),
    }
  }).map(c => {
    const { maintain_staking, total_staking } = { ...c }
    return {
      ...c,
      staking_percentage: typeof maintain_staking === 'number' && typeof total_staking === 'number' && (maintain_staking * 100 / total_staking),
    }
  })

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      <div className="bg-white dark:bg-black border dark:border-slate-400 shadow dark:shadow-slate-200 rounded-lg p-4">
        <div className="space-y-2">
          <span className="text-slate-400 dark:text-slate-200 text-sm font-semibold">
            Keygen Min Participation Requirement
          </span>
          <div className="grid grid-cols-2 gap-4">
            {info ?
              Object.keys(key_requirements).length > 0 ?
                Object.entries(key_requirements).map(([k, v]) => (
                  <div
                    key={k}
                    className="col-span-2"
                  >
                    <div className="text-slate-400 dark:text-slate-500 text-xs font-medium">
                      {k?.replace('KEY_TYPE_', '')}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {v.map((_v, i) => (
                        <span
                          key={i}
                          className="h-8 text-3xl font-bold"
                        >
                          {_v.min_keygen_threshold?.denominator > 0 ?
                            number_format(_v.min_keygen_threshold.numerator * 100 / _v.min_keygen_threshold.denominator, '0,0.00') : '-'
                          }
                          <span className="text-xl font-medium">
                            %
                          </span>
                        </span>
                      ))}
                    </div>
                  </div>
                ))
                :
                <span className="h-8 text-3xl font-bold">
                  {typeof info.active_keygen_threshold === 'number' ?
                    number_format(info.active_keygen_threshold, '0,0.00') : 'N/A'
                  }
                  <span className="text-xl font-medium">
                    %
                  </span>
                </span>
              :
              <ThreeDots color={loader_color(theme)} width="32" height="32" />
            }
          </div>
          <div className="grid grid-cols-2 gap-4">
            {info ?
              Object.keys(key_requirements).length > 0 && (
                _.uniq(Object.values(key_requirements).flatMap(v => v?.map(_v => _v?.key_role))).map((k, i) => (
                  <span
                    key={i}
                    className="text-slate-400 dark:text-slate-500 text-xs font-medium">
                    {k?.replace('KEY_ROLE_', '').split('_').join(' ')}
                  </span>
                ))
              )
              :
              <ThreeDots color={loader_color(theme)} width="32" height="32" />
            }
          </div>
        </div>
      </div>
      <div className="bg-white dark:bg-black border dark:border-slate-400 shadow dark:shadow-slate-200 rounded-lg p-4">
        <div className="space-y-2">
          <span className="text-slate-400 dark:text-slate-200 text-sm font-semibold">
            Sign Safety Threshold
          </span>
          <div className="grid grid-cols-2 gap-4">
            {info ?
              Object.keys(key_requirements).length > 0 ?
                Object.entries(key_requirements).map(([k, v]) => (
                  <div
                    key={k}
                    className="col-span-2"
                  >
                    <div className="text-slate-400 dark:text-slate-500 text-xs font-medium">
                      {k?.replace('KEY_TYPE_', '')}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {v.map((_v, i) => (
                        <span
                          key={i}
                          className="h-8 text-3xl font-bold"
                        >
                          {_v.safety_threshold?.denominator > 0 ?
                            number_format(_v.safety_threshold.numerator * 100 / _v.safety_threshold.denominator, '0,0.00') : '-'
                          }
                          <span className="text-xl font-medium">
                            %
                          </span>
                        </span>
                      ))}
                    </div>
                  </div>
                ))
                :
                <span className="h-8 text-3xl font-semibold">
                  N/A
                </span>
              :
              <ThreeDots color={loader_color(theme)} width="32" height="32" />
            }
          </div>
          <div className="grid grid-cols-2 gap-4">
            {info ?
              Object.keys(key_requirements).length > 0 && (
                _.uniq(Object.values(key_requirements).flatMap(v => v?.map(_v => _v?.key_role))).map((k, i) => (
                  <span
                    key={i}
                    className="text-slate-400 dark:text-slate-500 text-xs font-medium">
                    {k?.replace('KEY_ROLE_', '').split('_').join(' ')}
                  </span>
                ))
              )
              :
              <ThreeDots color={loader_color(theme)} width="32" height="32" />
            }
          </div>
        </div>
      </div>
      <div className="lg:col-span-2 bg-white dark:bg-black border dark:border-slate-400 shadow dark:shadow-slate-200 rounded-lg p-4">
        <div className="space-y-2">
          <span className="text-slate-400 dark:text-slate-200 text-sm font-semibold">
            EVM Votes Threshold
          </span>
          <div
            className="flex flex-wrap items-center"
            style={{ marginTop: '-0.25rem' }}
          >
            {evm_votes_thresholds ?
              evm_votes_thresholds.map((c, i) => (
                <div
                  key={i}
                  className="flex flex-col space-y-3 mt-3 mr-6"
                >
                  <div className="flex items-center space-x-2">
                    {chain_manager.image(c?.params?.chain, evm_chains_data) && (
                      <Image
                        src={chain_manager.image(c.params.chain, evm_chains_data)}
                        alt=""
                        className="w-6 h-6 rounded-full"
                      />
                    )}
                    <span className="text-sm font-bold">
                      {chain_manager.name(c?.params?.chain, evm_chains_data)}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <div className="text-slate-400 dark:text-slate-500 text-xs font-medium">
                      Threshold
                    </div>
                    <span className="h-5 text-xl font-bold">
                      {c?.params?.voting_threshold?.denominator > 0 ?
                        number_format(c.params.voting_threshold.numerator * 100 / c.params.voting_threshold.denominator, '0,0.00') : '-'
                      }
                      <span className="text-sm font-medium">
                        %
                      </span>
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <div className="text-slate-400 dark:text-slate-500 text-xs font-medium">
                      Stake Maintaining
                    </div>
                    {typeof c.staking_percentage === 'number' ?
                      <span className="h-5 text-xl font-bold">
                        {number_format(c.staking_percentage, '0,0.00')}
                        <span className="text-sm font-medium">
                          %
                        </span>
                      </span>
                      :
                      <ThreeDots color={loader_color(theme)} width="24" height="24" />
                    }
                  </div>
                </div>
              ))
              :
              <ThreeDots color={loader_color(theme)} width="32" height="32" />
            }
          </div>
        </div>
      </div>
    </div>
  )
}