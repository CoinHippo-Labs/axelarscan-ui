import Copy from '../copy'

import { number_format, ellipse } from '../../lib/utils'

export default function AxelarSpecific({ data, keygens, signs, rewards }) {
  const keygenParticipated = keygens && keygens.filter(k => k?.participated).length
  const keygenNotParticipated = keygens && keygens.filter(k => k?.not_participated).length
  const totalKeygen = keygenParticipated + keygenNotParticipated

  const signParticipated = signs && (signs.total_participated_signs || signs.data?.filter(s => s?.participated).length)
  const signNotParticipated = signs && (signs.total_not_participated_signs || signs.data?.filter(s => s?.not_participated).length)
  const totalSign = signParticipated + signNotParticipated

  return (
    <div
      title={<span className="text-lg font-medium">Axelar Specific</span>}
      className="dark:border-gray-900"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 text-base sm:text-sm lg:text-base gap-4 mt-3 mb-0.5">
        <div className="flex flex-col space-y-1">
          <span className="font-semibold">Keygen Participated</span>
          {keygens ?
            <span className="flex items-center text-gray-500 dark:text-gray-400 space-x-1.5">
              <span>{number_format(keygenParticipated, '0,0')}</span>
              <span>({number_format((totalKeygen > 0 ? keygenParticipated / totalKeygen : 0) * 100, '0,0.00')}%)</span>
            </span>
            :
            <div className="skeleton w-28 h-6" />
          }
        </div>
        <div className="flex flex-col space-y-1">
          <span className="font-semibold">Keygen Not Participated</span>
          {keygens ?
            <span className="flex items-center text-gray-500 dark:text-gray-400 space-x-1.5">
              <span>{number_format(keygenNotParticipated, '0,0')}</span>
              <span>({number_format((totalKeygen > 0 ? keygenNotParticipated / totalKeygen : 0) * 100, '0,0.00')}%)</span>
            </span>
            :
            <div className="skeleton w-28 h-6" />
          }
        </div>
        <div className="flex flex-col space-y-1">
          <span className="font-semibold">Sign Participated</span>
          {signs ?
            <span className="flex items-center text-gray-500 dark:text-gray-400 space-x-1.5">
              <span>{number_format(signParticipated, '0,0')}</span>
              <span>({number_format((totalSign > 0 ? signParticipated / totalSign : 0) * 100, '0,0.00')}%)</span>
            </span>
            :
            <div className="skeleton w-28 h-6" />
          }
        </div>
        <div className="flex flex-col space-y-1">
          <span className="font-semibold">Sign Not Participated</span>
          {signs ?
            <span className="flex items-center text-gray-500 dark:text-gray-400 space-x-1.5">
              <span>{number_format(signNotParticipated, '0,0')}</span>
              <span>({number_format((totalSign > 0 ? signNotParticipated / totalSign : 0) * 100, '0,0.00')}%)</span>
            </span>
            :
            <div className="skeleton w-28 h-6" />
          }
        </div>
        {/*<div className="sm:col-span-2 flex flex-col space-y-1">
          <span className="font-semibold">Rewards / Stake</span>
          {rewards ?
            <span className="text-gray-500 dark:text-gray-400">
              {rewards.length > 0 ?
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-2">
                  {rewards.map((reward, i) => (
                    <div key={i} className={`${reward?.rewards_per_stake?.length > 1 ? 'sm:col-span-2 lg:col-span-1 xl:col-span-2' : ''} space-y-0.5`}>
                      <div className="text-sm font-light">{reward?.name}</div>
                      <div className="flex items-center">
                        {reward?.rewards_per_stake?.map((_reward, j) => (
                          <span key={j} className="bg-gray-100 dark:bg-gray-800 rounded flex items-center font-medium space-x-1 px-2 py-1 mr-2">
                            <span>{number_format(_reward.amount_per_stake, '0,0.000')}</span>
                            <span className="uppercase font-light">{ellipse(_reward.denom, 16)}</span>
                            <span className="whitespace-nowrap text-xs font-light">({number_format(_reward.amount, '0,0.000')} / {number_format(_reward.stake, '0,0.000')})</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                :
                '-'
              }
            </span>
            :
            <>
              <div className="skeleton w-full h-6" />
              <div className="skeleton w-full h-6" />
            </>
          }
        </div>*/}
      </div>
    </div>
  )
}