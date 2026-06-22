'use client';

import Link from 'next/link';

const stats = [
  { value: '500+', label: 'Active Suppliers' },
  { value: '10,000+', label: 'Products Listed' },
  { value: '50,000+', label: 'Orders Fulfilled' },
];

const valueProps = [
  {
    icon: (
      <svg className="w-8 h-8 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
      </svg>
    ),
    title: 'Reach More Merchants',
    description: 'Connect with thousands of restaurants and hospitality businesses actively sourcing supplies through NextaBizz.',
  },
  {
    icon: (
      <svg className="w-8 h-8 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
    title: 'Automated Order Management',
    description: 'Streamline your order processing with automated purchase order handling, status updates, and delivery tracking.',
  },
  {
    icon: (
      <svg className="w-8 h-8 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    title: 'Performance Tracking',
    description: 'Monitor your delivery performance, response rates, and customer satisfaction with detailed analytics dashboards.',
  },
];

const testimonials = [
  {
    quote: 'NextaBizz helped us expand our customer base by 300% in just 6 months. The platform is intuitive and the support team is excellent.',
    author: 'Rajesh Kumar',
    role: 'Founder, FreshFarm Foods',
    avatar: 'RK',
  },
  {
    quote: 'The automated order management saves us hours every day. We can focus on quality products instead of paperwork.',
    author: 'Priya Sharma',
    role: 'Operations Director, SpiceMart Distributors',
    avatar: 'PS',
  },
  {
    quote: 'Performance insights helped us improve our delivery score from 3.5 to 4.8. More orders, better reputation.',
    author: 'Amit Patel',
    role: 'CEO, QualityFirst Supplies',
    avatar: 'AP',
  },
];

export default function SupplierPortalHome() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-b border-gray-100 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">NB</span>
              </div>
              <span className="text-xl font-bold text-gray-900">NextaBizz</span>
              <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 rounded">
                Supplier Portal
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/login"
                className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
              >
                Register
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-purple-50 via-white to-purple-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
              Grow your <span className="text-purple-600">B2B business</span> with NextaBizz
            </h1>
            <p className="mt-6 text-xl text-gray-600 max-w-2xl mx-auto">
              Join India&apos;s fastest-growing B2B supply chain platform. Connect with thousands of merchants, automate orders, and scale your business effortlessly.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/register"
                className="px-8 py-4 bg-purple-600 text-white rounded-xl font-semibold text-lg hover:bg-purple-700 transition-all shadow-lg shadow-purple-200 hover:shadow-xl hover:shadow-purple-300"
              >
                Register as Supplier
              </Link>
              <Link
                href="/login"
                className="px-8 py-4 bg-white text-purple-600 border-2 border-purple-200 rounded-xl font-semibold text-lg hover:border-purple-300 hover:bg-purple-50 transition-all"
              >
                Supplier Login
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-purple-600">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-5xl font-bold text-white">{stat.value}</div>
                <div className="mt-2 text-purple-200 text-lg">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Value Props Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
              Everything you need to succeed
            </h2>
            <p className="mt-4 text-xl text-gray-600">
              Powerful tools designed specifically for B2B suppliers
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {valueProps.map((prop, index) => (
              <div
                key={index}
                className="p-8 bg-white rounded-2xl border border-gray-200 hover:border-purple-200 hover:shadow-lg transition-all"
              >
                <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center">
                  {prop.icon}
                </div>
                <h3 className="mt-6 text-xl font-semibold text-gray-900">{prop.title}</h3>
                <p className="mt-3 text-gray-600">{prop.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
              Trusted by suppliers nationwide
            </h2>
            <p className="mt-4 text-xl text-gray-600">
              See what our supplier partners have to say
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className="p-8 bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-center space-x-1 text-yellow-400 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <blockquote className="text-gray-700 italic">&ldquo;{testimonial.quote}&rdquo;</blockquote>
                <div className="mt-6 flex items-center space-x-3">
                  <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-semibold text-sm">{testimonial.avatar}</span>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">{testimonial.author}</div>
                    <div className="text-sm text-gray-500">{testimonial.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-purple-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white">
            Ready to grow your business?
          </h2>
          <p className="mt-4 text-xl text-purple-100">
            Join hundreds of suppliers already selling on NextaBizz. Setup takes less than 5 minutes.
          </p>
          <div className="mt-10">
            <Link
              href="/register"
              className="inline-block px-10 py-4 bg-white text-purple-600 rounded-xl font-semibold text-lg hover:bg-purple-50 transition-colors"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 bg-gray-900">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-6 md:mb-0">
              <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">NB</span>
              </div>
              <span className="text-xl font-bold text-white">NextaBizz</span>
            </div>
            <div className="flex space-x-8 text-gray-400">
              <a href="#" className="hover:text-white transition-colors">About</a>
              <a href="#" className="hover:text-white transition-colors">Support</a>
              <a href="#" className="hover:text-white transition-colors">Privacy</a>
              <a href="#" className="hover:text-white transition-colors">Terms</a>
            </div>
          </div>
          <div className="mt-8 text-center text-gray-500 text-sm">
            &copy; {new Date().getFullYear()} NextaBizz. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
