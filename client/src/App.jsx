import { useState } from 'react';
import FileExplorer from './components/FileExplorer';

function App() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">
            F
          </div>
          <h1 className="text-xl font-semibold tracking-tight">File Manager</h1>
        </div>
      </header>
      <main className="container mx-auto px-4 py-6 h-[calc(100vh-80px)]">
        <FileExplorer />
      </main>
    </div>
  );
}

export default App;
