// lib/api/fetch-recent-prices.ts

interface HistoricalDataPoint {
  time: number // Unix timestamp in seconds
  close: number
}

/**
 * Fetches recent daily prices for BTC in EUR from CryptoCompare.
 * This is only used to get data missing from the local CSV.
 * @param daysToFetch The number of days of historical data to retrieve.
 * @returns A promise that resolves to an array of historical data points.
 */
export const fetchRecentDailyPrices = async (daysToFetch: number): Promise<HistoricalDataPoint[]> => {
  if (daysToFetch <= 0) {
    return []
  }

  // We use the public CryptoCompare API, which doesn't require a key for this type of request.
  const apiUrl = `https://min-api.cryptocompare.com/data/v2/histoday?fsym=BTC&tsym=EUR&limit=${daysToFetch}`

  try {
    const res = await fetch(apiUrl)
    if (!res.ok) {
      throw new Error(`CryptoCompare API responded with status: ${res.status}`)
    }
    const json = await res.json()

    if (json && json.Response === "Success" && Array.isArray(json.Data.Data)) {
      // The API returns data including the current, possibly incomplete day.
      // We filter out the last entry if it's for the current day to only use complete daily data.
      const todayTimestamp = new Date().setUTCHours(0, 0, 0, 0) / 1000
      return json.Data.Data.filter((d: any) => d.time < todayTimestamp).map(
        (item: { time: number; close: number }) => ({
          time: item.time,
          close: item.close,
        }),
      )
    } else {
      console.error("CryptoCompare API error:", json.Message)
      return []
    }
  } catch (error) {
    console.error("Error fetching recent data from CryptoCompare:", error)
    return []
  }
}
