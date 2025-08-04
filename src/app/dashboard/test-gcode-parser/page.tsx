'use client'

import { useState } from 'react'
import { analyzeGcodeFile, type GcodeAnalysis } from '@/utils/gcodeParser'
import JSZip from 'jszip'

type AnalysisResult = GcodeAnalysis | { error: string }

export default function TestGcodeParser() {
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [fileStructure, setFileStructure] = useState<string[]>([])

  const analyzeFileStructure = async (file: File) => {
    try {
      // Solo i file .gcode.3mf sono ZIP, i file .gcode normali sono file di testo
      if (file.name.toLowerCase().endsWith('.gcode.3mf')) {
        const zip = new JSZip()
        const zipContent = await zip.loadAsync(file)
        const fileNames = Object.keys(zipContent.files)
        setFileStructure(fileNames)
        console.log('📁 File contenuti nel .gcode.3mf:', fileNames)
      } else {
        // Per file .gcode normali, mostra che sono file di testo
        setFileStructure(['File di testo G-code'])
        console.log('📄 File .gcode normale (file di testo)')
      }
    } catch (error) {
      console.error('Errore nell\'analisi della struttura:', error)
      setFileStructure(['Errore nell\'analisi della struttura'])
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setLoading(true)
    try {
      // Analizza prima la struttura del file
      await analyzeFileStructure(file)
      
      const analysis = await analyzeGcodeFile(file)
      setResult(analysis)
      console.log('Analisi completata:', analysis)
    } catch (error) {
      console.error('Errore nell\'analisi:', error)
      const errorMessage = error instanceof Error ? error.message : 'Errore sconosciuto'
      setResult({ error: errorMessage })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Test Parser G-code</h1>
      
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">
          Carica file G-code per testare il parser:
        </label>
        <input
          type="file"
          accept=".gcode,.gcode.3mf,.3mf,application/octet-stream"
          onChange={handleFileUpload}
          className="block w-full text-sm text-gray-300 bg-gray-800 border border-gray-600 rounded-lg cursor-pointer focus:outline-none focus:border-blue-500"
        />
        <p className="text-sm text-gray-400 mt-2">
          Supporta file .gcode, .gcode.3mf e .3mf. Se non vedi i file .gcode.3mf, seleziona &quot;Tutti i file&quot; nel selettore.
        </p>
      </div>

      {loading && (
        <div className="mb-4 p-4 bg-blue-900 border border-blue-700 rounded-lg">
          Analizzando il file...
        </div>
      )}

      {fileStructure.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-4">Struttura File .gcode.3mf:</h2>
          <div className="p-4 bg-gray-800 border border-gray-700 rounded-lg">
            <pre className="text-xs overflow-auto max-h-40">
              {fileStructure.join('\n')}
            </pre>
          </div>
        </div>
      )}

      {result && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Risultati Analisi:</h2>
          
          {'error' in result ? (
            <div className="p-4 bg-red-900 border border-red-700 rounded-lg">
              <strong>Errore:</strong> {result.error}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-800 border border-gray-700 rounded-lg">
                <h3 className="font-semibold mb-2">Tempo di Stampa</h3>
                <p className="text-2xl font-bold text-blue-400">
                  {result.tempo_stampa_min !== null ? `${result.tempo_stampa_min} minuti` : 'Non disponibile'}
                </p>
              </div>
              
              <div className="p-4 bg-gray-800 border border-gray-700 rounded-lg">
                <h3 className="font-semibold mb-2">Peso</h3>
                <p className="text-2xl font-bold text-green-400">
                  {result.peso_grammi} grammi
                </p>
              </div>
              
              {result.materiale && (
                <div className="p-4 bg-gray-800 border border-gray-700 rounded-lg">
                  <h3 className="font-semibold mb-2">Materiale</h3>
                  <p className="text-lg text-yellow-400">{result.materiale}</p>
                </div>
              )}
              
              {result.stampante && (
                <div className="p-4 bg-gray-800 border border-gray-700 rounded-lg">
                  <h3 className="font-semibold mb-2">Stampante</h3>
                  <p className="text-lg text-cyan-400">{result.stampante}</p>
                </div>
              )}
              
              {result.layer_height && (
                <div className="p-4 bg-gray-800 border border-gray-700 rounded-lg">
                  <h3 className="font-semibold mb-2">Altezza Layer</h3>
                  <p className="text-lg text-purple-400">{result.layer_height} mm</p>
                </div>
              )}
            </div>
          )}
          
          <details className="mt-4">
            <summary className="cursor-pointer text-sm text-gray-400 hover:text-gray-300">
              Dettagli completi (JSON)
            </summary>
            <pre className="mt-2 p-4 bg-gray-900 border border-gray-700 rounded-lg text-xs overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  )
} 