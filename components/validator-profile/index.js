import { useState, useEffect } from 'react'
import { useSelector, useDispatch, shallowEqual } from 'react-redux'
import _ from 'lodash'
import { ColorRing } from 'react-loader-spinner'

import Image from '../image'
import { validator_profile } from '../../lib/api/lcd'
import { loader_color, rand_image } from '../../lib/utils'
import { VALIDATORS_PROFILE_DATA } from '../../reducers/types'

export default (
  {
    validator_description,
    className = '',
  },
) => {
  const dispatch = useDispatch()
  const {
    preferences,
    validators_profile,
  } = useSelector(state =>
    (
      {
        preferences: state.preferences,
        validators_profile: state.validators_profile,
      }
    ),
    shallowEqual,
  )
  const {
    theme,
  } = { ...preferences }
  const {
    validators_profile_data,
  } = { ...validators_profile }

  const [image, setImage] = useState(null)

  useEffect(
    () => {
      const getData = async () => {
        if (validator_description) {
          const {
            moniker,
            identity,
          } = { ...validator_description }

          const key =
            identity ||
            (moniker || '')
              .split(' ')
              .filter(s => s)
              .join('_')

          let _image

          if (validators_profile_data?.[key]) {
            _image = validators_profile_data[key]
          }
          else if (identity) {
            const response =
              await validator_profile(
                {
                  key_suffix: identity,
                },
              )

            const {
              url,
            } = { ..._.head(response?.them)?.pictures?.primary }

            _image = url
          }

          if (!_image) {
            if (
              (moniker || '')
                .toLowerCase()
                .startsWith('axelar-core-')
            ) {
              _image = '/logos/chains/axelarnet.svg'
            }
            else if (!identity) {
              _image = rand_image()
            }
          }

          setImage(_image)

          dispatch(
            {
              type: VALIDATORS_PROFILE_DATA,
              value: {
                [`${key}`]: _image,
              },
            }
          )
        }
      }

      getData()
    },
    [validator_description],
  )

  const {
    moniker,
    identity,
  } = { ...validator_description }

  const key =
    identity ||
    (moniker || '')
      .split(' ')
      .filter(s => s)
      .join('_')

  const _image =
    validators_profile_data?.[key] ||
    image

  return (
    _image ?
      <Image
        src={_image}
        className={`w-6 h-6 rounded-full ${className}`}
      /> :
      <div className={`flex items-center justify-center ${className}`}>
        <ColorRing
          color={loader_color(theme)}
          width="24"
          height="24"
        />
      </div>
  )
}