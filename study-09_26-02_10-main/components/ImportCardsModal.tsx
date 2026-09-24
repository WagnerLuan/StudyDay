"use client";

import * as React from 'react';
import { XIcon, CheckIcon, DatabaseIcon } from '../constants';
import { Deck } from '../types';
import { supabase } from '../src/lib/supabase';
import { showSuccess, showError, showLoading, dismissToast } from '../src/utils/toast';

// Ícone de Upload local
const UploadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
);

interface ImportCardsModalProps {
    isOpen: boolean;
    onClose: () => void;
    decks: Deck[];
    userId: string;
    onImportSuccess: () => void;
}

const ImportCardsModal: React.FC<ImportCardsModalProps> = ({ isOpen, onClose, decks, userId, onImportSuccess }) => {
    const [selectedDeckId, setSelectedDeckId] = React.useState('');
    const [file, setFile] = React.useState<File | null>(null);
    const [isImporting, setIsImporting] = React.useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    React.useEffect(() => {
        if (isOpen) {
            setSelectedDeckId(decks.length > 0 ? decks[0].id : '');
            setFile(null);
        }
    }, [isOpen, decks]);

    if (!isOpen) return null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const parseTextFile = (content: string): { front: string, back: string }[] => {
        const lines = content.split(/\r?\n/).filter(line => line.trim() !== '');
        if (lines.length === 0) return [];

        // Lógica de Detecção baseada na primeira linha
        const firstLine = lines[0];
        let separator = '';

        if (firstLine.includes('|')) {
            separator = '|';
        } else if (firstLine.includes(';')) {
            separator = ';';
        } else {
            // Fallback para vírgula ou tabulação se nenhum dos solicitados for encontrado
            if (firstLine.includes(',')) separator = ',';
            else if (firstLine.includes('\t')) separator = '\t';
        }

        if (!separator) return [];

        return lines.map(line => {
            const parts = line.split(separator);
            return {
                front: parts[0]?.trim() || '',
                back: parts.slice(1).join(separator).trim() || ''
            };
        }).filter(card => card.front !== '' && card.back !== '');
    };

    const handleImport = async () => {
        if (!selectedDeckId) {
            showError("Selecione um baralho de destino.");
            return;
        }
        if (!file) {
            showError("Selecione um arquivo para importar.");
            return;
        }

        setIsImporting(true);
        const toastId = showLoading("Processando arquivo...");

        try {
            const reader = new FileReader();
            
            const fileContent = await new Promise<string>((resolve, reject) => {
                reader.onload = (e) => resolve(e.target?.result as string);
                reader.onerror = (e) => reject(e);
                reader.readAsText(file);
            });

            const cardsToImport = parseTextFile(fileContent);

            if (cardsToImport.length === 0) {
                throw new Error("Nenhum card válido encontrado no arquivo. Verifique se o separador é Pipe (|) ou Ponto e Vírgula (;).");
            }

            const payload = cardsToImport.map(card => ({
                user_id: userId,
                deck_id: selectedDeckId,
                front_html: card.front,
                back_html: card.back,
                status: 'pendente',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }));

            const { error } = await supabase.from('flashcards').insert(payload);

            if (error) throw error;

            showSuccess(`${cardsToImport.length} cards importados com sucesso!`);
            onImportSuccess();
            onClose();
        } catch (e: any) {
            showError("Erro na importação: " + e.message);
        } finally {
            setIsImporting(false);
            dismissToast(toastId);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-[100] p-4 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg text-white transform transition-all flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="p-6 flex justify-between items-center border-b border-gray-700">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400">
                            <UploadIcon />
                        </div>
                        <h2 className="text-xl font-black text-white uppercase tracking-widest">
                            Importar do Anki / Planilha
                        </h2>
                    </div>
                    <button onClick={onClose} className="text-gray-500 hover:text-white p-2 rounded-full hover:bg-gray-700 transition-colors">
                        <XIcon className="w-6 h-6" />
                    </button>
                </header>

                <main className="p-8 space-y-6">
                    <p className="text-gray-400 text-sm leading-relaxed">
                        Aceita arquivos <span className="text-emerald-400 font-bold">.csv, .txt ou .tsv</span>. 
                        O sistema detectará automaticamente se você usa <span className="text-white font-bold">Pipe (|)</span> ou <span className="text-white font-bold">Ponto e Vírgula (;)</span> como separador.
                    </p>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-2">Baralho de Destino</label>
                            <select
                                value={selectedDeckId}
                                onChange={e => setSelectedDeckId(e.target.value)}
                                className="w-full bg-gray-900 border border-gray-600 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                            >
                                <option value="" disabled>Selecione um baralho</option>
                                {decks.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-2">Arquivo</label>
                            <div 
                                onClick={() => fileInputRef.current?.click()}
                                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${file ? 'border-emerald-500 bg-emerald-500/5' : 'border-gray-600 hover:border-gray-500 bg-gray-900/50'}`}
                            >
                                <input 
                                    type="file" 
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                    className="hidden"
                                    accept=".csv,.txt,.tsv"
                                />
                                <div className="flex flex-col items-center gap-2">
                                    <DatabaseIcon className={`w-8 h-8 ${file ? 'text-emerald-400' : 'text-gray-500'}`} />
                                    {file ? (
                                        <div className="space-y-1">
                                            <p className="text-sm font-bold text-white">{file.name}</p>
                                            <p className="text-[10px] text-gray-500 uppercase">{(file.size / 1024).toFixed(1)} KB</p>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-gray-400">Clique para selecionar ou arraste o arquivo</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </main>

                <footer className="p-6 border-t border-gray-700 flex justify-end gap-4">
                    <button onClick={onClose} className="px-6 py-2.5 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-xl transition-colors">
                        Cancelar
                    </button>
                    <button 
                        onClick={handleImport}
                        disabled={isImporting || !file || !selectedDeckId}
                        className="px-8 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2"
                    >
                        <CheckIcon className="w-5 h-5" />
                        {isImporting ? 'IMPORTANDO...' : 'INICIAR IMPORTAÇÃO'}
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default ImportCardsModal;