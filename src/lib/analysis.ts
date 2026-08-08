export interface RequirementAnalysis {
  requirement: string;
  sentences: string[];
  keywords: string[];
  featureAreas: string[];
  roles: string[];
  actions: string[];
  constraints: string[];
  featurePhrases: string[];
}

export interface TestCase {
  featureArea: string;
  category: string;
  title: string;
  description: string;
  inputs: string;
  expectedResult: string;
  priority: string;
  notes: string;
}

const STOPWORDS = new Set([
  'system', 'application', 'user', 'users', 'should', 'must', 'will', 'also', 'when', 'then', 'with',
  'that', 'from', 'their', 'them', 'there', 'this', 'these', 'those', 'any', 'each', 'many', 'more',
  'less', 'have', 'has', 'been', 'being', 'are', 'is', 'be', 'can', 'could', 'would', 'and', 'or', 'for',
  'not', 'but', 'into', 'onto', 'about', 'between', 'through', 'during', 'before', 'after', 'of', 'on', 'by',
  'as', 'a', 'an', 'the', 'to', 'via'
]);

const FEATURE_AREA_MAP: Record<string, string[]> = {
  Checkout: ['checkout', 'cart', 'payment', 'order', 'purchase', 'billing', 'shipping', 'discount', 'total'],
  Search: ['search', 'filter', 'sort', 'query', 'browse', 'find', 'lookup'],
  Authentication: ['login', 'logout', 'signin', 'signup', 'authentication', 'authorization', 'credentials', 'password', 'session', 'profile'],
  Reporting: ['report', 'dashboard', 'analytics', 'metric', 'statistics', 'export', 'insight'],
  Integration: ['api', 'integration', 'service', 'external', 'sync', 'connect', 'webhook'],
  Security: ['secure', 'encryption', 'access', 'permission', 'role', 'authorization', 'privacy', 'sensitive'],
  Notifications: ['notify', 'notification', 'alert', 'email', 'sms', 'push'],
  Data: ['data', 'import', 'export', 'storage', 'database'],
};

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function extractKeywords(text: string): string[] {
  const words = text.toLowerCase().match(/\b[a-z]{4,}\b/g) ?? [];
  const frequency = new Map<string, number>();

  for (const word of words) {
    if (STOPWORDS.has(word)) {
      continue;
    }
    frequency.set(word, (frequency.get(word) ?? 0) + 1);
  }

  return Array.from(frequency.entries())
    .sort(([a, countA], [b, countB]) => countB - countA || a.localeCompare(b))
    .slice(0, 12)
    .map(([word]) => word);
}

function extractRoles(text: string): string[] {
  const matches = [...text.matchAll(/as an?\s+([^.,;]+)/gi)];
  return [...new Set(matches.map((match) => match[1].trim()))];
}

function extractActions(text: string): string[] {
  const patterns = [
    /(?:able to|can|allows?|should|must|will|needs?)\s+([^.,;]+)/gi,
    /(?:when|if|once)\s+([^.,;]+)/gi,
  ];

  const actions = new Set<string>();
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      actions.add(match[1].trim());
    }
  }

  return Array.from(actions).slice(0, 8);
}

function extractConstraints(text: string): string[] {
  const patterns = [
    /(?:if|when|unless|only if|provided that)\s+([^.,;]+)/gi,
    /(?:required|optional|valid|invalid|missing|failure)\s+([^.,;]+)/gi,
  ];

  const constraints = new Set<string>();
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      constraints.add(match[1].trim());
    }
  }

  return Array.from(constraints).slice(0, 8);
}

function extractFeaturePhrases(text: string): string[] {
  const patterns = [
    /as an?\s+([^.,;]+)/gi,
    /i (?:should|want|need|must|can) (?:to )?([^.,;]+)/gi,
    /the system should (?:be able to )?([^.,;]+)/gi,
    /it should (?:be able to )?([^.,;]+)/gi,
    /users? can (?:to )?([^.,;]+)/gi,
  ];

  const phrases = new Set<string>();
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      phrases.add(match[1].trim());
    }
  }

  return Array.from(phrases).slice(0, 8);
}

