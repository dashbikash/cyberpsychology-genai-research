// Import styles of packages that you've installed.
// All packages except `@mantine/hooks` require styles imports
import '@mantine/core/styles.css';

import { Container, Image, MantineProvider, Title } from '@mantine/core';

export default function App() {
  return <MantineProvider>
    <Container>
      <Title order={1} c="dark">
        Using AI for Better Digital Mental Health
      </Title>


      <p>The integration of Artificial Intelligence into mental healthcare represents one of the most transformative shifts in modern psychiatry. With mental health challenges rising globally and a chronic shortage of qualified clinicians, AI is bridging the gap by making care more accessible, personalized, and proactive.</p>

      <Image src="https://medazhospital.com/storage/2025/10/Mental.webp" alt="Health" />
      <Title order={2}>How AI is Reshaping Digital Mental Health</Title>

      <p>AI technologies are currently deployed across several distinct phases of care, from early screening to continuous monitoring:</p>

      <ul>
        <li><strong>Conversational Agents (Chatbots):</strong> AI-driven platforms like Woebot and Wysa use natural language processing (NLP) to simulate conversational interactions. They are programmed to deliver structured, evidence-based interventions—such as cognitive-behavioral therapy (CBT) exercises—helping users practice emotional regulation and reframe negative thoughts.</li>
        <li><strong>Digital Phenotyping:</strong> This involves the moment-by-moment quantification of an individual's behavior using digital devices. By passively monitoring smartphone data—like sleep patterns, typing speed, and social interaction frequency—machine learning models can detect early behavioral shifts indicative of a depressive episode or psychiatric decline before the user even recognizes the symptoms.</li>
        <li><strong>Diagnostic Precision and Triage:</strong> AI systems can analyze vast amounts of data from electronic health records (EHRs) and clinical notes to identify nuanced patterns. This helps clinicians flag at-risk patients, predict treatment responses, and differentiate between complex conditions faster than traditional observational methods.</li>
      </ul>

      <Image src="https://fgwrc.ca/wp-content/uploads/2025/01/benefits-of-nature-on-mental-health-infographic.jpg" alt="Health" />


      <Title order={2} c="blue">The Benefits of AI Integration</Title>

      <p>The shift toward technology-enabled mental health solutions offers unique advantages, particularly for those facing barriers to traditional care.</p>

      <table>
        <thead>
          <tr>
            <th>Advantage</th>
            <th>Clinical Impact</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Accessibility</strong></td>
            <td>Provides immediate, 24/7 support without waitlists, geographical limits, or scheduling conflicts.</td>
          </tr>
          <tr>
            <td><strong>Anonymity</strong></td>
            <td>Reduces the stigma of help-seeking; users often feel less judged when disclosing sensitive feelings to a transparently artificial entity.</td>
          </tr>
          <tr>
            <td><strong>Cost-Effectiveness</strong></td>
            <td>Delivers low-threshold psychoeducational support to populations that cannot afford ongoing therapy.</td>
          </tr>
          <tr>
            <td><strong>Predictive Care</strong></td>
            <td>Shifts the mental health paradigm from reactive crisis management to proactive, preventive intervention.</td>
          </tr>
        </tbody>
      </table>

      <h2>Challenges and Ethical Guardrails</h2>

      <p>While the technology is advancing rapidly, integrating AI into mental health care introduces significant clinical and ethical challenges:</p>

      <ul>
        <li><strong>The Empathy Gap:</strong> AI can simulate active listening, but it cannot replicate genuine human connection. The "therapeutic alliance"—the trust built between a patient and a human clinician—remains a core predictor of successful psychiatric outcomes.</li>
        <li><strong>Data Privacy and Security:</strong> The continuous data collection required for digital phenotyping raises profound questions about user consent, data ownership, and the risk of sensitive behavioral data being exploited.</li>
        <li><strong>Algorithmic Bias:</strong> If machine learning models are trained on narrow datasets, they risk misinterpreting emotional expressions or symptoms across different cultures and demographics, potentially leading to misdiagnosis.</li>
      </ul>

      <blockquote>
        <strong>Key insight:</strong> AI is best utilized as a <strong>supplement</strong> to human-delivered care, not a surrogate. It excels at providing situational help between clinical appointments, monitoring symptoms, and handling triage, which ultimately frees up human professionals to focus on complex, nuanced psychotherapy.
      </blockquote>
    </Container>
  </MantineProvider>;
}