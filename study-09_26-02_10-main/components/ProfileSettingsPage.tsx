"use client";

import * as React from 'react';
import { UserIcon, SettingsIcon, CheckIcon, ClockIcon } from '../constants';
import { showSuccess, showError } from '../src/utils/toast';
import { supabase } from '../src/lib/supabase';

interface ProfileSettingsPageProps {
    user: any;
    onUpdateProfile: (name: string) => Promise<void>;
}

const ProfileSettingsPage: React.FC<ProfileSettingsPageProps> = ({ user, onUpdateProfile }) => {
    const [name, setName] = React.useState(user?.user_metadata?.full_name || '');
    const [isUpdatingProfile, setIsUpdatingProfile] = React.useState(false);

    const [currentPassword, setCurrentPassword] = React.useState('');
    const [newPassword, setNewPassword] = React.useState('');
    const [confirmPassword, setConfirmPassword] = React.useState('');
    const [isUpdatingPassword, setIsUpdatingPassword] = React.useState(false);

    const handleProfileSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            showError("O nome não pode estar vazio.");
            return;
        }
        setIsUpdatingProfile(true);
        try {
            await onUpdateProfile(name);
        } finally {
            setIsUpdatingProfile(false);
        }
    };

    const handlePasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            showError("As novas senhas não coincidem.");
            return;
        }
        if (newPassword.length < 6) {
            showError("A nova senha deve ter pelo menos 6 caracteres.");
            return;
        }

        setIsUpdatingPassword(true);
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        setIsUpdatingPassword(false);

        if (error) {
            showError("Erro ao atualizar senha: " + error.message);
        } else {
            showSuccess("Senha atualizada com sucesso!");
            setNewPassword('');
            setConfirmPassword('');
            setCurrentPassword('');
        }
    };

    return (
        <div className="space-y-8 max-w-4xl mx-auto">
            <header>
                <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                    <SettingsIcon className="w-8 h-8 text-emerald-400" />
                    Configurações de Perfil
                </h1>
                <p className="text-gray-400 mt-1">Gerencie suas informações pessoais e segurança da conta.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Dados Pessoais */}
                <section className="bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-700">
                    <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                        <UserIcon className="w-5 h-5 text-emerald-400" />
                        Dados Pessoais
                    </h2>
                    
                    <form onSubmit={handleProfileSubmit} className="space-y-6">
                        <div>
                            <label className="block text-xs font-black text-emerald-400 uppercase tracking-widest mb-2">E-mail (Somente Leitura)</label>
                            <input 
                                type="email" 
                                value={user?.email || ''} 
                                disabled 
                                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-gray-500 cursor-not-allowed"
                            />
                        </div>
                        
                        <div>
                            <label htmlFor="profile-name" className="block text-xs font-black text-emerald-400 uppercase tracking-widest mb-2">Nome de Usuário</label>
                            <input 
                                id="profile-name"
                                type="text" 
                                value={name} 
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Seu nome completo"
                                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                                required
                            />
                        </div>

                        <button 
                            type="submit"
                            disabled={isUpdatingProfile}
                            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black py-3 rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {isUpdatingProfile ? (
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                                <>
                                    <CheckIcon className="w-5 h-5" />
                                    SALVAR ALTERAÇÕES
                                </>
                            )}
                        </button>
                    </form>
                </section>

                {/* Segurança */}
                <section className="bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-700">
                    <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                        <ClockIcon className="w-5 h-5 text-blue-400" />
                        Segurança
                    </h2>
                    
                    <form onSubmit={handlePasswordSubmit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-black text-blue-400 uppercase tracking-widest mb-2">Nova Senha</label>
                            <input 
                                type="password" 
                                value={newPassword} 
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Mínimo 6 caracteres"
                                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                required
                            />
                        </div>
                        
                        <div>
                            <label className="block text-xs font-black text-blue-400 uppercase tracking-widest mb-2">Confirmar Nova Senha</label>
                            <input 
                                type="password" 
                                value={confirmPassword} 
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Repita a nova senha"
                                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                required
                            />
                        </div>

                        <div className="pt-2">
                            <button 
                                type="submit"
                                disabled={isUpdatingPassword}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-3 rounded-xl transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {isUpdatingPassword ? (
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                    <>
                                        <SettingsIcon className="w-5 h-5" />
                                        ATUALIZAR SENHA
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                    <p className="text-[10px] text-gray-500 mt-4 italic text-center">
                        Ao atualizar a senha, você permanecerá conectado nesta sessão.
                    </p>
                </section>
            </div>
        </div>
    );
};

export default ProfileSettingsPage;