function inferFeatureAreas(text: string): string[] {
  const lower = text.toLowerCase();
  const areas = new Set<string>();

  for (const [area, keywords] of Object.entries(FEATURE_AREA_MAP)) {
    for (const keyword of keywords) {
      if (new RegExp(`\\b${keyword}\\b`, 'i').test(lower)) {
        areas.add(area);
        break;
      }
    }
  }

  if (areas.size === 0) {
    areas.add('General');
  }

  return Array.from(areas);
}

export function parseRequirement(requirement: string): RequirementAnalysis {
  const cleaned = requirement.trim();

  return {
    requirement: cleaned,
    sentences: splitSentences(cleaned),
    keywords: extractKeywords(cleaned),
    featureAreas: inferFeatureAreas(cleaned),
    roles: extractRoles(cleaned),
    actions: extractActions(cleaned),
    constraints: extractConstraints(cleaned),
    featurePhrases: extractFeaturePhrases(cleaned),
  };
}

function buildCoreScenarios(analysis: RequirementAnalysis): TestCase[] {
  const area = analysis.featureAreas[0] ?? 'General';

  return [
    {
      featureArea: area,
      category: 'Core Scenario',
      title: 'Primary happy path',
      description: 'Validate the main workflow described by the requirement.',
      inputs: analysis.requirement,
      expectedResult: 'The system performs the expected action without errors.',
      priority: 'High',
      notes: 'Covers the main feature flow in the identified area.',
    },
    {
      featureArea: area,
      category: 'Core Scenario',
      title: 'End-to-end feature verification',
      description: 'Verify the complete flow and feature interactions described by the requirement.',
      inputs: analysis.featurePhrases.length > 0 ? `Focus on: ${analysis.featurePhrases.join(', ')}` : analysis.requirement,
      expectedResult: 'All major steps work together and deliver the intended outcome.',
      priority: 'High',
      notes: 'Ensures the feature area is validated from start to finish.',
    },
  ];
}

function buildEdgeCases(analysis: RequirementAnalysis): TestCase[] {
  const area = analysis.featureAreas[0] ?? 'General';

  return [
    {
      featureArea: area,
      category: 'Edge Case',
      title: 'Boundary values and limits',
      description: 'Test minimum, maximum, and off-by-one values for relevant inputs.',
      inputs: analysis.keywords.length > 0 ? `${analysis.keywords.slice(0, 4).join(', ')} at edge boundaries` : 'Relevant fields at boundary values.',
      expectedResult: 'Valid values are accepted and out-of-range values are rejected clearly.',
      priority: 'High',
      notes: 'Includes edge conditions and extreme valid inputs for the feature area.',
    },
    {
      featureArea: area,
      category: 'Edge Case',
      title: 'Missing optional information',
      description: 'Confirm how the system behaves when optional fields are omitted or left blank.',
      inputs: 'Blank optional fields, omitted optional selections, default handling.',
      expectedResult: 'The system continues gracefully and applies defaults or prompts appropriately.',
      priority: 'Medium',
      notes: 'Validates durability when data is incomplete.',
    },
  ];
}

function buildNegativeTests(analysis: RequirementAnalysis): TestCase[] {
  const primary = analysis.featureAreas[0] ?? 'General';

  return [
    {
      featureArea: 'Validation',
      category: 'Negative Test',
      title: 'Invalid input format',
      description: 'Submit malformed or unsupported values to validate input checks.',
      inputs: 'Bad formats, invalid characters, incorrect dates, unsupported values.',
      expectedResult: 'The system rejects invalid input and returns clear validation messages.',
      priority: 'High',
      notes: 'Covers field validation and data integrity rules.',
    },
    {
      featureArea: 'Security',
      category: 'Negative Test',
      title: 'Unauthorized access',
      description: 'Attempt to perform the flow with a user who lacks the required permissions.',
      inputs: 'User without required role, invalid credentials, restricted operation.',
      expectedResult: 'The system denies access and handles the request securely.',
      priority: 'High',
      notes: 'Validates authorization and role-based access controls.',
    },
    {
      featureArea: primary,
      category: 'Negative Test',
      title: 'External dependency failure',
      description: 'Simulate failures in external services or integrations used by the feature.',
      inputs: 'Service timeout, API error, unavailable integration.',
      expectedResult: 'The system handles dependency failures gracefully and recovers safely.',
      priority: 'Medium',
      notes: 'Tests resiliency and error handling in the primary feature area.',
    },
  ];
}

