import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import { Puff } from 'react-loader-spinner'

import Image from '../image'
import { validator_profile } from '../../lib/api/cosmos'
import { loader_color, rand_image } from '../../lib/utils'

export default ({ validator_description }) => {
  const { preferences } = useSelector(state => ({ preferences: state.preferences }), shallowEqual)
  const { theme } = { ...preferences }

  const [image, setImage] = useState(null)

  useEffect(() => {
    const getData = async () => {
      let _image
      if (validator_description?.identity) {
        const response = await validator_profile({ key_suffix: validator_description.identity })
        _image = response?.them?.[0]?.pictures?.primary?.url
      }
      if (!_image) {
        if (validator_description?.moniker?.toLowerCase().startsWith('axelar-core-')) {
          _image = '/logos/chains/axelar.png'
        }
        else {
          _image = rand_image()
        }
      }
      setImage(_image)
    }
    getData()
  }, [validator_description])

  return image ?
    <Image
      src={image}
      alt=""
      className="w-6 h-6 rounded-full"
    />
    :
    <Puff color={loader_color(theme)} width="24" height="24" />
}