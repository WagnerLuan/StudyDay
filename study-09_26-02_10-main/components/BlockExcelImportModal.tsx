import * as React from 'react';
import { StudyPlan } from '../types';
import { XIcon, CheckIcon } from '../constants';
import { 
    ParsedBlockImport, 
    BlockImportParseResult, 
    parseExcelToStudyBlocks, 
    downloadBlockExcelTemplate 
} from '../src/utils/excelBlockUtils';

interface BlockExcelImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    plans: StudyPlan[];
    currentWeekBlockCount: number;
    onConfirmImport: (blocks: ParsedBlockImport[], mode: 'append' | 'replace') => Promise<void>;
}

export const BlockExcelImportModal: React.FC<BlockExcelImportModalProps> = ({
    isOpen,
    onClose,
    plans,
    currentWeekBlockCount,
    onConfirmImport,
}) => {
    const [file, setFile] = React.useState<File | null>(null);
    const [isParsing, setIsParsing] = React.useState(false);
    const [parseResult, setParseResult] = React.useState<BlockImportParseResult | null>(null);
    const [generalError, setGeneralError] = React.useState<string | null>(null);
    const [importMode, setImportMode] = React.useState<'append' | 'replace'>('append');
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [activeTab, setActiveTab] = React.useState<'summary' | 'list'>('summary');

    const fileInputRef = React.useRef<HTMLInputElement>(null);

    React.useEffect(() => {
        if (!isOpen) {
            setFile(null);
            setIsParsing(false);
            setParseResult(null);
            setGeneralError(null);
            setImportMode('append');
            setIsSubmitting(false);
            setActiveTab('summary');
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const processFile = async (selectedFile: File) => {
        setFile(selectedFile);
        setGeneralError(null);
        setParseResult(null);
        setIsParsing(true);

        try {
            const result = await parseExcelToStudyBlocks(selectedFile, plans);
            setParseResult(result);
        } catch (err: any) {
            setGeneralError(err.message || 'Erro ao processar arquivo Excel.');
            setParseResult(null);
        } finally {
            setIsParsing(false);
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files?.[0];
        if (!selected) return;
        await processFile(selected);
    };

    const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        const droppedFile = e.dataTransfer.files?.[0];
        if (!droppedFile) return;

        if (!droppedFile.name.match(/\.(xlsx|xls)$/i)) {
            setGeneralError('Formato de arquivo inválido. Por favor, envie uma planilha Excel (.xlsx ou .xls).');
            return;
        }

        await processFile(droppedFile);
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
    };

    const handleDownloadTemplate = () => {
        downloadBlockExcelTemplate(plans);
    };

    const handleConfirm = async () => {
        if (!parseResult || parseResult.blocks.length === 0 || parseResult.errors.length > 0) return;

        setIsSubmitting(true);
        try {
            await onConfirmImport(parseResult.blocks, importMode);
            onClose();
        } catch (err: any) {
            setGeneralError(err.message || 'Erro ao salvar blocos importados.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const hasErrors = (parseResult?.errors && parseResult.errors.length > 0);
    const hasValidBlocks = (parseResult?.blocks && parseResult.blocks.length > 0);
    const canConfirm = hasValidBlocks && !hasErrors && !isSubmitting && !isParsing;

    const daysOrder = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

    return (
        <div 
            className="fixed inset-0 bg-black/80 flex justify-center items-center z-50 p-4 backdrop-blur-sm animate-fade-in"
            onClick={onClose}
        >
            <div 
                className="bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-2xl text-white max-h-[90vh] flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <header className="flex justify-between items-center pb-4 border-b border-gray-700">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                <polyline points="14 2 14 8 20 8"></polyline>
                                <line x1="8" y1="13" x2="16" y2="13"></line>
                                <line x1="8" y1="17" x2="16" y2="17"></line>
                                <polyline points="10 9 9 9 8 9"></polyline>
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Importar Semana (Excel)</h2>
                            <p className="text-xs text-gray-400">Distribua sua rotina semanal de estudos a partir de uma planilha .xlsx</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="p-1 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                    >
                        <XIcon className="w-5 h-5" />
                    </button>
                </header>

                {/* Conteúdo rolável */}
                <div className="flex-1 overflow-y-auto py-5 space-y-5 custom-scrollbar pr-1">
                    {/* Botão Baixar Modelo */}
                    <div className="bg-gray-900/60 border border-gray-700/80 p-3.5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="text-xs text-gray-300">
                            <span className="font-semibold text-emerald-400 block mb-0.5">Precisa do formato padrão?</span>
                            Baixe o modelo com os exemplos e nomes dos seus planos cadastrados.
                        </div>
                        <button
                            type="button"
                            onClick={handleDownloadTemplate}
                            className="inline-flex items-center justify-center gap-2 px-3.5 py-2 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer shadow-xs"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                <polyline points="7 10 12 15 17 10"></polyline>
                                <line x1="12" y1="15" x2="12" y2="3"></line>
                            </svg>
                            <span>Baixar Modelo Excel</span>
                        </button>
                    </div>

                    {/* Área de Upload / Dropzone */}
                    <div 
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onClick={() => fileInputRef.current?.click()}
                        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                            file ? 'border-emerald-500/60 bg-emerald-500/5' : 'border-gray-700 hover:border-gray-600 bg-gray-900/40'
                        }`}
                    >
                        <input 
                            ref={fileInputRef}
                            type="file" 
                            accept=".xlsx, .xls"
                            onChange={handleFileChange}
                            className="hidden" 
                        />
                        <div className="flex flex-col items-center justify-center gap-2 text-gray-400">
                            <div className="w-12 h-12 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-emerald-400">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                    <polyline points="17 8 12 3 7 8"></polyline>
                                    <line x1="12" y1="3" x2="12" y2="15"></line>
                                </svg>
                            </div>
                            {file ? (
                                <div>
                                    <p className="text-sm font-bold text-emerald-400">{file.name}</p>
                                    <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB • Clique para escolher outro arquivo</p>
                                </div>
                            ) : (
                                <div>
                                    <p className="text-sm font-semibold text-gray-200">Arraste seu arquivo Excel (.xlsx) aqui ou <span className="text-emerald-400 underline">clique para selecionar</span></p>
                                    <p className="text-xs text-gray-500 mt-1">Colunas: Dia da Semana, Plano de Estudo, Disciplina, Tópico, Duração (min), Horário, Categoria</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Loading State */}
                    {isParsing && (
                        <div className="p-4 bg-gray-900/80 rounded-xl border border-gray-700 flex items-center justify-center gap-3 text-sm text-gray-300">
                            <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
                            <span>Validando estrutura e correspondência da planilha...</span>
                        </div>
                    )}

                    {/* Erro Geral */}
                    {generalError && (
                        <div className="p-4 bg-red-900/30 border border-red-700/60 rounded-xl text-red-200 text-xs flex items-start gap-2.5">
                            <span className="text-red-400 font-bold text-sm leading-none mt-0.5">⚠️</span>
                            <div>
                                <strong className="font-semibold block mb-0.5">Falha na leitura da planilha:</strong>
                                <span>{generalError}</span>
                            </div>
                        </div>
                    )}

                    {/* Alerta de Validação Estrita (Linhas com Erro) */}
                    {hasErrors && parseResult && (
                        <div className="p-4 bg-rose-950/40 border border-rose-600/50 rounded-xl text-rose-200 text-xs space-y-2">
                            <div className="flex items-center gap-2 font-bold text-rose-400 text-sm">
                                <span>⛔</span>
                                <span>Importação bloqueada: Corrija os erros abaixo na planilha</span>
                            </div>
                            <p className="text-gray-300 text-[11px]">
                                Para manter a consistência da sua rotina, todas as linhas devem atender aos campos obrigatórios e aos nomes de planos e disciplinas cadastrados.
                            </p>
                            <div className="max-h-48 overflow-y-auto space-y-1.5 custom-scrollbar pr-2 mt-2 bg-gray-900/70 p-3 rounded-lg border border-gray-800">
                                {parseResult.errors.map((err, i) => (
                                    <div key={i} className="text-rose-300 font-mono text-[11px] flex items-start gap-1.5">
                                        <span className="text-rose-500 font-bold">•</span>
                                        <span>{err}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Sucesso na Leitura e Resumo dos Blocos */}
                    {hasValidBlocks && !hasErrors && parseResult && (
                        <div className="space-y-4">
                            {/* Card de Resumo */}
                            <div className="bg-emerald-950/30 border border-emerald-500/40 p-4 rounded-xl space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                                            ✓
                                        </div>
                                        <h4 className="text-sm font-bold text-white">
                                            {parseResult.blocks.length} {parseResult.blocks.length === 1 ? 'bloco identificado' : 'blocos identificados'} com sucesso!
                                        </h4>
                                    </div>
                                    <div className="flex text-xs bg-gray-900 p-1 rounded-lg border border-gray-700">
                                        <button
                                            type="button"
                                            onClick={() => setActiveTab('summary')}
                                            className={`px-2.5 py-1 rounded font-semibold transition-colors ${
                                                activeTab === 'summary' ? 'bg-emerald-500 text-white' : 'text-gray-400 hover:text-white'
                                            }`}
                                        >
                                            Por Dia
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setActiveTab('list')}
                                            className={`px-2.5 py-1 rounded font-semibold transition-colors ${
                                                activeTab === 'list' ? 'bg-emerald-500 text-white' : 'text-gray-400 hover:text-white'
                                            }`}
                                        >
                                            Lista Detalhada
                                        </button>
                                    </div>
                                </div>

                                {activeTab === 'summary' ? (
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                                        {daysOrder.map(dayName => {
                                            const count = parseResult.summaryByDay[dayName] || 0;
                                            return (
                                                <div 
                                                    key={dayName}
                                                    className={`p-2.5 rounded-lg border text-center transition-colors ${
                                                        count > 0 
                                                            ? 'bg-gray-900/80 border-emerald-500/30' 
                                                            : 'bg-gray-900/40 border-gray-800 opacity-60'
                                                    }`}
                                                >
                                                    <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                                        {dayName}
                                                    </span>
                                                    <span className={`text-base font-extrabold ${count > 0 ? 'text-emerald-400' : 'text-gray-500'}`}>
                                                        {count} {count === 1 ? 'bloco' : 'blocos'}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="max-h-52 overflow-y-auto space-y-2 custom-scrollbar pr-1">
                                        {parseResult.blocks.map((blk, idx) => (
                                            <div key={idx} className="bg-gray-900/80 p-2.5 rounded-lg border border-gray-800 text-xs flex items-center justify-between gap-3">
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 uppercase">
                                                            {blk.dayName}
                                                        </span>
                                                        {blk.dateDisplay && (
                                                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300">
                                                                {blk.dateDisplay}
                                                            </span>
                                                        )}
                                                        <span className="font-bold text-white truncate">{blk.disciplineName}</span>
                                                        <span className="text-gray-500 text-[10px]">({blk.planName})</span>
                                                    </div>
                                                    <p className="text-gray-300 truncate text-[11px] mt-0.5">
                                                        {blk.topicName}
                                                    </p>
                                                </div>
                                                <div className="text-right flex-shrink-0">
                                                    <span className="text-emerald-400 font-mono font-bold block">{blk.durationMinutes} min</span>
                                                    <span className="text-gray-400 text-[10px] font-mono">{blk.timeRange || blk.startTime || 'Sem horário'}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Escolha do Modo de Importação */}
                            <div className="bg-gray-900/60 border border-gray-700/80 p-4 rounded-xl space-y-3">
                                <label className="block text-xs font-bold text-emerald-400 uppercase tracking-wider">
                                    Modo de Aplicação na Semana
                                </label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                                        importMode === 'append' 
                                            ? 'bg-emerald-500/10 border-emerald-500 text-white' 
                                            : 'bg-gray-800/60 border-gray-700 text-gray-300 hover:bg-gray-800'
                                    }`}>
                                        <input 
                                            type="radio" 
                                            name="importMode" 
                                            value="append"
                                            checked={importMode === 'append'}
                                            onChange={() => setImportMode('append')}
                                            className="mt-1 text-emerald-500 focus:ring-emerald-500"
                                        />
                                        <div>
                                            <span className="font-bold text-xs block text-white">Adicionar aos blocos existentes</span>
                                            <span className="text-[11px] text-gray-400 block mt-0.5">
                                                Mantém os {currentWeekBlockCount} blocos atuais da semana e insere os novos blocos da planilha.
                                            </span>
                                        </div>
                                    </label>

                                    <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                                        importMode === 'replace' 
                                            ? 'bg-rose-500/10 border-rose-500 text-white' 
                                            : 'bg-gray-800/60 border-gray-700 text-gray-300 hover:bg-gray-800'
                                    }`}>
                                        <input 
                                            type="radio" 
                                            name="importMode" 
                                            value="replace"
                                            checked={importMode === 'replace'}
                                            onChange={() => setImportMode('replace')}
                                            className="mt-1 text-rose-500 focus:ring-rose-500"
                                        />
                                        <div>
                                            <span className="font-bold text-xs block text-rose-400">Substituir todos os blocos</span>
                                            <span className="text-[11px] text-gray-400 block mt-0.5">
                                                Apaga os {currentWeekBlockCount} blocos atuais da semana e cadastra exclusivamente os da planilha.
                                            </span>
                                        </div>
                                    </label>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <footer className="flex flex-col sm:flex-row justify-end items-center gap-3 pt-4 border-t border-gray-700">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="w-full sm:w-auto px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs font-bold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirm}
                        disabled={!canConfirm}
                        className="w-full sm:w-auto px-5 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                    >
                        {isSubmitting ? (
                            <>
                                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                <span>Importando...</span>
                            </>
                        ) : (
                            <>
                                <CheckIcon className="w-4 h-4" />
                                <span>Confirmar Importação ({parseResult?.blocks.length || 0} blocos)</span>
                            </>
                        )}
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default BlockExcelImportModal;
