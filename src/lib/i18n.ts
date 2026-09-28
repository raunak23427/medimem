import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  en: {
    translation: {
      app: {
        name: 'MediMem',
        tagline: "Your family's health, always remembered",
      },
      nav: {
        home: 'Home', records: 'Records', family: 'Family',
        insights: 'Insights', settings: 'Settings',
      },
      dashboard: {
        quickActions: 'Quick actions',
        healthModules: 'Health modules',
        scan: 'Scan', summary: 'Summary',
        medicines: 'Medicines', emergency: 'Emergency',
        history: 'History', metrics: 'Metrics',
        childBirth: 'Child & Birth', visits: 'Visits',
        insurance: 'Insurance', specialty: 'Specialty',
        smartAlerts: 'Smart Alerts', recentRecords: 'Recent Records',
        viewAll: 'View all', seeAll: 'See all',
      },
      auth: {
        continueGoogle: 'Continue with Google',
        emailPlaceholder: 'Email address',
        passwordPlaceholder: 'Password',
        signIn: 'Sign In', signUp: 'Sign Up',
        createAccount: 'Create Account',
        noAccount: "Don't have an account?",
        hasAccount: 'Already have an account?',
      },
      common: {
        save: 'Save', cancel: 'Cancel', delete: 'Delete',
        edit: 'Edit', add: 'Add', loading: 'Loading…',
        saved: 'Saved', search: 'Search',
      },
    },
  },
  hi: {
    translation: {
      app: {
        name: 'MediMem',
        tagline: 'आपके परिवार का स्वास्थ्य, हमेशा याद',
      },
      nav: {
        home: 'होम', records: 'रिकॉर्ड', family: 'परिवार',
        insights: 'जानकारी', settings: 'सेटिंग्स',
      },
      dashboard: {
        quickActions: 'त्वरित क्रियाएँ',
        healthModules: 'स्वास्थ्य मॉड्यूल',
        scan: 'स्कैन', summary: 'सारांश',
        medicines: 'दवाएँ', emergency: 'आपातकाल',
        history: 'इतिहास', metrics: 'मापन',
        childBirth: 'बाल और जन्म', visits: 'मुलाक़ात',
        insurance: 'बीमा', specialty: 'विशेषज्ञता',
        smartAlerts: 'स्मार्ट अलर्ट', recentRecords: 'हाल के रिकॉर्ड',
        viewAll: 'सभी देखें', seeAll: 'सभी देखें',
      },
      auth: {
        continueGoogle: 'Google से जारी रखें',
        emailPlaceholder: 'ईमेल पता',
        passwordPlaceholder: 'पासवर्ड',
        signIn: 'साइन इन', signUp: 'साइन अप',
        createAccount: 'खाता बनाएँ',
        noAccount: 'खाता नहीं है?',
        hasAccount: 'पहले से खाता है?',
      },
      common: {
        save: 'सहेजें', cancel: 'रद्द करें', delete: 'हटाएँ',
        edit: 'संपादित करें', add: 'जोड़ें', loading: 'लोड हो रहा है…',
        saved: 'सहेजा गया', search: 'खोज',
      },
    },
  },
  ta: {
    translation: {
      app: { name: 'MediMem', tagline: 'உங்கள் குடும்பத்தின் ஆரோக்கியம், எப்போதும் நினைவில்' },
      nav: { home: 'முகப்பு', records: 'பதிவுகள்', family: 'குடும்பம்', insights: 'நுண்ணறிவு', settings: 'அமைப்புகள்' },
      dashboard: { quickActions: 'விரைவு செயல்கள்', healthModules: 'ஆரோக்கிய தொகுதிகள்', scan: 'ஸ்கேன்', summary: 'சுருக்கம்', medicines: 'மருந்துகள்', emergency: 'அவசரம்', history: 'வரலாறு', metrics: 'அளவீடுகள்', childBirth: 'பிறப்பு', visits: 'வருகைகள்', insurance: 'காப்பீடு', specialty: 'சிறப்புத்துறை', smartAlerts: 'புத்திசாலி எச்சரிக்கைகள்', recentRecords: 'சமீபத்திய பதிவுகள்', viewAll: 'எல்லாம் காண்க', seeAll: 'எல்லாம் காண்க' },
      auth: { continueGoogle: 'Google உடன் தொடரவும்', emailPlaceholder: 'மின்னஞ்சல்', passwordPlaceholder: 'கடவுச்சொல்', signIn: 'உள்நுழைய', signUp: 'பதிவு', createAccount: 'கணக்கு உருவாக்கு', noAccount: 'கணக்கு இல்லையா?', hasAccount: 'ஏற்கனவே கணக்கு உள்ளதா?' },
      common: { save: 'சேமி', cancel: 'ரத்து', delete: 'நீக்கு', edit: 'திருத்து', add: 'சேர்', loading: 'ஏற்றுகிறது…', saved: 'சேமிக்கப்பட்டது', search: 'தேடு' },
    },
  },
  te: {
    translation: {
      app: { name: 'MediMem', tagline: 'మీ కుటుంబ ఆరోగ్యం, ఎల్లప్పుడూ గుర్తుండిపోయేలా' },
      nav: { home: 'హోమ్', records: 'రికార్డులు', family: 'కుటుంబం', insights: 'అంతర్దృష్టులు', settings: 'సెట్టింగులు' },
      dashboard: { quickActions: 'శీఘ్ర చర్యలు', healthModules: 'ఆరోగ్య మాడ్యూల్స్', scan: 'స్కాన్', summary: 'సారాంశం', medicines: 'మందులు', emergency: 'అత్యవసరం', history: 'చరిత్ర', metrics: 'కొలతలు', childBirth: 'శిశు & జననం', visits: 'సందర్శనలు', insurance: 'భీమా', specialty: 'ప్రత్యేకత', smartAlerts: 'తెలివైన హెచ్చరికలు', recentRecords: 'ఇటీవలి రికార్డులు', viewAll: 'అన్నీ చూడండి', seeAll: 'అన్నీ చూడండి' },
      auth: { continueGoogle: 'Google తో కొనసాగండి', emailPlaceholder: 'ఇమెయిల్', passwordPlaceholder: 'పాస్‌వర్డ్', signIn: 'సైన్ ఇన్', signUp: 'సైన్ అప్', createAccount: 'ఖాతా సృష్టించండి', noAccount: 'ఖాతా లేదా?', hasAccount: 'ఖాతా ఉందా?' },
      common: { save: 'సేవ్', cancel: 'రద్దు', delete: 'తొలగించు', edit: 'సవరించు', add: 'జోడించు', loading: 'లోడ్…', saved: 'సేవ్ చేయబడింది', search: 'శోధించండి' },
    },
  },
  bn: {
    translation: {
      app: { name: 'MediMem', tagline: 'আপনার পরিবারের স্বাস্থ্য, সর্বদা স্মরণীয়' },
      nav: { home: 'হোম', records: 'রেকর্ড', family: 'পরিবার', insights: 'অন্তর্দৃষ্টি', settings: 'সেটিংস' },
      dashboard: { quickActions: 'দ্রুত পদক্ষেপ', healthModules: 'স্বাস্থ্য মডিউল', scan: 'স্ক্যান', summary: 'সারাংশ', medicines: 'ঔষধ', emergency: 'জরুরি', history: 'ইতিহাস', metrics: 'মাপ', childBirth: 'শিশু ও জন্ম', visits: 'সাক্ষাৎ', insurance: 'বীমা', specialty: 'বিশেষত্ব', smartAlerts: 'স্মার্ট সতর্কতা', recentRecords: 'সাম্প্রতিক রেকর্ড', viewAll: 'সব দেখুন', seeAll: 'সব দেখুন' },
      auth: { continueGoogle: 'Google দিয়ে চালিয়ে যান', emailPlaceholder: 'ইমেল', passwordPlaceholder: 'পাসওয়ার্ড', signIn: 'সাইন ইন', signUp: 'সাইন আপ', createAccount: 'অ্যাকাউন্ট তৈরি', noAccount: 'অ্যাকাউন্ট নেই?', hasAccount: 'অ্যাকাউন্ট আছে?' },
      common: { save: 'সংরক্ষণ', cancel: 'বাতিল', delete: 'মুছুন', edit: 'সম্পাদনা', add: 'যোগ', loading: 'লোড হচ্ছে…', saved: 'সংরক্ষিত', search: 'খোঁজ' },
    },
  },
};

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'medimem.lang',
      caches: ['localStorage'],
    },
  });

export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'hi', label: 'Hindi', native: 'हिंदी' },
  { code: 'ta', label: 'Tamil', native: 'தமிழ்' },
  { code: 'te', label: 'Telugu', native: 'తెలుగు' },
  { code: 'bn', label: 'Bengali', native: 'বাংলা' },
] as const;

export default i18n;
