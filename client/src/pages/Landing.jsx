import { useNavigate } from 'react-router-dom';
import { FiArrowRight, FiBookOpen, FiEdit3, FiTrendingUp, FiBookmark, FiRefreshCw, FiAward } from 'react-icons/fi';
import AnimatedBackground from '../components/common/AnimatedBackground';

const features = [
  {
    icon: <FiBookOpen />,
    title: 'Word of the Day',
    desc: 'Start each day with a handpicked word — complete with definition, pronunciation, examples, synonyms, and antonyms.',
    color: 'var(--accent-primary)',
    bg: 'var(--accent-primary-bg)',
  },
  {
    icon: <FiRefreshCw />,
    title: 'Smart Revision',
    desc: 'Add words to your personal revision list and review them anytime. Mark words as "learned" when you\'ve mastered them.',
    color: 'var(--accent-teal)',
    bg: 'var(--accent-teal-bg)',
  },
  {
    icon: <FiBookmark />,
    title: 'Bookmark & Save',
    desc: 'Save words you love to your personal library. Access your entire saved collection anytime, even after they expire from the daily feed.',
    color: 'var(--accent-info)',
    bg: 'var(--accent-info-bg)',
  },
  {
    icon: <FiEdit3 />,
    title: 'Interactive Quizzes',
    desc: 'Test your knowledge with auto-generated quizzes based on your daily words. Get instant scores and track your accuracy over time.',
    color: 'var(--accent-warning)',
    bg: 'var(--accent-warning-bg)',
  },
  {
    icon: <FiTrendingUp />,
    title: 'Progress Dashboard',
    desc: 'Visualize your learning journey with weekly activity charts, streaks, quiz performance, and detailed stats — all in one place.',
    color: 'var(--accent-secondary)',
    bg: 'rgba(228, 75, 194, 0.08)',
  },
  {
    icon: <FiAward />,
    title: 'Leaderboard',
    desc: 'Compete with fellow learners! Climb the ranks based on your learning streaks, quiz scores, and overall engagement.',
    color: 'var(--accent-coral)',
    bg: 'var(--accent-coral-bg)',
  },
];

const steps = [
  { num: '01', title: 'Sign Up Free', desc: 'Create your account in seconds — no credit card needed.' },
  { num: '02', title: 'Explore Daily Words', desc: 'Discover new curated words every day across GRE, IELTS, and Business categories.' },
  { num: '03', title: 'Practice & Revise', desc: 'Bookmark words, add them to revision, and test yourself with quizzes.' },
  { num: '04', title: 'Track & Grow', desc: 'Monitor your streaks, quiz accuracy, and weekly progress on your dashboard.' },
];



export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="landing-page">
      <AnimatedBackground variant="landing" />
      <div className="landing-bg-overlay" />

      <div className="landing-content">
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '36px', height: '36px',
              background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-primary-light))',
              borderRadius: 'var(--radius-sm)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontSize: '1.1rem'
            }}>
              <FiBookOpen />
            </div>
            <span style={{ fontSize: '1.3rem', fontWeight: 800, letterSpacing: '-0.02em' }} className="text-gradient">
              Edicto
            </span>
          </div>
          <button className="btn btn-ghost" onClick={() => navigate('/login')} style={{ fontSize: '0.85rem' }}>
            Sign In <FiArrowRight size={14} />
          </button>
        </div>

        {/* Hero */}
        <div className="landing-hero">
          <div className="landing-badge animate-fade-in">
            ✨ Your vocabulary companion
          </div>

          <h1 className="landing-title animate-fade-in-up stagger-1">
            Master Words,<br />
            <span className="text-gradient">Elevate Your Mind</span>
          </h1>

          <p className="landing-subtitle animate-fade-in-up stagger-2">
            A smart vocabulary platform that delivers fresh words daily, helps you revise with purpose, quizzes you to reinforce memory, and tracks every step of your progress — built for GRE, IELTS, and beyond.
          </p>

          <div className="landing-cta-group animate-fade-in-up stagger-3">
            <button className="btn btn-primary btn-lg" onClick={() => navigate('/register')}>
              Start Learning Free <FiArrowRight />
            </button>
            <button className="btn btn-secondary btn-lg" onClick={() => navigate('/login')}>
              Sign In
            </button>
          </div>
        </div>

        {/* How It Works */}
        <div style={{ marginTop: '80px' }}>
          <h2 className="landing-section-heading animate-fade-in-up">How It Works</h2>
          <p className="landing-section-subheading animate-fade-in-up">Four simple steps to a stronger vocabulary</p>
          <div className="landing-steps-grid">
            {steps.map((step, i) => (
              <div key={step.num} className={`landing-step-card animate-fade-in-up stagger-${i + 1}`}>
                <div className="landing-step-num">{step.num}</div>
                <h3 className="landing-step-title">{step.title}</h3>
                <p className="landing-step-desc">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Features */}
        <div style={{ marginTop: '80px' }}>
          <h2 className="landing-section-heading animate-fade-in-up">Everything You Need</h2>
          <p className="landing-section-subheading animate-fade-in-up">Packed with tools to make vocabulary building effective and enjoyable</p>
          <div className="landing-features">
            {features.map((feature, i) => (
              <div key={feature.title} className={`landing-feature-card animate-fade-in-up stagger-${Math.min(i + 1, 6)}`}>
                <div className="landing-feature-icon" style={{ background: feature.bg, color: feature.color }}>
                  {feature.icon}
                </div>
                <h3 className="landing-feature-title">{feature.title}</h3>
                <p className="landing-feature-desc">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>



        {/* Final CTA */}
        <div className="landing-final-cta animate-fade-in-up" style={{ marginTop: '80px' }}>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '12px', letterSpacing: '-0.02em' }}>
            Ready to <span className="text-gradient">expand your vocabulary?</span>
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', marginBottom: '24px', maxWidth: '500px', margin: '0 auto 24px' }}>
            Join Edicto today and start your journey toward mastering words — one day at a time.
          </p>
          <button className="btn btn-primary btn-lg" onClick={() => navigate('/register')}>
            Get Started — It's Free <FiArrowRight />
          </button>
        </div>

        {/* Footer */}
        <div style={{
          textAlign: 'center',
          marginTop: '80px',
          padding: '24px 0',
          borderTop: '1px solid var(--border-light)',
          color: 'var(--text-light)',
          fontSize: '0.8rem'
        }}>
          © 2026 Edicto. Crafted for learners who love words.
        </div>
      </div>
    </div>
  );
}
