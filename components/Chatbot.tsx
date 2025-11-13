import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { ChatIcon, SendIcon, CloseIcon, MagixLogo } from './ui/Icons';

interface Message {
    sender: 'user' | 'bot';
    text: string;
}

const Chatbot: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(scrollToBottom, [messages]);

    useEffect(() => {
        if (isOpen) {
            setMessages([
                { sender: 'bot', text: '¡Hola! Soy el asistente de Magix. ¿Cómo puedo ayudarte a usar la aplicación hoy?' }
            ]);
        }
    }, [isOpen]);

    const handleSendMessage = async () => {
        if (inputValue.trim() === '' || isLoading) return;

        const userMessage: Message = { sender: 'user', text: inputValue };
        setMessages(prev => [...prev, userMessage]);
        setInputValue('');
        setIsLoading(true);

        try {
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: [{ role: 'user', parts: [{ text: inputValue }] }],
                config: {
                    systemInstruction: `Eres un asistente de IA amigable y servicial para la aplicación 'Magix Data Analyzer'. Tu única función es responder preguntas sobre cómo usar la aplicación.
                    
                    Las características de la aplicación sobre las que puedes informar son:
                    - **Importar Datos**: El usuario puede importar archivos Excel (.xlsx, .xls) o CSV (.csv) con registros. Las columnas importantes son Fecha, Salón, Compañía, Ítem, Tipo, Valor y Cantidad.
                    - **Crear/Editar/Eliminar Registros**: Se pueden gestionar registros individualmente desde la tabla de datos.
                    - **Tabla de Datos**: Permite ver, filtrar y ordenar todos los registros.
                    - **Dashboard Inteligente**: Una vista de análisis con KPIs (indicadores clave de rendimiento) y gráficos sobre los ingresos por tiempo, compañía, salón e ítem.
                    - **Exportar Datos**: Se pueden exportar todos los datos a un archivo Excel, o un resumen mensual de ventas.

                    Sé conciso y claro en tus respuestas. No respondas preguntas que no estén relacionadas con el uso de la aplicación 'Magix Data Analyzer'. Si te preguntan algo fuera de tema, responde amablemente que solo puedes ayudar con preguntas sobre la aplicación.`,
                },
            });

            const botMessage: Message = { sender: 'bot', text: response.text };
            setMessages(prev => [...prev, botMessage]);

        } catch (error) {
            console.error('Error al contactar la IA de Gemini:', error);
            const errorMessage: Message = { sender: 'bot', text: 'Lo siento, no pude procesar tu solicitud en este momento. Por favor, inténtalo de nuevo más tarde.' };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleSendMessage();
        }
    };

    return (
        <>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="fixed bottom-6 right-6 bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-transform transform hover:scale-110 z-50"
                aria-label="Abrir asistente de chat"
            >
                {isOpen ? <CloseIcon className="h-6 w-6" /> : <ChatIcon className="h-6 w-6" />}
            </button>
            
            {isOpen && (
                <div className="fixed bottom-24 right-6 w-80 h-[28rem] bg-white rounded-lg shadow-2xl flex flex-col z-50 border border-gray-200">
                    <header className="bg-gray-100 p-3 flex justify-between items-center border-b rounded-t-lg">
                        <div className="flex items-center gap-2">
                             <MagixLogo className="h-6 w-auto"/>
                            <h3 className="font-semibold text-gray-800">Asistente Magix</h3>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-gray-800">
                            <CloseIcon className="h-5 w-5"/>
                        </button>
                    </header>
                    <main className="flex-1 p-4 overflow-y-auto bg-gray-50">
                        <div className="space-y-4">
                            {messages.map((msg, index) => (
                                <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-xs px-3 py-2 rounded-lg ${msg.sender === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'}`}>
                                        <p className="text-sm">{msg.text}</p>
                                    </div>
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex justify-start">
                                    <div className="bg-gray-200 text-gray-800 px-3 py-2 rounded-lg">
                                        <div className="flex items-center space-x-1">
                                            <span className="h-2 w-2 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                            <span className="h-2 w-2 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                            <span className="h-2 w-2 bg-gray-500 rounded-full animate-bounce"></span>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>
                    </main>
                    <footer className="p-3 border-t bg-white">
                        <div className="flex items-center">
                            <input
                                type="text"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder="Escribe tu pregunta..."
                                className="flex-1 p-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                disabled={isLoading}
                            />
                            <button
                                onClick={handleSendMessage}
                                disabled={isLoading}
                                className="bg-blue-600 text-white p-2 rounded-r-md hover:bg-blue-700 disabled:bg-blue-300"
                                aria-label="Enviar mensaje"
                            >
                                <SendIcon className="h-5 w-5"/>
                            </button>
                        </div>
                    </footer>
                </div>
            )}
        </>
    );
};

export default Chatbot;