function buildAdditionalTests(analysis: RequirementAnalysis): TestCase[] {
  const area = analysis.featureAreas[0] ?? 'General';

  return [
    {
      featureArea: area,
      category: 'Regression Test',
      title: 'Related feature stability',
      description: 'Verify related existing behavior continues to work after this requirement is implemented.',
      inputs: 'Repeat key workflows and scenarios tied to the feature area.',
      expectedResult: 'No regressions occur in related functionality.',
      priority: 'Medium',
      notes: 'Helps protect adjacent features from unintended side effects.',
    },
    {
      featureArea: area,
      category: 'Performance Test',
      title: 'Feature response under load',
      description: 'Measure performance for the feature under normal and elevated usage.',
      inputs: 'Regular usage plus load spikes, large records, or many concurrent actions.',
      expectedResult: 'Performance stays within acceptable limits.',
      priority: 'Medium',
      notes: 'Detects bottlenecks and scale issues in the feature area.',
    },
    {
      featureArea: area,
      category: 'Usability Test',
      title: 'Clarity and user guidance',
      description: 'Assess whether the feature is intuitive and provides helpful guidance.',
      inputs: 'User navigation through screens, prompts, and error feedback.',
      expectedResult: 'A user can complete the task without confusion.',
      priority: 'Medium',
      notes: 'Ensures a polished user experience.',
    },
  ];
}

function buildSecurityTests(analysis: RequirementAnalysis): TestCase[] {
  return [
    {
      featureArea: 'Security',
      category: 'Security Test',
      title: 'Input injection attacks',
      description: 'Test for SQL injection, XSS, command injection, and other payload attacks.',
      inputs: 'Malicious payloads: SQL commands, scripts, shell commands, special characters.',
      expectedResult: 'All malicious payloads are sanitized and rejected safely.',
      priority: 'High',
      notes: 'Critical for data integrity and user protection.',
    },
    {
      featureArea: 'Security',
      category: 'Security Test',
      title: 'Authentication and session management',
      description: 'Verify session tokens, expiry, and multi-session handling.',
      inputs: 'Expired tokens, replayed tokens, concurrent sessions, token tampering.',
      expectedResult: 'Invalid or expired tokens are rejected; sessions are secure and isolated.',
      priority: 'High',
      notes: 'Ensures user identity verification and session safety.',
    },
    {
      featureArea: 'Security',
      category: 'Security Test',
      title: 'Data encryption and privacy',
      description: 'Confirm sensitive data is encrypted at rest and in transit.',
      inputs: 'Sensitive data flow (passwords, PII, financial data) across network and storage.',
      expectedResult: 'Data is encrypted using strong algorithms; no plaintext leakage.',
      priority: 'High',
      notes: 'Protects user privacy and regulatory compliance.',
    },
  ];
}

function buildDataTests(analysis: RequirementAnalysis): TestCase[] {
  return [
    {
      featureArea: 'Data',
      category: 'Data Test',
      title: 'Data consistency and integrity',
      description: 'Verify data is consistent across create, read, update, and delete operations.',
      inputs: 'CRUD operations, concurrent updates, transactions, rollbacks.',
      expectedResult: 'Data remains consistent; no orphaned or corrupted records.',
      priority: 'High',
      notes: 'Ensures database reliability and data accuracy.',
    },
    {
      featureArea: 'Data',
      category: 'Data Test',
      title: 'Data import and export validation',
      description: 'Test import/export of data in supported formats.',
      inputs: 'CSV, Excel, JSON, XML files with valid and invalid structures.',
      expectedResult: 'Valid data imports successfully; invalid data is rejected with clear errors.',
      priority: 'Medium',
      notes: 'Covers data migration and bulk operations.',
    },
    {
      featureArea: 'Data',
      category: 'Data Test',
      title: 'Audit logging and compliance',
      description: 'Verify all data changes are logged for audit and compliance.',
      inputs: 'Data modifications, access logs, timestamps, user identity tracking.',
      expectedResult: 'Complete audit trail is maintained; no data changes go unlogged.',
      priority: 'Medium',
      notes: 'Supports regulatory requirements and forensics.',
    },
  ];
}

