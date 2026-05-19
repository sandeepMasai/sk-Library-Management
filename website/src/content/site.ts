export const SITE = {
  name: 'SmartLibDesk',
  tagline: 'Library management made simple',
  supportEmail: 'support@smartlibdesk.in',
  noreplyEmail: 'noreply@smartlibdesk.in',
  company: 'SmartLibDesk',
  address: 'India',
} as const;

export const STATS = [
  { value: '10K+', label: 'Daily check-ins' },
  { value: '500+', label: 'Libraries onboarded' },
  { value: '99.9%', label: 'Uptime target' },
  { value: '24/7', label: 'Cloud backed' },
] as const;

export const HOW_IT_WORKS = [
  { step: '01', title: 'Register your library', desc: 'Verify email, set location, and get your unique library code.' },
  { step: '02', title: 'Add students & seats', desc: 'Import members, assign seats, and configure shifts.' },
  { step: '03', title: 'Run daily operations', desc: 'QR attendance, notifications, renewals, and reports.' },
  { step: '04', title: 'Subscribe via Razorpay', desc: 'Choose a plan and pay securely inside the app.' },
] as const;

export const TESTIMONIALS = [
  {
    quote: 'Attendance used to be manual registers. Now one QR and we are done in minutes.',
    author: 'Rahul K.',
    role: 'Library owner, Pune',
  },
  {
    quote: 'Seat allocation and renewal requests saved us hours every week.',
    author: 'Priya S.',
    role: 'Study hall, Hyderabad',
  },
] as const;

export const FAQ = [
  {
    q: 'Do students pay through the website?',
    a: 'Student fees are managed by each library. Library subscriptions are paid via Razorpay in the mobile app.',
  },
  {
    q: 'Can I try before subscribing?',
    a: 'Yes — start with the Trial plan (₹99 for 30 days) after registering your library.',
  },
  {
    q: 'Is my data isolated from other libraries?',
    a: 'Yes. SmartLibDesk is multi-tenant: each library only sees its own students and data.',
  },
] as const;

export const NAV_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/about', label: 'About' },
  { to: '/services', label: 'Services' },
  { to: '/pricing', label: 'Pricing' },
  { to: '/contact', label: 'Contact' },
] as const;

export const FOOTER_LINKS = {
  company: [...NAV_LINKS, { to: '/login', label: 'Login' }, { to: '/register', label: 'Register' }],
  legal: [
    { to: '/privacy-policy', label: 'Privacy Policy' },
    { to: '/terms', label: 'Terms & Conditions' },
    { to: '/refund-policy', label: 'Refund Policy' },
  ],
} as const;

export const PLANS = [
  {
    key: 'trial',
    name: 'Trial Plan',
    price: 99,
    duration: '30 days',
    tag: 'Start here',
    features: ['Full dashboard', 'Up to library seat limit', 'Email support'],
  },
  {
    key: 'monthly',
    name: 'Monthly',
    price: 999,
    duration: '30 days',
    tag: null,
    features: ['Everything in Trial', 'Monthly billing', 'Priority support'],
  },
  {
    key: '6month',
    name: '6 Month',
    price: 4999,
    duration: '180 days',
    tag: 'Popular',
    features: ['Best for growing halls', 'Save vs monthly', 'Razorpay invoice'],
  },
  {
    key: 'yearly',
    name: 'Yearly',
    price: 9999,
    duration: '365 days',
    tag: 'Best Value',
    features: ['Maximum savings', 'Annual billing', 'Dedicated onboarding'],
  },
] as const;

export const SERVICES = [
  {
    title: 'Student management',
    description: 'Add, edit, and manage students with profiles, plans, and renewal workflows.',
    icon: '👥',
  },
  {
    title: 'QR attendance',
    description: 'One library QR for daily check-in with time windows and attendance history.',
    icon: '📱',
  },
  {
    title: 'Seat allocation',
    description: 'Spaces, shifts, and seat assignments for organized study halls.',
    icon: '🪑',
  },
  {
    title: 'Notifications',
    description: 'Keep students and staff informed with in-app alerts and announcements.',
    icon: '🔔',
  },
  {
    title: 'Subscription billing',
    description: 'Library plans with secure payments processed via Razorpay.',
    icon: '💳',
  },
  {
    title: 'Reports & dashboard',
    description: 'Attendance, revenue, and library insights at a glance.',
    icon: '📊',
  },
] as const;
