import * as React from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { Discipline } from '../types';
import { XIcon } from '../constants';

interface CalculateWeightsModalProps {
    isOpen: boolean;
    onClose: () => void;
    disciplines: Discipline[];
    onWeightsCalculated: (weights: { name: string; importance: number }[]) => void;
}

const responseSchema = {
    type: Type.OBJECT,
    properties: {
        subjectWeights: {
            type: Type.ARRAY,
            description: "An array of objects, where each object represents a subject and its calculated importance.",
            items: {
                type: Type.OBJECT,
                properties: {
                    name: {
                        type: Type.STRING,
                        description: "The name of the subject, exactly as provided in the input list."
                    },
                    importance: {
                        type: Type.INTEGER,
                        description: "The importance of the subject on a scale of 1 (least important) to 5 (most important)."
                    }
                },
                required: ["name", "importance"]
            }
        }
    },
    required: ["subjectWeights"]
};

const CalculateWeightsModal: React.FC<CalculateWeightsModalProps> = ({ isOpen, onClose, disciplines, onWeightsCalculated }) => {
    const [examiningBoard, setExaminingBoard] = React.useState('');
    const [isLoading, setIsLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

    if (!isOpen) return null;

    const handleCalculate = async () => {
        if (!examiningBoard.trim()) {
            setError('Por favor, insira o nome da banca.');
            return;
        }

        const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY || '';
        if (!apiKey) {
            setError('Chave de API do Gemini não configurada.');
            return;
        }

        setIsLoading(true);
        setError(null);

        const subjectNames = disciplines.map(d => d.name).join(', ');

        const prompt = `Como um especialista em concursos públicos, analise a relevância das seguintes disciplinas para a banca examinadora "${examiningBoard}". As disciplinas são: ${subjectNames}. Para cada disciplina, atribua um peso de importância de 1 (menos importante) a 5 (mais importante), com base na frequência e no peso que a banca costuma dar a esses assuntos em seus editais e provas. Retorne os resultados no formato JSON solicitado.`;

        try {
            const ai = new GoogleGenAI({ apiKey });
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    responseMimeType: 'application/json',
                    responseSchema: responseSchema,
                },
            });
            
            const jsonText = response.text ? response.text.trim() : '';
            const parsedJson = JSON.parse(jsonText);

            if (parsedJson.subjectWeights && Array.isArray(parsedJson.subjectWeights)) {
                onWeightsCalculated(parsedJson.subjectWeights);
            } else {
                throw new Error("Formato de resposta da IA inválido.");
            }

        } catch (e) {
            console.error("Erro ao calcular pesos:", e);
            setError("Não foi possível calcular os pesos. Verifique a banca ou tente novamente.");
        } finally {
            setIsLoading(false);
        }
    };


    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4 backdrop-blur-sm"
            onClick={onClose}
        >
            <div 
                className="bg-gray-800 rounded-xl shadow-2xl p-8 w-full max-w-lg text-white transform transition-all relative"
                onClick={(e) => e.stopPropagation()}
            >
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors">
                    <XIcon />
                </button>
                <div className="text-center">
                    <h2 className="text-2xl font-bold mb-2">Calcular Pesos por Banca</h2>
                    <p className="text-gray-400 mb-6">Insira o nome da banca para que a IA analise a importância de cada matéria.</p>
                </div>
                
                <div className="space-y-4">
                    <label htmlFor="exam-board" className="block text-sm font-bold text-emerald-400 uppercase tracking-wide">
                        Nome da Banca
                    </label>
                    <input
                        id="exam-board"
                        type="text"
                        value={examiningBoard}
                        onChange={(e) => setExaminingBoard(e.target.value)}
                        placeholder="Ex: FGV, Cebraspe, FCC"
                        className="w-full bg-gray-700 border border-gray-600 text-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-gray-500"
                        disabled={isLoading}
                    />
                    {error && <p className="text-red-500 text-sm mt-2 text-center">{error}</p>}
                </div>

                <div className="flex justify-end items-center gap-4 mt-8">
                     <button 
                        onClick={onClose}
                        className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-6 rounded-lg transition-colors"
                        disabled={isLoading}
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={handleCalculate}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2 px-6 rounded-lg transition-colors flex items-center justify-center w-36"
                        disabled={isLoading || !examiningBoard.trim()}
                    >
                        {isLoading ? (
                           <>
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <span>Calculando...</span>
                           </>
                        ) : 'Calcular'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CalculateWeightsModal;