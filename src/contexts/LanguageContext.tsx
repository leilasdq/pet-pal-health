import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Language = 'en' | 'fa';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  isRTL: boolean;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    // Navigation
    'nav.dashboard': 'Dashboard',
    'nav.vault': 'Vault',
    'nav.chat': 'AI Chat',
    'nav.profile': 'Profile',
    
    // Auth
    'auth.welcome': 'Welcome to PetCare',
    'auth.subtitle': 'Your pet\'s health companion',
    'auth.signIn': 'Sign In',
    'auth.signUp': 'Sign Up',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.fullName': 'Full Name',
    'auth.signingIn': 'Signing in...',
    'auth.creatingAccount': 'Creating account...',
    'auth.noAccount': 'Don\'t have an account?',
    'auth.hasAccount': 'Already have an account?',
    
    // Dashboard
    'dashboard.title': 'Dashboard',
    'dashboard.myPets': 'My Pets',
    'dashboard.addPet': 'Add Pet',
    'dashboard.noPets': 'No pets yet',
    'dashboard.addFirstPet': 'Add your first furry friend!',
    'dashboard.upcomingReminders': 'Upcoming Reminders',
    'dashboard.next7Days': 'Next 7 days',
    'dashboard.noReminders': 'No upcoming reminders',
    'dashboard.allCaughtUp': 'All caught up! 🎉',
    'dashboard.yearsOld': 'years old',
    'dashboard.kg': 'kg',
    
    // Add Pet Dialog
    'pet.addNew': 'Add New Pet',
    'pet.name': 'Pet Name',
    'pet.namePlaceholder': 'e.g., Max',
    'pet.breed': 'Breed',
    'pet.breedPlaceholder': 'e.g., Golden Retriever',
    'pet.birthDate': 'Birth Date',
    'pet.weight': 'Weight (kg)',
    'pet.weightPlaceholder': 'e.g., 25',
    'pet.cancel': 'Cancel',
    'pet.add': 'Add Pet',
    'pet.adding': 'Adding...',
    'pet.added': 'Pet added successfully!',
    'pet.addError': 'Failed to add pet',
    
    // Add Reminder Dialog
    'reminder.addNew': 'Add Reminder',
    'reminder.title': 'Title',
    'reminder.titlePlaceholder': 'e.g., Annual vaccination',
    'reminder.type': 'Type',
    'reminder.selectType': 'Select type',
    'reminder.vaccination': 'Vaccination',
    'reminder.antiparasitic': 'Anti-parasitic',
    'reminder.checkup': 'Check-up',
    'reminder.dueDate': 'Due Date',
    'reminder.selectPet': 'Select Pet',
    'reminder.choosePet': 'Choose a pet',
    'reminder.notes': 'Notes (optional)',
    'reminder.notesPlaceholder': 'Any additional notes...',
    'reminder.cancel': 'Cancel',
    'reminder.add': 'Add Reminder',
    'reminder.adding': 'Adding...',
    'reminder.added': 'Reminder added successfully!',
    'reminder.addError': 'Failed to add reminder',
    'reminder.markComplete': 'Mark as complete',
    
    // Health Vault
    'vault.title': 'Health Vault',
    'vault.subtitle': 'Medical records & documents',
    'vault.upload': 'Upload',
    'vault.noRecords': 'No records yet',
    'vault.startUploading': 'Start uploading medical documents',
    'vault.medicalTests': 'Medical Tests',
    'vault.prescriptions': 'Prescriptions',
    'vault.passports': 'Passports & ID',
    'vault.uploadNew': 'Upload Record',
    'vault.category': 'Category',
    'vault.selectCategory': 'Select category',
    'vault.medicalTest': 'Medical Test',
    'vault.prescription': 'Prescription',
    'vault.passport': 'Passport/ID',
    'vault.recordTitle': 'Title',
    'vault.titlePlaceholder': 'e.g., Blood test results',
    'vault.recordDate': 'Record Date',
    'vault.image': 'Image',
    'vault.uploading': 'Uploading...',
    'vault.uploaded': 'Record uploaded successfully!',
    'vault.uploadError': 'Failed to upload record',
    
    // AI Chat
    'chat.title': 'AI Vet Assistant',
    'chat.subtitle': 'Ask me anything about pet health',
    'chat.selectPet': 'Select pet for context',
    'chat.allPets': 'All pets',
    'chat.placeholder': 'Ask about your pet\'s health...',
    'chat.send': 'Send',
    'chat.thinking': 'Thinking...',
    'chat.error': 'Failed to get response',
    'chat.suggestion1': 'What vaccines does my pet need?',
    'chat.suggestion2': 'Signs of common pet illnesses',
    'chat.suggestion3': 'Diet tips for my pet',
    'chat.newChat': 'New Chat',
    'chat.noChats': 'No chats yet. Start a new conversation!',
    'chat.welcome': 'Hello! 👋',
    'chat.disclaimer': 'AI advice is not a substitute for professional veterinary care.',
    
    // Profile
    'profile.title': 'Profile',
    'profile.editProfile': 'Edit Profile',
    'profile.fullName': 'Full Name',
    'profile.email': 'Email',
    'profile.save': 'Save',
    'profile.saving': 'Saving...',
    'profile.saved': 'Profile updated!',
    'profile.saveError': 'Failed to update profile',
    'profile.signOut': 'Sign Out',
    'profile.signingOut': 'Signing out...',
    'profile.pets': 'Pets',
    'profile.reminders': 'Reminders',
    'profile.records': 'Records',
    'profile.language': 'Language',
    'profile.english': 'English',
    'profile.persian': 'فارسی',
    
    // Common
    'common.loading': 'Loading...',
    'common.error': 'An error occurred',
    'common.retry': 'Retry',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
  },
  fa: {
    // Navigation
    'nav.dashboard': 'داشبورد',
    'nav.vault': 'پرونده',
    'nav.chat': 'مشاوره',
    'nav.profile': 'پروفایل',
    
    // Auth
    'auth.welcome': 'به پت‌کر خوش آمدید',
    'auth.subtitle': 'همراه سلامت حیوان خانگی شما',
    'auth.signIn': 'ورود',
    'auth.signUp': 'ثبت نام',
    'auth.email': 'ایمیل',
    'auth.password': 'رمز عبور',
    'auth.fullName': 'نام کامل',
    'auth.signingIn': 'در حال ورود...',
    'auth.creatingAccount': 'در حال ساخت حساب...',
    'auth.noAccount': 'حساب کاربری ندارید؟',
    'auth.hasAccount': 'قبلاً ثبت نام کرده‌اید؟',
    
    // Dashboard
    'dashboard.title': 'داشبورد',
    'dashboard.myPets': 'حیوانات من',
    'dashboard.addPet': 'افزودن',
    'dashboard.noPets': 'هنوز حیوانی ندارید',
    'dashboard.addFirstPet': 'اولین دوست پشمالوی خود را اضافه کنید!',
    'dashboard.upcomingReminders': 'یادآوری‌های پیش رو',
    'dashboard.next7Days': '۷ روز آینده',
    'dashboard.noReminders': 'یادآوری‌ای وجود ندارد',
    'dashboard.allCaughtUp': 'همه چیز مرتب است! 🎉',
    'dashboard.yearsOld': 'ساله',
    'dashboard.kg': 'کیلوگرم',
    
    // Add Pet Dialog
    'pet.addNew': 'افزودن حیوان جدید',
    'pet.name': 'نام حیوان',
    'pet.namePlaceholder': 'مثلاً: مکس',
    'pet.breed': 'نژاد',
    'pet.breedPlaceholder': 'مثلاً: گلدن رتریور',
    'pet.birthDate': 'تاریخ تولد',
    'pet.weight': 'وزن (کیلوگرم)',
    'pet.weightPlaceholder': 'مثلاً: ۲۵',
    'pet.cancel': 'انصراف',
    'pet.add': 'افزودن',
    'pet.adding': 'در حال افزودن...',
    'pet.added': 'حیوان با موفقیت اضافه شد!',
    'pet.addError': 'خطا در افزودن حیوان',
    
    // Add Reminder Dialog
    'reminder.addNew': 'افزودن یادآوری',
    'reminder.title': 'عنوان',
    'reminder.titlePlaceholder': 'مثلاً: واکسیناسیون سالانه',
    'reminder.type': 'نوع',
    'reminder.selectType': 'انتخاب نوع',
    'reminder.vaccination': 'واکسیناسیون',
    'reminder.antiparasitic': 'ضد انگل',
    'reminder.checkup': 'معاینه',
    'reminder.dueDate': 'تاریخ سررسید',
    'reminder.selectPet': 'انتخاب حیوان',
    'reminder.choosePet': 'یک حیوان انتخاب کنید',
    'reminder.notes': 'یادداشت (اختیاری)',
    'reminder.notesPlaceholder': 'توضیحات اضافی...',
    'reminder.cancel': 'انصراف',
    'reminder.add': 'افزودن',
    'reminder.adding': 'در حال افزودن...',
    'reminder.added': 'یادآوری با موفقیت اضافه شد!',
    'reminder.addError': 'خطا در افزودن یادآوری',
    'reminder.markComplete': 'تکمیل شد',
    
    // Health Vault
    'vault.title': 'پرونده سلامت',
    'vault.subtitle': 'مدارک و اسناد پزشکی',
    'vault.upload': 'آپلود',
    'vault.noRecords': 'هنوز مدرکی وجود ندارد',
    'vault.startUploading': 'شروع به آپلود اسناد پزشکی کنید',
    'vault.medicalTests': 'آزمایشات',
    'vault.prescriptions': 'نسخه‌ها',
    'vault.passports': 'شناسنامه',
    'vault.uploadNew': 'آپلود مدرک',
    'vault.category': 'دسته‌بندی',
    'vault.selectCategory': 'انتخاب دسته‌بندی',
    'vault.medicalTest': 'آزمایش پزشکی',
    'vault.prescription': 'نسخه',
    'vault.passport': 'شناسنامه/پاسپورت',
    'vault.recordTitle': 'عنوان',
    'vault.titlePlaceholder': 'مثلاً: نتایج آزمایش خون',
    'vault.recordDate': 'تاریخ مدرک',
    'vault.image': 'تصویر',
    'vault.uploading': 'در حال آپلود...',
    'vault.uploaded': 'مدرک با موفقیت آپلود شد!',
    'vault.uploadError': 'خطا در آپلود مدرک',
    
    // AI Chat
    'chat.title': 'دستیار هوش مصنوعی دامپزشکی',
    'chat.subtitle': 'هر سوالی درباره سلامت حیوان بپرسید',
    'chat.selectPet': 'انتخاب حیوان برای مشاوره',
    'chat.allPets': 'همه حیوانات',
    'chat.placeholder': 'سوال خود را درباره سلامت حیوان بپرسید...',
    'chat.send': 'ارسال',
    'chat.thinking': 'در حال فکر کردن...',
    'chat.error': 'خطا در دریافت پاسخ',
    'chat.suggestion1': 'حیوان من به چه واکسن‌هایی نیاز دارد؟',
    'chat.suggestion2': 'علائم بیماری‌های رایج حیوانات',
    'chat.suggestion3': 'نکات تغذیه‌ای برای حیوان من',
    'chat.newChat': 'گفتگوی جدید',
    'chat.noChats': 'هنوز گفتگویی ندارید. یک مکالمه جدید شروع کنید!',
    'chat.welcome': 'سلام! 👋',
    'chat.disclaimer': 'مشاوره هوش مصنوعی جایگزین مراقبت‌های دامپزشکی حرفه‌ای نیست.',
    
    // Profile
    'profile.title': 'پروفایل',
    'profile.editProfile': 'ویرایش پروفایل',
    'profile.fullName': 'نام کامل',
    'profile.email': 'ایمیل',
    'profile.save': 'ذخیره',
    'profile.saving': 'در حال ذخیره...',
    'profile.saved': 'پروفایل بروزرسانی شد!',
    'profile.saveError': 'خطا در بروزرسانی پروفایل',
    'profile.signOut': 'خروج',
    'profile.signingOut': 'در حال خروج...',
    'profile.pets': 'حیوانات',
    'profile.reminders': 'یادآوری‌ها',
    'profile.records': 'مدارک',
    'profile.language': 'زبان',
    'profile.english': 'English',
    'profile.persian': 'فارسی',
    
    // Common
    'common.loading': 'در حال بارگذاری...',
    'common.error': 'خطایی رخ داد',
    'common.retry': 'تلاش مجدد',
    'common.save': 'ذخیره',
    'common.cancel': 'انصراف',
    'common.delete': 'حذف',
    'common.edit': 'ویرایش',
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('petcare-language');
    return (saved as Language) || 'en';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('petcare-language', lang);
  };

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  const isRTL = language === 'fa';

  useEffect(() => {
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
    document.documentElement.classList.toggle('rtl', isRTL);
  }, [isRTL, language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isRTL }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
