import React, { useState } from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { BriefingData } from '../types';
import { INITIAL_BRIEFING } from '../constants';

interface PhaseBriefingProps {
  onNext: (data: BriefingData) => void;
  isGenerating: boolean;
}

export const PhaseBriefing: React.FC<PhaseBriefingProps> = ({ onNext, isGenerating }) => {
  const [formData, setFormData] = useState<BriefingData>(INITIAL_BRIEFING);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.topic && formData.targetAudience && formData.coreProblem) {
      onNext(formData);
    } else {
      alert("Proszę wypełnić wszystkie wymagane pola (Temat, Grupa Docelowa, Problem), aby przejść dalej.");
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 lg:p-12">
      <div className="max-w-3xl mx-auto">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-extrabold text-gray-900 mb-4">
            Faza 1: Briefing & Koncepcja
          </h1>
          <p className="text-lg text-gray-600">
            Zdefiniujmy fundamenty Twojego przyszłego bestsellera. Im więcej szczegółów podasz, tym lepszy będzie rezultat.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Główny temat e-booka <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="topic"
                value={formData.topic}
                onChange={handleChange}
                placeholder="np. Efektywne zarządzanie czasem"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Autor (Twoje imię / Marka)
              </label>
              <input
                type="text"
                name="authorName"
                value={formData.authorName}
                onChange={handleChange}
                placeholder="np. Jan Kowalski"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Kto jest grupą docelową (Avatar Klienta)? <span className="text-red-500">*</span>
            </label>
            <textarea
              name="targetAudience"
              value={formData.targetAudience}
              onChange={handleChange}
              rows={3}
              placeholder="np. Freelancerzy IT, wiek 25-40, walczący z work-life balance..."
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Jaki główny problem rozwiązuje ten e-book? <span className="text-red-500">*</span>
            </label>
            <textarea
              name="coreProblem"
              value={formData.coreProblem}
              onChange={handleChange}
              rows={3}
              placeholder="np. Ciągłe uczucie przytłoczenia i brak czasu na rozwój osobisty."
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Ton wypowiedzi
              </label>
              <select
                name="tone"
                value={formData.tone}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
              >
                <option value="Profesjonalny i autorytatywny">Profesjonalny i autorytatywny</option>
                <option value="Przyjacielski i wspierający">Przyjacielski i wspierający</option>
                <option value="Motywacyjny i energiczny">Motywacyjny i energiczny</option>
                <option value="Akademicki i analityczny">Akademicki i analityczny</option>
                <option value="Luźny z humorem">Luźny z humorem</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Preferowana długość rozdziałów
              </label>
              <select
                name="targetLength"
                value={formData.targetLength}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
              >
                <option value="short">Krótka (ok. 500-800 słów)</option>
                <option value="medium">Standardowa (ok. 1000-1500 słów)</option>
                <option value="long">Długa / Pogłębiona (2000+ słów)</option>
              </select>
            </div>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={isGenerating}
              className="w-full flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg hover:shadow-blue-500/30 disabled:opacity-70 disabled:cursor-not-allowed group"
            >
              {isGenerating ? (
                <>
                  <Sparkles className="w-5 h-5 mr-2 animate-spin" />
                  Generowanie struktury...
                </>
              ) : (
                <>
                  Przejdź do struktury
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
