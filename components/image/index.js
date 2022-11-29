export default (
  {
    alt = '',
    ...rest
  },
) => {
  return (
    <img
      alt={alt}
      { ...rest }
    />
  )
}