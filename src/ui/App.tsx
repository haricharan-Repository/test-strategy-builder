import { useEffect, useMemo, useState } from 'react';

interface RequirementAnalysis {
  requirement: string;
  sentences: string[];
  keywords: string[];
  featureAreas: string[];
  roles: string[];
  actions: string[];
  constraints: string[];
  featurePhrases: string[];
}

interface TestCase {
  featureArea: string;
  category: string;
  title: string;
  description: string;
  inputs: string;
  expectedResult: string;
  priority: string;
  notes: string;
}

interface ApiResponse {
  sourceText: string;
  llmResult: {
    analysis: RequirementAnalysis;
    testCases: TestCase[];
  };
  fallback: boolean;
  warning?: string;
}

interface ApiHistoryEntry {
  id: string;
  createdAt: string;
  sourceType: string;
  sourcePreview: string;
  fallback: boolean;
}

interface TestPlan {
  projectName: string;
  objective: string;
  scope: { included: string[]; excluded: string[] };
  featuresToTest: string[];
  testStrategy: string[];
  resources: { teamMembers: string[]; tools: string[]; environments: string[] };
  timeline: { phase: string; duration: string; description: string }[];
  risks: { risk: string; impact: string; mitigation: string }[];
  successCriteria: string[];
  deliverables: string[];
  documentation: string[];
  testCases: TestCase[];
}

interface EnterpriseTestStrategy {
  documentInfo: {
    documentOwner: string;
    version: string;
    status: string;
    lastUpdated: string;
    targetAudience: string[];
  };
  executiveSummary: {
    overview: string;
    coreObjectives: string[];
  };
  scope: {
    inScope: string[];
    outOfScope: string[];
  };
  methodology: {
    shiftLeftStrategy: string[];
    testingLevels: string[];
    automationStrategy: string[];
  };
  qualityStandards: any;
  riskProfile: any;
  toolsAndInfra: any;
  governance: any;
  defectManagement: any;
  metrics: any;
  continuousImprovement: any;
  testCases: TestCase[];
}

