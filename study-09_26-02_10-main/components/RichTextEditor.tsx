"use client";

import * as React from 'react';
import { AlignLeft, AlignCenter, AlignRight, AlignJustify } from 'lucide-react';
import ColorPickerPopover from './ColorPickerPopover';

interface RichTextEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({ value, onChange, placeholder }) => {
    const editorRef = React.useRef<HTMLDivElement>(null);
    const [currentColor, setCurrentColor] = React.useState('#FFFFFF');

    React.useEffect(() => {
        if (editorRef.current && editorRef.current.innerHTML !== value) {
            editorRef.current.innerHTML = value;
        }
    }, [value]);

    const execCommand = (command: string, val?: string) => {
        if (editorRef.current) {
            editorRef.current.focus();
            document.execCommand(command, false, val);
            onChange(editorRef.current.innerHTML);
        }
    };

    const handleInput = () => {
        if (editorRef.current) {
            onChange(editorRef.current.innerHTML);
        }
    };

    const handleSelectColor = (color: string) => {
        setCurrentColor(color);
        execCommand('foreColor', color);
    };

    const ToolbarButton = ({ onClick, children, title, active = false }: { onClick: () => void, children: React.ReactNode, title: string, active?: boolean }) => (
        <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => { e.preventDefault(); onClick(); }}
            className={`p-2 hover:bg-gray-700 rounded text-gray-300 transition-colors ${active ? 'bg-gray-700 text-emerald-400' : ''}`}
            title={title}
        >
            {children}
        </button>
    );

    return (
        <div className="border border-gray-600 rounded-lg bg-gray-900 flex flex-col">
            <div className="flex flex-wrap gap-1 p-1 bg-gray-800 border-b border-gray-600 sticky top-0 z-10 rounded-t-lg">
                <ToolbarButton onClick={() => execCommand('bold')} title="Negrito"><strong>B</strong></ToolbarButton>
                <ToolbarButton onClick={() => execCommand('italic')} title="Itálico"><em>I</em></ToolbarButton>
                <ToolbarButton onClick={() => execCommand('underline')} title="Sublinhado"><u>U</u></ToolbarButton>
                
                <div className="w-px h-6 bg-gray-600 mx-1 self-center"></div>
                
                <ToolbarButton onClick={() => execCommand('justifyLeft')} title="Alinhar à Esquerda"><AlignLeft size={18} /></ToolbarButton>
                <ToolbarButton onClick={() => execCommand('justifyCenter')} title="Centralizar"><AlignCenter size={18} /></ToolbarButton>
                <ToolbarButton onClick={() => execCommand('justifyRight')} title="Alinhar à Direita"><AlignRight size={18} /></ToolbarButton>
                <ToolbarButton onClick={() => execCommand('justifyFull')} title="Justificar"><AlignJustify size={18} /></ToolbarButton>

                <div className="w-px h-6 bg-gray-600 mx-1 self-center"></div>
                
                <ToolbarButton onClick={() => execCommand('insertUnorderedList')} title="Lista com Marcadores">• Lista</ToolbarButton>
                <ToolbarButton onClick={() => execCommand('insertOrderedList')} title="Lista Numerada">1. Lista</ToolbarButton>
                
                <div className="w-px h-6 bg-gray-600 mx-1 self-center"></div>

                <ColorPickerPopover onSelectColor={handleSelectColor} currentColor={currentColor} />

                <ToolbarButton onClick={() => execCommand('backColor', '#FDE047')} title="Destacar Texto">🖍️</ToolbarButton>
                
                <div className="w-px h-6 bg-gray-600 mx-1 self-center"></div>
                
                <ToolbarButton onClick={() => {
                    const url = prompt('Insira a URL:');
                    if (url) execCommand('createLink', url);
                }} title="Inserir Link">🔗</ToolbarButton>
                
                <ToolbarButton onClick={() => execCommand('removeFormat')} title="Limpar Formatação">⌫</ToolbarButton>
            </div>

            <div
                ref={editorRef}
                contentEditable
                onInput={handleInput}
                className="p-4 min-h-[200px] outline-none text-gray-200 
                           [&_ul]:list-disc [&_ul]:pl-8 [&_ol]:list-decimal [&_ol]:pl-8 [&_li]:mb-1"
                data-placeholder={placeholder}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        setTimeout(handleInput, 0);
                    }
                }}
            />
        </div>
    );
};

export default RichTextEditor;