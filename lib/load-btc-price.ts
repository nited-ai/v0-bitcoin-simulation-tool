/**
 * Load current Bitcoin price - now uses database API with external fallback
 */
export const loadCurrentBtcPrice = async (preferLive: boolean = false): Promise<number | null> => {
  try {
    // First try our database API
    console.log('💰 Loading current BTC price from database API...')

    const response = await fetch(`/api/bitcoin-prices/current${preferLive ? '?live=true' : ''}`)

    if (response.ok) {
      const result = await response.json()

      if (result.success && result.data?.current?.close) {
        console.log(`✅ Current BTC price: $${result.data.current.close} (${result.data.isLive ? 'live' : 'database'})`)
        return result.data.current.close
      }
    }

    // Fallback to external API
    console.log('🔄 Falling back to external API...')
    const res = await fetch("https://min-api.cryptocompare.com/data/price?fsym=BTC&tsyms=USD")
    const json = await res.json()

    if (json && json.USD) {
      console.log(`✅ Current BTC price from CryptoCompare: $${json.USD}`)
      return Number(json.USD)
    } else {
      console.error("Could not fetch BTC price:", json)
      return null
    }
  } catch (error) {
    console.error("Error fetching BTC price:", error)
    return null
  }
}
