
import * as React from 'react';
import { CameraIcon, CheckIcon } from '../constants';
import { StudyPlan } from '../types';

interface CreatePlanModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (plan: Partial<StudyPlan>) => void;
    planToEdit: StudyPlan | null;
}

const InputField = ({ label, placeholder, optional = false, id, value, onChange }: { label: string; placeholder: string; optional?: boolean; id: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; }) => (
    <div>
        <label htmlFor={id} className="block text-xs font-bold text-emerald-400 uppercase tracking-wide mb-2">
            {label} {optional && <span className="text-gray-400 font-normal normal-case">(Opcional)</span>}
        </label>
        <input
            type="text"
            id={id}
            placeholder={placeholder}
            value={value}
            onChange={onChange}
            className="w-full bg-gray-700 border border-gray-600 text-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-gray-500"
        />
    </div>
);

const TextAreaField = ({ label, placeholder, optional = false, id, value, onChange }: { label: string; placeholder: string; optional?: boolean; id: string; value: string; onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void; }) => (
    <div>
        <label htmlFor={id} className="block text-xs font-bold text-emerald-400 uppercase tracking-wide mb-2">
            {label} {optional && <span className="text-gray-400 font-normal normal-case">(Opcional)</span>}
        </label>
        <textarea
            id={id}
            placeholder={placeholder}
            rows={4}
            value={value}
            onChange={onChange}
            className="w-full bg-gray-700 border border-gray-600 text-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-gray-500 resize-none"
        ></textarea>
    </div>
);

const CreatePlanModal: React.FC<CreatePlanModalProps> = ({ isOpen, onClose, onSave, planToEdit }) => {
    const [name, setName] = React.useState('');
    const [cargo, setCargo] = React.useState('');
    const [edital, setEdital] = React.useState('');
    const [banca, setBanca] = React.useState('');
    const [observacoes, setObservacoes] = React.useState('');
    const [imagePreview, setImagePreview] = React.useState<string | null>(null);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    React.useEffect(() => {
        if (isOpen && planToEdit) {
            setName(planToEdit.name);
            setCargo(planToEdit.cargo || '');
            setEdital(planToEdit.edital || '');
            setBanca(planToEdit.banca || '');
            setObservacoes(planToEdit.observacoes || '');
            setImagePreview(planToEdit.image || null);
        } else {
            // Reset form when modal opens for creation or closes
            setName('');
            setCargo('');
            setEdital('');
            setBanca('');
            setObservacoes('');
            setImagePreview(null);
        }
    }, [isOpen, planToEdit]);

    if (!isOpen) return null;

    const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleImageUploadClick = () => {
        fileInputRef.current?.click();
    };
    
    const handleSave = () => {
        if (!name.trim()) {
            alert('O nome do plano é obrigatório.');
            return;
        }

        const formData: Partial<StudyPlan> = {
            id: planToEdit ? planToEdit.id : undefined, // Correctly pass the ID for updates
            name,
            cargo,
            edital,
            banca,
            observacoes,
            image: imagePreview,
        };
        
        onSave(formData);
        onClose();
    };


    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4"
            onClick={onClose}
        >
            <div 
                className="bg-gray-800 rounded-xl shadow-2xl p-8 w-full max-w-4xl text-white transform transition-all"
                onClick={(e) => e.stopPropagation()}
            >
                <h2 className="text-3xl font-bold text-center mb-8">{planToEdit ? 'Editar Plano' : 'Seu Plano'}</h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="flex flex-col items-center justify-center text-center md:col-span-1">
                         <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleImageChange}
                            className="hidden"
                            accept="image/*"
                         />
                         <div 
                            className="w-40 h-40 bg-gray-700 rounded-lg flex items-center justify-center mb-4 overflow-hidden relative group cursor-pointer"
                            onClick={handleImageUploadClick}
                         >
                            {imagePreview ? (
                                <>
                                    <img src={imagePreview} alt="Pré-visualização do plano" className="w-full h-full object-cover" />
                                     <div className="absolute inset-0 bg-green-500 bg-opacity-70 flex items-center justify-center opacity-100 group-hover:opacity-0 transition-opacity duration-300">
                                        <CheckIcon className="w-16 h-16 text-white"/>
                                    </div>
                                </>
                            ) : (
                                <CameraIcon />
                            )}
                         </div>
                         <button 
                            type="button"
                            onClick={handleImageUploadClick}
                            className="text-emerald-400 hover:text-emerald-500 text-sm font-semibold"
                          >
                             {imagePreview ? 'Alterar Imagem' : 'Selecionar Imagem'}
                         </button>
                    </div>

                    <div className="space-y-6 md:col-span-2">
                        <InputField id="nome" label="Nome" placeholder="Meu Plano" value={name} onChange={(e) => setName(e.target.value)} />
                        <InputField id="cargo" label="Cargo" placeholder="Ex: Analista Judiciário" optional value={cargo} onChange={(e) => setCargo(e.target.value)} />
                        <InputField id="edital" label="Edital" placeholder="Ex: Edital 2024" optional value={edital} onChange={(e) => setEdital(e.target.value)} />
                        <InputField id="banca" label="Banca" placeholder="Ex: FGV, Cebraspe" optional value={banca} onChange={(e) => setBanca(e.target.value)} />
                        <TextAreaField id="observacoes" label="Observações" placeholder="Aqui você pode escrever alguma observação sobre o seu plano" optional value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
                    </div>
                </div>

                <div className="flex justify-end items-center gap-4 mt-10">
                    <button 
                        onClick={onClose}
                        className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-6 rounded-lg transition-colors"
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={handleSave}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2 px-6 rounded-lg transition-colors"
                    >
                        Avançar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CreatePlanModal;