function buildCompatibilityTests(analysis: RequirementAnalysis): TestCase[] {
  return [
    {
      featureArea: 'Compatibility',
      category: 'Compatibility Test',
      title: 'Cross-browser and device compatibility',
      description: 'Test on Chrome, Firefox, Safari, Edge, and mobile browsers.',
      inputs: 'Access from desktop, tablet, and mobile devices.',
      expectedResult: 'Feature works consistently across all tested browsers and devices.',
      priority: 'Medium',
      notes: 'Ensures broad user accessibility.',
    },
    {
      featureArea: 'Compatibility',
      category: 'Compatibility Test',
      title: 'API version and integration compatibility',
      description: 'Test backward and forward compatibility with external services.',
      inputs: 'Different API versions, deprecated endpoints, new API features.',
      expectedResult: 'System gracefully handles version mismatches; old endpoints still work.',
      priority: 'Medium',
      notes: 'Supports long-term integration stability.',
    },
  ];
}

function buildAccessibilityTests(analysis: RequirementAnalysis): TestCase[] {
  return [
    {
      featureArea: 'Accessibility',
      category: 'Accessibility Test',
      title: 'Keyboard navigation and screen reader support',
      description: 'Verify the feature is fully navigable via keyboard and compatible with screen readers.',
      inputs: 'Tab navigation, Enter/Space activation, focus management, ARIA labels.',
      expectedResult: 'All interactive elements are keyboard-accessible; screen readers read content correctly.',
      priority: 'Medium',
      notes: 'Ensures accessibility for users with disabilities (WCAG compliance).',
    },
  ];
}

function buildIntegrationTests(analysis: RequirementAnalysis): TestCase[] {
  return [
    {
      featureArea: 'Integration',
      category: 'Integration Test',
      title: 'Third-party API integration',
      description: 'Verify integration with external APIs, webhooks, and services.',
      inputs: 'API calls, webhook payloads, error responses, rate limiting.',
      expectedResult: 'External services integrate seamlessly; errors are handled gracefully.',
      priority: 'Medium',
      notes: 'Covers external dependency reliability.',
    },
    {
      featureArea: 'Integration',
      category: 'Integration Test',
      title: 'Notification and webhook delivery',
      description: 'Test delivery of notifications via email, SMS, push, or webhooks.',
      inputs: 'Multiple notification types, delivery failures, retry logic.',
      expectedResult: 'Notifications are delivered reliably; retries occur on failure.',
      priority: 'Medium',
      notes: 'Ensures user communication flows work as expected.',
    },
  ];
}

function buildConcurrencyTests(analysis: RequirementAnalysis): TestCase[] {
  const area = analysis.featureAreas[0] ?? 'General';

  return [
    {
      featureArea: area,
      category: 'Concurrency Test',
      title: 'Concurrent user access and race conditions',
      description: 'Simulate multiple users accessing the feature simultaneously.',
      inputs: 'Concurrent requests, simultaneous updates, competing transactions.',
      expectedResult: 'No data corruption or deadlocks; transactions are isolated correctly.',
      priority: 'Medium',
      notes: 'Tests multi-threaded safety and resource contention.',
    },
  ];
}

function buildSmokeTests(analysis: RequirementAnalysis): TestCase[] {
  const area = analysis.featureAreas[0] ?? 'General';

  return [
    {
      featureArea: area,
      category: 'Smoke Test',
      title: 'Basic feature availability',
      description: 'Verify the core feature is available and responds to basic operations.',
      inputs: 'Simple, basic operations without complex parameters.',
      expectedResult: 'Feature loads and responds without critical errors.',
      priority: 'High',
      notes: 'Quick check to ensure feature is deployable; run after each build.',
    },
  ];
}

