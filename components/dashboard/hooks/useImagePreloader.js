import { useState, useEffect } from 'react'

const preloadImagePromise = src => new Promise((resolve, reject) => {
  const img = new Image()
  img.onload = () => resolve(img)
  img.onerror = img.onabort = () => reject()
  img.src = src
  img.crossOrigin = 'anonymous'
})

const getImageAsync = async url => {
  try {
    return await preloadImagePromise(url)
  } catch (error) {}
  return null
}

export const useImagePreloader = images => {
  const [imagesMap, setImagesMap] = useState({})
  useEffect(
    () => {
      const preloadImages = async () => {
        images.forEach(async url => {
          if (imagesMap[url]) return
          const image = await getImageAsync(url)
          if (image !== null) {
            setImagesMap(_imagesMap => {
              return {
                ..._imagesMap,
                [url]: image,
              }
            })
          }
        })
      }
      if (images) {
        preloadImages()
      }
    },
    [images, imagesMap],
  )
  return imagesMap
}