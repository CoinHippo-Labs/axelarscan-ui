import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import { BiCheckCircle, BiXCircle } from 'react-icons/bi'

import Info from './info'
import Participations from './participations'
import { genesis } from '../../lib/api/rpc'
import { keygens as getKeygens, sign_attempts as getSignAttempts } from '../../lib/api/index'
import { number_format, equals_ignore_case } from '../../lib/utils'

const TABLES = ['keygens_success', 'keygens_failed', 'signs_success', 'signs_failed']

export default () => {
  const { validators } = useSelector(state => ({ validators: state.validators }), shallowEqual)
  const { validators_data } = { ...validators }

  const [info, setInfo] = useState(null)
  const [table, setTable] = useState(_.head(TABLES))
  const [keygensSuccess, setKeygensSuccess] = useState(null)
  const [keygensFailed, setKeygensFailed] = useState(null)
  const [signsSuccess, setSignsSuccess] = useState(null)
  const [signsFailed, setSignsFailed] = useState(null)

  useEffect(() => {
    const controller = new AbortController()
    const getData = async () => {
      if (!controller.signal.aborted) {
        const response = await genesis()
        setInfo({ ...response })
      }
    }
    getData()
    return () => {
      controller?.abort()
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    const getData = async (is_success = true) => {
      if (!controller.signal.aborted) {
        const response = await getKeygens({
          size: 1000,
          sort: [{ height: 'desc' }],
          track_total_hits: true,
        }, is_success)
        const _data = {
          data: response?.data?.map(d => {
            const {
              key_id,
              height,
              key_role,
              participants,
              non_participants,
              snapshot_validators,
              snapshot_non_participant_validators,
            } = { ...d }
            return {
              ...d,
              id: `${key_id}_${height}`,
              key_role: key_role || (key_id?.split('-').length > 1 && `${key_id.split('-')[0].toUpperCase()}_KEY`),
              validators: (participants || snapshot_validators?.validators)?.map(v => {
                const {
                  validator,
                  share_count,
                  weight,
                } = { ...v }
                let {
                  address,
                } = { ...v }
                address = address || validator
                return {
                  ...v,
                  address,
                  ...validators_data?.find(_v => equals_ignore_case(_v?.operator_address, address)),
                  share: weight || share_count,
                }
              }),
              non_participant_validators: (non_participants || snapshot_non_participant_validators?.validators)?.map(v => {
                const {
                  validator,
                  share_count,
                  weight,
                } = { ...v }
                let {
                  address,
                } = { ...v }
                address = address || validator
                return {
                  ...v,
                  address,
                  ...validators_data?.find(_v => equals_ignore_case(_v?.operator_address, address)),
                  share: weight || share_count,
                }
              }),
            }
          }) || [],
          total: response?.total,
        }
        switch (is_success) {
          case false:
            setKeygensFailed(_data)
            break
          default:
            setKeygensSuccess(_data)
            break
        }
      }
    }
    getData(true)
    getData(false)
    const interval = setInterval(() => {
      getData(true)
      getData(false)
    }, 5 * 60 * 1000)
    return () => {
      controller?.abort()
      clearInterval(interval)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    const getData = async (is_success = true) => {
      if (!controller.signal.aborted) {
        const response = await getSignAttempts({
          query: { match: { result: is_success } },
          size: 1000,
          sort: [{ height: 'desc' }],
          track_total_hits: true,
        })
        const _data = {
          data: response?.data?.map(d => {
            const { sig_id, key_id, key_role, participants, participant_shares, non_participants, non_participant_shares } = { ...d }
            return {
              ...d,
              id: sig_id,
              key_role: key_role || (key_id?.split('-').length > 1 && `${key_id.split('-')[0].toUpperCase()}_KEY`),
              validators: participants?.map((a, i) => {
                return {
                  address: a,
                  ...validators_data?.find(v => equals_ignore_case(v?.operator_address, a)),
                  share: participant_shares?.[i],
                }
              }),
              non_participant_validators: non_participants?.map((a, i) => {
                return {
                  address: a,
                  ...validators_data?.find(v => equals_ignore_case(v?.operator_address, a)),
                  share: non_participant_shares?.[i],
                }
              }),
            }
          }) || [],
          total: response?.total,
        }
        switch (is_success) {
          case false:
            setSignsFailed(_data)
            break
          default:
            setSignsSuccess(_data)
            break
        }
      }
    }
    getData(true)
    getData(false)
    const interval = setInterval(() => {
      getData(true)
      getData(false)
    }, 5 * 60 * 1000)
    return () => {
      controller?.abort()
      clearInterval(interval)
    }
  }, [])

  useEffect(() => {
    const setData = (type = 'keygens', is_success = true) => {
      if (validators_data) {
        let _data
        switch (type) {
          case 'signs':
            switch (is_success) {
              case false:
                _data = signsFailed
                break
              default:
                _data = signsSuccess
                break
            }
            break
          default:
            switch (is_success) {
              case false:
                _data = keygensFailed
                break
              default:
                _data = keygensSuccess
                break
            }
            break
        }
        let {
          data,
        } = { ..._data }
        if (data) {
          data = data.map(d => {
            const {
              validators,
              non_participant_validators,
            } = { ...d }
            return {
              ...d,
              validators: validators?.map(v => {
                const {
                  address,
                } = { ...v }
                return {
                  ...v,
                  ...validators_data.find(_v => equals_ignore_case(_v?.operator_address, address)),
                }
              }),
              non_participant_validators: non_participant_validators?.map(v => {
                const {
                  address,
                } = { ...v }
                return {
                  ...v,
                  ...validators_data.find(_v => equals_ignore_case(_v?.operator_address, address)),
                }
              }),
            }
          })
          switch (type) {
            case 'signs':
              switch (is_success) {
                case false:
                  setSignsFailed({
                    ..._data,
                    data,
                  })
                  break
                default:
                  setSignsSuccess({
                    ..._data,
                    data,
                  })
                  break
              }
              break
            default:
              switch (is_success) {
                case false:
                  setKeygensFailed({
                    ..._data,
                    data,
                  })
                  break
                default:
                  setKeygensSuccess({
                    ..._data,
                    data,
                  })
                  break
              }
              break
          }
        }
      }
    }
    setData('keygens', true)
    setData('keygens', false)
    setData('signs', true)
    setData('signs', false)
  }, [validators_data])

  return (
    <div className="space-y-6 mt-2 mb-6 mx-auto">
      <Info
        data={{
          info,
          keygensSuccess,
          keygensFailed,
          signsSuccess,
          signsFailed,
        }}
      />
      <div className="flex items-center overflow-x-auto space-x-2">
        {TABLES.map((t, i) => {
          const { total } = {
            ...(t === 'keygens_failed' ?
              keygensFailed :
              t === 'signs_success' ?
                signsSuccess :
                t === 'signs_failed' ?
                  signsFailed : keygensSuccess
            )
          }
          return (
            <button
              key={i}
              onClick={() => setTable(t)}
              className={`${t === table ? 'bg-blue-500 dark:bg-blue-600 text-white font-bold' : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 font-medium hover:font-semibold'} rounded-lg flex items-center uppercase space-x-1 py-1 px-2`}
            >
              {t?.endsWith('_failed') ?
                <BiXCircle size={16} className={`${t === table ? 'text-white' : 'text-red-500 dark:text-red-600'}`} /> :
                <BiCheckCircle size={16} className={`${t === table ? 'text-white' : 'text-green-500 dark:text-green-600'}`} />
              }
              <span className="whitespace-nowrap">
                {_.head(t.split('_'))}
              </span>
              {typeof total === 'number' && (
                <span className="font-mono font-bold">
                  ({number_format(total, '0,0')})
                </span>
              )}
            </button>
          )
        })}
      </div>
      <Participations
        table={table}
        _data={table === 'keygens_failed' ?
          keygensFailed :
          table === 'signs_success' ?
            signsSuccess :
            table === 'signs_failed' ?
              signsFailed : keygensSuccess
        }
        corruption_signing_threshold={info?.data?.corruption_signing_threshold}
      />
    </div>
  )
}