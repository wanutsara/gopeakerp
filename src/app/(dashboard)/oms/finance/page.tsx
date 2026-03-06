'use client';
import { useState } from 'react';
import { SparklesIcon, ChartBarSquareIcon, ArrowPathIcon, CurrencyDollarIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline';
import ReactMarkdown from 'react-markdown';
import { toast } from 'react-hot-toast';

export default function OMSFinanceCopilotPage() {
    const [prompt, setPrompt] = useState('');
    const [chatHistory, setChatHistory] = useState<{ role: 'USER' | 'AI', content: string }[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const presetPrompts = [
        "สรุปกำไรขั้นต้น (Gross Margin) ของเดือนนี้ให้หน่อย ระบบดึงต้นทุน FIFO แบบเป๊ะๆ มาคำนวณหรือยัง?",
        "วิเคราะห์ 'Zombie SKU' ให้หน่อย (สินค้าที่ทุนจม ขายไม่ออกเลย 30 วันที่ผ่านมา) ควรทำอย่างไรดี?",
        "ถ้าตั้ง Clearance ลดราคาสินค้าที่ใกล้หมดอายุ (FEFO) เพื่อเอาทุนคืน ควรลดกี่เปอร์เซ็นต์ถึงจะเหมาะสม?"
    ];

    const handleSendPrompt = async (forcedPrompt?: string) => {
        const textToProcess = forcedPrompt || prompt;
        if (!textToProcess.trim()) return;

        setChatHistory(prev => [...prev, { role: 'USER', content: textToProcess }]);
        setPrompt('');
        setIsLoading(true);

        try {
            const res = await fetch('/api/oms/finance/copilot', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: textToProcess })
            });

            const data = await res.json();

            if (res.ok) {
                setChatHistory(prev => [...prev, { role: 'AI', content: data.response }]);
            } else {
                toast.error(data.error || 'AI Copilot Error');
                setChatHistory(prev => [...prev, { role: 'AI', content: "🚨 Data Sync Error: I could not retrieve the exact P&L matrices. Please try again." }]);
            }
        } catch (e) {
            toast.error('Network Error');
            setChatHistory(prev => [...prev, { role: 'AI', content: "⚠️ Connection Lost to the Gemini Intelligence Module." }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 min-h-screen pb-32">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-gradient-to-br from-indigo-900 via-purple-900 to-black p-8 rounded-3xl shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 opacity-10 blur-3xl rounded-full bg-indigo-500 w-96 h-96 mix-blend-screen translate-x-1/2 -translate-y-1/2 animate-pulse"></div>
                <div className="absolute bottom-0 left-0 opacity-10 blur-3xl rounded-full bg-pink-500 w-72 h-72 mix-blend-screen -translate-x-1/2 translate-y-1/2"></div>

                <div className="relative z-10">
                    <h1 className="text-3xl font-black text-white flex items-center gap-3 tracking-tight">
                        <SparklesIcon className="w-8 h-8 text-yellow-400" />
                        AI Financial Copilot
                    </h1>
                    <p className="text-sm font-medium text-indigo-200 mt-2 max-w-xl leading-relaxed">
                        Interact with your personal Real-time CFO. The AI inherently computes 30-Day performance directly against strict FIFO batch structures preventing any margin bleeding. Ask anything about Profitability, Dead-Stock Expiration, or Cash-flow strategy.
                    </p>
                </div>

                <div className="relative z-10 mt-6 md:mt-0 flex gap-4">
                    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 flex items-center gap-4">
                        <div className="bg-emerald-500/20 p-2 rounded-xl text-emerald-400"><CurrencyDollarIcon className="w-6 h-6" /></div>
                        <div>
                            <div className="text-xs uppercase tracking-widest font-black text-white/50">COGS ENGINE</div>
                            <div className="font-bold text-white text-sm">STRICT FIFO LOCk</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-4 hide-scrollbar">
                {presetPrompts.map((p, i) => (
                    <button
                        key={i}
                        onClick={() => handleSendPrompt(p)}
                        className="flex-shrink-0 bg-white border border-indigo-100 shadow-sm text-indigo-700 text-sm font-medium hover:bg-indigo-50 px-5 py-3 rounded-full transition whitespace-nowrap"
                    >
                        {p}
                    </button>
                ))}
            </div>

            <div className="space-y-4">
                {chatHistory.length === 0 && (
                    <div className="text-center py-20 px-6 border-2 border-dashed border-gray-200 rounded-3xl bg-gray-50/50">
                        <ChartBarSquareIcon className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                        <h3 className="text-gray-900 font-bold text-lg mb-1">Awaiting Executive Guidance</h3>
                        <p className="text-gray-500 text-sm max-w-md mx-auto">Ask the Copilot to extract hidden patterns from your procurement algorithms, forecast demand, or suggest clearance pricing for FEFO batches.</p>
                    </div>
                )}

                {chatHistory.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'USER' ? 'justify-end' : 'justify-start'} animate-fade-in-up`}>
                        <div className={`max-w-[90%] md:max-w-[75%] rounded-3xl p-5 ${msg.role === 'USER' ? 'bg-indigo-600 text-white rounded-br-sm shadow-md' : 'bg-white border text-gray-800 border-gray-100 rounded-bl-sm shadow-lg'}`}>
                            {msg.role === 'USER' ? (
                                <p className="text-sm font-medium leading-relaxed">{msg.content}</p>
                            ) : (
                                <div className="prose prose-sm md:prose-base prose-indigo max-w-none text-gray-700 font-medium leading-loose">
                                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                {isLoading && (
                    <div className="flex justify-start px-2 mt-4 animate-pulse">
                        <div className="flex bg-white shadow-md border border-gray-100 rounded-full px-6 py-4 items-center gap-3">
                            <ArrowPathIcon className="w-5 h-5 text-indigo-500 animate-spin" />
                            <span className="text-sm font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-purple-500">
                                Consulting Prisma Matrix & Extracting CFO Summaries...
                            </span>
                        </div>
                    </div>
                )}
            </div>

            <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-gray-200 p-4 md:p-6 z-50">
                <div className="max-w-4xl mx-auto flex items-end gap-3">
                    <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendPrompt(); } }}
                        placeholder="Ask the CFO Copilot to run algorithmic pricing on expiring batches..."
                        className="flex-1 w-full border border-gray-200 rounded-3xl px-6 py-4 text-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none resize-none shadow-sm transition h-14 bg-gray-50/50"
                        rows={1}
                        disabled={isLoading}
                    />
                    <button
                        onClick={() => handleSendPrompt()}
                        disabled={isLoading || !prompt.trim()}
                        className="bg-gray-900 disabled:opacity-50 hover:bg-black text-white p-4 rounded-full shadow-lg transition transform hover:scale-105 active:scale-95"
                    >
                        <PaperAirplaneIcon className="w-6 h-6" />
                    </button>
                </div>
            </div>
        </div>
    );
}
