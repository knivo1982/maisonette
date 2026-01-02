import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import Layout from '../components/Layout';
import { Card, CardContent } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import axios from 'axios';
import { 
  Clock, 
  LogIn, 
  LogOut, 
  Home, 
  Shield, 
  Ban, 
  PawPrint, 
  Car, 
  Trash2, 
  AlertTriangle,
  Volume2,
  FileText
} from 'lucide-react';

import { API } from '../lib/api';

const categoryIcons = {
  checkin: LogIn,
  checkout: LogOut,
  soggiorno: Home,
  sicurezza: Shield
};

const categoryLabels = {
  it: {
    checkin: 'Check-in',
    checkout: 'Check-out',
    soggiorno: 'Durante il Soggiorno',
    sicurezza: 'Sicurezza'
  },
  en: {
    checkin: 'Check-in',
    checkout: 'Check-out',
    soggiorno: 'During Your Stay',
    sicurezza: 'Safety'
  }
};

const categoryColors = {
  checkin: 'bg-green-100 text-green-700 border-green-200',
  checkout: 'bg-blue-100 text-blue-700 border-blue-200',
  soggiorno: 'bg-amber-100 text-amber-700 border-amber-200',
  sicurezza: 'bg-red-100 text-red-700 border-red-200'
};

export default function HouseRulesPage() {
  const { user, loading: authLoading } = useAuth();
  const { language, t } = useLanguage();
  const navigate = useNavigate();
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  // Helper to get translated content
  const getLocalizedText = (item, field) => {
    if (language === 'en' && item[`${field}_en`]) {
      return item[`${field}_en`];
    }
    return item[field] || '';
  };

  const catLabels = categoryLabels[language] || categoryLabels.it;

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    try {
      const response = await axios.get(`${API}/house-rules`);
      setRules(response.data);
    } catch (error) {
      console.error('Error fetching rules:', error);
    } finally {
      setLoading(false);
    }
  };

  const categories = ['all', ...new Set(rules.map(r => r.categoria))];
  
  const filteredRules = activeTab === 'all' 
    ? rules 
    : rules.filter(r => r.categoria === activeTab);

  const groupedRules = rules.reduce((acc, rule) => {
    if (!acc[rule.categoria]) acc[rule.categoria] = [];
    acc[rule.categoria].push(rule);
    return acc;
  }, {});

  if (authLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="spinner" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-12 text-center">
          <div className="w-16 h-16 bg-[#C5A059]/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-[#C5A059]" />
          </div>
          <p className="font-cormorant text-[#C5A059] tracking-[0.2em] uppercase text-sm mb-2">
            {language === 'en' ? 'Useful Information' : 'Informazioni Utili'}
          </p>
          <h1 className="font-cinzel text-4xl md:text-5xl text-[#1A202C] mb-4">
            {language === 'en' ? 'House Rules' : 'Regole della Casa'}
          </h1>
          <p className="font-manrope text-[#4A5568] max-w-2xl mx-auto">
            {language === 'en' 
              ? 'To ensure a pleasant stay for all our guests, please read the following rules.'
              : 'Per garantire un soggiorno piacevole a tutti i nostri ospiti, vi preghiamo di prendere visione delle seguenti regole.'}
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="spinner" />
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedRules).map(([categoria, categoryRules]) => {
              const IconComponent = categoryIcons[categoria] || FileText;
              
              return (
                <Card key={categoria} className="border-[#E2E8F0] overflow-hidden">
                  <div className={`px-6 py-4 border-b ${categoryColors[categoria] || 'bg-gray-100'}`}>
                    <div className="flex items-center gap-3">
                      <IconComponent className="w-5 h-5" />
                      <h2 className="font-cinzel text-lg">
                        {catLabels[categoria] || categoria}
                      </h2>
                    </div>
                  </div>
                  <CardContent className="p-0">
                    <div className="divide-y divide-[#E2E8F0]">
                      {categoryRules.map((rule, index) => (
                        <div 
                          key={rule.id}
                          className="p-6 hover:bg-[#F9F9F7] transition-colors"
                        >
                          <h3 className="font-manrope font-semibold text-[#1A202C] mb-2">
                            {getLocalizedText(rule, 'titolo')}
                          </h3>
                          <p className="font-manrope text-sm text-[#4A5568] leading-relaxed">
                            {getLocalizedText(rule, 'contenuto')}
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Quick Info */}
        <div className="mt-12 grid md:grid-cols-2 gap-6">
          <Card className="border-[#E2E8F0]">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <LogIn className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="font-manrope text-sm text-[#4A5568]">Check-in</p>
                <p className="font-cinzel text-xl text-[#1A202C]">15:00 - 20:00</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-[#E2E8F0]">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <LogOut className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="font-manrope text-sm text-[#4A5568]">Check-out</p>
                <p className="font-cinzel text-xl text-[#1A202C]">Entro le 10:00</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Contact */}
        <div className="mt-8 bg-[#1A202C] rounded-sm p-8 text-center">
          <h3 className="font-cinzel text-xl text-white mb-2">Hai domande?</h3>
          <p className="font-manrope text-gray-400 mb-4">
            Contattaci per qualsiasi chiarimento
          </p>
          <a 
            href="tel:+393934957532"
            className="inline-flex items-center gap-2 text-[#C5A059] font-cinzel hover:underline"
          >
            +39 393 4957532
          </a>
        </div>
      </div>
    </Layout>
  );
}
