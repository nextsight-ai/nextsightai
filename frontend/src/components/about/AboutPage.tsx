import { useState } from 'react';
import {
  InformationCircleIcon,
  SparklesIcon,
  CodeBracketIcon,
  ShieldCheckIcon,
  CpuChipIcon,
  RocketLaunchIcon,
  HeartIcon,
  GlobeAltIcon,
} from '@heroicons/react/24/outline';
import { useTheme } from '../../contexts/ThemeContext';
import { getThemeColors } from '../../styles/linear-design';

const features = [
  {
    icon: CpuChipIcon,
    name: 'Kubernetes Management',
    description: 'Full lifecycle management of Kubernetes clusters, workloads, and resources.',
  },
  {
    icon: SparklesIcon,
    name: 'AI-Powered Insights',
    description: 'Intelligent recommendations for optimization, security, and cost management.',
  },
  {
    icon: ShieldCheckIcon,
    name: 'Security Center',
    description: 'Comprehensive security scanning and vulnerability management.',
  },
  {
    icon: RocketLaunchIcon,
    name: 'GitOps Deployments',
    description: 'Seamless integration with ArgoCD, Helm, and CI/CD pipelines.',
  },
];

const techStack = [
  { name: 'React', version: '18.x' },
  { name: 'TypeScript', version: '5.x' },
  { name: 'Tailwind CSS', version: '3.x' },
  { name: 'FastAPI', version: '0.109.x' },
  { name: 'Python', version: '3.11+' },
  { name: 'Kubernetes Client', version: '28.x' },
];

