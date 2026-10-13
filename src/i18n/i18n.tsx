import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type Lang = 'en' | 'hi';

/** Hindi translations keyed by the English text. Missing keys fall back to English. */
const HI: Record<string, string> = {
  'Lower electricity bills. Smarter energy for your business.': 'बिजली का बिल कम करें। आपके व्यवसाय के लिए स्मार्ट ऊर्जा।',
  'Explore solar, battery storage and flexible payment options for your factory or business.': 'अपनी फैक्ट्री या व्यवसाय के लिए सोलर, बैटरी स्टोरेज और आसान भुगतान विकल्प देखें।',
  'Check My Savings': 'मेरी बचत जानें',
  'View Sample Customer': 'नमूना ग्राहक देखें',
  'JioUrja Partner Login': 'JioUrja पार्टनर लॉगिन',
  'Reduce electricity costs': 'बिजली खर्च कम करें',
  'Pay flexibly': 'आसान भुगतान',
  'Get expert installation and support': 'विशेषज्ञ इंस्टॉलेशन और सहायता',
  'Use rooftop solar to buy fewer units from the grid.': 'रूफटॉप सोलर से ग्रिड से कम यूनिट खरीदें।',
  'Pay per unit of solar electricity, or own the system with an EMI.': 'सोलर बिजली की प्रति यूनिट कीमत दें, या EMI पर सिस्टम के मालिक बनें।',
  'Engineers survey your roof, install the system and look after it.': 'इंजीनियर आपकी छत देखेंगे, सिस्टम लगाएंगे और उसकी देखभाल करेंगे।',
  'What kind of business are you?': 'आपका व्यवसाय किस प्रकार का है?',
  'MSME / Small Factory': 'MSME / छोटी फैक्ट्री',
  'Large Industry': 'बड़ा उद्योग',
  'Data Centre': 'डेटा सेंटर',
  'Need help? Talk to us': 'मदद चाहिए? हमसे बात करें',
  'Back': 'पीछे',
  'Continue': 'आगे बढ़ें',
  'Step': 'चरण',
  'of': 'में से',
  'Electricity bill': 'बिजली बिल',
  'Business details': 'व्यवसाय विवरण',
  'Rooftop': 'छत',
  'Review': 'जाँचें',
  'What is your average monthly electricity bill?': 'आपका औसत मासिक बिजली बिल कितना है?',
  'An approximate amount is fine.': 'अनुमानित राशि भी ठीक है।',
  'Try Sample Pune Factory': 'नमूना पुणे फैक्ट्री आज़माएँ',
  'Upload your bill (PDF or photo)': 'अपना बिल अपलोड करें (PDF या फोटो)',
  'Add more details for a better estimate': 'बेहतर अनुमान के लिए और जानकारी जोड़ें',
  'Monthly electricity units': 'मासिक बिजली यूनिट',
  'Tell us about your business': 'अपने व्यवसाय के बारे में बताएं',
  'Business or factory name': 'व्यवसाय या फैक्ट्री का नाम',
  'Type of business': 'व्यवसाय का प्रकार',
  'City': 'शहर',
  'PIN code': 'पिन कोड',
  'Factory working hours': 'फैक्ट्री के काम के घंटे',
  'Opens at': 'खुलने का समय',
  'Closes at': 'बंद होने का समय',
  'Working days per week': 'सप्ताह में काम के दिन',
  'Do you own or rent the premises?': 'क्या परिसर आपका अपना है या किराए का?',
  'Owned': 'अपना',
  'Rented': 'किराए का',
  'Your name': 'आपका नाम',
  'Mobile number': 'मोबाइल नंबर',
  'Email (optional)': 'ईमेल (वैकल्पिक)',
  'Can you tell us about your factory rooftop?': 'क्या आप अपनी फैक्ट्री की छत के बारे में बता सकते हैं?',
  'Find my roof on a map': 'नक्शे पर मेरी छत खोजें',
  'Enter details manually': 'खुद जानकारी भरें',
  'Not sure? Our engineer can check this.': 'पक्का नहीं पता? हमारे इंजीनियर जाँच कर लेंगे।',
  'Approximate roof length (metres)': 'छत की अनुमानित लंबाई (मीटर)',
  'Approximate roof width (metres)': 'छत की अनुमानित चौड़ाई (मीटर)',
  'Is there anything on the roof or nearby that may block sunlight?': 'क्या छत पर या आस-पास कुछ है जो धूप रोक सकता है?',
  'Water tank': 'पानी की टंकी',
  'Tall buildings nearby': 'पास में ऊँची इमारतें',
  'Other structures': 'अन्य संरचनाएँ',
  'Upload rooftop photos (optional)': 'छत की फोटो अपलोड करें (वैकल्पिक)',
  'See my estimate': 'मेरा अनुमान देखें',
  'Your JioUrja Energy Plan': 'आपका JioUrja ऊर्जा प्लान',
  'Preliminary estimate': 'प्रारंभिक अनुमान',
  'Recommended system': 'सुझाया गया सिस्टम',
  'Solar only': 'केवल सोलर',
  'Solar + Battery storage': 'सोलर + बैटरी स्टोरेज',
  'Approximate monthly savings': 'अनुमानित मासिक बचत',
  'Estimated initial payment': 'अनुमानित शुरुआती भुगतान',
  'Assessment confidence': 'आकलन का भरोसा',
  'Next step': 'अगला कदम',
  'Book My Free Site Assessment': 'मेरा मुफ़्त साइट आकलन बुक करें',
  'Compare payment options': 'भुगतान विकल्पों की तुलना करें',
  'Final pricing and system design are subject to an engineering survey and commercial approval.': 'अंतिम कीमत और सिस्टम डिज़ाइन इंजीनियरिंग सर्वे और व्यावसायिक मंज़ूरी पर निर्भर हैं।',
  'Choose how you want to pay': 'भुगतान का तरीका चुनें',
  'Plan A: JioUrja Energy-as-a-Service': 'प्लान A: JioUrja एनर्जी-एज़-ए-सर्विस',
  'Plan B: Own the system with a loan': 'प्लान B: लोन से सिस्टम के मालिक बनें',
  'Choose this plan': 'यह प्लान चुनें',
  'Download Preliminary Proposal': 'प्रारंभिक प्रस्ताव डाउनलोड करें',
  'Book a free site visit': 'मुफ़्त साइट विज़िट बुक करें',
  'Preferred visit date': 'विज़िट की पसंदीदा तारीख',
  'Preferred time': 'पसंदीदा समय',
  'Morning (9 AM – 12 PM)': 'सुबह (9 – 12 बजे)',
  'Afternoon (12 PM – 4 PM)': 'दोपहर (12 – 4 बजे)',
  'Evening (4 PM – 7 PM)': 'शाम (4 – 7 बजे)',
  'Notes for our engineer (optional)': 'इंजीनियर के लिए नोट (वैकल्पिक)',
  'Request visit': 'विज़िट का अनुरोध करें',
  'My enquiry': 'मेरी पूछताछ',
  'Your progress': 'आपकी प्रगति',
  'Home': 'होम',
  'Savings': 'बचत',
  'My Plan': 'मेरा प्लान',
  'Help': 'सहायता',
  'Your solar system is working well.': 'आपका सोलर सिस्टम ठीक से काम कर रहा है।',
  'Your system needs attention. Request an engineer.': 'आपके सिस्टम पर ध्यान देने की ज़रूरत है। इंजीनियर बुलाएँ।',
  'Estimated savings this month': 'इस महीने की अनुमानित बचत',
  'Solar units generated': 'सोलर से बनी यूनिट',
  'System status': 'सिस्टम की स्थिति',
  'Electricity cost avoided': 'बची हुई बिजली लागत',
  'Net estimated savings': 'अनुमानित शुद्ध बचत',
  'Report a problem': 'समस्या बताएं',
  'Request an engineer': 'इंजीनियर बुलाएँ',
  'Track a service request': 'सेवा अनुरोध ट्रैक करें',
  'Payment enquiry': 'भुगतान संबंधी प्रश्न',
  'Contact support': 'सहायता से संपर्क करें',
  'Submit request': 'अनुरोध भेजें',
  'Enquiry received': 'पूछताछ प्राप्त हुई',
  'Electricity assessment': 'बिजली आकलन',
  'Rooftop and document verification': 'छत और दस्तावेज़ सत्यापन',
  'Final proposal': 'अंतिम प्रस्ताव',
  'Customer acceptance': 'ग्राहक स्वीकृति',
  'Installation scheduled': 'इंस्टॉलेशन तय',
  'Installation complete': 'इंस्टॉलेशन पूरा',
  'System active': 'सिस्टम चालू',
  'Your engineer visit is scheduled.': 'आपके इंजीनियर की विज़िट तय है।',
  'Do you need to pay anything upfront?': 'क्या आपको पहले कुछ भुगतान करना होगा?',
  'Is your roof suitable?': 'क्या आपकी छत उपयुक्त है?',
  'How much could you save?': 'आप कितनी बचत कर सकते हैं?',
  'per month': 'प्रति माह',
  'Talk to a JioUrja advisor': 'JioUrja सलाहकार से बात करें',
  'Request a call back': 'कॉल बैक का अनुरोध करें',
  'Start Guided Demo': 'गाइडेड डेमो शुरू करें',
};

const Ctx = createContext<{ lang: Lang; setLang: (l: Lang) => void; t: (s: string) => string }>({
  lang: 'en',
  setLang: () => {},
  t: (s) => s,
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => {
    try {
      return (localStorage.getItem('jiourja2.lang') as Lang) || 'en';
    } catch {
      return 'en';
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem('jiourja2.lang', lang);
    } catch {
      /* ignore */
    }
    document.documentElement.lang = lang;
  }, [lang]);
  const t = (s: string) => (lang === 'hi' ? HI[s] ?? s : s);
  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>;
}

export const useI18n = () => useContext(Ctx);
