"use client";

import * as React from 'react';
import { AlignLeft, AlignCenter, AlignRight, AlignJustify, ImagePlus, Trash2 } from 'lucide-react';
import ColorPickerPopover from './ColorPickerPopover';
import { showError } from '../src/utils/toast';

interface RichTextEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}

type ImageSizePreset = 'P' | 'M' | 'G';

const SIZE_TO_WIDTH: Record<ImageSizePreset, string> = {
    P: '35%',
    M: '65%',
    G: '100%',
};

const MAX_IMAGE_WIDTH = 1200;
const ACCEPTED_IMAGE_TYPES = new Set([
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/gif',
]);

const detectImageSize = (img: HTMLImageElement): ImageSizePreset => {
    const dataSize = img.getAttribute('data-size');
    if (dataSize === 'P' || dataSize === 'M' || dataSize === 'G') {
        return dataSize;
    }
    const inlineWidth = img.style.width?.trim();
    if (inlineWidth === '35%') return 'P';
    if (inlineWidth === '65%') return 'M';
    return 'G';
};

const processImageFile = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        if (!ACCEPTED_IMAGE_TYPES.has(file.type)) {
            reject(new Error('Formato não suportado. Use PNG, JPEG, WEBP ou GIF.'));
            return;
        }

        const reader = new FileReader();
        reader.onerror = () => reject(new Error('Erro ao ler o arquivo de imagem.'));
        reader.onload = () => {
            const originalDataUrl = reader.result as string;
            const img = new Image();
            img.onerror = () => reject(new Error('Não foi possível processar a imagem selecionada.'));
            img.onload = () => {
                const naturalWidth = img.naturalWidth || img.width;
                const naturalHeight = img.naturalHeight || img.height;

                // Mantém GIFs animados intactos quando já estão dentro do limite de largura e peso razoável
                if (file.type === 'image/gif' && naturalWidth <= MAX_IMAGE_WIDTH && file.size <= 2 * 1024 * 1024) {
                    resolve(originalDataUrl);
                    return;
                }

                const scale = naturalWidth > MAX_IMAGE_WIDTH ? MAX_IMAGE_WIDTH / naturalWidth : 1;
                const targetWidth = Math.max(1, Math.round(naturalWidth * scale));
                const targetHeight = Math.max(1, Math.round(naturalHeight * scale));

                const canvas = document.createElement('canvas');
                canvas.width = targetWidth;
                canvas.height = targetHeight;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    resolve(originalDataUrl);
                    return;
                }

                ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

                if (file.type === 'image/jpeg') {
                    resolve(canvas.toDataURL('image/jpeg', 0.82));
                    return;
                }

                const webpUrl = canvas.toDataURL('image/webp', 0.85);
                if (webpUrl.startsWith('data:image/webp')) {
                    if (scale === 1 && webpUrl.length >= originalDataUrl.length) {
                        resolve(originalDataUrl);
                    } else {
                        resolve(webpUrl);
                    }
                    return;
                }

                resolve(canvas.toDataURL('image/png'));
            };
            img.src = originalDataUrl;
        };
        reader.readAsDataURL(file);
    });
};

