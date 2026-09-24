import * as React from 'react';
import { UserIcon } from '../constants';
import { supabase } from '../src/lib/supabase';
import { showSuccess, showError } from '../src/utils/toast';

interface LoginPageProps {
    onLoginSuccess: () => void;
    onNavigateToRegister: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess, onNavigateToRegister }) => {
    const [email, setEmail] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [rememberMe, setRememberMe] = React.useState(true); // Novo estado para "Lembrar acesso"
    const [isLoading, setIsLoading] = React.useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        // O método signInWithPassword do Supabase já persiste a sessão por padrão.
        // A opção 'persistSession' é configurada na criação do cliente Supabase, não por chamada de login.
        // Por enquanto, a caixa de seleção serve como confirmação visual para o usuário.
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        setIsLoading(false);

        if (error) {
            showError('Erro ao fazer login: ' + error.message);
        } else {
            onLoginSuccess();
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-900 p-4">
            <div className="bg-gray-800 rounded-xl shadow-2xl p-8 w-full max-w-md text-white">
                <div className="flex flex-col items-center mb-8">
                    <UserIcon className="w-16 h-16 text-emerald-400 mb-4" />
                    <h2 className="text-3xl font-bold text-white">StudyDay</h2>
                    <p className="text-gray-400 mt-2">Faça login para continuar.</p>
                </div>
                <form onSubmit={handleSubmit} className="space-y-6">
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
                            placeholder="Sua senha"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-gray-700 border border-gray-600 text-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-gray-500"
                            required
                            disabled={isLoading}
                        />
                    </div>
                    <div className="flex items-center justify-between">
                        <label htmlFor="remember-me" className="flex items-center space-x-2 cursor-pointer">
                            <input
                                type="checkbox"
                                id="remember-me"
                                checked={rememberMe}
                                onChange={(e) => setRememberMe(e.target.checked)}
                                className="form-checkbox h-4 w-4 text-emerald-500 rounded border-gray-600 bg-gray-700 focus:ring-emerald-500"
                                disabled={isLoading}
                            />
                            <span className="text-gray-300 text-sm">Lembrar acesso</span>
                        </label>
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
                        ) : 'Entrar'}
                    </button>
                </form>
                <p className="text-center text-gray-400 mt-6">
                    Não tem uma conta?{' '}
                    <button
                        onClick={onNavigateToRegister}
                        className="font-bold text-emerald-400 hover:text-emerald-300 transition-colors"
                        disabled={isLoading}
                    >
                        Cadastre-se
                    </button>
                </p>
            </div>
        </div>
    );
};

export default LoginPage;