import Head from 'next/head';
import Link from 'next/link';
import { 
  Mic, 
  BarChart3, 
  FileText, 
  Shield, 
  AlertCircle, 
  Zap,
  Download,
  Github,
  Twitter,
  Mail,
  ChevronRight,
  CheckCircle2,
  ArrowRight,
  Cpu,
  MessageSquare,
  TrendingUp,
  Clock,
  Building2,
  Scan,
  Check,
  Receipt,
  Radio
} from 'lucide-react';

// Feature Card Component
function FeatureCard({ icon: Icon, title, description, delay }) {
  return (
    <div 
      className="group p-6 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-slate-100 hover:border-primary-200 hover:-translate-y-1"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="w-14 h-14 bg-gradient-to-br from-primary-100 to-accent-100 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
        <Icon className="w-7 h-7 text-primary-600" />
      </div>
      <h3 className="text-xl font-bold text-slate-900 mb-2">{title}</h3>
      <p className="text-slate-600 leading-relaxed">{description}</p>
    </div>
  );
}

// Download Card Component
function DownloadCard({ platform, icon: Icon, downloadUrl, version, size, color }) {
  return (
    <a
      href={downloadUrl}
      className="flex items-center gap-4 p-5 bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-slate-100 hover:border-slate-200 group"
    >
      <div className={`w-16 h-16 ${color} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
        <Icon className="w-8 h-8 text-white" />
      </div>
      <div className="flex-1">
        <h4 className="font-bold text-slate-900">{platform}</h4>
        <p className="text-sm text-slate-500">v{version} • {size}</p>
      </div>
      <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center group-hover:bg-primary-500 transition-colors">
        <Download className="w-5 h-5 text-slate-600 group-hover:text-white" />
      </div>
    </a>
  );
}

// Testimonial Card
function TestimonialCard({ name, role, company, quote, delay }) {
  return (
    <div 
      className="p-6 bg-white rounded-2xl shadow-lg border border-slate-100"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-accent-500 rounded-full flex items-center justify-center text-white font-bold">
          {name.charAt(0)}
        </div>
        <div>
          <h4 className="font-semibold text-slate-900">{name}</h4>
          <p className="text-sm text-slate-500">{role} at {company}</p>
        </div>
      </div>
      <p className="text-slate-600 italic">"{quote}"</p>
    </div>
  );
}

export default function Home({ releases, latestVersion }) {
  // Parse GitHub releases for download links
  const getDownloadLink = (extension) => {
    if (!releases?.assets) return null;
    const asset = releases.assets.find(a => a.name.toLowerCase().endsWith(extension));
    return asset?.browser_download_url || null;
  };

  const windowsUrl = getDownloadLink('.exe');
  const macUrl = getDownloadLink('.dmg');
  const linuxDebUrl = getDownloadLink('.deb');
  const linuxAppImageUrl = getDownloadLink('.appimage');
  
  // Fallback to GitHub releases page if no direct download
  const githubReleasesUrl = 'https://github.com/jitenkr2030/Talk-to-Your-Accounts/releases/latest';

  // Check which platforms are available
  const platforms = {
    windows: !!windowsUrl,
    macos: !!macUrl,
    linuxDeb: !!linuxDebUrl,
    linuxAppImage: !!linuxAppImageUrl
  };

  const hasWindows = platforms.windows;
  const hasMacOS = platforms.macos;
  const hasLinux = platforms.linuxDeb || platforms.linuxAppImage;
  const hasAnyDownload = hasWindows || hasMacOS || hasLinux;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <Head>
        <title>Talk to Your Accounts - AI-Powered Desktop Accounting</title>
        <meta name="description" content="The AI-powered desktop accountant that listens, analyzes, and manages your business finances. Voice-controlled, GST compliant, and offline-first." />
        <link rel="icon" href="/favicon.ico" />
        <meta property="og:title" content="Talk to Your Accounts - Accounting at the Speed of Voice" />
        <meta property="og:description" content="AI-powered desktop accounting with voice commands. GST compliant, smart insights, and instant reports." />
        <meta property="og:type" content="website" />
      </Head>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-accent-600 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <span className="font-bold text-xl text-slate-900">Talk to Your Accounts</span>
            </div>
            
            <div className="hidden md:flex items-center gap-8">
              <a href="#core-features" className="text-slate-600 hover:text-primary-600 transition-colors">Features</a>
              <a href="#features" className="text-slate-600 hover:text-primary-600 transition-colors">All Features</a>
              <a href="#download" className="text-slate-600 hover:text-primary-600 transition-colors">Download</a>
              <a href="https://github.com/jitenkr2030/Talk-to-Your-Accounts" target="_blank" rel="noopener noreferrer" className="text-slate-600 hover:text-primary-600 transition-colors">GitHub</a>
              <a 
                href="#download"
                className="px-5 py-2.5 bg-gradient-to-r from-primary-500 to-primary-600 text-white font-medium rounded-lg hover:from-primary-600 hover:to-primary-700 transition-all shadow-lg shadow-primary-500/25"
              >
                Download Now
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 -left-1/4 w-1/2 h-1/2 bg-gradient-to-br from-primary-200/30 to-accent-200/30 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-gradient-to-tl from-accent-200/30 to-primary-200/30 rounded-full blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-50 rounded-full text-primary-700 text-sm font-medium mb-6">
                <Zap className="w-4 h-4" />
                AI-Powered Accounting
              </div>
              
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 leading-tight mb-6">
                Accounting at the{' '}
                <span className="text-gradient">Speed of Voice</span>
              </h1>
              
              <p className="text-lg sm:text-xl text-slate-600 mb-8 max-w-2xl mx-auto lg:mx-0">
                The AI-powered desktop accountant that listens, analyzes, and manages your business finances. 
                Features <span className="font-semibold text-primary-600">Voice Reconciliation</span> and <span className="font-semibold text-primary-600">Invoice Scanning</span> for effortless accounting.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <a 
                  href={hasWindows ? '#download' : 'https://github.com/jitenkr2030/Talk-to-Your-Accounts'}
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-primary-500 to-accent-600 text-white font-bold rounded-xl hover:from-primary-600 hover:to-accent-700 transition-all shadow-xl shadow-primary-500/25 hover:shadow-primary-500/40"
                >
                  <Download className="w-5 h-5" />
                  {hasWindows ? 'Download Free' : 'Learn More'}
                  <ArrowRight className="w-5 h-5" />
                </a>
                <a 
                  href="https://github.com/jitenkr2030/Talk-to-Your-Accounts"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-slate-700 font-bold rounded-xl border-2 border-slate-200 hover:border-slate-300 transition-all"
                >
                  <Github className="w-5 h-5" />
                  View on GitHub
                </a>
              </div>

              <div className="mt-8 flex items-center gap-6 justify-center lg:justify-start text-sm text-slate-500">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  Voice Reconciliation
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  Invoice Scanning
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  Free & Open Source
                </div>
                {hasWindows && (
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-blue-500" />
                    Windows Available
                  </div>
                )}
              </div>
            </div>

            {/* Right - App Preview */}
            <div className="relative hidden lg:block">
              <div className="relative animate-float">
                <div className="absolute inset-0 bg-gradient-to-r from-primary-500 to-accent-600 rounded-2xl blur-2xl opacity-20" />
                <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
                  {/* Mock App Interface */}
                  <div className="bg-slate-100 px-4 py-3 border-b border-slate-200 flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400" />
                    <div className="w-3 h-3 rounded-full bg-green-400" />
                    <div className="ml-4 flex-1 bg-white rounded-lg px-3 py-1.5 text-sm text-slate-400">
                      Say "Show my sales today"
                    </div>
                  </div>
                  <div className="p-6 space-y-4">
                    {/* Mock Stats */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl p-4 text-white">
                        <p className="text-white/80 text-sm">Today's Sales</p>
                        <p className="text-2xl font-bold">₹1,25,000</p>
                      </div>
                      <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl p-4 text-white">
                        <p className="text-white/80 text-sm">Pending</p>
                        <p className="text-2xl font-bold">₹45,000</p>
                      </div>
                    </div>
                    {/* Mock Voice Command */}
                    <div className="flex items-center gap-3 p-3 bg-primary-50 rounded-xl">
                      <div className="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center">
                        <Mic className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">Voice Command Active</p>
                        <p className="text-xs text-slate-500">Listening for commands...</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Features Section - Voice Reconciliation & Invoice Scanning */}
      <section id="core-features" className="py-20 px-4 bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-50 rounded-full text-primary-700 text-sm font-medium mb-6">
              <Zap className="w-4 h-4" />
              New Features
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              Two Powerful Features to Supercharge Your Accounting
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Experience the future of accounting with our two flagship features designed to save you hours of manual work.
            </p>
          </div>

          {/* Voice Reconciliation Feature */}
          <div className="grid lg:grid-cols-2 gap-12 items-center mb-20">
            <div className="order-2 lg:order-1">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-primary-500 to-accent-600 rounded-3xl blur-2xl opacity-20" />
                <div className="relative bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
                  {/* Mock Voice Reconciliation Interface */}
                  <div className="bg-slate-900 px-4 py-3 flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-400 animate-pulse" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400" />
                    <div className="w-3 h-3 rounded-full bg-green-400" />
                    <span className="ml-4 text-white/80 text-sm">Voice Reconciliation</span>
                  </div>
                  <div className="p-6 space-y-4">
                    {/* Voice Command Display */}
                    <div className="flex items-center gap-3 p-4 bg-primary-50 rounded-xl border border-primary-100">
                      <div className="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center">
                        <Mic className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">Voice Command</p>
                        <p className="text-xs text-slate-500">"Reconcile my bank statement for March"</p>
                      </div>
                    </div>
                    {/* Reconciliation Progress */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Reconciling transactions...</span>
                        <span className="text-primary-600 font-medium">67%</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-primary-500 to-accent-500 rounded-full transition-all duration-500" style={{ width: '67%' }} />
                      </div>
                    </div>
                    {/* Matched Items */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-green-600">
                        <Check className="w-4 h-4" />
                        <span className="font-medium">12 transactions matched</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-amber-600">
                        <AlertCircle className="w-4 h-4" />
                        <span className="font-medium">3 transactions need review</span>
                      </div>
                    </div>
                    {/* Action Button */}
                    <button className="w-full py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white font-medium rounded-xl hover:from-primary-600 hover:to-primary-700 transition-all">
                      Complete Reconciliation
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary-100 rounded-lg text-primary-700 text-sm font-medium mb-4">
                <Radio className="w-4 h-4" />
                Voice Reconciliation
              </div>
              <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-4">
                Reconcile Accounts with Your Voice
              </h3>
              <p className="text-lg text-slate-600 mb-6">
                Stop spending hours manually matching bank statements with your books. Our Voice Reconciliation feature uses AI to understand your natural voice commands and automatically reconcile transactions.
              </p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-4 h-4 text-green-600" />
                  </div>
                  <span className="text-slate-700">Natural voice commands like "Reconcile my bank statement"</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-4 h-4 text-green-600" />
                  </div>
                  <span className="text-slate-700">Automatic matching of bank transactions with ledger entries</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-4 h-4 text-green-600" />
                  </div>
                  <span className="text-slate-700">Smart suggestions for unmatched transactions</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-4 h-4 text-green-600" />
                  </div>
                  <span className="text-slate-700">Detailed reconciliation reports with one click</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Invoice Scanning Feature */}
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-accent-100 rounded-lg text-accent-700 text-sm font-medium mb-4">
                <Receipt className="w-4 h-4" />
                Invoice Scanning
              </div>
              <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-4">
                Scan Invoices and Capture Data Instantly
              </h3>
              <p className="text-lg text-slate-600 mb-6">
                Transform paper invoices into digital data within seconds. Simply point your camera or upload documents, and let our AI extract all the important details automatically.
              </p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-4 h-4 text-green-600" />
                  </div>
                  <span className="text-slate-700">Capture invoices via camera or upload scanned documents</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-4 h-4 text-green-600" />
                  </div>
                  <span className="text-slate-700">Automatic GST details extraction (GSTIN, HSN codes, amounts)</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-4 h-4 text-green-600" />
                  </div>
                  <span className="text-slate-700">Instant categorization and ledger entry suggestions</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-4 h-4 text-green-600" />
                  </div>
                  <span className="text-slate-700">Bulk scanning support for multiple invoices</span>
                </li>
              </ul>
            </div>
            <div>
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-accent-500 to-primary-600 rounded-3xl blur-2xl opacity-20" />
                <div className="relative bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
                  {/* Mock Invoice Scanning Interface */}
                  <div className="bg-slate-900 px-4 py-3 flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400" />
                    <div className="w-3 h-3 rounded-full bg-green-400" />
                    <span className="ml-4 text-white/80 text-sm">Invoice Scanner</span>
                  </div>
                  <div className="p-6 space-y-4">
                    {/* Upload Area */}
                    <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:border-primary-300 transition-colors cursor-pointer">
                      <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                        <Scan className="w-6 h-6 text-primary-600" />
                      </div>
                      <p className="text-sm text-slate-600">Drop invoice image here or</p>
                      <button className="mt-2 px-4 py-2 bg-primary-500 text-white text-sm font-medium rounded-lg hover:bg-primary-600 transition-colors">
                        Browse Files
                      </button>
                    </div>
                    {/* Scanned Result Preview */}
                    <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                      <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                        <span className="text-xs text-slate-500">Supplier</span>
                        <span className="text-sm font-medium text-slate-900">Tech Solutions Ltd</span>
                      </div>
                      <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                        <span className="text-xs text-slate-500">Invoice No.</span>
                        <span className="text-sm font-medium text-slate-900">TS-2024-0892</span>
                      </div>
                      <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                        <span className="text-xs text-slate-500">GSTIN</span>
                        <span className="text-sm font-medium text-slate-900">27AABCT1234A1Z5</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-500">Amount</span>
                        <span className="text-sm font-bold text-primary-600">₹24,500.00</span>
                      </div>
                    </div>
                    <button className="w-full py-3 bg-gradient-to-r from-accent-500 to-accent-600 text-white font-medium rounded-xl hover:from-accent-600 hover:to-accent-700 transition-all">
                      Save to Accounts
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              Everything You Need to Manage Your Business
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Powerful features designed for small businesses, from voice-controlled data entry to comprehensive GST reporting.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard 
              icon={Radio}
              title="Voice Reconciliation"
              description="Reconcile transactions using natural voice commands. Simply say 'Reconcile my bank statement' and let AI match transactions automatically across your accounts."
              delay={100}
            />
            <FeatureCard 
              icon={Scan}
              title="Invoice Scanning"
              description="Scan and digitize invoices instantly. Capture invoices via camera or upload documents, with automatic GST details extraction and seamless entry into your accounts."
              delay={200}
            />
            <FeatureCard 
              icon={Mic}
              title="Voice-Controlled Entry"
              description="Forget typing. Just say 'Log expense ₹500 for lunch' and let AI handle the categorization and entry automatically."
              delay={300}
            />
            <FeatureCard 
              icon={MessageSquare}
              title="Natural Language Queries"
              description="Ask questions like 'What's my profit this month?' or 'Who owes me money?' and get instant, accurate answers."
              delay={400}
            />
            <FeatureCard 
              icon={Cpu}
              title="AI-Powered Insights"
              description="Get real-time business health scores, predictive analytics, and smart recommendations based on your data."
              delay={500}
            />
            <FeatureCard 
              icon={FileText}
              title="GST Compliance"
              description="Automated GSTR-1 & GSTR-3B generation designed for Indian taxation standards. Export-ready reports."
              delay={600}
            />
            <FeatureCard 
              icon={BarChart3}
              title="Instant Reports"
              description="Generate Profit & Loss, Balance Sheet, Cash Flow, and more in seconds with one click."
              delay={700}
            />
            <FeatureCard 
              icon={Shield}
              title="Business Health Score"
              description="A single metric that tells you the financial stability of your business. Track improvement over time."
              delay={800}
            />
            <FeatureCard 
              icon={AlertCircle}
              title="Smart Alerts"
              description="Get notified about low balances, overdue payments, GST deadlines, and unusual transactions."
              delay={900}
            />
          </div>
        </div>
      </section>

      {/* Download Section */}
      <section id="download" className="py-20 px-4 bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              Download for Your Platform
            </h2>
            <p className="text-lg text-slate-600">
              Free forever for individuals and small businesses. 
              {latestVersion && <span className="font-semibold text-primary-600"> Latest version: v{latestVersion}</span>}
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Windows */}
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-100 hover:shadow-xl transition-all">
              <div className="w-16 h-16 bg-blue-500 rounded-2xl flex items-center justify-center mb-4">
                <svg className="w-10 h-10 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 24M24 12.6h-9.75v9.451L24 24"/>
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Windows</h3>
              <p className="text-slate-500 text-sm mb-4">Windows 10/11 (64-bit)</p>
              <a
                href={windowsUrl || 'https://github.com/jitenkr2030/Talk-to-Your-Accounts/releases'}
                className="inline-flex items-center justify-center w-full gap-2 px-4 py-3 bg-slate-900 text-white font-medium rounded-xl hover:bg-slate-800 transition-colors"
              >
                <Download className="w-4 h-4" />
                {windowsUrl ? 'Download .exe' : 'View Releases'}
              </a>
            </div>

            {/* macOS */}
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-100 hover:shadow-xl transition-all">
              <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center mb-4">
                <svg className="w-10 h-10 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">macOS</h3>
              <p className="text-slate-500 text-sm mb-4">Intel & Apple Silicon</p>
              <a
                href={macUrl || 'https://github.com/jitenkr2030/Talk-to-Your-Accounts/releases'}
                className="inline-flex items-center justify-center w-full gap-2 px-4 py-3 bg-slate-900 text-white font-medium rounded-xl hover:bg-slate-800 transition-colors"
              >
                <Download className="w-4 h-4" />
                {macUrl ? 'Download .dmg' : 'View Releases'}
              </a>
            </div>

            {/* Linux - .deb */}
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-100 hover:shadow-xl transition-all">
              <div className="w-16 h-16 bg-orange-500 rounded-2xl flex items-center justify-center mb-4">
                <svg className="w-10 h-10 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.503.986c-.588-.062-1.206.27-1.432.912-.226.642-.062 1.35.395 1.83.456.48 1.13.634 1.753.396.622-.238 1.065-.79 1.13-1.413.066-.622-.18-1.253-.605-1.574-.426-.321-.977-.422-1.241-.151z"/>
                  <path d="M21.478 14.21c-.17-.017-.35-.017-.53 0-.823.075-1.477.663-1.6 1.435-.124.772.347 1.5 1.123 1.755.775.255 1.577.047 2.075-.533.147-.173.246-.39.295-.62.05-.23.015-.473-.05-.696-.128-.438-.41-.796-.78-1.002-.37-.206-.822-.262-1.233-.339z"/>
                  <path d="M19.828 10.464c-.352-.03-.706.063-.998.273-.292.21-.506.525-.602.885-.096.36-.015.744.228 1.047.243.302.607.496 1.006.535.4.038.795-.084 1.093-.337.063-.053.117-.113.164-.178.047-.065.084-.135.108-.21.024-.075.03-.154.018-.232-.012-.078-.043-.153-.09-.223-.095-.14-.233-.255-.393-.328-.16-.072-.338-.104-.515-.103-.176 0-.35.032-.51.093-.16.06-.303.156-.416.279-.113.123-.197.276-.243.445-.023.084-.025.17-.005.254.02.083.06.16.115.226.055.066.122.118.196.153.073.035.152.05.233.043.08-.007.16-.034.233-.08.146-.092.26-.227.315-.383.055-.157.056-.332.002-.489-.054-.156-.16-.292-.299-.38z"/>
                  <path d="M5.66 17.196c-.37-.043-.736.065-1.018.303-.282.237-.464.564-.507.92-.042.356.052.718.262 1.003.21.285.525.47.878.518.353.047.708-.054 1.003-.29.295-.235.492-.568.552-.93.06-.362-.008-.73-.188-1.02-.18-.29-.456-.515-.78-.628-.102-.035-.208-.056-.302-.096v-.28z"/>
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Linux</h3>
              <p className="text-slate-500 text-sm mb-4">Ubuntu, Debian, etc.</p>
              <a
                href={linuxDebUrl || 'https://github.com/jitenkr2030/Talk-to-Your-Accounts/releases'}
                className="inline-flex items-center justify-center w-full gap-2 px-4 py-3 bg-slate-900 text-white font-medium rounded-xl hover:bg-slate-800 transition-colors"
              >
                <Download className="w-4 h-4" />
                {linuxDebUrl ? 'Download .deb' : 'View Releases'}
              </a>
            </div>

            {/* Linux - AppImage */}
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-100 hover:shadow-xl transition-all">
              <div className="w-16 h-16 bg-purple-600 rounded-2xl flex items-center justify-center mb-4">
                <svg className="w-10 h-10 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.503.986c-.588-.062-1.206.27-1.432.912-.226.642-.062 1.35.395 1.83.456.48 1.13.634 1.753.396.622-.238 1.065-.79 1.13-1.413.066-.622-.18-1.253-.605-1.574-.426-.321-.977-.422-1.241-.151z"/>
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Linux</h3>
              <p className="text-slate-500 text-sm mb-4">Any Distribution</p>
              <a
                href={linuxAppImageUrl || 'https://github.com/jitenkr2030/Talk-to-Your-Accounts/releases'}
                className="inline-flex items-center justify-center w-full gap-2 px-4 py-3 bg-slate-900 text-white font-medium rounded-xl hover:bg-slate-800 transition-colors"
              >
                <Download className="w-4 h-4" />
                {linuxAppImageUrl ? 'Download .AppImage' : 'View Releases'}
              </a>
            </div>
          </div>

          <div className="mt-12 p-6 bg-gradient-to-r from-primary-500 to-accent-600 rounded-2xl text-white text-center">
            <h3 className="text-xl font-bold mb-2">Need Help Getting Started?</h3>
            <p className="text-white/80 mb-4">Check out our documentation and GitHub repository for guides, tutorials, and support.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a 
                href="https://github.com/jitenkr2030/Talk-to-Your-Accounts"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-primary-600 font-medium rounded-xl hover:bg-white/90 transition-colors"
              >
                <Github className="w-5 h-5" />
                View Documentation
              </a>
              <a 
                href="https://github.com/jitenkr2030/Talk-to-Your-Accounts/releases"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white/20 text-white font-medium rounded-xl hover:bg-white/30 transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
                All Releases
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-6">
            Ready to Transform Your Accounting?
          </h2>
          <p className="text-lg text-slate-600 mb-8">
            Join thousands of business owners who are saving hours every week with voice-controlled accounting.
          </p>
          <a 
            href="#download"
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-primary-500 to-accent-600 text-white font-bold rounded-xl hover:from-primary-600 hover:to-accent-700 transition-all shadow-xl shadow-primary-500/25"
          >
            Download Now — It's Free
            <ArrowRight className="w-5 h-5" />
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            {/* Brand */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-accent-600 rounded-lg flex items-center justify-center">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <span className="font-bold text-xl">Talk to Your Accounts</span>
              </div>
              <p className="text-slate-400 mb-4 max-w-md">
                AI-powered desktop accounting software that listens to your voice and manages your business finances effortlessly.
              </p>
              <div className="flex gap-4">
                <a 
                  href="https://github.com/jitenkr2030/Talk-to-Your-Accounts"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center hover:bg-slate-700 transition-colors"
                >
                  <Github className="w-5 h-5" />
                </a>
                <a 
                  href="#"
                  className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center hover:bg-slate-700 transition-colors"
                >
                  <Twitter className="w-5 h-5" />
                </a>
                <a 
                  href="#"
                  className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center hover:bg-slate-700 transition-colors"
                >
                  <Mail className="w-5 h-5" />
                </a>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2">
                <li><a href="#core-features" className="text-slate-400 hover:text-white transition-colors">Core Features</a></li>
                <li><a href="#features" className="text-slate-400 hover:text-white transition-colors">All Features</a></li>
                <li><a href="#download" className="text-slate-400 hover:text-white transition-colors">Download</a></li>
                <li><a href="https://github.com/jitenkr2030/Talk-to-Your-Accounts" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-white transition-colors">Documentation</a></li>
                <li><a href="https://github.com/jitenkr2030/Talk-to-Your-Accounts/releases" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-white transition-colors">Releases</a></li>
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h4 className="font-semibold mb-4">Resources</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-slate-400 hover:text-white transition-colors">Getting Started</a></li>
                <li><a href="#" className="text-slate-400 hover:text-white transition-colors">GST Guide</a></li>
                <li><a href="#" className="text-slate-400 hover:text-white transition-colors">Voice Commands</a></li>
                <li><a href="#" className="text-slate-400 hover:text-white transition-colors">Support</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-slate-400 text-sm">
              © {new Date().getFullYear()} Talk to Your Accounts. Open source under MIT License.
            </p>
            <div className="flex items-center gap-4 text-sm text-slate-400">
              <span className="flex items-center gap-1">
                <Building2 className="w-4 h-4" />
                Made with ❤️ in India
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export async function getServerSideProps() {
  try {
    const response = await fetch('https://api.github.com/repos/jitenkr2030/Talk-to-Your-Accounts/releases/latest');
    
    if (response.ok) {
      const releases = await response.json();
      return {
        props: {
          releases,
          latestVersion: releases.tag_name?.replace('v', '') || '1.0.0'
        }
      };
    }
  } catch (error) {
    console.error('Failed to fetch releases:', error);
  }
  
  return {
    props: {
      releases: null,
      latestVersion: '1.0.0'
    }
  };
}