function buildSanityTests(analysis: RequirementAnalysis): TestCase[] {
  const area = analysis.featureAreas[0] ?? 'General';

  return [
    {
      featureArea: area,
      category: 'Sanity Test',
      title: 'Requirement coverage validation',
      description: 'Verify all stated requirements are implemented and working.',
      inputs: 'All specified actions and features from the requirement.',
      expectedResult: 'Each requirement item works as specified.',
      priority: 'High',
      notes: 'Run before formal QA to confirm feature meets spec.',
    },
  ];
}

function buildExploratoryTests(analysis: RequirementAnalysis): TestCase[] {
  const area = analysis.featureAreas[0] ?? 'General';

  return [
    {
      featureArea: area,
      category: 'Exploratory Test',
      title: 'Uncovering unexpected behavior',
      description: 'Ad-hoc testing to discover defects not covered by scripted cases.',
      inputs: 'Varied and unexpected user interactions, unusual workflows.',
      expectedResult: 'System handles unexpected usage gracefully; no crashes or data loss.',
      priority: 'Medium',
      notes: 'Performed by experienced testers; valuable for finding hidden issues.',
    },
  ];
}

function buildLocalizationTests(analysis: RequirementAnalysis): TestCase[] {
  return [
    {
      featureArea: 'Localization',
      category: 'Localization Test',
      title: 'Multi-language and region support',
      description: 'Test the feature in different languages and regional settings.',
      inputs: 'Text in different languages, regional number/date formats, RTL text.',
      expectedResult: 'All content renders correctly; no text overflow; RTL layouts work.',
      priority: 'Medium',
      notes: 'Supports global user base; catches encoding and formatting issues.',
    },
  ];
}

function buildMobileTests(analysis: RequirementAnalysis): TestCase[] {
  return [
    {
      featureArea: 'Mobile',
      category: 'Mobile Test',
      title: 'Mobile device responsiveness and touch',
      description: 'Verify feature works on mobile devices with touch and smaller screens.',
      inputs: 'Mobile browser, touch interactions, varying screen sizes and orientations.',
      expectedResult: 'Feature is fully usable on mobile; buttons are touch-friendly; layouts adapt.',
      priority: 'Medium',
      notes: 'Critical for mobile-first or responsive applications.',
    },
  ];
}

function buildDatabaseTests(analysis: RequirementAnalysis): TestCase[] {
  return [
    {
      featureArea: 'Data',
      category: 'Database Test',
      title: 'Database schema and query performance',
      description: 'Verify database queries execute efficiently and data is stored correctly.',
      inputs: 'Complex queries, large datasets, indexes, query plans.',
      expectedResult: 'Queries return correct results; response times are acceptable.',
      priority: 'Medium',
      notes: 'Tests backend data layer; identifies performance bottlenecks.',
    },
  ];
}

function buildAPIContractTests(analysis: RequirementAnalysis): TestCase[] {
  return [
    {
      featureArea: 'Integration',
      category: 'API Contract Test',
      title: 'API request and response validation',
      description: 'Verify API endpoints return expected response structure and status codes.',
      inputs: 'Valid and invalid API requests, different HTTP methods, edge-case payloads.',
      expectedResult: 'Responses match contract; status codes are correct; payloads are valid.',
      priority: 'High',
      notes: 'Ensures API reliability for consumers; prevents breaking changes.',
    },
  ];
}

function buildStateTransitionTests(analysis: RequirementAnalysis): TestCase[] {
  const area = analysis.featureAreas[0] ?? 'General';

  return [
    {
      featureArea: area,
      category: 'State Transition Test',
      title: 'Valid and invalid state transitions',
      description: 'Test all state transitions defined in the feature workflow.',
      inputs: 'State machine transitions, event sequences, edge cases in state changes.',
      expectedResult: 'Only valid transitions are allowed; invalid transitions are blocked.',
      priority: 'High',
      notes: 'Critical for workflows, order processing, and state-driven features.',
    },
  ];
}

