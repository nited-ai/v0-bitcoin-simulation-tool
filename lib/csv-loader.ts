import Papa from "papaparse"

interface HistoricalDataPoint {
  time: number // Unix timestamp in seconds
  close: number
}

const USD_TO_EUR_RATE = 0.92

export const loadPriceHistoryFromCsv = async (): Promise<HistoricalDataPoint[]> => {
  try {
    // Fetch the local CSV file from the public folder
    const response = await fetch("/btc-price-history.csv")
    const csvText = await response.text()

    return new Promise((resolve, reject) => {
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true,
        complete: (results) => {
          if (results.errors.length > 0) {
            console.error("CSV Parsing errors:", results.errors)
            return reject(new Error("Failed to parse historical price CSV."))
          }

          const formattedData = results.data
            .map((row: any) => {
              // Check for valid row structure
              if (!row.Date || !row["Closing Price (USD)"]) {
                return null
              }
              const date = new Date(row.Date)
              const priceUsd =
                typeof row["Closing Price (USD)"] === "string"
                  ? Number.parseFloat(row["Closing Price (USD)"])
                  : row["Closing Price (USD)"]

              if (isNaN(date.getTime()) || isNaN(priceUsd)) {
                return null
              }

              return {
                time: Math.floor(date.getTime() / 1000),
                close: priceUsd * USD_TO_EUR_RATE,
              }
            })
            .filter((item): item is HistoricalDataPoint => item !== null)
            .sort((a, b) => a.time - b.time) // Ensure data is sorted chronologically

          resolve(formattedData)
        },
        error: (error: Error) => {
          console.error("PapaParse error:", error)
          reject(new Error("Failed to parse historical price CSV."))
        },
      })
    })
  } catch (error) {
    console.error("Error fetching or processing CSV:", error)
    throw new Error("Could not load historical price data from CSV file.")
  }
}
