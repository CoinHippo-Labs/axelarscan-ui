import { useState, useEffect } from 'react'
import { useSelector, useDispatch, shallowEqual } from 'react-redux'
import _ from 'lodash'

import Spinner from '../spinner'
import Image from '../image'
import { getProfile } from '../../lib/api/keybase'
import { split, randImage } from '../../lib/utils'
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
          let _image

          if (profiles_data?.[key]) {
            _image = profiles_data[key]
          }
          else if (identity) {
            const response = await getProfile({ key_suffix: identity })
            const { url } = { ..._.head(response?.them)?.pictures?.primary }
            _image = url
          }

          if (!_image) {
            if (moniker?.toLowerCase().startsWith('axelar-core-')) {
              _image = '/logos/chains/axelarnet.svg'
            }
            else if (!identity) {
              _image = randImage()
            }
          }

          setImage(_image)
          dispatch({ type: PROFILES_DATA, value: { [key]: _image } })
        }
      }
      getData()
    },
    [description],
  )

  const _image = profiles_data?.[getKey()] || image

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