import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'

import _ from 'lodash'

import Summary from './summary'
import KeysTable from './keys-table'

import { keygenSummary } from '../../lib/api/query'
import { axelard } from '../../lib/api/executor'
import { successKeygens as getSuccessKeygens, failedKeygens as getFailedKeygens, signAttempts as getSignAttempts } from '../../lib/api/opensearch'
import { chain_manager } from '../../lib/object/chain'
import { getName, convertToJson } from '../../lib/utils'

export default function Participations() {
  const { chains, denoms, validators, validators_chains } = useSelector(state => ({ chains: state.chains, denoms: state.denoms, validators: state.validators, validators_chains: state.validators_chains }), shallowEqual)
  const { chains_data } = { ...chains }
  const { denoms_data } = { ...denoms }
  const { validators_data } = { ...validators }
  const { validators_chains_data } = { validators_chains }

  const [summaryData, setSummaryData] = useState(null)
  const [successKeygens, setSuccessKeygens] = useState(null)
  const [failedKeygens, setFailedKeygens] = useState(null)
  const [successSignAttempts, setSuccessSignAttempts] = useState(null)
  const [failedSignAttempts, setFailedSignAttempts] = useState(null)

  const [table, setTable] = useState('keygen_success')
  const [keys, setKeys] = useState(null)

  useEffect(() => {
    const controller = new AbortController()

    const getData = async () => {
      if (!controller.signal.aborted) {
        const response = await keygenSummary()

        setSummaryData({ data: response || {}})
      }
    }

    getData()

    const interval = setInterval(() => getData(), 5 * 60 * 1000)
    return () => {
      controller?.abort()
      clearInterval(interval)
    }
  }, [])

  // useEffect(() => {
  //   const controller = new AbortController()

  //   const getData = async () => {
  //     if (chains_data) {
  //       if (!controller.signal.aborted) {
  //         const chainIds = _.uniq(chains_data?.map(c => chain_manager.maintainer_id(c?.id, chains_data)).filter(id => id) || [])
  //         const tssTypes = ['key-id', 'active-old-keys'], keyRoles = ['master', 'secondary']
  //         let data        

  //         for (let i = 0; i < chainIds.length; i++) {
  //           const key_chain = chainIds[i]

  //           for (let j = 0; j < tssTypes.length; j++) {
  //             const tssType = tssTypes[j]

  //             for (let k = 0; k < keyRoles.length; k++) {
  //               if (!controller.signal.aborted) {
  //                 const key_role = keyRoles[k]

  //                 const response = await axelard({ cmd: `axelard q tss ${tssType} ${key_chain} ${key_role} -oj`, cache: true, cache_timeout: 15 })

  //                 if (convertToJson(response?.data?.stdout)) {
  //                   let keyIds = convertToJson(response.data.stdout)

  //                   if (keyIds) {
  //                     keyIds = Array.isArray(keyIds) ? keyIds : [keyIds]

  //                     data = _.uniqBy(_.concat(data || [], keyIds.map(key_id => {
  //                       return {
  //                         key_id,
  //                         key_chain,
  //                         key_role,
  //                       }
  //                     })), 'key_id')
  //                   }
  //                 }
  //               }
  //             }
  //           }
  //         }

  //         if (data) {
  //           setKeys(data)
  //         }
  //       }
  //     }
  //   }

  //   getData()

  //   const interval = setInterval(() => getData(), 10 * 60 * 1000)
  //   return () => {
  //     controller?.abort()
  //     clearInterval(interval)
  //   }
  // }, [chains_data])

  useEffect(() => {
    const controller = new AbortController()

    const getData = async () => {
      let response, data

      if (!controller.signal.aborted) {
        response = await getSuccessKeygens({ size: 1000, sort: [{ height: 'desc' }] })
        data = response?.data || []

        for (let i = 0; i < data.length; i++) {
          const keygen = data[i]

          data[i] = {
            ...keygen,
            id: `${keygen.key_id}_${keygen.height}`,
            key_chain: keys?.find(k => k.key_id === keygen.key_id)?.key_chain || keygen.key_chain,
            key_chain_loading: true,
            key_role: keys?.find(k => k.key_id === keygen.key_id)?.key_role || keygen.key_role || (keygen?.key_id?.split('-').length > 2 && `${keygen.key_id.split('-')[1].toUpperCase()}_KEY`),
            validators: keygen.snapshot_validators?.validators?.map((v, j) => {
              return {
                ...v,
                address: v.validator,
                ...(validators_data?.find(_v => _v.operator_address === v.validator)),
                share: v.share_count,
              }
            }),
            non_participant_validators: keygen.snapshot_non_participant_validators?.validators?.map((v, j) => {
              return {
                ...v,
                address: v.validator,
                ...(validators_data?.find(_v => _v.operator_address === v.validator)),
                share: v.share_count,
              }
            }),
          }
        }

        data = _.orderBy(data, ['height'], ['desc'])
        setSuccessKeygens({ data, total: response?.total })
      }

      if (!controller.signal.aborted) {
        response = await getFailedKeygens({ size: 1000, sort: [{ height: 'desc' }] })
        data = response?.data || []

        for (let i = 0; i < data.length; i++) {
          const keygen = data[i]

          data[i] = {
            ...keygen,
            id: `${keygen.key_id}_${keygen.height}`,
            key_chain: keys?.find(k => k.key_id === keygen.key_id)?.key_chain || keygen.key_chain,
            key_chain_loading: true,
            key_role: keys?.find(k => k.key_id === keygen.key_id)?.key_role || keygen.key_role || (keygen?.key_id?.split('-').length > 2 && `${keygen.key_id.split('-')[1].toUpperCase()}_KEY`),
            validators: keygen.snapshot_validators?.validators?.map((v, j) => {
              return {
                ...v,
                address: v.validator,
                ...(validators_data?.find(_v => _v.operator_address === v.validator)),
                share: v.share_count,
              }
            }),
            non_participant_validators: keygen.snapshot_non_participant_validators?.validators?.map((v, j) => {
              return {
                ...v,
                address: v.validator,
                ...(validators_data?.find(_v => _v.operator_address === v.validator)),
                share: v.share_count,
              }
            }),
          }
        }

        data = _.orderBy(data, ['height'], ['desc'])
        setFailedKeygens({ data, total: response?.total })
      }

      if (!controller.signal.aborted) {
        response = await getSignAttempts({
          size: 1000,
          query: { match: { result: true } },
          sort: [{ height: 'desc' }],
          aggs: { total: { terms: { field: 'result' } } },
        })
        data = response?.data || []

        for (let i = 0; i < data.length; i++) {
          const sign = data[i]

          data[i] = {
            ...sign,
            id: sign.sig_id,
            key_chain: keys?.find(k => k.key_id === sign.key_id)?.key_chain || sign.key_chain,
            key_chain_loading: true,
            key_role: keys?.find(k => k.key_id === sign.key_id)?.key_role || sign.key_role || (sign?.key_id?.split('-').length > 2 && `${sign.key_id.split('-')[1].toUpperCase()}_KEY`),
            validators: sign.participants?.map((address, j) => {
              return {
                address,
                ...(validators_data?.find(v => v.operator_address === address)),
                share: sign.participant_shares?.[j],
              }
            }),
            non_participant_validators: sign.non_participants?.map((address, j) => {
              return {
                address,
                ...(validators_data?.find(v => v.operator_address === address)),
                share: sign.non_participant_shares?.[j],
              }
            }),
          }
        }

        data = _.orderBy(data, ['height'], ['desc'])
        setSuccessSignAttempts({ data, total: response?.total })
      }

      if (!controller.signal.aborted) {
        response = await getSignAttempts({
          size: 1000,
          query: { match: { result: false } },
          sort: [{ height: 'desc' }],
          aggs: { total: { terms: { field: 'result' } } },
        })
        data = response?.data || []

        for (let i = 0; i < data.length; i++) {
          const sign = data[i]

          data[i] = {
            ...sign,
            id: sign.sig_id,
            key_chain: keys?.find(k => k.key_id === sign.key_id)?.key_chain || sign.key_chain,
            key_chain_loading: true,
            key_role: keys?.find(k => k.key_id === sign.key_id)?.key_role || sign.key_role || (sign?.key_id?.split('-').length > 2 && `${sign.key_id.split('-')[1].toUpperCase()}_KEY`),
            validators: sign.participants?.map((address, j) => {
              return {
                address,
                ...(validators_data?.find(v => v.operator_address === address)),
                share: sign.participant_shares?.[j],
              }
            }),
            non_participant_validators: sign.non_participants?.map((address, j) => {
              return {
                address,
                ...(validators_data?.find(v => v.operator_address === address)),
                share: sign.non_participant_shares?.[j],
              }
            }),
          }
        }

        data = _.orderBy(data, ['height'], ['desc'])
        setFailedSignAttempts({ data, total: response?.total })
      }
    }

    getData()

    const interval = setInterval(() => getData(), 5 * 60 * 1000)
    return () => {
      controller?.abort()
      clearInterval(interval)
    }
  }, [validators_data])

  useEffect(() => {
    if (validators_data) {
      if (successKeygens?.data) {
        const data = successKeygens.data.map(keygen => {
          return {
            ...keygen,
            key_chain: keys?.find(k => k.key_id === keygen.key_id)?.key_chain || keygen.key_chain,
            key_chain_loading: !keys,
            key_role: keys?.find(k => k.key_id === keygen.key_id)?.key_role || keygen.key_role,
            validators: keygen?.snapshot_validators.validators?.map((v, j) => {
              return {
                ...v,
                address: v.validator,
                ...(validators_data?.find(_v => _v.operator_address === v.validator)),
                share: v.share_count,
              }
            }),
            non_participant_validators: keygen.snapshot_non_participant_validators?.validators?.map((v, j) => {
              return {
                ...v,
                address: v.validator,
                ...(validators_data?.find(_v => _v.operator_address === v.validator)),
                share: v.share_count,
              }
            }),
          }
        })

        setSuccessKeygens({ ...successKeygens, data })
      }

      if (failedKeygens?.data) {
        const data = failedKeygens.data.map(keygen => {
          return {
            ...keygen,
            key_chain: keys?.find(k => k.key_id === keygen.key_id)?.key_chain || keygen.key_chain,
            key_chain_loading: !keys,
            key_role: keys?.find(k => k.key_id === keygen.key_id)?.key_role || keygen.key_role,
            validators: keygen.snapshot_validators?.validators?.map((v, j) => {
              return {
                ...v,
                address: v.validator,
                ...(validators_data?.find(_v => _v.operator_address === v.validator)),
                share: v.share_count,
              }
            }),
            non_participant_validators: keygen.snapshot_non_participant_validators?.validators?.map((v, j) => {
              return {
                ...v,
                address: v.validator,
                ...(validators_data?.find(_v => _v.operator_address === v.validator)),
                share: v.share_count,
              }
            }),
          }
        })

        setFailedKeygens({ ...failedKeygens, data })
      }

      if (successSignAttempts?.data) {
        const data = successSignAttempts.data.map(sign => {
          return {
            ...sign,
            key_chain: keys?.find(k => k.key_id === sign.key_id)?.key_chain || sign.key_chain,
            key_chain_loading: !keys,
            key_role: keys?.find(k => k.key_id === sign.key_id)?.key_role || sign.key_role,
            validators: sign.participants?.map((address, j) => {
              return {
                address,
                ...(validators_data?.find(v => v.operator_address === address)),
                share: sign.participant_shares?.[j],
              }
            }),
            non_participant_validators: sign.non_participants?.map((address, j) => {
              return {
                address,
                ...(validators_data?.find(v => v.operator_address === address)),
                share: sign.non_participant_shares?.[j],
              }
            }),
          }
        })

        setSuccessSignAttempts({ ...successSignAttempts, data })
      }

      if (failedSignAttempts?.data) {
        const data = failedSignAttempts.data.map(sign => {
          return {
            ...sign,
            key_chain: keys?.find(k => k.key_id === sign.key_id)?.key_chain || sign.key_chain,
            key_chain_loading: !keys,
            key_role: keys?.find(k => k.key_id === sign.key_id)?.key_role || sign.key_role,
            validators: sign.participants?.map((address, j) => {
              return {
                address,
                ...(validators_data?.find(v => v.operator_address === address)),
                share: sign.participant_shares?.[j],
              }
            }),
            non_participant_validators: sign.non_participants?.map((address, j) => {
              return {
                address,
                ...(validators_data?.find(v => v.operator_address === address)),
                share: sign.non_participant_shares?.[j],
              }
            }),
          }
        })

        setFailedSignAttempts({ ...failedSignAttempts, data })
      }
    }
  }, [validators_data, keys])

  return (
    <div className={`max-w-${[/*'keygen_failed', 'sign_success', 'sign_failed'*/].includes(table) ? '7xl' : 'full'} my-2 xl:my-4 mx-auto`}>
      <Summary
        data={summaryData?.data}
        successKeygens={successKeygens && (typeof successKeygens.total === 'number' ? successKeygens.total : successKeygens.data?.length)}
        failedKeygens={failedKeygens && (typeof failedKeygens.total === 'number' ? failedKeygens.total : failedKeygens.data?.length)}
        successSignAttempts={successSignAttempts && (typeof successSignAttempts.total === 'number' ? successSignAttempts.total : successSignAttempts.data?.length)}
        failedSignAttempts={failedSignAttempts && (typeof failedSignAttempts.total === 'number' ? failedSignAttempts.total : failedSignAttempts.data?.length)}
      />
      <div className="flex flex-row items-center overflow-x-auto space-x-1 my-2">
        {['keygen_success', 'keygen_failed', 'sign_success', 'sign_failed'].map((t, i) => (
          <div
            key={i}
            onClick={() => setTable(t)}
            className={`btn btn-default btn-rounded cursor-pointer bg-trasparent ${t === table ? 'bg-gray-700 dark:bg-gray-900 text-white' : 'bg-trasparent hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-gray-700 dark:hover:text-gray-100'}`}
          >
            {t.split('_').join(' - ')}
          </div>
        ))}
      </div>
      {table === 'keygen_failed' ?
        <KeysTable
          data={failedKeygens}
          page={table}
        />
        :
        table === 'sign_success' ?
          <KeysTable
            data={successSignAttempts}
            page={table}
          />
          :
          table === 'sign_failed' ?
            <KeysTable
              data={failedSignAttempts}
              page={table}
            />
            :
            <KeysTable
              data={successKeygens}
              page={table}
              corruption_signing_threshold={summaryData?.data?.corruption_signing_threshold}
            />
      }
    </div>
  )
}