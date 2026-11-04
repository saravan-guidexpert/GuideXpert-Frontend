import { Link } from 'react-router-dom';
import { FiMail, FiPhone } from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';

const linkClass =
  'text-gray-300 hover:text-white transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#001a2c] rounded';

const Footer = () => {
  const quickLinks = [
    { name: 'Privacy Policy', href: '#privacy' },
    { name: 'Terms & Conditions', to: '/terms-and-conditions' },
    { name: 'Blogs', to: '/blogs' },
    { name: 'Counselor Login', to: '/counsellor/login' },
    { name: 'About GuideXpert', href: '#about' },
  ];



  
  return (
    <footer
      role="contentinfo"
      className="border-t border-primary-blue-800/50 bg-[#001a2c] text-white"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-14">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 lg:gap-16 mb-10">
          {/* Left — Branding and Mission */}
          <div className="md:max-w-xs">
            <a
              href="#home"
              className="inline-block mb-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#001a2c] rounded transition-opacity hover:opacity-90"
              aria-label="GuideXpert home"
            >
              <img
                src="https://res.cloudinary.com/dfqdb1xws/image/upload/v1773394005/GuideXpert_Logo_inbaz5.png"
                alt="GuideXpert"
                className="h-9 sm:h-10 md:h-11 w-auto max-w-[190px] object-contain"
              />
            </a>
            <p className="text-gray-300 text-sm leading-relaxed">
              Making college and course selection transparent, personalized, and
              future-ready. Empowering counselors to guide students towards
              successful careers.
            </p>
          </div>

          {/* Middle — Contact Us */}
          <div>
            <h3 className="font-satoshi font-semibold text-sm text-white uppercase tracking-wider mb-6">
              Contact Us
            </h3>
            <ul className="space-y-4" role="list">
              <li className="flex items-start gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center text-primary-blue-400 mt-0.5" aria-hidden>
                  <FiMail className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-white text-sm mb-1">Email Support</p>
                  <a
                    href="mailto:support@guidexpert.co.in"
                    className={`text-sm ${linkClass}`}
                  >
                    support@guidexpert.co.in
                  </a>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center text-primary-blue-400 mt-0.5" aria-hidden>
                  <FiPhone className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-white text-sm mb-1">Phone Support</p>
                  <a
                    href="tel:+916304153859"
                    className={`text-sm ${linkClass}`}
                  >
                    +91 6304-153859
                  </a>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center text-primary-blue-400 mt-0.5" aria-hidden>
                  <FaWhatsapp className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-white text-sm mb-1">WhatsApp</p>
                  <a
                    href="https://wa.me/916304153659"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`text-sm ${linkClass}`}
                  >
                    +91 6304-153659
                  </a>
                </div>
              </li>
            </ul>
          </div>

          {/* Right — Quick Links */}
          <div>
            <h3 className="font-satoshi font-semibold text-sm text-white uppercase tracking-wider mb-6">
              Quick Links
            </h3>
            <ul className="space-y-3" role="list">
              {quickLinks.map((link) => (
                <li key={link.name}>
                  {link.to ? (
                    <Link to={link.to} className={`text-sm ${linkClass} inline-block`}>
                      {link.name}
                    </Link>
                  ) : (
                    <a href={link.href} className={`text-sm ${linkClass} inline-block`}>
                      {link.name}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar — Copyright and features */}
        <div className="pt-6 border-t border-white/10 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <p className="text-gray-400 text-xs">
            © {new Date().getFullYear()} GuideXpert. All rights reserved.
          </p>
          <p className="text-gray-400 text-xs text-center md:text-right">
            Trusted by thousands of counselors · PAN‑India presence · Professional certification
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;











































