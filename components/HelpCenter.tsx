import React, { useState, useMemo } from 'react';
import { 
    Search, ChevronDown, ChevronUp, Tag, Image, LayoutTemplate, 
    Clock, Users, HelpCircle, MessageCircle, Sparkles, Loader2
} from 'lucide-react';

interface FAQItem {
    id: string;
    category: string;
    question: string;
    answer: React.ReactNode;
    screenshotUrl?: string;
}

const FAQ_DATA: FAQItem[] = [
    // General
    {
        id: 'gen-1',
        category: 'General',
        question: "What is the Marketing Portal?",
        answer: "The Marketing Portal is a comprehensive AI-powered platform designed to streamline the creation of marketing assets. It allows you to generate images, resize banners, and manage brand templates in one place.",
        screenshotUrl: "/help_screenshots/dashboard.png"
    },
    {
        id: 'gen-2',
        category: 'General',
        question: "How do I navigate between different tools?",
        answer: "Use the sidebar navigation menu on the left. You can switch between the Dashboard, Image Generator, Image Resizer, and other tools. You can also collapse the sidebar for more screen space.",
        screenshotUrl: "/help_screenshots/dashboard.png"
    },
    
    // Image Generator
    {
        id: 'ig-1',
        category: 'Image Generator',
        question: "How do I generate a new marketing image?",
        answer: "Navigate to the 'Image Generator' page. Select your target audience (e.g., 'Families', 'Young Adults') and campaign type. Enter a descriptive prompt of what you want to see, and optionally upload a product image to feature. Click 'Generate' to create your assets.",
        screenshotUrl: "/help_screenshots/image_generator.png"
    },
    {
        id: 'ig-2',
        category: 'Image Generator',
        question: "Can I use my own product images?",
        answer: "Yes! In the Image Generator, use the 'Upload Product' section to include your own product images. The AI will seamlessly integrate them into the generated scene.",
        screenshotUrl: "/help_screenshots/image_generator.png"
    },

    // Image Resizer
    {
        id: 'ir-1',
        category: 'Image Resizer',
        question: "How can I resize a banner for multiple platforms?",
        answer: "Go to the 'Image Resizer' tool. Upload your source image (high resolution recommended). Select all the target sizes you need (e.g., 'Instagram Story', 'Web Hero'). The system will automatically resize and extend the background where necessary to fit each format.",
        screenshotUrl: "/help_screenshots/image_resizer.png"
    },
    {
        id: 'ir-2',
        category: 'Image Resizer',
        question: "What happens if the image doesn't fit the new aspect ratio?",
        answer: "Our AI uses 'outpainting' technology to intelligently extend the background of your image, ensuring that the main subject remains centered and uncropped while filling the new dimensions perfectly.",
    },

    // Template Builder
    {
        id: 'tb-1',
        category: 'Template Builder',
        question: "How do I create a reusable template?",
        answer: "In the 'Template Builder', upload an image of a design you like. The AI will analyze its layout, text areas, and visual hierarchy. You can then save this as a template to generate consistent on-brand banners automatically.",
        screenshotUrl: "/help_screenshots/template_builder.png"
    },

    // Theme History
    {
        id: 'th-1',
        category: 'Theme History',
        question: "Where can I find my past generated images?",
        answer: "The 'Theme History' page stores all your previous jobs. You can view details, see all generated variations, and download the assets again at any time.",
        screenshotUrl: "/help_screenshots/history.png"
    },

    // Administration
    {
        id: 'adm-1',
        category: 'Administration',
        question: "How do I add a new user?",
        answer: "If you are an admin, go to the 'Users' section under Administration. Click the 'Add User' button, fill in the username, full name, password, and role, then save.",
        screenshotUrl: "/help_screenshots/admin_users.png"
    },
    {
        id: 'adm-2',
        category: 'Administration',
        question: "How can I update company brand colors?",
        answer: "Navigate to 'Companies' in the Admin section. Select the company you want to edit. You can update the primary and secondary colors, upload new logos, and adjust brand guidelines.",
        screenshotUrl: "/help_screenshots/admin_users.png"
    }
];

