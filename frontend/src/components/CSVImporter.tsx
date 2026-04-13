import { useState } from 'react';
import { X, Upload, FileText, Check } from 'lucide-react';
import Papa from 'papaparse';

export default function CSVImporter({ onClose, onImport }: { onClose: () => void; onImport: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any[]>([]);
  const [mapping, setMapping] = useState({
    date: 'Date',
    aircraft: 'Aircraft',
    from: 'From',
    to: 'To',
    total: 'Total',
    pic: 'PIC',
    night: 'Night',
    actual: 'Actual Instrument',
    sim: 'Simulated Instrument',
    dayLandings: 'Day Landings',
    nightLandings: 'Night Landings',
    remarks: 'Comments'
  });
  const [importing, setImporting] = useState(false);

  const handleFile = (f: File) => {
    setFile(f);
    Papa.parse(f, {
      header: true,
      preview: 5,
      complete: (results) => {
        setPreview(results.data);
        // Auto-detect columns
        const headers = results.meta.fields || [];
        const newMapping = { ...mapping };
        headers.forEach(h => {
          const lower = h.toLowerCase();
          if (lower.includes('date')) newMapping.date = h;
          if (lower.includes('aircraft') && !lower.includes('type')) newMapping.aircraft = h;
          if (lower === 'from' || lower.includes('depart')) newMapping.from = h;
          if (lower === 'to' || lower.includes('arriv')) newMapping.to = h;
        });
        setMapping(newMapping);
      }
    });
  };

  const doImport = async () => {
    if (!file) return;
    setImporting(true);
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('mapping', JSON.stringify(mapping));
    
    try {
      const res = await fetch('/api/import/csv', { method: 'POST', body: formData });
      const data = await res.json();
      alert(`Imported ${data.imported} flights`);
      onImport();
      onClose();
    } catch (err) {
      // Fallback: parse locally
      Papa.parse(file, {
        header: true,
        complete: (results) => {
          console.log('Parsed', results.data.length, 'rows');
          alert(`Parsed ${results.data.length} flights (demo mode - connect backend to save)`);
          onImport();
          onClose();
        }
      });
    }
    setImporting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-4xl glass rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/20 text-primary">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Import myFlightBook CSV</h2>
              <p className="text-xs text-slate-400 mt-0.5">Map your columns to logbook fields</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {!file ? (
            <div 
              onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
              onDragOver={(e) => e.preventDefault()}
              className="border-2 border-dashed border-white/20 rounded-2xl p-12 text-center hover:border-primary/50 transition-colors cursor-pointer"
              onClick={() => document.getElementById('csv-input')?.click()}
            >
              <FileText className="w-12 h-12 mx-auto mb-4 text-slate-500" />
              <div className="text-lg font-medium mb-2">Drop CSV file here</div>
              <div className="text-sm text-slate-400 mb-4">or click to browse</div>
              <div className="text-xs text-slate-500">Exports from myflightbook.com Ã¢ÂÂ Logbook Ã¢ÂÂ Download</div>
              <input id="csv-input" type="file" accept=".csv" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center gap-3 p-4 rounded-xl bg-success/10 border border-success/20">
                <Check className="w-5 h-5 text-success" />
                <div>
                  <div className="font-medium">{file.name}</div>
                  <div className="text-xs text-slate-400">{(file.size / 1024).toFixed(1)} KB Ã¢ÂÂ¢ {preview.length} rows preview</div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3">Column Mapping</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {Object.entries(mapping).map(([key, val]) => (
                    <div key={key} className="flex items-center gap-3">
                      <label className="w-32 text-sm text-slate-400 capitalize">{key.replace(/([A-Z])/g, ' $1')}</label>
                      <select value={val} onChange={(e) => setMapping({ ...mapping, [key]: e.target.value })} className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm focus:border-primary focus:outline-none">
                        {preview[0] && Object.keys(preview[0]).map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              {preview.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3">Preview</h3>
                  <div className="overflow-x-auto rounded-xl border border-white/10">
                    <table className="w-full text-xs">
                      <thead className="bg-white/5">
                        <tr>
                          {Object.keys(preview[0]).slice(0, 8).map(h => <th key={h} className="px-3 py-2 text-left font-medium text-slate-400">{h}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {preview.slice(0, 3).map((row, i) => (
                          <tr key={i} className="border-t border-white/5">
                            {Object.values(row).slice(0, 8).map((v: any, j) => <td key={j} className="px-3 py-2 truncate max-w-[120px]">{v}</td>)}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between p-6 border-t border-white/10 bg-black/20">
          <div className="text-xs text-slate-400">Data stays in your browser until you save</div>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 rounded-xl hover:bg-white/10 transition-colors">Cancel</button>
            <button onClick={doImport} disabled={!file || importing} className="px-5 py-2.5 rounded-xl btn-primary text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed">
              {importing ? 'Importing...' : 'Import Flights'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