function buildConfigurationTests(analysis: RequirementAnalysis): TestCase[] {
  const area = analysis.featureAreas[0] ?? 'General';

  return [
    {
      featureArea: area,
      category: 'Configuration Test',
      title: 'Feature behavior under different configurations',
      description: 'Test feature with various configuration settings and feature flags.',
      inputs: 'Different config values, enabled/disabled feature flags, environment variables.',
      expectedResult: 'Feature behaves correctly for all valid configurations.',
      priority: 'Medium',
      notes: 'Ensures feature is flexible and configurable for different deployments.',
    },
  ];
}

function buildErrorRecoveryTests(analysis: RequirementAnalysis): TestCase[] {
  const area = analysis.featureAreas[0] ?? 'General';

  return [
    {
      featureArea: area,
      category: 'Error Recovery Test',
      title: 'Recovery from transient errors and failures',
      description: 'Test system recovery from temporary failures (network timeouts, service restarts).',
      inputs: 'Simulated service interruptions, network delays, partial failures.',
      expectedResult: 'System recovers gracefully; retries succeed; no data loss.',
      priority: 'Medium',
      notes: 'Tests resilience and fault tolerance in production scenarios.',
    },
  ];
}

function buildDataValidationTests(analysis: RequirementAnalysis): TestCase[] {
  return [
    {
      featureArea: 'Validation',
      category: 'Data Validation Test',
      title: 'Field-level data validation',
      description: 'Verify all input fields are validated for type, length, format, and range.',
      inputs: 'Various invalid values: wrong types, null, empty, oversized, special characters.',
      expectedResult: 'Invalid values are rejected with specific error messages.',
      priority: 'High',
      notes: 'Prevents data corruption and injection attacks.',
    },
  ];
}

function buildBoundaryTests(analysis: RequirementAnalysis): TestCase[] {
  return [
    {
      featureArea: 'Boundary',
      category: 'Boundary Test',
      title: 'Testing at system limits and boundaries',
      description: 'Test feature behavior at maximum limits (file sizes, record counts, string lengths).',
      inputs: 'Maximum allowed values, just-before-max, just-after-max, zero, negative.',
      expectedResult: 'System handles boundary values correctly; appropriate errors at limits.',
      priority: 'High',
      notes: 'Catches off-by-one errors and buffer overflow issues.',
    },
  ];
}

function buildDocumentationTests(analysis: RequirementAnalysis): TestCase[] {
  const area = analysis.featureAreas[0] ?? 'General';

  return [
    {
      featureArea: area,
      category: 'Documentation Test',
      title: 'Help content, tooltips, and error messages',
      description: 'Verify all user-facing text is clear, accurate, and helpful.',
      inputs: 'Help documentation, tooltips, error messages, user guidance.',
      expectedResult: 'All text is clear, grammatically correct, and helpful to users.',
      priority: 'Medium',
      notes: 'Improves user experience and reduces support burden.',
    },
  ];
}

function buildInstallationTests(analysis: RequirementAnalysis): TestCase[] {
  return [
    {
      featureArea: 'Deployment',
      category: 'Installation Test',
      title: 'Installation and setup procedures',
      description: 'Test installation, configuration, and initial setup of the feature.',
      inputs: 'Fresh install, upgrade from previous version, configuration steps.',
      expectedResult: 'Installation completes successfully; all components are initialized.',
      priority: 'Medium',
      notes: 'Ensures smooth deployment and first-time user experience.',
    },
  ];
}

function buildUpgradeTests(analysis: RequirementAnalysis): TestCase[] {
  return [
    {
      featureArea: 'Deployment',
      category: 'Upgrade Test',
      title: 'Upgrade and migration from previous versions',
      description: 'Test upgrading from previous versions without data loss or corruption.',
      inputs: 'Upgrade scripts, data migration, rollback scenarios.',
      expectedResult: 'Upgrade completes successfully; data is migrated correctly.',
      priority: 'High',
      notes: 'Critical for production deployments and user retention.',
    },
  ];
}

