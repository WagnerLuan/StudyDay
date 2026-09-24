import * as React from 'react';
import { UserIcon } from '../constants';
import { supabase } from '../src/lib/supabase';
import { showSuccess, showError } from '../src/utils/toast';

interface RegisterPageProps {
    onRegisterSuccess: () => void;
    onNavigateToLogin: () => void;
}

const RegisterPage: React.FC<RegisterPageProps> = ({ onRegisterSuccess, onNavigateToLogin }) => {
    const [name, setName] = React.useState('');
    const [email, setEmail] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [confirmPassword, setConfirmPassword] = React.useState('');
    const [isLoading, setIsLoading] = React.useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            showError('As senhas não coincidem!');
            return;
        }
        setIsLoading(true);
        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: name, // Salvar o nome completo no perfil do usuário
                },
            },
        });
        setIsLoading(false);

        if (error) {
            showError('Erro ao cadastrar: ' + error.message);
        } else {
            onRegisterSuccess();
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-900 p-4">
            <div className="bg-gray-800 rounded-xl shadow-2xl p-8 w-full max-w-md text-white">
                <div className="flex flex-col items-center mb-8">
                    <UserIcon className="w-16 h-16 text-emerald-400 mb-4" />
                    <h2 className="text-3xl font-bold text-white">Crie sua conta</h2>
                    <p className="text-gray-400 mt-2">Junte-se à comunidade StudyDay!</p>
                </div>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="name" className="block text-sm font-bold text-emerald-400 uppercase tracking-wide mb-2">
                            Nome
                        </label>
                        <input
                            type="text"
                            id="name"
                            placeholder="Seu nome completo"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full bg-gray-700 border border-gray-600 text-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-gray-500"
                            required
                            disabled={isLoading}
                        />
                    </div>
                    <div>
                        <label htmlFor="email" className="block text-sm font-bold text-emerald-400 uppercase tracking-wide mb-2">
                            Email
                        </label>
                        <input
                            type="email"
                            id="email"
                            placeholder="seu@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-gray-700 border border-gray-600 text-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-gray-500"
                            required
                            disabled={isLoading}
                        />
                    </div>
                    <div>
                        <label htmlFor="password" className="block text-sm font-bold text-emerald-400 uppercase tracking-wide mb-2">
                            Senha
                        </label>
                        <input
                            type="password"
                            id="password"
                            placeholder="Crie uma senha"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-gray-700 border border-gray-600 text-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-gray-500"
                            required
                            disabled={isLoading}
                        />
                    </div>
                    <div>
                        <label htmlFor="confirmPassword" className="block text-sm font-bold text-emerald-400 uppercase tracking-wide mb-2">
                            Confirmar Senha
                        </label>
                        <input
                            type="password"
                            id="confirmPassword"
                            placeholder="Confirme sua senha"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full bg-gray-700 border border-gray-600 text-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-gray-500"
                            required
                            disabled={isLoading}
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 px-6 rounded-lg transition-colors text-lg shadow-lg hover:shadow-emerald-500/50 flex items-center justify-center"
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        ) : 'Cadastrar'}
                    </button>
                </form>
                <p className="text-center text-gray-400 mt-6">
                    Já tem uma conta?{' '}
                    <button
                        onClick={onNavigateToLogin}
                        className="font-bold text-emerald-400 hover:text-emerald-300 transition-colors"
                        disabled={isLoading}
                    >
                        Faça login
                    </button>
                </p>
            </div>
        </div>
    );
};

export default RegisterPage;