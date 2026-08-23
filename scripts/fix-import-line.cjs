const fs = require('fs');
const NL = String.fromCharCode(10);
const p = 'src/app/pages/ministry/NationalDirectoriesManagement.tsx';
let s = fs.readFileSync(p, 'utf8');
const lines = s.split(NL);
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("from 'lucide-react'") && lines[i].includes('Upload,')) {
    lines[i] = "import { Plus, Search, RefreshCw, Edit, Trash2, RotateCcw, Layers, Briefcase, Building2, Scale, Landmark, Save, X, Download, ChevronRight, ChevronLeft, Upload } from 'lucide-react';";
    console.log('fixed line ' + (i + 1));
    break;
  }
}
fs.writeFileSync(p, lines.join(NL), 'utf8');