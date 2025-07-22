export const loadCurrentBtcPrice = async (): Promise<number | null> => {
  try {
    const res = await fetch("https://min-api.cryptocompare.com/data/price?fsym=BTC&tsyms=EUR")
    const json = await res.json()

    if (json && json.EUR) {
      return Number(json.EUR)
    } else {
      console.error("Could not fetch BTC price:", json)
      return null
    }
  } catch (error) {
    console.error("Error fetching BTC price:", error)
    return null
  }
}
