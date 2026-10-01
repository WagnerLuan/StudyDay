"use client";

import * as React from 'react';
import { UserIcon, SettingsIcon, CheckIcon, ClockIcon } from '../constants';
import { showSuccess, showError } from '../src/utils/toast';
import { supabase } from '../src/lib/supabase';
import { UserStudyStreak } from '../types';
import { sincronizarOfensivaUsuario } from '../src/utils/streakUtils';

interface ProfileSettingsPageProps {
    user: any;
    onUpdateProfile: (name: string) => Promise<void>;
    userStreak?: UserStudyStreak;
    onUpdateStreak?: (updatedStreak: Partial<UserStudyStreak>) => Promise<void>;
}

const ProfileSettingsPage: React.FC<ProfileSettingsPageProps> = ({ user, onUpdateProfile, userStreak, onUpdateStreak }) => {
    const [name, setName] = React.useState(user?.user_metadata?.full_name || '');
    const [isUpdatingProfile, setIsUpdatingProfile] = React.useState(false);

    const [currentPassword, setCurrentPassword] = React.useState('');
    const [newPassword, setNewPassword] = React.useState('');
    const [confirmPassword, setConfirmPassword] = React.useState('');
    const [isUpdatingPassword, setIsUpdatingPassword] = React.useState(false);

    // Métricas de estudo (Streaks e Recordes)
    const [sequenciaAtual, setSequenciaAtual] = React.useState<number>(userStreak?.sequencia_dias_atual ?? 0);
    const [sequenciaRecorde, setSequenciaRecorde] = React.useState<number>(userStreak?.sequencia_dias_recorde ?? 0);
    const [questoesRecorde, setQuestoesRecorde] = React.useState<number>(userStreak?.questoes_recorde_diario ?? 0);
    const [questoesHoje, setQuestoesHoje] = React.useState<number>(userStreak?.questoes_hoje ?? 0);
    const [isUpdatingMetrics, setIsUpdatingMetrics] = React.useState(false);

    React.useEffect(() => {
        if (userStreak) {
            setSequenciaAtual(userStreak.sequencia_dias_atual ?? 0);
            setSequenciaRecorde(userStreak.sequencia_dias_recorde ?? 0);
            setQuestoesRecorde(userStreak.questoes_recorde_diario ?? 0);
            setQuestoesHoje(userStreak.questoes_hoje ?? 0);
        }
    }, [userStreak]);

    const handleMetricsSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsUpdatingMetrics(true);
        const updates: Partial<UserStudyStreak> = {
            sequencia_dias_atual: Math.max(0, Number(sequenciaAtual) || 0),
            sequencia_dias_recorde: Math.max(0, Number(sequenciaRecorde) || 0),
            questoes_recorde_diario: Math.max(0, Number(questoesRecorde) || 0),
            questoes_hoje: Math.max(0, Number(questoesHoje) || 0),
        };

        try {
            if (onUpdateStreak) {
                await onUpdateStreak(updates);
            } else if (user?.id) {
                const { error } = await supabase
                    .from('profiles')
                    .update(updates)
                    .eq('id', user.id);
                if (error) throw error;
                showSuccess("Métricas de estudo atualizadas com sucesso!");
            }
        } catch (err: any) {
            showError("Erro ao salvar métricas: " + err.message);
        } finally {
            setIsUpdatingMetrics(false);
        }
    };

    const handleRecalculateMetrics = async () => {
        if (!user?.id) return;
        setIsUpdatingMetrics(true);
        try {
            const synced = await sincronizarOfensivaUsuario(user.id);
            setSequenciaAtual(synced.sequencia_dias_atual);
            setSequenciaRecorde(synced.sequencia_dias_recorde);
            setQuestoesRecorde(synced.questoes_recorde_diario);
            setQuestoesHoje(synced.questoes_hoje);
            showSuccess("Métricas recalculadas a partir dos registros reais do banco!");
        } catch (err: any) {
            showError("Erro ao sincronizar métricas: " + err.message);
        } finally {
            setIsUpdatingMetrics(false);
        }
    };

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

                {/* Ajuste de Métricas de Estudo */}
                <section className="bg-gray-800 rounded-2xl shadow-xl p-6 border border-amber-500/30 md:col-span-2 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
                    
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
                        <div>
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <span className="text-xl">🔥</span>
                                Ajuste de Métricas de Estudo
                            </h2>
                            <p className="text-xs text-gray-400 mt-1">
                                Consulte e ajuste manualmente suas ofensivas de estudos e recordes históricos.
                            </p>
                        </div>
                        <span className="text-xs px-2.5 py-1 rounded-md font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 self-start sm:self-auto">
                            Ofensiva & Recordes
                        </span>
                    </div>

                    <form onSubmit={handleMetricsSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                            {/* Sequência Atual de Dias */}
                            <div>
                                <label className="block text-xs font-black text-amber-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                    <span>🔥</span> Sequência Atual (Dias)
                                </label>
                                <input 
                                    type="number" 
                                    min="0"
                                    step="1"
                                    value={sequenciaAtual} 
                                    onChange={(e) => setSequenciaAtual(Math.max(0, parseInt(e.target.value, 10) || 0))}
                                    placeholder="Ex: 5"
                                    className="w-full bg-gray-900 border border-gray-700 focus:border-amber-500 rounded-xl px-4 py-3 text-white text-lg font-bold focus:ring-2 focus:ring-amber-500 outline-none transition-all"
                                    required
                                />
                                <span className="text-[11px] text-gray-500 mt-1 block">
                                    Dias consecutivos atuais
                                </span>
                            </div>

                            {/* Recorde de Dias Estudados */}
                            <div>
                                <label className="block text-xs font-black text-orange-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                    <span>🏆</span> Recorde de Dias Estudados
                                </label>
                                <input 
                                    type="number" 
                                    min="0"
                                    step="1"
                                    value={sequenciaRecorde} 
                                    onChange={(e) => setSequenciaRecorde(Math.max(0, parseInt(e.target.value, 10) || 0))}
                                    placeholder="Ex: 15"
                                    className="w-full bg-gray-900 border border-gray-700 focus:border-orange-500 rounded-xl px-4 py-3 text-white text-lg font-bold focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                                    required
                                />
                                <span className="text-[11px] text-gray-500 mt-1 block">
                                    Maior sequência já alcançada
                                </span>
                            </div>

                            {/* Recorde Diário de Questões */}
                            <div>
                                <label className="block text-xs font-black text-cyan-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                    <span>⚡</span> Recorde Diário de Questões
                                </label>
                                <input 
                                    type="number" 
                                    min="0"
                                    step="1"
                                    value={questoesRecorde} 
                                    onChange={(e) => setQuestoesRecorde(Math.max(0, parseInt(e.target.value, 10) || 0))}
                                    placeholder="Ex: 50"
                                    className="w-full bg-gray-900 border border-gray-700 focus:border-cyan-500 rounded-xl px-4 py-3 text-white text-lg font-bold focus:ring-2 focus:ring-cyan-500 outline-none transition-all"
                                    required
                                />
                                <span className="text-[11px] text-gray-500 mt-1 block">
                                    Máximo de questões num único dia
                                </span>
                            </div>
                        </div>

                        <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-2">
                            <button 
                                type="button"
                                onClick={handleRecalculateMetrics}
                                disabled={isUpdatingMetrics}
                                className="w-full sm:w-auto px-6 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded-xl transition-all border border-gray-600 flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
                                title="Recalcular métricas a partir dos registros de estudo reais do Supabase"
                            >
                                <span>🔄</span>
                                RECALCULAR DO HISTÓRICO
                            </button>
                            <button 
                                type="submit"
                                disabled={isUpdatingMetrics}
                                className="w-full sm:w-auto px-8 bg-amber-500 hover:bg-amber-600 text-white font-black py-3 rounded-xl transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {isUpdatingMetrics ? (
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                    <>
                                        <CheckIcon className="w-5 h-5" />
                                        SALVAR MÉTRICAS
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </section>
            </div>

        </div>
    );
};

export default ProfileSettingsPage;