function buildDisasterRecoveryTests(analysis: RequirementAnalysis): TestCase[] {
  return [
    {
      featureArea: 'Reliability',
      category: 'Disaster Recovery Test',
      title: 'System recovery after catastrophic failure',
      description: 'Test recovery procedures after major failures (database crash, data loss).',
      inputs: 'Database failures, backup restoration, recovery procedures.',
      expectedResult: 'System recovers to last known good state; minimal data loss.',
      priority: 'High',
      notes: 'Essential for business continuity and data protection.',
    },
  ];
}

function buildComplianceTests(analysis: RequirementAnalysis): TestCase[] {
  return [
    {
      featureArea: 'Compliance',
      category: 'Compliance Test',
      title: 'Regulatory and compliance requirements',
      description: 'Verify feature meets all applicable regulations (GDPR, CCPA, HIPAA, etc).',
      inputs: 'Compliance requirements, data handling, retention policies, audit trails.',
      expectedResult: 'Feature fully complies with applicable regulations.',
      priority: 'High',
      notes: 'Legal requirement; failure can result in penalties.',
    },
  ];
}

function buildStressTests(analysis: RequirementAnalysis): TestCase[] {
  const area = analysis.featureAreas[0] ?? 'General';

  return [
    {
      featureArea: area,
      category: 'Stress Test',
      title: 'System behavior under extreme load',
      description: 'Test feature performance with massive load, spike traffic, and resource exhaustion.',
      inputs: 'Very high concurrent users, peak traffic patterns, maximum data volume.',
      expectedResult: 'System remains stable; degrades gracefully under extreme load.',
      priority: 'Medium',
      notes: 'Identifies system breaking points and capacity limits.',
    },
  ];
}

function buildEnduranceTests(analysis: RequirementAnalysis): TestCase[] {
  const area = analysis.featureAreas[0] ?? 'General';

  return [
    {
      featureArea: area,
      category: 'Endurance Test',
      title: 'System stability over extended periods',
      description: 'Run feature continuously for hours/days to detect memory leaks and degradation.',
      inputs: 'Extended usage, repeated operations, continuous load.',
      expectedResult: 'No memory leaks, resource leaks, or performance degradation over time.',
      priority: 'Medium',
      notes: 'Identifies issues that only appear after prolonged use.',
    },
  ];
}

function buildVolumeTests(analysis: RequirementAnalysis): TestCase[] {
  return [
    {
      featureArea: 'Data',
      category: 'Volume Test',
      title: 'System performance with large data volumes',
      description: 'Test feature performance when processing very large datasets.',
      inputs: 'Large files, bulk operations, massive database queries.',
      expectedResult: 'Feature handles large volumes efficiently; performance is acceptable.',
      priority: 'Medium',
      notes: 'Ensures scalability for production data sizes.',
    },
  ];
}

function buildScalabilityTests(analysis: RequirementAnalysis): TestCase[] {
  return [
    {
      featureArea: 'Performance',
      category: 'Scalability Test',
      title: 'Linear scaling with increasing load',
      description: 'Verify performance scales linearly as resources or users increase.',
      inputs: '1x, 2x, 4x, 8x load multipliers; multiple server instances.',
      expectedResult: 'Performance scales predictably; no exponential degradation.',
      priority: 'Medium',
      notes: 'Critical for services expected to grow.',
    },
  ];
}

function buildBusinessLogicTests(analysis: RequirementAnalysis): TestCase[] {
  const area = analysis.featureAreas[0] ?? 'General';

  return [
    {
      featureArea: area,
      category: 'Business Logic Test',
      title: 'Complex business rule validation',
      description: 'Test complex business logic, calculations, and rule engine behavior.',
      inputs: 'Business rule scenarios, edge cases in calculations, complex conditions.',
      expectedResult: 'All business rules execute correctly; calculations are accurate.',
      priority: 'High',
      notes: 'Validates core business logic that drives the feature.',
    },
  ];
}