const CATEGORIES = ['All', 'General', 'Image Generator', 'Image Resizer', 'Template Builder', 'Theme History', 'Administration'];

export const HelpCenter: React.FC = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState('All');
    const [expandedItems, setExpandedItems] = useState<string[]>([]);
    const [aiAnswer, setAiAnswer] = useState<string | null>(null);
    const [isSearchingAI, setIsSearchingAI] = useState(false);

    const handleAskAI = async () => {
        if (!searchQuery.trim()) return;
        setIsSearchingAI(true);
        setAiAnswer(null);
        try {
            const res = await fetch('/api/help/ask', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question: searchQuery })
            });
            const data = await res.json();
            if (data.answer) { // Correctly extract the 'answer' property from the response object
                setAiAnswer(data.answer);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsSearchingAI(false);
        }
    };

    // Natural Language Search Simulation
    const filteredFAQs = useMemo(() => {
        let items = FAQ_DATA;

        // Filter by Category
        if (activeCategory !== 'All') {
            items = items.filter(item => item.category === activeCategory);
        }

        // Search Filter
        if (searchQuery.trim()) {
            const queryTerms = searchQuery.toLowerCase().split(' ').filter(t => t.length > 2);
            
            items = items.filter(item => {
                const qLower = item.question.toLowerCase();
                const aLower = typeof item.answer === 'string' ? item.answer.toLowerCase() : '';
                
                // Exact phrase match (high priority)
                if (qLower.includes(searchQuery.toLowerCase())) return true;

                // Keyword matching
                return queryTerms.some(term => qLower.includes(term) || aLower.includes(term));
            }).sort((a, b) => {
                // Simple relevance scoring
                const aQ = a.question.toLowerCase().includes(searchQuery.toLowerCase()) ? 2 : 0;
                const bQ = b.question.toLowerCase().includes(searchQuery.toLowerCase()) ? 2 : 0;
                return bQ - aQ;
            });
        }

        return items;
    }, [searchQuery, activeCategory]);

    const toggleItem = (id: string) => {
        setExpandedItems(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    return (
        <div className="max-w-7xl mx-auto h-[calc(100vh-100px)] flex flex-col">
            {/* Header Area */}
            <div className="mb-8 text-center flex-shrink-0">
                <h1 className="text-3xl font-bold text-gray-900 mb-3">How can we help you?</h1>
                <p className="text-gray-600 mb-6">Search our knowledge base for guides, FAQs, and troubleshooting.</p>
                
                {/* Search Bar */}
                <div className="max-w-2xl mx-auto relative mb-6">
                    <input 
                        type="text" 
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            if(e.target.value) setActiveCategory('All');
                        }}
                        onKeyDown={(e) => e.key === 'Enter' && handleAskAI()}
                        placeholder="Describe your issue (e.g. 'how to resize banner')" 
                        className="w-full pl-12 pr-12 py-4 rounded-xl border border-gray-200 shadow-sm focus:ring-2 focus:ring-[#00529b] focus:border-transparent outline-none text-lg transition-all"
                    />
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={24} />
                    <button 
                        onClick={handleAskAI}
                        disabled={isSearchingAI || !searchQuery.trim()}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#00529b] p-2 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                        title="Ask AI Assistant"
                    >
                        {isSearchingAI ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
                    </button>
                </div>

                {/* AI Answer Section */}
                {(aiAnswer) && (
                    <div className="max-w-3xl mx-auto mb-8 bg-gradient-to-br from-blue-50 to-white border border-blue-100 rounded-xl p-6 shadow-sm text-left relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                            <Sparkles size={100} className="text-blue-500" />
                        </div>
                        <div className="flex items-start gap-4 relative z-10">
                            <div className="bg-blue-100 text-blue-600 p-2 rounded-lg mt-1">
                                <Sparkles size={24} />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold text-gray-900 mb-2">AI Assistant Response</h3>
                                <div className="prose prose-blue text-gray-700 max-w-none text-sm leading-relaxed whitespace-pre-line">
                                    {aiAnswer}
                                </div>
                            </div>
                            <button onClick={() => setAiAnswer(null)} className="text-gray-400 hover:text-gray-600">
                                <span className="sr-only">Close</span>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Main Content Layout */}
            <div className="flex flex-1 gap-8 overflow-hidden">
                {/* Sidebar Categories */}
                <div className="w-64 flex-shrink-0 hidden md:block overflow-y-auto pr-2">
                    <h3 className="font-semibold text-gray-900 mb-3 px-3 uppercase text-xs tracking-wider">Categories</h3>
                    <div className="space-y-1">
                        {CATEGORIES.map(cat => (
                            <button
                                key={cat}
                                onClick={() => { setActiveCategory(cat); setSearchQuery(''); }}
                                className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                                    activeCategory === cat 
                                    ? 'bg-blue-50 text-[#00529b]' 
                                    : 'text-gray-600 hover:bg-gray-50'
                                }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>

                    <div className="mt-8 bg-blue-50 p-4 rounded-xl border border-blue-100">
                        <div className="flex items-center gap-2 text-[#00529b] mb-2 font-semibold text-sm">
                            <MessageCircle size={16} /> Need Support?
                        </div>
                        <p className="text-xs text-blue-800 mb-3 leading-relaxed">
                            Can't find the answer you're looking for? Contact our support team directly.
                        </p>
                        <button className="w-full py-2 bg-[#00529b] text-white text-xs font-medium rounded hover:bg-[#003d75] transition-colors">
                            Contact Support
                        </button>
                    </div>
                </div>

                {/* FAQ List */}
                <div className="flex-1 overflow-y-auto pb-10 pr-2 custom-scrollbar">
                    {filteredFAQs.length === 0 ? (
                        <div className="text-center py-12">
                            <HelpCircle size={48} className="mx-auto text-gray-300 mb-4" />
                            <h3 className="text-lg font-medium text-gray-900">No results found</h3>
                            <p className="text-gray-500">Try asking our AI Assistant above or browse categories.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filteredFAQs.map((item) => (
                                <div key={item.id} className="border border-gray-200 rounded-xl bg-white overflow-hidden hover:border-gray-300 transition-colors">
                                    <button 
                                        onClick={() => toggleItem(item.id)}
                                        className="w-full flex items-center justify-between p-5 text-left focus:outline-none"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`p-2 rounded-lg ${expandedItems.includes(item.id) ? 'bg-blue-50 text-[#00529b]' : 'bg-gray-100 text-gray-500'}`}>
                                                <HelpCircle size={20} />
                                            </div>
                                            <div>
                                                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5 block">
                                                    {item.category}
                                                </span>
                                                <h3 className="font-semibold text-gray-900 text-lg">
                                                    {item.question}
                                                </h3>
                                            </div>
                                        </div>
                                        {expandedItems.includes(item.id) ? <ChevronUp className="text-gray-400" /> : <ChevronDown className="text-gray-400" />}
                                    </button>
                                    
                                    {expandedItems.includes(item.id) && (
                                        <div className="px-5 pb-6 pt-0 pl-[4.5rem]">
                                            <div className="prose prose-blue text-gray-600 max-w-none">
                                                <p className="mb-4 text-base leading-relaxed">{item.answer}</p>
                                                {item.screenshotUrl && (
                                                    <div className="mt-4 rounded-lg overflow-hidden border border-gray-200 shadow-sm">
                                                        <img 
                                                            src={item.screenshotUrl} 
                                                            alt={`Screenshot for ${item.question}`}
                                                            className="w-full h-auto object-cover bg-gray-50" 
                                                        />
                                                        <div className="bg-gray-50 px-3 py-2 text-xs text-gray-500 border-t border-gray-200 text-center italic">
                                                            Visual reference for: {item.question}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};