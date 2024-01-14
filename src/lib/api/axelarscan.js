const request = async (url = process.env.NEXT_PUBLIC_AXELARSCAN_API_URL, params) => {
  const response = await fetch(url, { method: 'POST', body: JSON.stringify(params) }).catch(error => { return null })
  return response && await response.json()
}