function buildWorkflowTests(analysis: RequirementAnalysis): TestCase[] {
  const area = analysis.featureAreas[0] ?? 'General';

  return [
    {
      featureArea: area,
      category: 'Workflow Test',
      title: 'End-to-end workflow and process flows',
      description: 'Test complete workflows from start to finish, including all approval steps.',
      inputs: 'Full workflow scenarios, approvals, rejections, parallel paths.',
      expectedResult: 'All workflow steps execute correctly; no steps are skipped.',
      priority: 'High',
      notes: 'Ensures complete process integrity.',
    },
  ];
}

function buildPerformanceTests(analysis: RequirementAnalysis): TestCase[] {
  const area = analysis.featureAreas[0] ?? 'General';

  return [
    {
      featureArea: area,
      category: 'Performance Test',
      title: 'Feature response time and resource usage',
      description: 'Measure response times, CPU usage, memory consumption, and throughput.',
      inputs: 'Normal load, peak load, resource utilization monitoring.',
      expectedResult: 'Performance meets defined SLAs; resource usage is acceptable.',
      priority: 'Medium',
      notes: 'Establishes performance baselines and detects regressions.',
    },
  ];
}

function buildRegressionTests(analysis: RequirementAnalysis): TestCase[] {
  const area = analysis.featureAreas[0] ?? 'General';

  return [
    {
      featureArea: area,
      category: 'Regression Test',
      title: 'Related feature stability after changes',
      description: 'Verify related existing behavior continues to work after this requirement is implemented.',
      inputs: 'Repeat key workflows and scenarios tied to the feature area.',
      expectedResult: 'No regressions occur in related functionality.',
      priority: 'Medium',
      notes: 'Protects adjacent features from unintended side effects.',
    },
  ];
}

function buildUsabilityTests(analysis: RequirementAnalysis): TestCase[] {
  const area = analysis.featureAreas[0] ?? 'General';

  return [
    {
      featureArea: area,
      category: 'Usability Test',
      title: 'Intuitive interface and user guidance',
      description: 'Assess whether the feature is intuitive and provides helpful guidance.',
      inputs: 'User navigation through screens, prompts, error feedback, help availability.',
      expectedResult: 'A user can complete the task without confusion; interface is polished.',
      priority: 'Medium',
      notes: 'Ensures excellent user experience and reduces training needs.',
    },
  ];
}

export function generateTestCases(requirement: string): TestCase[] {
  const analysis = parseRequirement(requirement);
  return [
    ...buildSmokeTests(analysis),
    ...buildSanityTests(analysis),
    ...buildCoreScenarios(analysis),
    ...buildEdgeCases(analysis),
    ...buildBoundaryTests(analysis),
    ...buildNegativeTests(analysis),
    ...buildDataValidationTests(analysis),
    ...buildSecurityTests(analysis),
    ...buildDataTests(analysis),
    ...buildDatabaseTests(analysis),
    ...buildAPIContractTests(analysis),
    ...buildStateTransitionTests(analysis),
    ...buildBusinessLogicTests(analysis),
    ...buildWorkflowTests(analysis),
    ...buildCompatibilityTests(analysis),
    ...buildMobileTests(analysis),
    ...buildAccessibilityTests(analysis),
    ...buildLocalizationTests(analysis),
    ...buildIntegrationTests(analysis),
    ...buildConcurrencyTests(analysis),
    ...buildConfigurationTests(analysis),
    ...buildErrorRecoveryTests(analysis),
    ...buildPerformanceTests(analysis),
    ...buildStressTests(analysis),
    ...buildEnduranceTests(analysis),
    ...buildVolumeTests(analysis),
    ...buildScalabilityTests(analysis),
    ...buildDocumentationTests(analysis),
    ...buildInstallationTests(analysis),
    ...buildUpgradeTests(analysis),
    ...buildDisasterRecoveryTests(analysis),
    ...buildComplianceTests(analysis),
    ...buildExploratoryTests(analysis),
    ...buildRegressionTests(analysis),
    ...buildUsabilityTests(analysis),
  ];
}
