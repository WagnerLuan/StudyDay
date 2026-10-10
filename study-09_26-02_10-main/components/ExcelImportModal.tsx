import * as React from 'react';
import { ParsedDisciplineImport, parseExcelToPlanDisciplines, downloadExcelTemplate } from '../src/utils/excelPlanUtils';

interface ExcelImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    planName: string;
    existingDisciplinesCount: number;
    onConfirmImport: (disciplines: ParsedDisciplineImport[], mode: 'append' | 'replace') => Promise<void>;
}

export const ExcelImportModal: React.FC<ExcelImportModalProps> = ({
    isOpen,
    onClose,
    planName,
    existingDisciplinesCount,
    onConfirmImport,
}) => {
    const [file, setFile] = React.useState<File | null>(null);
    const [parsedData, setParsedData] = React.useState<ParsedDisciplineImport[] | null>(null);
    const [isParsing, setIsParsing] = React.useState(false);
    const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
    const [importMode, setImportMode] = React.useState<'append' | 'replace'>('append');
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [expandedDisciplineIndex, setExpandedDisciplineIndex] = React.useState<number | null>(null);

    const fileInputRef = React.useRef<HTMLInputElement>(null);

    React.useEffect(() => {
        if (!isOpen) {
            setFile(null);
            setParsedData(null);
            setIsParsing(false);
            setErrorMsg(null);
            setImportMode('append');
            setIsSubmitting(false);
            setExpandedDisciplineIndex(null);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        setFile(selectedFile);
        setErrorMsg(null);
        setIsParsing(true);

        try {
            const result = await parseExcelToPlanDisciplines(selectedFile);
            setParsedData(result);
        } catch (err: any) {
            setErrorMsg(err.message || 'Erro ao ler arquivo Excel.');
            setParsedData(null);
        } finally {
            setIsParsing(false);
        }
    };

    const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        const droppedFile = e.dataTransfer.files?.[0];
        if (!droppedFile) return;

        if (!droppedFile.name.match(/\.(xlsx|xls|csv)$/i)) {
            setErrorMsg('Formato de arquivo inválido. Por favor, envie um arquivo .xlsx ou .xls.');
            return;
        }

        setFile(droppedFile);
        setErrorMsg(null);
        setIsParsing(true);

        try {
            const result = await parseExcelToPlanDisciplines(droppedFile);
            setParsedData(result);
        } catch (err: any) {
            setErrorMsg(err.message || 'Erro ao ler arquivo Excel.');
            setParsedData(null);
        } finally {
            setIsParsing(false);
        }
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
    };

    const totalTopicsCount = parsedData?.reduce((sum, d) => sum + d.topics.length, 0) || 0;

    const handleConfirm = async () => {
        if (!parsedData || parsedData.length === 0) return;

        setIsSubmitting(true);
        try {
            await onConfirmImport(parsedData, importMode);
            onClose();
        } catch (err: any) {
            setErrorMsg(err.message || 'Erro ao salvar importação no banco de dados.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs overflow-y-auto">
            <div className="relative w-full max-w-2xl bg-gray-900 border border-gray-700/80 rounded-2xl shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
                
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-800 bg-gray-900/90">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                <polyline points="14 2 14 8 20 8"></polyline>
                                <line x1="16" y1="13" x2="8" y2="13"></line>
                                <line x1="16" y1="17" x2="8" y2="17"></line>
                                <polyline points="10 9 9 9 8 9"></polyline>
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Importar Disciplinas via Excel</h2>
                            <p className="text-xs text-gray-400">Plano: <span className="text-emerald-400 font-semibold">{planName}</span></p>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
                        title="Fechar"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                    
                    {/* Upload Box (Se nenhum dado lido ou para trocar) */}
                    {!parsedData && (
                        <div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".xlsx, .xls, .csv"
                                onChange={handleFileChange}
                                className="hidden"
                            />

                            <div
                                onClick={() => fileInputRef.current?.click()}
                                onDrop={handleDrop}
                                onDragOver={handleDragOver}
                                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
                                    isParsing 
                                        ? 'border-emerald-500 bg-emerald-950/20' 
                                        : 'border-gray-700 hover:border-emerald-500/80 bg-gray-800/40 hover:bg-gray-800/80'
                                }`}
                            >
                                <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-3">
                                    {isParsing ? (
                                        <svg className="animate-spin w-6 h-6 text-emerald-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                                        </svg>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
                                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                            <polyline points="17 8 12 3 7 8"></polyline>
                                            <line x1="12" y1="3" x2="12" y2="15"></line>
                                        </svg>
                                    )}
                                </div>

                                <p className="text-base font-semibold text-gray-200">
                                    {isParsing ? 'Processando planilha...' : 'Clique para selecionar ou arraste sua planilha aqui'}
                                </p>
                                <p className="text-xs text-gray-400 mt-1">
                                    Suporta formatos <span className="text-emerald-400 font-semibold">.XLSX</span> e <span className="text-emerald-400 font-semibold">.XLS</span> de editais verticalizados
                                </p>

                                <div className="mt-4 flex items-center justify-center gap-2">
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            downloadExcelTemplate();
                                        }}
                                        className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold underline underline-offset-2 flex items-center gap-1 hover:underline"
                                    >
                                        <span>Baixar planilha modelo de exemplo</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Mensagem de Erro */}
                    {errorMsg && (
                        <div className="bg-rose-950/40 border border-rose-500/40 text-rose-200 rounded-xl p-4 text-xs space-y-2">
                            <div className="flex items-center gap-2 font-bold text-rose-400">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <line x1="12" y1="8" x2="12" y2="12"></line>
                                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                                </svg>
                                <span>Aviso de Validação</span>
                            </div>
                            <p>{errorMsg}</p>
                            <div className="pt-1">
                                <button
                                    type="button"
                                    onClick={() => downloadExcelTemplate()}
                                    className="text-emerald-400 hover:text-emerald-300 font-semibold underline"
                                >
                                    Clique aqui para baixar o modelo correto
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Resumo da Importação e Seleção de Modo */}
                    {parsedData && (
                        <div className="space-y-6">
                            
                            {/* Card de Informações do Arquivo */}
                            <div className="flex items-center justify-between bg-gray-800/80 border border-gray-700 rounded-xl p-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                            <polyline points="14 2 14 8 20 8"></polyline>
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-white truncate max-w-[280px] sm:max-w-[360px]">{file?.name}</p>
                                        <p className="text-[11px] text-gray-400">
                                            {file ? `${(file.size / 1024).toFixed(1)} KB` : ''}
                                        </p>
                                    </div>
                                </div>

                                <button
                                    onClick={() => {
                                        setFile(null);
                                        setParsedData(null);
                                        setErrorMsg(null);
                                    }}
                                    className="text-xs text-gray-400 hover:text-rose-400 underline"
                                >
                                    Trocar arquivo
                                </button>
                            </div>

                            {/* Estatísticas Encontradas */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-gray-800/60 border border-gray-700/80 rounded-xl p-4 text-center">
                                    <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400">
                                        {parsedData.length}
                                    </div>
                                    <div className="text-xs font-semibold text-gray-300 mt-0.5">
                                        {parsedData.length === 1 ? 'Disciplina Encontrada' : 'Disciplinas Encontradas'}
                                    </div>
                                </div>

                                <div className="bg-gray-800/60 border border-gray-700/80 rounded-xl p-4 text-center">
                                    <div className="text-2xl sm:text-3xl font-extrabold text-blue-400">
                                        {totalTopicsCount}
                                    </div>
                                    <div className="text-xs font-semibold text-gray-300 mt-0.5">
                                        {totalTopicsCount === 1 ? 'Tópico Encontrado' : 'Tópicos Encontrados'}
                                    </div>
                                </div>
                            </div>

                            {/* Opções de Importação: Adicionar ou Substituir */}
                            <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4 space-y-3">
                                <p className="text-xs font-bold text-gray-200 uppercase tracking-wider">
                                    Como deseja aplicar ao plano?
                                </p>

                                <div className="space-y-2">
                                    <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                                        importMode === 'append' 
                                            ? 'bg-emerald-950/20 border-emerald-500/60 text-white' 
                                            : 'bg-gray-800/40 border-gray-700 text-gray-400 hover:bg-gray-800'
                                    }`}>
                                        <input
                                            type="radio"
                                            name="importMode"
                                            value="append"
                                            checked={importMode === 'append'}
                                            onChange={() => setImportMode('append')}
                                            className="mt-0.5 text-emerald-500 focus:ring-emerald-500"
                                        />
                                        <div>
                                            <p className="text-xs font-bold text-gray-100">
                                                Adicionar às disciplinas existentes
                                            </p>
                                            <p className="text-[11px] text-gray-400 mt-0.5">
                                                Mantém as {existingDisciplinesCount} disciplinas já cadastradas e adiciona as {parsedData.length} novas disciplinas da planilha.
                                            </p>
                                        </div>
                                    </label>

                                    <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                                        importMode === 'replace' 
                                            ? 'bg-rose-950/20 border-rose-500/60 text-white' 
                                            : 'bg-gray-800/40 border-gray-700 text-gray-400 hover:bg-gray-800'
                                    }`}>
                                        <input
                                            type="radio"
                                            name="importMode"
                                            value="replace"
                                            checked={importMode === 'replace'}
                                            onChange={() => setImportMode('replace')}
                                            className="mt-0.5 text-rose-500 focus:ring-rose-500"
                                        />
                                        <div>
                                            <p className="text-xs font-bold text-gray-100">
                                                Substituir todas as disciplinas
                                            </p>
                                            <p className="text-[11px] text-gray-400 mt-0.5">
                                                Substitui o edital atual. Remove as disciplinas atuais deste plano e cadastra somente as disciplinas e tópicos da planilha.
                                            </p>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            {/* Lista de Pré-visualização das Disciplinas e Tópicos */}
                            <div className="space-y-2">
                                <p className="text-xs font-bold text-gray-200 uppercase tracking-wider flex items-center justify-between">
                                    <span>Pré-visualização do Conteúdo</span>
                                    <span className="text-[10px] text-gray-400 font-normal">Clique para expandir os tópicos</span>
                                </p>

                                <div className="space-y-2 max-h-56 overflow-y-auto pr-1 custom-scrollbar">
                                    {parsedData.map((disc, idx) => {
                                        const isExpanded = expandedDisciplineIndex === idx;

                                        return (
                                            <div
                                                key={idx}
                                                className="border border-gray-700/80 rounded-xl overflow-hidden bg-gray-800/50"
                                            >
                                                <button
                                                    type="button"
                                                    onClick={() => setExpandedDisciplineIndex(isExpanded ? null : idx)}
                                                    className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-800 transition-colors"
                                                >
                                                    <div className="flex items-center gap-2.5 min-w-0">
                                                        <div 
                                                            className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs"
                                                            style={{ backgroundColor: disc.color }}
                                                        />
                                                        <span className="text-xs font-bold text-gray-100 truncate">
                                                            {disc.name}
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center gap-2 shrink-0">
                                                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-700 text-gray-300">
                                                            {disc.topics.length} tópicos
                                                        </span>
                                                        <svg 
                                                            xmlns="http://www.w3.org/2000/svg" 
                                                            viewBox="0 0 24 24" 
                                                            fill="none" 
                                                            stroke="currentColor" 
                                                            strokeWidth="2" 
                                                            strokeLinecap="round" 
                                                            strokeLinejoin="round" 
                                                            className={`w-3.5 h-3.5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                                        >
                                                            <polyline points="6 9 12 15 18 9"></polyline>
                                                        </svg>
                                                    </div>
                                                </button>

                                                {/* Tópicos da Disciplina */}
                                                {isExpanded && (
                                                    <div className="p-3 bg-gray-900/60 border-t border-gray-700/60 text-xs space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar">
                                                        {disc.topics.map((top, tIdx) => {
                                                            const topicMeta = disc.topicsWithMetadata?.[tIdx];
                                                            const inc = topicMeta?.incidence || 'Média';
                                                            
                                                            const badgeStyle = 
                                                                inc === 'Muito Alta' ? 'bg-red-500/20 text-red-300 border-red-500/40' :
                                                                inc === 'Alta' ? 'bg-orange-500/20 text-orange-300 border-orange-500/40' :
                                                                inc === 'Média' ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40' :
                                                                inc === 'Baixa' ? 'bg-green-500/20 text-green-300 border-green-500/40' :
                                                                'bg-gray-500/20 text-gray-400 border-gray-500/40';

                                                            return (
                                                                <div key={tIdx} className="flex items-center justify-between gap-2 p-1.5 rounded hover:bg-gray-800/40 transition-colors">
                                                                    <div className="text-gray-300 flex items-start gap-1.5 leading-relaxed min-w-0">
                                                                        <span className="text-emerald-400 font-bold shrink-0">{tIdx + 1}.</span>
                                                                        <span className="text-gray-200 truncate">{top.replace(/^\s*\d+(\.\d+)*\.\s*/, '')}</span>
                                                                    </div>
                                                                    <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border shrink-0 ${badgeStyle}`}>
                                                                        {inc}
                                                                    </span>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                        </div>
                    )}

                </div>

                {/* Footer Buttons */}
                <div className="p-5 border-t border-gray-800 bg-gray-900 flex items-center justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="px-4 py-2 text-xs font-bold text-gray-300 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
                    >
                        Cancelar
                    </button>

                    {parsedData && (
                        <button
                            type="button"
                            onClick={handleConfirm}
                            disabled={isSubmitting || parsedData.length === 0}
                            className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-all shadow-md flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                        >
                            {isSubmitting ? (
                                <>
                                    <svg className="animate-spin w-4 h-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                                    </svg>
                                    <span>Salvando no Plano...</span>
                                </>
                            ) : (
                                <>
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                                        <polyline points="20 6 9 17 4 12"></polyline>
                                    </svg>
                                    <span>Confirmar Importação ({parsedData.length} disc.)</span>
                                </>
                            )}
                        </button>
                    )}
                </div>

            </div>
        </div>
    );
};

export default ExcelImportModal;
