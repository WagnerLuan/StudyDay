"use client";

import * as React from 'react';
import Card from './Card';

interface GreetingCardProps {
    userName: string;
}

const quotes = [
    "Para aqueles que não acreditam em si mesmos, o trabalho duro é inútil! — Maito Gai",
    "O sucesso é a soma de pequenos esforços repetidos dia após dia.",
    "Não pare quando estiver cansado, pare quando tiver terminado.",
    "A disciplina é a ponte entre metas e realizações.",
    "O único lugar onde o sucesso vem antes do trabalho é no dicionário.",
    "A persistência é o caminho do êxito.",
    "Grandes batalhas só são dadas a grandes guerreiros."
];

const GreetingCard: React.FC<GreetingCardProps> = ({ userName }) => {
    const [quote, setQuote] = React.useState('');

    React.useEffect(() => {
        const randomIndex = Math.floor(Math.random() * quotes.length);
        setQuote(quotes[randomIndex]);
    }, []);

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return { text: 'Bom dia', emoji: '☀️' };
        if (hour < 18) return { text: 'Boa tarde', emoji: '🌤️' };
        return { text: 'Boa noite', emoji: '🌙' };
    };

    const greeting = getGreeting();

    return (
        <Card className="h-full flex flex-col justify-center border-l-4 border-emerald-500">
            <h2 className="text-2xl font-bold text-white">
                {greeting.text}, <span className="text-emerald-400">{userName}</span> {greeting.emoji}
            </h2>
            <p className="text-gray-400 mt-3 italic text-sm leading-relaxed">
                "{quote}"
            </p>
        </Card>
    );
};

export default GreetingCard;