const RichTextEditor: React.FC<RichTextEditorProps> = ({ value, onChange, placeholder }) => {
    const editorRef = React.useRef<HTMLDivElement>(null);
    const editorWrapperRef = React.useRef<HTMLDivElement>(null);
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const savedRangeRef = React.useRef<Range | null>(null);
    const selectedImgRef = React.useRef<HTMLImageElement | null>(null);
    const floatingBarRef = React.useRef<HTMLDivElement>(null);

    const [currentColor, setCurrentColor] = React.useState('#FFFFFF');
    const [isDraggingImage, setIsDraggingImage] = React.useState(false);
    const [isProcessingImage, setIsProcessingImage] = React.useState(false);
    const [selectedImgOverlay, setSelectedImgOverlay] = React.useState<{
        top: number;
        left: number;
        width: number;
        height: number;
        wrapperWidth: number;
        size: ImageSizePreset;
    } | null>(null);

    const clearImageSelection = React.useCallback(() => {
        selectedImgRef.current = null;
        setSelectedImgOverlay(null);
    }, []);

    const updateSelectedImgOverlay = React.useCallback(() => {
        const img = selectedImgRef.current;
        const wrapper = editorWrapperRef.current;
        const editor = editorRef.current;
        if (!img || !wrapper || !editor || !editor.contains(img)) {
            clearImageSelection();
            return;
        }
        const imgRect = img.getBoundingClientRect();
        const wrapperRect = wrapper.getBoundingClientRect();
        setSelectedImgOverlay({
            top: imgRect.top - wrapperRect.top,
            left: imgRect.left - wrapperRect.left,
            width: imgRect.width,
            height: imgRect.height,
            wrapperWidth: wrapperRect.width,
            size: detectImageSize(img),
        });
    }, [clearImageSelection]);

    React.useEffect(() => {
        if (editorRef.current && editorRef.current.innerHTML !== value) {
            editorRef.current.innerHTML = value;
            clearImageSelection();
        }
    }, [value, clearImageSelection]);

    React.useEffect(() => {
        const handleOutsideMouseDown = (e: MouseEvent) => {
            const target = e.target as Node;
            if (floatingBarRef.current?.contains(target)) {
                return;
            }
            if (!editorWrapperRef.current?.contains(target)) {
                clearImageSelection();
            }
        };

        const handleReposition = () => {
            if (selectedImgRef.current) {
                updateSelectedImgOverlay();
            }
        };

        document.addEventListener('mousedown', handleOutsideMouseDown);
        window.addEventListener('resize', handleReposition);
        window.addEventListener('scroll', handleReposition, true);

        return () => {
            document.removeEventListener('mousedown', handleOutsideMouseDown);
            window.removeEventListener('resize', handleReposition);
            window.removeEventListener('scroll', handleReposition, true);
        };
    }, [clearImageSelection, updateSelectedImgOverlay]);

    const saveSelection = React.useCallback(() => {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0 || !editorRef.current) return;
        const range = selection.getRangeAt(0);
        if (editorRef.current.contains(range.commonAncestorContainer)) {
            savedRangeRef.current = range.cloneRange();
        }
    }, []);

    const handleInput = React.useCallback(() => {
        if (editorRef.current) {
            if (selectedImgRef.current && !editorRef.current.contains(selectedImgRef.current)) {
                clearImageSelection();
            } else if (selectedImgRef.current) {
                requestAnimationFrame(updateSelectedImgOverlay);
            }
            onChange(editorRef.current.innerHTML);
        }
    }, [onChange, clearImageSelection, updateSelectedImgOverlay]);

    const execCommand = (command: string, val?: string) => {
        if (editorRef.current) {
            editorRef.current.focus();
            document.execCommand(command, false, val);
            onChange(editorRef.current.innerHTML);
        }
    };

    const handleSelectColor = (color: string) => {
        setCurrentColor(color);
        execCommand('foreColor', color);
    };

    const insertImagesAtSelection = React.useCallback(
        async (files: File[], dropRange?: Range | null) => {
            const validFiles = files.filter(f => ACCEPTED_IMAGE_TYPES.has(f.type));
            if (validFiles.length === 0) {
                showError('Formato não suportado. Selecione imagens PNG, JPEG, WEBP ou GIF.');
                return;
            }

            setIsProcessingImage(true);
            try {
                const processedDataUrls = await Promise.all(validFiles.map(processImageFile));
                const editor = editorRef.current;
                if (!editor) return;

                editor.focus();
                const selection = window.getSelection();
                let targetRange: Range | null = null;

                if (dropRange && editor.contains(dropRange.commonAncestorContainer)) {
                    targetRange = dropRange;
                } else if (savedRangeRef.current && editor.contains(savedRangeRef.current.commonAncestorContainer)) {
                    targetRange = savedRangeRef.current;
                }

                if (selection && targetRange) {
                    selection.removeAllRanges();
                    selection.addRange(targetRange);
                }

                const activeRange =
                    selection && selection.rangeCount > 0 && editor.contains(selection.getRangeAt(0).commonAncestorContainer)
                        ? selection.getRangeAt(0)
                        : null;

                let lastInsertedNode: Node | null = null;

                processedDataUrls.forEach((dataUrl) => {
                    const img = document.createElement('img');
                    img.src = dataUrl;
                    img.alt = 'Imagem anexada';
                    img.className = 'max-w-full h-auto rounded-lg my-3 object-contain';
                    img.style.width = '100%';
                    img.setAttribute('data-size', 'G');

                    const br = document.createElement('br');

                    if (activeRange) {
                        activeRange.deleteContents();
                        activeRange.insertNode(br);
                        activeRange.insertNode(img);
                        activeRange.setStartAfter(br);
                        activeRange.collapse(true);
                        lastInsertedNode = br;
                    } else {
                        editor.appendChild(img);
                        editor.appendChild(br);
                        lastInsertedNode = br;
                    }
                });

                if (selection && lastInsertedNode) {
                    const newRange = document.createRange();
                    newRange.setStartAfter(lastInsertedNode);
                    newRange.collapse(true);
                    selection.removeAllRanges();
                    selection.addRange(newRange);
                    savedRangeRef.current = newRange.cloneRange();
                }

                clearImageSelection();
                onChange(editor.innerHTML);
            } catch (err) {
                const message = err instanceof Error ? err.message : 'Erro ao inserir imagem.';
                showError(message);
            } finally {
                setIsProcessingImage(false);
            }
        },
        [clearImageSelection, onChange]
    );

    const handleTriggerImageUpload = () => {
        saveSelection();
        fileInputRef.current?.click();
    };

    const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        e.target.value = '';
        if (files.length > 0) {
            await insertImagesAtSelection(files);
        }
    };

    const hasImageDragData = (dataTransfer: DataTransfer | null): boolean => {
        if (!dataTransfer) return false;
        if (dataTransfer.items && dataTransfer.items.length > 0) {
            return Array.from(dataTransfer.items).some(
                item => item.kind === 'file' && item.type.startsWith('image/')
            );
        }
        return Array.from(dataTransfer.files || []).some(file => file.type.startsWith('image/'));
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        if (!hasImageDragData(e.dataTransfer)) return;
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'copy';
        if (!isDraggingImage) {
            setIsDraggingImage(true);
        }
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setIsDraggingImage(false);
        }
    };

    const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
        const droppedFiles = Array.from(e.dataTransfer.files || []).filter(f => f.type.startsWith('image/'));
        if (droppedFiles.length === 0) return;

        e.preventDefault();
        e.stopPropagation();
        setIsDraggingImage(false);

        let dropRange: Range | null = null;
        if (typeof document.caretRangeFromPoint === 'function') {
            dropRange = document.caretRangeFromPoint(e.clientX, e.clientY);
        }

        await insertImagesAtSelection(droppedFiles, dropRange);
    };

    const handleEditorClick = (e: React.MouseEvent<HTMLDivElement>) => {
        saveSelection();
        if (e.target instanceof HTMLImageElement) {
            selectedImgRef.current = e.target;
            updateSelectedImgOverlay();
        } else {
            clearImageSelection();
        }
    };

    const handleResizeSelectedImage = (size: ImageSizePreset) => {
        const img = selectedImgRef.current;
        if (!img || !editorRef.current?.contains(img)) {
            clearImageSelection();
            return;
        }
        img.style.width = SIZE_TO_WIDTH[size];
        img.setAttribute('data-size', size);
        img.classList.add('max-w-full', 'h-auto', 'rounded-lg', 'my-3', 'object-contain');

        onChange(editorRef.current.innerHTML);
        requestAnimationFrame(updateSelectedImgOverlay);
    };

    const handleRemoveSelectedImage = () => {
        const img = selectedImgRef.current;
        if (!img || !editorRef.current?.contains(img)) {
            clearImageSelection();
            return;
        }
        img.remove();
        clearImageSelection();
        onChange(editorRef.current.innerHTML);
        editorRef.current.focus();
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

    const floatingBarTop = selectedImgOverlay
        ? selectedImgOverlay.top > 44
            ? selectedImgOverlay.top - 40
            : selectedImgOverlay.top + 8
        : 0;

    const floatingBarLeft = selectedImgOverlay
        ? Math.min(
              Math.max(selectedImgOverlay.left + selectedImgOverlay.width / 2, 104),
              Math.max(104, selectedImgOverlay.wrapperWidth - 104)
          )
        : 0;

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

                <ToolbarButton onClick={handleTriggerImageUpload} title="Inserir imagem do computador">
                    <ImagePlus size={18} className={isProcessingImage ? 'animate-pulse text-emerald-400' : ''} />
                </ToolbarButton>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png, image/jpeg, image/webp, image/gif"
                    multiple
                    onChange={handleFileInputChange}
                    className="hidden"
                />
                
                <ToolbarButton onClick={() => execCommand('removeFormat')} title="Limpar Formatação">⌫</ToolbarButton>
            </div>

            <div
                ref={editorWrapperRef}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`relative rounded-b-lg transition-colors ${
                    isDraggingImage ? 'ring-2 ring-inset ring-emerald-500 bg-emerald-950/20' : ''
                }`}
            >
                <div
                    ref={editorRef}
                    contentEditable
                    onInput={handleInput}
                    onClick={handleEditorClick}
                    onMouseUp={saveSelection}
                    onKeyUp={() => {
                        saveSelection();
                        if (selectedImgRef.current && !editorRef.current?.contains(selectedImgRef.current)) {
                            clearImageSelection();
                        }
                    }}
                    onBlur={saveSelection}
                    className="p-4 min-h-[200px] outline-none text-gray-200 
                               [&_ul]:list-disc [&_ul]:pl-8 [&_ol]:list-decimal [&_ol]:pl-8 [&_li]:mb-1
                               [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-lg [&_img]:my-3 [&_img]:object-contain [&_img]:cursor-pointer"
                    data-placeholder={placeholder}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            setTimeout(handleInput, 0);
                        }
                    }}
                />

                {selectedImgOverlay && (
                    <>
                        <div
                            className="pointer-events-none absolute border-2 border-emerald-400 rounded-lg transition-all duration-150"
                            style={{
                                top: selectedImgOverlay.top,
                                left: selectedImgOverlay.left,
                                width: selectedImgOverlay.width,
                                height: selectedImgOverlay.height,
                            }}
                        />
                        <div
                            ref={floatingBarRef}
                            onMouseDown={(e) => e.preventDefault()}
                            style={{
                                top: floatingBarTop,
                                left: floatingBarLeft,
                            }}
                            className="absolute -translate-x-1/2 z-20 flex items-center gap-1 bg-gray-800/95 backdrop-blur-sm border border-gray-600 rounded-lg shadow-xl px-1.5 py-1"
                        >
                            {(['P', 'M', 'G'] as ImageSizePreset[]).map((preset) => {
                                const isActive = selectedImgOverlay.size === preset;
                                const labelTitle =
                                    preset === 'P'
                                        ? 'Pequena (35%)'
                                        : preset === 'M'
                                        ? 'Média (65%)'
                                        : 'Grande (100%)';
                                return (
                                    <button
                                        key={preset}
                                        type="button"
                                        onClick={() => handleResizeSelectedImage(preset)}
                                        title={labelTitle}
                                        className={`px-2 py-1 text-xs font-bold rounded transition-colors cursor-pointer ${
                                            isActive
                                                ? 'bg-emerald-500 text-white'
                                                : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                                        }`}
                                    >
                                        {preset}
                                    </button>
                                );
                            })}
                            <div className="w-px h-4 bg-gray-600 mx-0.5" />
                            <button
                                type="button"
                                onClick={handleRemoveSelectedImage}
                                title="Remover imagem"
                                className="p-1.5 rounded text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors cursor-pointer"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    </>
                )}

                {isDraggingImage && (
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-gray-900/70 rounded-b-lg z-20">
                        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-800 border border-emerald-500/60 text-emerald-400 text-sm font-bold shadow-lg">
                            <ImagePlus size={18} />
                            <span>Solte a imagem para inserir na anotação</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RichTextEditor;