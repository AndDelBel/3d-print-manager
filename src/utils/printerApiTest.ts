// Utility per testare le API delle stampanti
export const mockKlipperResponse = {
  printerInfo: {
    result: {
      state: "ready",
      state_message: "Printer is ready"
    }
  },
  temperature: {
    result: {
      status: {
        extruder: {
          temperature: 200.5,
          target: 200.0
        },
        heater_bed: {
          temperature: 60.0,
          target: 60.0
        }
      }
    }
  },
  printStats: {
    result: {
      status: {
        print_stats: {
          state: "printing",
          progress: 0.45,
          print_duration: 3600, // 1 ora
          total_duration: 8000, // 2.2 ore
          filename: "test_print.gcode"
        }
      }
    }
  }
}

export const mockBambuResponse = {
  state: "printing",
  temperature: {
    nozzle: 210.0,
    bed: 65.0
  },
  progress: {
    percentage: 45.5,
    remaining_time: 3600,
    total_time: 8000
  },
  current_file: "test_bambu.gcode"
}

// Funzione per testare l'API Klipper
export async function testKlipperAPI(endpoint: string, apiKey?: string) {
  try {
    console.log(`Testing Klipper API: ${endpoint}`)
    
    // Simula le chiamate API
    const printerInfoResponse = await fetch(`${endpoint}/printer/info`, {
      headers: apiKey ? { 'X-API-Key': apiKey } : {}
    })
    
    if (!printerInfoResponse.ok) {
      throw new Error(`HTTP ${printerInfoResponse.status}`)
    }
    
    const printerInfo = await printerInfoResponse.json()
    console.log('Printer Info:', printerInfo)
    
    // Test temperature
    const temperatureResponse = await fetch(`${endpoint}/printer/objects/query?extruder&heater_bed`, {
      headers: apiKey ? { 'X-API-Key': apiKey } : {}
    })
    
    if (!temperatureResponse.ok) {
      throw new Error(`HTTP ${temperatureResponse.status}`)
    }
    
    const temperatureData = await temperatureResponse.json()
    console.log('Temperature Data:', temperatureData)
    
    // Test print stats
    const printStatsResponse = await fetch(`${endpoint}/printer/objects/query?print_stats`, {
      headers: apiKey ? { 'X-API-Key': apiKey } : {}
    })
    
    let printStats = null
    if (printStatsResponse.ok) {
      printStats = await printStatsResponse.json()
      console.log('Print Stats:', printStats)
    }
    
    return {
      success: true,
      data: {
        printerInfo,
        temperatureData,
        printStats
      }
    }
  } catch (error) {
    console.error('Klipper API Test Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// Funzione per testare l'API Bambu Lab
export async function testBambuAPI(endpoint: string, apiKey?: string) {
  try {
    console.log(`Testing Bambu API: ${endpoint}`)
    
    const response = await fetch(`${endpoint}/device/status`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    
    const data = await response.json()
    console.log('Bambu API Response:', data)
    
    return {
      success: true,
      data
    }
  } catch (error) {
    console.error('Bambu API Test Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// Funzione per testare con dati mock
export function testWithMockData(tipoSistema: 'klipper' | 'bambu') {
  console.log(`Testing with mock data for ${tipoSistema}`)
  
  if (tipoSistema === 'klipper') {
    return {
      success: true,
      data: mockKlipperResponse
    }
  } else {
    return {
      success: true,
      data: mockBambuResponse
    }
  }
} 