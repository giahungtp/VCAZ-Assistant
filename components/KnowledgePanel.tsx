import React from 'react';
import { KnowledgeSource, Language } from '../types';
import { MOCK_KNOWLEDGE_SOURCES, UI_TEXT } from '../constants';

interface KnowledgePanelProps {
  language: Language;
}

const KnowledgePanel: React.FC<KnowledgePanelProps> = ({ language }) => {
  const text = UI_TEXT[language];

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 h-full flex flex-col shadow-sm">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-1">{text.knowledgeTitle}</h2>
        <p className="text-sm text-gray-500">{text.knowledgeSubtitle}</p>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 space-y-4">
        
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{text.files}</h3>
          {MOCK_KNOWLEDGE_SOURCES.filter(k => k.type === 'file' || k.type === 'sheet').map((source) => (
            <div key={source.id} className="flex items-center p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-purple-200 hover:bg-purple-50/50 transition-colors group">
              <span className="text-2xl mr-3 group-hover:scale-110 transition-transform">{source.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-700 truncate">{source.name}</p>
                <p className="text-xs text-gray-500 truncate">{source.details}</p>
              </div>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700 border border-green-200">
                {source.status}
              </span>
            </div>
          ))}
        </div>

        <div className="space-y-3 pt-4 border-t border-gray-100">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{text.social}</h3>
          {MOCK_KNOWLEDGE_SOURCES.filter(k => k.type === 'social').map((source) => (
            <div key={source.id} className="flex items-center p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-purple-200 hover:bg-purple-50/50 transition-colors group">
               <span className="text-2xl mr-3 group-hover:scale-110 transition-transform">{source.icon}</span>
               <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-700 truncate">{source.name}</p>
                <p className="text-xs text-gray-500 truncate">{source.details}</p>
              </div>
              <div className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-purple-500"></span>
              </div>
            </div>
          ))}
        </div>

        <div className="pt-4 mt-auto">
            <button className="w-full py-2 px-4 bg-white hover:bg-gray-50 text-sm text-gray-600 rounded-lg border-2 border-dashed border-gray-300 hover:border-purple-400 hover:text-purple-600 flex items-center justify-center gap-2 transition-colors font-medium">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                {text.addSource}
            </button>
        </div>

      </div>
    </div>
  );
};

export default KnowledgePanel;