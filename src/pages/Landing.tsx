import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { PawPrint, Heart, Calendar, FileText, MessageCircle, Shield, Sparkles, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

const Landing = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { language, isRTL } = useLanguage();

  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  const features = language === 'fa' ? [
    {
      icon: Calendar,
      title: 'یادآوری هوشمند',
      description: 'واکسن، ضدانگل و چکاپ‌ها رو هیچوقت فراموش نکن',
      color: 'bg-primary/10 text-primary',
    },
    {
      icon: FileText,
      title: 'صندوق سلامت',
      description: 'همه مدارک پزشکی حیوانت رو یکجا نگهداری کن',
      color: 'bg-secondary/10 text-secondary',
    },
    {
      icon: Sparkles,
      title: 'تحلیل هوش مصنوعی',
      description: 'مدارک پزشکی رو با AI بررسی کن و نکات مهم رو بفهم',
      color: 'bg-accent/10 text-accent-foreground',
    },
    {
      icon: MessageCircle,
      title: 'چت با دستیار AI',
      description: 'سوالات مراقبتی از حیوانت رو از دستیار هوشمند بپرس',
      color: 'bg-primary/10 text-primary',
    },
  ] : [
    {
      icon: Calendar,
      title: 'Smart Reminders',
      description: 'Never forget vaccinations, anti-parasitics, or checkups',
      color: 'bg-primary/10 text-primary',
    },
    {
      icon: FileText,
      title: 'Health Vault',
      description: 'Keep all your pet\'s medical records in one place',
      color: 'bg-secondary/10 text-secondary',
    },
    {
      icon: Sparkles,
      title: 'AI Analysis',
      description: 'Analyze medical documents with AI to understand key points',
      color: 'bg-accent/10 text-accent-foreground',
    },
    {
      icon: MessageCircle,
      title: 'AI Assistant Chat',
      description: 'Ask your pet care questions to our smart assistant',
      color: 'bg-primary/10 text-primary',
    },
  ];

  return (
    <div className={cn("min-h-screen bg-background", isRTL && "rtl")} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center">
              <PawPrint className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl text-foreground">
              {language === 'fa' ? 'ویتاپت' : 'VitaPet'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link to="/auth">
                {language === 'fa' ? 'ورود' : 'Sign In'}
              </Link>
            </Button>
            <Button asChild>
              <Link to="/auth">
                {language === 'fa' ? 'شروع رایگان' : 'Get Started'}
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 bg-gradient-hero">
        <div className="container mx-auto text-center max-w-3xl">
          {/* Floating elements for playful feel */}
          <div className="relative mb-8">
            <div className="inline-flex items-center justify-center">
              <div className="relative">
                <div className="w-24 h-24 rounded-3xl bg-gradient-primary flex items-center justify-center shadow-glow animate-fade-in">
                  <PawPrint className="w-12 h-12 text-primary-foreground" />
                </div>
                <Heart className="absolute -top-2 -right-2 w-8 h-8 text-destructive fill-destructive animate-bounce" style={{ animationDuration: '2s' }} />
              </div>
            </div>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-extrabold text-foreground mb-4 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            {language === 'fa' ? (
              <>
                <span className="text-primary">ویتاپت</span>
                <br />
                همراه هوشمند سلامت پت شما
              </>
            ) : (
              <>
                <span className="text-primary">VitaPet</span>
                <br />
                Your Pet's Smart Health Companion
              </>
            )}
          </h1>
          
          <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto animate-fade-in" style={{ animationDelay: '0.2s' }}>
            {language === 'fa' 
              ? 'یادآوری واکسن، ذخیره مدارک پزشکی، و چت با دستیار هوش مصنوعی - همه چیز برای سلامت دوست پشمالوت!'
              : 'Vaccination reminders, medical record storage, and AI assistant chat - everything for your furry friend\'s health!'
            }
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <Button size="lg" className="text-lg px-8 py-6 shadow-glow" asChild>
              <Link to="/auth">
                {language === 'fa' ? 'همین الان شروع کن' : 'Start Now for Free'}
                {!isRTL && <ChevronLeft className="w-5 h-5 ms-2 rotate-180" />}
                {isRTL && <ChevronLeft className="w-5 h-5 me-2" />}
              </Link>
            </Button>
          </div>

          {/* Trust badge */}
          <div className="mt-12 flex items-center justify-center gap-2 text-muted-foreground animate-fade-in" style={{ animationDelay: '0.4s' }}>
            <Shield className="w-5 h-5 text-primary" />
            <span className="text-sm">
              {language === 'fa' ? 'اطلاعات شما امن و محفوظ است' : 'Your data is safe and secure'}
            </span>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-background">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-3">
              {language === 'fa' ? 'چرا ویتاپت؟' : 'Why VitaPet?'}
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              {language === 'fa' 
                ? 'همه چیزی که برای مراقبت بهتر از حیوان خانگیت نیاز داری'
                : 'Everything you need to better care for your pet'
              }
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {features.map((feature, index) => (
              <div 
                key={feature.title}
                className="p-6 rounded-2xl border border-border bg-card hover:shadow-lg transition-all duration-300 animate-fade-in"
                style={{ animationDelay: `${0.1 * index}s` }}
              >
                <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center mb-4", feature.color)}>
                  <feature.icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-hero">
        <div className="container mx-auto max-w-2xl text-center">
          <div className="p-8 rounded-3xl bg-card border border-border shadow-elegant">
            <div className="w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center mx-auto mb-6">
              <Heart className="w-8 h-8 text-primary-foreground" />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
              {language === 'fa' 
                ? 'آماده‌ای بهتر از پتت مراقبت کنی؟'
                : 'Ready to better care for your pet?'
              }
            </h2>
            <p className="text-muted-foreground mb-6">
              {language === 'fa'
                ? 'رایگان شروع کن و از امکانات ویتاپت لذت ببر'
                : 'Start for free and enjoy VitaPet features'
              }
            </p>
            <Button size="lg" className="text-lg px-8 py-6 shadow-glow" asChild>
              <Link to="/auth">
                {language === 'fa' ? 'ثبت نام رایگان' : 'Sign Up Free'}
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 bg-muted/30 border-t border-border">
        <div className="container mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
              <PawPrint className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-foreground">
              {language === 'fa' ? 'ویتاپت' : 'VitaPet'}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            {language === 'fa' 
              ? '© ۱۴۰۴ ویتاپت - با ❤️ برای دوستداران حیوانات'
              : '© 2025 VitaPet - Made with ❤️ for pet lovers'
            }
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;