export default function AboutPage() {
  const { theme } = useTheme();
  const t = getThemeColors(theme);

  const [githubHover, setGithubHover] = useState(false);
  const [docsHover, setDocsHover] = useState(false);

  return (
    <div style={{ color: t.text }}>
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '24px 32px' }}>

        {/* Page title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
          <InformationCircleIcon style={{ width: 20, height: 20, color: t.info }} />
          <div>
            <h1 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: t.text }}>About NextSight AI</h1>
            <p style={{ margin: 0, fontSize: 12, color: t.textSub }}>AI-Driven Kubernetes &amp; DevOps Management Platform</p>
          </div>
        </div>

        {/* Hero Card */}
        <div
          style={{
            background: t.cardBg,
            border: `1px solid ${t.cardBorder}`,
            borderRadius: 14,
            padding: 28,
            marginBottom: 24,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20 }}>
            <div
              style={{
                background: t.infoBg,
                borderRadius: 12,
                padding: 14,
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <SparklesIcon style={{ width: 32, height: 32, color: t.info }} />
            </div>
            <div style={{ flex: 1 }}>
              <h2 style={{ margin: '0 0 6px 0', fontSize: 22, fontWeight: 700, color: t.text }}>
                NextSight AI
              </h2>
              <p style={{ margin: '0 0 16px 0', fontSize: 13, color: t.textSub, lineHeight: 1.6 }}>
                A comprehensive platform for managing Kubernetes clusters with AI-powered insights,
                GitOps workflows, and enterprise-grade security. Designed to simplify DevOps operations
                while providing deep visibility into your infrastructure.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <span
                  style={{
                    background: t.infoBg,
                    color: t.info,
                    padding: '2px 10px',
                    borderRadius: 9999,
                    fontSize: 11,
                    fontWeight: 500,
                  }}
                >
                  v1.4.1
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: t.success }}>
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: t.success,
                      flexShrink: 0,
                    }}
                  />
                  Stable Release
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ margin: '0 0 14px 0', fontSize: 11, fontWeight: 600, color: t.textMuted, textTransform: 'uppercase', letterSpacing: 1 }}>
            Key Features
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {features.map((feature) => (
              <div
                key={feature.name}
                style={{
                  background: t.cardBg,
                  border: `1px solid ${t.cardBorder}`,
                  borderRadius: 12,
                  padding: 20,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div
                    style={{
                      background: t.infoBg,
                      borderRadius: 8,
                      padding: 8,
                      flexShrink: 0,
                    }}
                  >
                    <feature.icon style={{ width: 18, height: 18, color: t.info }} />
                  </div>
                  <div>
                    <h4 style={{ margin: '0 0 4px 0', fontSize: 13, fontWeight: 600, color: t.text }}>
                      {feature.name}
                    </h4>
                    <p style={{ margin: 0, fontSize: 12, color: t.textSub, lineHeight: 1.5 }}>
                      {feature.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tech Stack */}
        <div
          style={{
            background: t.cardBg,
            border: `1px solid ${t.cardBorder}`,
            borderRadius: 12,
            padding: 20,
            marginBottom: 24,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <CodeBracketIcon style={{ width: 16, height: 16, color: t.textSub }} />
            <h3 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: t.text }}>Technology Stack</h3>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {techStack.map((tech) => (
              <span
                key={tech.name}
                style={{
                  background: t.cardBg,
                  border: `1px solid ${t.cardBorder}`,
                  borderRadius: 6,
                  padding: '5px 12px',
                  fontSize: 12,
                  fontWeight: 500,
                  color: t.text,
                }}
              >
                {tech.name}{' '}
                <span style={{ color: t.textMuted, fontWeight: 400 }}>{tech.version}</span>
              </span>
            ))}
          </div>
        </div>

        {/* Links Section */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
          <a
            href="https://github.com/nexsight/nexsight-ai"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              padding: 20,
              background: t.cardBg,
              border: `1px solid ${githubHover ? t.info : t.cardBorder}`,
              borderRadius: 12,
              textDecoration: 'none',
              transition: 'border-color 0.15s',
            }}
            onMouseEnter={() => setGithubHover(true)}
            onMouseLeave={() => setGithubHover(false)}
          >
            <div
              style={{
                background: t.cardBorder,
                borderRadius: 10,
                padding: 10,
                flexShrink: 0,
              }}
            >
              <CodeBracketIcon style={{ width: 20, height: 20, color: t.text }} />
            </div>
            <div>
              <h4 style={{ margin: '0 0 3px 0', fontSize: 13, fontWeight: 600, color: t.text }}>
                GitHub Repository
              </h4>
              <p style={{ margin: 0, fontSize: 12, color: t.textSub }}>View source code and contribute</p>
            </div>
          </a>

          <a
            href="https://docs.nexsight.ai"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              padding: 20,
              background: t.cardBg,
              border: `1px solid ${docsHover ? t.info : t.cardBorder}`,
              borderRadius: 12,
              textDecoration: 'none',
              transition: 'border-color 0.15s',
            }}
            onMouseEnter={() => setDocsHover(true)}
            onMouseLeave={() => setDocsHover(false)}
          >
            <div
              style={{
                background: t.infoBg,
                borderRadius: 10,
                padding: 10,
                flexShrink: 0,
              }}
            >
              <GlobeAltIcon style={{ width: 20, height: 20, color: t.info }} />
            </div>
            <div>
              <h4 style={{ margin: '0 0 3px 0', fontSize: 13, fontWeight: 600, color: t.text }}>
                Documentation
              </h4>
              <p style={{ margin: 0, fontSize: 12, color: t.textSub }}>Learn how to use NextSight AI</p>
            </div>
          </a>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', paddingTop: 16, paddingBottom: 8 }}>
          <p style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, margin: '0 0 6px 0', fontSize: 13, color: t.textSub }}>
            Built with{' '}
            <HeartIcon style={{ width: 14, height: 14, color: t.error }} />{' '}
            by the NextSight Team
          </p>
          <p style={{ margin: 0, fontSize: 11, color: t.textMuted }}>
            &copy; {new Date().getFullYear()} NextSight AI. All rights reserved.
          </p>
        </div>

      </div>
    </div>
  );
}