export default function App() {
  const [sourceType, setSourceType] = useState<'text' | 'figma' | 'file'>('text');
  const [textInput, setTextInput] = useState('');
  const [figmaUrl, setFigmaUrl] = useState('');
  const [figmaToken, setFigmaToken] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<RequirementAnalysis | null>(null);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [testPlan, setTestPlan] = useState<TestPlan | null>(null);
  const [enterpriseStrategy, setEnterpriseStrategy] = useState<EnterpriseTestStrategy | null>(null);
  const [sourceText, setSourceText] = useState('');
  const [message, setMessage] = useState('');
  const [warning, setWarning] = useState('');
  const [history, setHistory] = useState<ApiHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [showPlan, setShowPlan] = useState(false);
  const [showEnterprise, setShowEnterprise] = useState(false);

  const fetchHistory = async () => {
    try {
      const response = await fetch('/api/history');
      if (response.ok) {
        const historyData = await response.json();
        setHistory(historyData);
      }
    } catch (error) {
      console.warn('History load failed', error);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const onGenerate = async () => {
    setMessage('');
    setWarning('');
    setAnalysis(null);
    setTestCases([]);
    setSourceText('');

    if (sourceType === 'text' && !textInput.trim()) {
      setMessage('Enter the requirement text.');
      return;
    }

    if (sourceType === 'figma' && !figmaUrl.trim()) {
      setMessage('Enter a Figma URL.');
      return;
    }

    if (sourceType === 'file' && !file) {
      setMessage('Upload a file to parse requirements from.');
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('sourceType', sourceType);
      if (sourceType === 'text') {
        formData.append('textInput', textInput);
      }
      if (sourceType === 'figma') {
        formData.append('figmaUrl', figmaUrl);
        if (figmaToken.trim()) {
          formData.append('figmaToken', figmaToken.trim());
        }
      }
      if (sourceType === 'file' && file) {
        formData.append('file', file);
      }

      const response = await fetch('/api/generate', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        setMessage(`Error: ${errorText}`);
        return;
      }

      const data = (await response.json()) as ApiResponse;
      setSourceText(data.sourceText);
      setAnalysis(data.llmResult.analysis);
      setTestCases(data.llmResult.testCases);
      
      // Build test plan
      const plan: TestPlan = {
        projectName: `Test Strategy - ${new Date().toLocaleDateString()}`,
        objective: `Test the functionality, security, and quality of ${data.llmResult.analysis.featureAreas.join(', ')} feature`,
        scope: {
          included: [
            ...data.llmResult.analysis.featureAreas.map((area) => `${area} feature`),
            'Functional testing',
            'Security testing',
            'Performance testing',
          ],
          excluded: [
            'Legacy system testing',
            'Out-of-scope integrations',
            'Third-party vendor testing',
          ],
        },
        featuresToTest: [
          ...data.llmResult.analysis.actions.slice(0, 5),
          ...data.llmResult.analysis.featurePhrases.slice(0, 5),
        ],
        testStrategy: [
          'Functional Testing',
          'Security Testing',
          'Performance Testing',
          'Regression Testing',
          'Accessibility Testing',
          'Integration Testing',
        ],
        resources: {
          teamMembers: [
            'QA Lead - Test planning',
            'QA Engineers (2-3) - Test execution',
            'Security Specialist - Security testing',
          ],
          tools: [
            'Test case management',
            'Automation framework',
            'API testing tool',
            'Performance testing tool',
          ],
          environments: [
            'Staging environment',
            'Test database',
            'Multiple browsers',
            'Mobile devices',
          ],
        },
        timeline: [
          {
            phase: 'Planning and Setup',
            duration: 'Week 1',
            description: 'Define scope and set up environments',
          },
          {
            phase: 'Test Case Development',
            duration: 'Week 2',
            description: 'Create detailed test cases',
          },
          {
            phase: 'Functional Testing',
            duration: 'Weeks 3-4',
            description: 'Execute functional tests',
          },
          {
            phase: 'Security & Performance',
            duration: 'Week 5',
            description: 'Execute security and performance tests',
          },
        ],
        risks: [
          {
            risk: 'Insufficient test data',
            impact: 'High',
            mitigation: 'Prepare test data in parallel',
          },
          {
            risk: 'Scope creep',
            impact: 'High',
            mitigation: 'Define clear scope upfront',
          },
        ],
        successCriteria: [
          '100% pass rate on critical test cases',
          'Zero critical bugs remaining',
          'Performance meets SLAs',
          'Security testing shows no vulnerabilities',
          'Stakeholder approval on UAT',
        ],
        deliverables: [
          'Test Plan document',
          'Test Case specification',
          'Test Execution reports',
          'Security Testing findings',
          'Performance report',
          'UAT feedback',
        ],
        documentation: [
          'Requirement specification',
          'System architecture',
          'API documentation',
          'Security requirements',
        ],
        testCases: data.llmResult.testCases,
      };
      
      setTestPlan(plan);
      setShowPlan(false);
      setWarning(data.fallback ? 'LLM key unavailable; used local fallback analysis.' : 'LLM output generated successfully.');
      setMessage(`Generated ${data.llmResult.testCases.length} test cases and comprehensive test plan.`);
      await fetchHistory();
    } catch (error: any) {
      setMessage(`Unexpected error: ${error.message || error}`);
    } finally {
      setLoading(false);
    }
  };

  const onDownload = async () => {
    if (!analysis || testCases.length === 0) {
      setMessage('Generate the strategy first before downloading.');
      return;
    }

    setLoading(true);
    setMessage('Exporting Excel from backend...');

    try {
      const formData = new FormData();
      formData.append('sourceType', sourceType);
      formData.append('analysis', JSON.stringify(analysis));
      formData.append('testCases', JSON.stringify(testCases));

      if (sourceType === 'text') {
        formData.append('textInput', textInput);
      }
      if (sourceType === 'figma') {
        formData.append('figmaUrl', figmaUrl);
        if (figmaToken.trim()) {
          formData.append('figmaToken', figmaToken.trim());
        }
      }
      if (sourceType === 'file' && file) {
        formData.append('file', file);
      }

      const response = await fetch('/api/export', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        setMessage(`Export failed: ${errorText}`);
        return;
      }

      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `test_strategy_${Date.now()}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(downloadUrl);

      setMessage('Excel exported from backend successfully.');
      await fetchHistory();
    } catch (error: any) {
      setMessage(`Unexpected export error: ${error.message || error}`);
    } finally {
      setLoading(false);
    }
  };

  const onGenerateEnterpriseStrategy = async () => {
    if (!analysis) {
      setMessage('Generate test cases first before creating enterprise strategy.');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('projectName', `Enterprise Strategy - ${new Date().toLocaleDateString()}`);
      formData.append('sourceType', sourceType);
      if (sourceType === 'text') {
        formData.append('textInput', textInput);
      } else if (sourceType === 'figma') {
        formData.append('figmaUrl', figmaUrl);
        formData.append('figmaToken', figmaToken);
      } else if (sourceType === 'file' && file) {
        formData.append('file', file);
      }

      const response = await fetch('/api/enterprise-strategy', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        setMessage(`Error: ${errorText}`);
        return;
      }

      const strategy = (await response.json()) as EnterpriseTestStrategy;
      setEnterpriseStrategy(strategy);
      setShowEnterprise(true);
      setMessage('Enterprise test strategy generated successfully.');
    } catch (error: any) {
      setMessage(`Error generating enterprise strategy: ${error.message || error}`);
    } finally {
      setLoading(false);
    }
  };

  const onExportEnterpriseStrategy = async () => {
    if (!enterpriseStrategy) {
      setMessage('No enterprise strategy to export.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/export-enterprise-strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          strategy: enterpriseStrategy,
          testCases: testCases,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        setMessage(`Export error: ${errorText}`);
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `enterprise-strategy-${new Date().getTime()}.xlsx`;
      link.click();
      window.URL.revokeObjectURL(url);

      setMessage('Enterprise strategy exported successfully.');
    } catch (error: any) {
      setMessage(`Export error: ${error.message || error}`);
    } finally {
      setLoading(false);
    }
  };

  const featureSummary = useMemo(() => {
    if (!analysis) {
      return null;
    }
    return (
      <div className="summary-card">
        <h2>Requirement Analysis</h2>
        <div className="summary-grid">
          <div>
            <strong>Feature Areas</strong>
            <p>{analysis.featureAreas.join(', ') || 'General'}</p>
          </div>
          <div>
            <strong>Keywords</strong>
            <p>{analysis.keywords.join(', ') || 'None'}</p>
          </div>
          <div>
            <strong>Actions</strong>
            <p>{analysis.actions.join(', ') || 'None'}</p>
          </div>
          <div>
            <strong>Constraints</strong>
            <p>{analysis.constraints.join(', ') || 'None'}</p>
          </div>
          <div>
            <strong>Roles / Personas</strong>
            <p>{analysis.roles.join(', ') || 'None'}</p>
          </div>
          <div>
            <strong>Feature Phrases</strong>
            <p>{analysis.featurePhrases.join(', ') || 'None'}</p>
          </div>
        </div>
      </div>
    );
  }, [analysis]);

  return (
    <div className="app-shell">
      <header>
        <h1>Test Strategy Builder</h1>
        <p>Upload Figma URLs, documents, or files and generate Excel test strategies via LLM.</p>
      </header>

      <main>
        <section className="input-panel">
          <div className="source-selector">
            <label>
              <input
                type="radio"
                name="sourceType"
                value="text"
                checked={sourceType === 'text'}
                onChange={() => setSourceType('text')}
              />
              Text
            </label>
            <label>
              <input
                type="radio"
                name="sourceType"
                value="figma"
                checked={sourceType === 'figma'}
                onChange={() => setSourceType('figma')}
              />
              Figma URL
            </label>
            <label>
              <input
                type="radio"
                name="sourceType"
                value="file"
                checked={sourceType === 'file'}
                onChange={() => setSourceType('file')}
              />
              File Upload
            </label>
          </div>

          {sourceType === 'text' && (
            <textarea
              aria-label="Requirement text"
              placeholder="Enter requirement text here..."
              value={textInput}
              onChange={(event) => setTextInput(event.target.value)}
            />
          )}

          {sourceType === 'figma' && (
            <div className="figma-inputs">
              <input
                type="text"
                placeholder="Figma file URL"
                value={figmaUrl}
                onChange={(event) => setFigmaUrl(event.target.value)}
              />
              <input
                type="text"
                placeholder="Figma personal access token (optional if set on server)"
                value={figmaToken}
                onChange={(event) => setFigmaToken(event.target.value)}
              />
            </div>
          )}

          {sourceType === 'file' && (
            <div className="file-input">
              <input
                type="file"
                accept=".txt,.md,.docx,.pdf,.xlsx,.xls,.json"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
              {file && <p>Uploaded: {file.name}</p>}
            </div>
          )}

          <div className="actions">
            <button type="button" onClick={onGenerate} disabled={loading}>
              {loading ? 'Generating...' : 'Generate Strategy'}
            </button>
            <button type="button" onClick={onDownload} disabled={!analysis || testCases.length === 0}>
              Download Excel
            </button>
            <button type="button" onClick={() => setShowPlan(!showPlan)} disabled={!testPlan}>
              {showPlan ? 'Hide Test Plan' : 'Show Test Plan'}
            </button>
            <button type="button" onClick={onGenerateEnterpriseStrategy} disabled={loading}>
              {loading ? 'Generating...' : 'Generate Enterprise Strategy'}
            </button>
            <button type="button" onClick={onExportEnterpriseStrategy} disabled={!enterpriseStrategy}>
              Export Enterprise Strategy
            </button>
          </div>

          {warning && <p className="message warning">{warning}</p>}
          {message && <p className="message">{message}</p>}
        </section>

        {analysis && (
          <section className="table-panel">
            <h2>Requirement Source</h2>
            <pre className="source-text">{sourceText}</pre>
          </section>
        )}

        {featureSummary}

        {testCases.length > 0 && (
          <section className="table-panel">
            <h2>Generated Test Cases</h2>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Feature Area</th>
                    <th>Category</th>
                    <th>Test Case</th>
                    <th>Description</th>
                    <th>Priority</th>
                  </tr>
                </thead>
                <tbody>
                  {testCases.map((testCase, index) => (
                    <tr key={`${testCase.category}-${index}`}>
                      <td>{testCase.featureArea}</td>
                      <td>{testCase.category}</td>
                      <td>{testCase.title}</td>
                      <td>{testCase.description}</td>
                      <td>{testCase.priority}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {history.length > 0 && (
          <section className="table-panel">
            <h2>Recent History</h2>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Source</th>
                    <th>Preview</th>
                    <th>Fallback</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((entry) => (
                    <tr key={entry.id}>
                      <td>{new Date(entry.createdAt).toLocaleString()}</td>
                      <td>{entry.sourceType}</td>
                      <td>{entry.sourcePreview}</td>
                      <td>{entry.fallback ? 'Yes' : 'No'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {showPlan && testPlan && (
          <section className="table-panel">
            <h2>Comprehensive Test Plan</h2>
            <div style={{ lineHeight: '1.8', fontSize: '14px' }}>
              <h3>{testPlan.projectName}</h3>
              
              <h4>Objective</h4>
              <p>{testPlan.objective}</p>

              <h4>Scope</h4>
              <div>
                <strong>Included:</strong>
                <ul>
                  {testPlan.scope.included.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <strong>Excluded:</strong>
                <ul>
                  {testPlan.scope.excluded.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>

              <h4>Features to Test</h4>
              <ul>
                {testPlan.featuresToTest.map((feature, idx) => (
                  <li key={idx}>{feature}</li>
                ))}
              </ul>

              <h4>Test Strategy</h4>
              <ul>
                {testPlan.testStrategy.map((strategy, idx) => (
                  <li key={idx}>{strategy}</li>
                ))}
              </ul>

              <h4>Resources</h4>
              <div>
                <strong>Team Members:</strong>
                <ul>
                  {testPlan.resources.teamMembers.map((member, idx) => (
                    <li key={idx}>{member}</li>
                  ))}
                </ul>
              </div>
              <div>
                <strong>Tools:</strong>
                <ul>
                  {testPlan.resources.tools.map((tool, idx) => (
                    <li key={idx}>{tool}</li>
                  ))}
                </ul>
              </div>
              <div>
                <strong>Environments:</strong>
                <ul>
                  {testPlan.resources.environments.map((env, idx) => (
                    <li key={idx}>{env}</li>
                  ))}
                </ul>
              </div>

              <h4>Timeline</h4>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f0f0f0' }}>
                    <th style={{ padding: '8px', border: '1px solid #ddd' }}>Phase</th>
                    <th style={{ padding: '8px', border: '1px solid #ddd' }}>Duration</th>
                    <th style={{ padding: '8px', border: '1px solid #ddd' }}>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {testPlan.timeline.map((phase, idx) => (
                    <tr key={idx}>
                      <td style={{ padding: '8px', border: '1px solid #ddd' }}>{phase.phase}</td>
                      <td style={{ padding: '8px', border: '1px solid #ddd' }}>{phase.duration}</td>
                      <td style={{ padding: '8px', border: '1px solid #ddd' }}>{phase.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <h4>Risk Assessment & Mitigation</h4>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f0f0f0' }}>
                    <th style={{ padding: '8px', border: '1px solid #ddd' }}>Risk</th>
                    <th style={{ padding: '8px', border: '1px solid #ddd' }}>Impact</th>
                    <th style={{ padding: '8px', border: '1px solid #ddd' }}>Mitigation</th>
                  </tr>
                </thead>
                <tbody>
                  {testPlan.risks.map((risk, idx) => (
                    <tr key={idx}>
                      <td style={{ padding: '8px', border: '1px solid #ddd' }}>{risk.risk}</td>
                      <td style={{ padding: '8px', border: '1px solid #ddd' }}>{risk.impact}</td>
                      <td style={{ padding: '8px', border: '1px solid #ddd' }}>{risk.mitigation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <h4>Success Criteria</h4>
              <ul>
                {testPlan.successCriteria.map((criteria, idx) => (
                  <li key={idx}>{criteria}</li>
                ))}
              </ul>

              <h4>Deliverables</h4>
              <ul>
                {testPlan.deliverables.map((deliverable, idx) => (
                  <li key={idx}>{deliverable}</li>
                ))}
              </ul>

              <h4>Documentation Requirements</h4>
              <ul>
                {testPlan.documentation.map((doc, idx) => (
                  <li key={idx}>{doc}</li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {showEnterprise && enterpriseStrategy && (
          <section className="table-panel">
            <h2>Enterprise Test Strategy</h2>
            <div style={{ lineHeight: '1.8', fontSize: '14px' }}>
              <h3>{enterpriseStrategy.documentInfo.documentOwner} - {enterpriseStrategy.documentInfo.version}</h3>
              
              <h4>Executive Summary</h4>
              <p>{enterpriseStrategy.executiveSummary.overview}</p>
              <ul>
                {enterpriseStrategy.executiveSummary.coreObjectives.map((objective, idx) => (
                  <li key={idx}>{objective}</li>
                ))}
              </ul>

              <h4>Scope</h4>
              <div>
                <strong>In Scope:</strong>
                <ul>
                  {enterpriseStrategy.scope.inScope.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <strong>Out of Scope:</strong>
                <ul>
                  {enterpriseStrategy.scope.outOfScope.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>

              <h4>Methodology</h4>
              <div>
                <strong>Shift Left Strategy:</strong>
                <ul>
                  {enterpriseStrategy.methodology.shiftLeftStrategy.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <strong>Testing Levels:</strong>
                <ul>
                  {enterpriseStrategy.methodology.testingLevels.map((level, idx) => (
                    <li key={idx}>{level}</li>
                  ))}
                </ul>
              </div>
              <div>
                <strong>Automation Strategy:</strong>
                <ul>
                  {enterpriseStrategy.methodology.automationStrategy.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>

              <h4>Quality Standards</h4>
              <pre>{JSON.stringify(enterpriseStrategy.qualityStandards, null, 2)}</pre>

              <h4>Risk Profile</h4>
              <pre>{JSON.stringify(enterpriseStrategy.riskProfile, null, 2)}</pre>

              <h4>Tools and Infrastructure</h4>
              <pre>{JSON.stringify(enterpriseStrategy.toolsAndInfra, null, 2)}</pre>

              <h4>Governance</h4>
              <pre>{JSON.stringify(enterpriseStrategy.governance, null, 2)}</pre>

              <h4>Defect Management</h4>
              <pre>{JSON.stringify(enterpriseStrategy.defectManagement, null, 2)}</pre>

              <h4>Metrics</h4>
              <pre>{JSON.stringify(enterpriseStrategy.metrics, null, 2)}</pre>

              <h4>Continuous Improvement</h4>
              <pre>{JSON.stringify(enterpriseStrategy.continuousImprovement, null, 2)}</pre>

              <h4>Test Cases</h4>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Feature Area</th>
                      <th>Category</th>
                      <th>Test Case</th>
                      <th>Description</th>
                      <th>Priority</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enterpriseStrategy.testCases.map((testCase, index) => (
                      <tr key={`${testCase.category}-${index}`}>
                        <td>{testCase.featureArea}</td>
                        <td>{testCase.category}</td>
                        <td>{testCase.title}</td>
                        <td>{testCase.description}</td>
                        <td>{testCase.priority}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
