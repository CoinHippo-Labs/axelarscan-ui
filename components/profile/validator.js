import { useState, useEffect } from 'react'
import { useSelector, useDispatch, shallowEqual } from 'react-redux'
import _ from 'lodash'
import moment from 'moment'

import Spinner from '../spinner'
import Image from '../image'
import { getProfile } from '../../lib/api/keybase'
import { split, createMomentFromUnixtime, randImage } from '../../lib/utils'
import { PROFILES_DATA } from '../../reducers/types'

export default (
  {
    description,
    width = 24,
    height = 24,
    className = '',
  },
) => {
  const dispatch = useDispatch()
  const { profiles } = useSelector(state => ({ profiles: state.profiles }), shallowEqual)
  const { profiles_data } = { ...profiles }

  const [image, setImage] = useState(null)

  const getKey = () => {
    const { moniker, identity } = { ...description }
    return identity || split(moniker, 'normal', ' ').join('_')
  }

  useEffect(
    () => {
      const getData = async () => {
        if (description) {
          const { moniker, identity } = { ...description }
          const key = getKey()
          let value = profiles_data?.[key]
          let { image, updated_at } = { ...value }

          if (image && updated_at && moment().diff(createMomentFromUnixtime(updated_at), 'seconds') < 30 * 60) {
            value = null
          }
          else if (identity) {
            const response = await getProfile({ key_suffix: identity })
            const { url } = { ..._.head(response?.them)?.pictures?.primary }
            image = url
            updated_at = moment().unix()
            value = { image, updated_at }
          }

          if (!image) {
            if (moniker?.toLowerCase().startsWith('axelar-core-')) {
              image = '/logos/chains/axelarnet.svg'
            }
            else if (!identity) {
              image = randImage()
            }
            if (image) {
              updated_at = moment().unix()
              value = { image, updated_at }
            }
          }

          setImage(image)
          if (value) {
            dispatch({ type: PROFILES_DATA, value: { [key]: value } })
          }
        }
      }
      getData()
    },
    [description],
  )

  const _image = profiles_data?.[getKey()]?.image || image

  return (
    _image ?
      <Image
        src={_image}
        width={width}
        height={height}
        className={`rounded-full ${className}`}
      /> :
      <div className={`flex items-center justify-center ${className}`}>
        <Spinner width={width - 6} height={height - 2} />
      </div>
  )
}