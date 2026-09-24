import * as React from 'react';

interface DeleteConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    itemType?: 'plano' | 'disciplina' | 'registro' | 'ciclo';
}

const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({ isOpen, onClose, onConfirm, itemType = 'plano' }) => {
    // Removendo o estado de password e error, e a lógica de validação de senha.
    // const [password, setPassword] = React.useState('');
    // const [error, setError] = React.useState('');
    // const correctPassword = '123';

    React.useEffect(() => {
        // Reset state when modal opens
        if (isOpen) {
            // setPassword('');
            // setError('');
        }
    }, [isOpen]);
    
    if (!isOpen) return null;

    const handleConfirmClick = () => {
        // Ação de confirmação agora é direta, sem validação de senha.
        onConfirm();
    };
    
    const itemTypeName = {
        'plano': 'este plano',
        'disciplina': 'esta disciplina',
        'registro': 'este registro',
        'ciclo': 'este ciclo de estudos'
    }[itemType];

    const buttonText = {
        'plano': 'Plano',
        'disciplina': 'Disciplina',
        'registro': 'Registro',
        'ciclo': 'Ciclo'
    }[itemType];

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4"
            onClick={onClose}
        >
            <div 
                className="bg-gray-800 rounded-xl shadow-2xl p-8 w-full max-w-md text-white"
                onClick={(e) => e.stopPropagation()}
            >
                <h3 className="text-2xl font-bold text-center mb-4">Confirmar Exclusão</h3>
                <p className="text-gray-400 text-center mb-6">
                    Você tem certeza que deseja excluir {itemTypeName}? Esta ação não pode ser desfeita.
                </p>
                {/* Removendo o campo de senha */}
                {/* <div className="space-y-4">
                     <label htmlFor="delete-password" className="block text-sm font-medium text-gray-300">
                        Para confirmar, digite a senha <span className="font-bold text-emerald-400">123</span> abaixo:
                    </label>
                    <input 
                        type="password"
                        id="delete-password"
                        value={password}
                        onChange={(e) => {
                            setPassword(e.target.value);
                            if (error) setError(''); // Clear error on type
                        }}
                        placeholder="Senha de confirmação"
                        className="w-full bg-gray-700 border border-gray-600 text-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-gray-500"
                    />
                    {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
                </div> */}

                <div className="flex justify-end items-center gap-4 mt-8">
                    <button 
                        onClick={onClose}
                        className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-6 rounded-lg transition-colors"
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={handleConfirmClick}
                        className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-lg transition-colors"
                        // O botão não estará mais desabilitado pela senha
                    >
                        Excluir {buttonText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DeleteConfirmationModal;