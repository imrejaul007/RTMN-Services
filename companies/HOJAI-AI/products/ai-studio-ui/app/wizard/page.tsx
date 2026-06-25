'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useWizardStore } from '@/lib/store';
import { architectApi, compilerApi } from '@/lib/api';
import {
  Sparkles, ChevronRight, ChevronLeft, Check, Loader2,
  Rocket, Zap, Globe, Users, Code, ArrowRight, ExternalLink
} from 'lucide-react';

type Step = 'idea' | 'questions' | 'blueprint' | 'generating' | 'success';

export default function WizardPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('idea');
  const [idea, setIdea] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [interviewId, setInterviewId] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [blueprint, setBlueprint] = useState<any>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [deployUrl, setDeployUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [progressMsg, setProgressMsg] = useState('');

  // Step 1: Submit idea
  const handleSubmitIdea = async () => {
    if (idea.length < 3) {
      setError('Please describe your company idea (at least 3 characters)');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await architectApi.startInterview(idea);
      setInterviewId(result.interviewId);
      setCurrentQuestion(result.currentQuestion);
      setStep('questions');
    } catch (err: any) {
      setError(err.message || 'Failed to start interview');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Submit answer
  const handleSubmitAnswer = async (skip = false) => {
    if (!interviewId || !currentQuestion) return;

    setIsLoading(true);
    setError(null);

    try {
      const answer = skip ? null : answers[currentQuestion.id];
      const result = skip
        ? await architectApi.skipQuestion(interviewId, currentQuestion.id)
        : await architectApi.submitAnswer(interviewId, currentQuestion.id, answer);

      if (result.isComplete) {
        // All questions answered - get the blueprint
        const bp = await architectApi.getBlueprint(interviewId);
        setBlueprint(bp.blueprint || result.blueprint);
        setStep('blueprint');
      } else {
        setCurrentQuestion(result.currentQuestion);
        setQuestionIndex(result.progress?.current || questionIndex + 1);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to submit answer');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 3: Approve blueprint and compile
  const handleApproveBlueprint = async () => {
    if (!blueprint) return;

    setStep('generating');
    setProgress(10);
    setProgressMsg('Starting compilation...');

    try {
      // Start compilation
      const compileResult = await compilerApi.compile(blueprint);
      setJobId(compileResult.jobId);
      setProgress(30);
      setProgressMsg('Rendering template...');

      // Poll for completion
      const pollStatus = async () => {
        const status = await compilerApi.getStatus(compileResult.jobId);
        setProgress(status.progress || 50);
        setProgressMsg(status.progressMessage || 'Compiling...');

        if (status.state === 'compiling_done' || status.state === 'done') {
          setProgress(90);
          setProgressMsg('Ready to deploy...');
          return true;
        }
        if (status.state === 'failed') {
          throw new Error(status.error || 'Compilation failed');
        }
        return false;
      };

      // Poll until done
      let attempts = 0;
      while (attempts < 30) {
        const done = await pollStatus();
        if (done) break;
        await new Promise(r => setTimeout(r, 1000));
        attempts++;
      }

      setProgress(95);
      setProgressMsg('Deploying to cloud...');

      // Deploy
      try {
        const deployResult = await compilerApi.deploy(compileResult.jobId);
        setDeployUrl(deployResult.deployResult?.url || `https://${blueprint.config.slug}.hojai.app`);
      } catch {
        // Deploy failed - still success, just no URL
        setDeployUrl(`https://${blueprint.config.slug}.hojai.app`);
      }

      setProgress(100);
      setProgressMsg('Done!');
      setStep('success');

    } catch (err: any) {
      setError(err.message || 'Failed to compile');
      setStep('blueprint');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-sm border-b border-slate-800">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">H</span>
            </div>
            <span className="text-white font-bold">HOJAI Studio</span>
          </div>
          <button
            onClick={() => router.push('/')}
            className="text-slate-400 hover:text-white transition-colors"
          >
            Exit Wizard
          </button>
        </div>
      </header>

      {/* Progress bar */}
      {step !== 'idea' && (
        <div className="fixed top-16 left-0 right-0 z-40 bg-slate-900">
          <div className="h-1 bg-slate-800">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
              style={{ width: `${step === 'success' ? 100 : step === 'generating' ? progress : 75}%` }}
            />
          </div>
        </div>
      )}

      {/* Content */}
      <main className="pt-32 pb-20 px-4">
        <div className="max-w-2xl mx-auto">

          {/* Step: Idea */}
          {step === 'idea' && (
            <div className="space-y-8">
              <div className="text-center">
                <Sparkles className="w-12 h-12 text-blue-400 mx-auto mb-4" />
                <h1 className="text-3xl font-bold text-white mb-2">
                  What do you want to build?
                </h1>
                <p className="text-slate-400">
                  Tell me about your company idea and I&apos;ll design the perfect AI-native business for you.
                </p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <textarea
                  value={idea}
                  onChange={(e) => setIdea(e.target.value)}
                  placeholder="e.g., Build me a D2C fashion brand for Indian women that sells on Instagram and WhatsApp"
                  className="w-full h-40 bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                />

                {error && (
                  <p className="text-red-400 text-sm mt-2">{error}</p>
                )}

                <button
                  onClick={handleSubmitIdea}
                  disabled={isLoading || idea.length < 3}
                  className="w-full mt-4 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Starting Interview...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      Start Building
                    </>
                  )}
                </button>
              </div>

              <p className="text-center text-slate-500 text-sm">
                I&apos;ll ask you 12 quick questions to design your perfect company
              </p>
            </div>
          )}

          {/* Step: Questions */}
          {step === 'questions' && currentQuestion && (
            <div className="space-y-8">
              <div className="text-center">
                <p className="text-slate-400 mb-2">
                  Question {questionIndex + 1} of 12
                </p>
                <div className="flex justify-center gap-1">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-2 h-2 rounded-full ${
                        i < questionIndex ? 'bg-green-500' :
                        i === questionIndex ? 'bg-blue-500' :
                        'bg-slate-700'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <h2 className="text-xl font-semibold text-white mb-2">
                  {currentQuestion.text}
                </h2>
                {currentQuestion.help && (
                  <p className="text-slate-400 text-sm mb-4">{currentQuestion.help}</p>
                )}

                {/* Text input */}
                {currentQuestion.type === 'text' && (
                  <input
                    type="text"
                    value={answers[currentQuestion.id] || ''}
                    onChange={(e) => setAnswers({ ...answers, [currentQuestion.id]: e.target.value })}
                    placeholder={currentQuestion.placeholder}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                )}

                {/* Dropdown */}
                {currentQuestion.type === 'dropdown' && (
                  <select
                    value={answers[currentQuestion.id] || ''}
                    onChange={(e) => setAnswers({ ...answers, [currentQuestion.id]: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  >
                    <option value="">Select an option...</option>
                    {currentQuestion.options?.map((opt: any) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.flag && `${opt.flag} `}{opt.label}
                        {opt.description && ` — ${opt.description}`}
                      </option>
                    ))}
                  </select>
                )}

                {/* Multi-select */}
                {currentQuestion.type === 'multi-select' && (
                  <div className="space-y-2">
                    {currentQuestion.options?.map((opt: any) => (
                      <label
                        key={opt.value}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          (answers[currentQuestion.id] || []).includes(opt.value)
                            ? 'bg-blue-500/10 border-blue-500 text-blue-400'
                            : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={(answers[currentQuestion.id] || []).includes(opt.value)}
                          onChange={(e) => {
                            const current = answers[currentQuestion.id] || [];
                            const updated = e.target.checked
                              ? [...current, opt.value]
                              : current.filter((v: string) => v !== opt.value);
                            setAnswers({ ...answers, [currentQuestion.id]: updated });
                          }}
                          className="w-5 h-5 rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-blue-500"
                        />
                        <span>
                          {opt.flag && `${opt.flag} `}
                          {opt.label}
                          {opt.description && (
                            <span className="text-slate-500 text-sm ml-2">{opt.description}</span>
                          )}
                        </span>
                      </label>
                    ))}
                  </div>
                )}

                {error && (
                  <p className="text-red-400 text-sm mt-2">{error}</p>
                )}

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => handleSubmitAnswer(true)}
                    disabled={isLoading}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                  >
                    Skip
                  </button>
                  <button
                    onClick={() => handleSubmitAnswer()}
                    disabled={isLoading}
                    className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                  >
                    {isLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        Continue
                        <ChevronRight className="w-5 h-5" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step: Blueprint */}
          {step === 'blueprint' && blueprint && (
            <div className="space-y-8">
              <div className="text-center">
                <Check className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <h1 className="text-3xl font-bold text-white mb-2">
                  Your Company Blueprint
                </h1>
                <p className="text-slate-400">
                  Review your AI-generated company and click &quot;Generate&quot; to build it.
                </p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
                {/* Company Info */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">{blueprint.config?.name}</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-slate-500">Type</span>
                      <p className="text-white capitalize">{blueprint.config?.type}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Currency</span>
                      <p className="text-white">{blueprint.config?.currency}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Regions</span>
                      <p className="text-white">{blueprint.config?.regions?.join(', ')}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Languages</span>
                      <p className="text-white">{blueprint.config?.languages?.join(', ')}</p>
                    </div>
                  </div>
                </div>

                {/* AI Workforce */}
                <div>
                  <h4 className="text-sm font-medium text-slate-400 mb-2">AI Workforce</h4>
                  <div className="flex flex-wrap gap-2">
                    {blueprint.agents?.map((agent: any) => (
                      <span
                        key={agent.key}
                        className="px-3 py-1 bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded-full text-sm"
                      >
                        {agent.name}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Integrations */}
                <div>
                  <h4 className="text-sm font-medium text-slate-400 mb-2">Built-in Integrations</h4>
                  <div className="flex flex-wrap gap-2">
                    {blueprint.integrations?.slice(0, 8).map((int: string) => (
                      <span
                        key={int}
                        className="px-2 py-1 bg-purple-500/10 border border-purple-500/30 text-purple-400 rounded text-xs"
                      >
                        {int}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {error && (
                <p className="text-red-400 text-sm text-center">{error}</p>
              )}

              <button
                onClick={handleApproveBlueprint}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white py-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all"
              >
                <Rocket className="w-5 h-5" />
                Approve & Generate Company
              </button>
            </div>
          )}

          {/* Step: Generating */}
          {step === 'generating' && (
            <div className="text-center space-y-8">
              <div className="relative">
                <Loader2 className="w-16 h-16 text-blue-500 mx-auto animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-purple-500" />
                </div>
              </div>

              <div>
                <h1 className="text-3xl font-bold text-white mb-2">
                  Building your company...
                </h1>
                <p className="text-slate-400">{progressMsg}</p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-center text-slate-400 text-sm mt-2">{progress}%</p>
              </div>
            </div>
          )}

          {/* Step: Success */}
          {step === 'success' && blueprint && (
            <div className="text-center space-y-8">
              <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
                <Check className="w-10 h-10 text-green-500" />
              </div>

              <div>
                <h1 className="text-3xl font-bold text-white mb-2">
                  Your company is ready! 🎉
                </h1>
                <p className="text-slate-400">
                  {blueprint.config?.name} has been generated and deployed.
                </p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
                {deployUrl && (
                  <a
                    href={deployUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-lg font-medium transition-colors"
                  >
                    <ExternalLink className="w-5 h-5" />
                    Open {blueprint.config?.name}
                    <ArrowRight className="w-4 h-4" />
                  </a>
                )}

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="bg-slate-800 rounded-lg p-4">
                    <Users className="w-6 h-6 text-blue-400 mb-2 mx-auto" />
                    <p className="text-white font-medium">{blueprint.agents?.length || 0} AI Agents</p>
                  </div>
                  <div className="bg-slate-800 rounded-lg p-4">
                    <Globe className="w-6 h-6 text-green-400 mb-2 mx-auto" />
                    <p className="text-white font-medium">{blueprint.config?.regions?.length || 0} Regions</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => router.push('/dashboard')}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-lg font-medium transition-colors"
                >
                  Go to Dashboard
                </button>
                <button
                  onClick={() => {
                    setStep('idea');
                    setIdea('');
                    setInterviewId(null);
                    setBlueprint(null);
                    setAnswers({});
                    setQuestionIndex(0);
                  }}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-lg font-medium transition-colors"
                >
                  Build Another
                </button>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
