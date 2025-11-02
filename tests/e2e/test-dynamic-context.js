#!/usr/bin/env node
/**
 * Test script for dynamic context creation with ML processing
 */

import { createContextEngine } from './dist/src/core/container.js';

const testMessages = [
  {
    role: 'user',
    content: 'I want to create a React component that handles form validation. It should use TypeScript and include error handling.'
  },
  {
    role: 'assistant',
    content: 'Here\'s a React component with form validation:\n\n```typescript\n// components/FormInput.tsx\nimport React, { useState } from \'react\';\n\ninterface FormInputProps {\n  label: string;\n  type: string;\n  validator?: (value: string) => string | null;\n}\n\nexport const FormInput: React.FC<FormInputProps> = ({ label, type, validator }) => {\n  const [value, setValue] = useState(\'\');\n  const [error, setError] = useState<string | null>(null);\n\n  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {\n    const newValue = e.target.value;\n    setValue(newValue);\n    if (validator) {\n      const errorMsg = validator(newValue);\n      setError(errorMsg);\n    }\n  };\n\n  return (\n    <div>\n      <label>{label}</label>\n      <input type={type} value={value} onChange={handleChange} />\n      {error && <span className="error">{error}</span>}\n    </div>\n  );\n};\n```\n\nThis component includes TypeScript types and error handling as requested.'
  },
  {
    role: 'user',
    content: 'Can you add validation for email format?'
  },
  {
    role: 'assistant',
    content: 'I\'ll add email validation:\n\n```typescript\nconst emailValidator = (value: string): string | null => {\n  const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;\n  if (!value) return \'Email is required\';\n  if (!emailRegex.test(value)) return \'Invalid email format\';\n  return null;\n};\n```\n\nYou can use it like: `<FormInput type="email" validator={emailValidator} />`'
  }
];

async function testDynamicContext() {
  try {
    console.log('🧪 Testing Dynamic Context Creation with ML Processing...\n');
    
    const contextEngine = await createContextEngine();
    await contextEngine.initialize();
    
    console.log('📝 Creating dynamic context from conversation...');
    const context = await contextEngine.createFromConversation({
      name: 'e2e-react-form-validation',
      messages: testMessages,
      source: 'local',
      tags: ['react', 'typescript', 'validation', 'e2e'],
      category: 'testing'
    });
    
    console.log('\n✅ Dynamic Context Created!');
    console.log(`   ID: ${context.id}`);
    console.log(`   Name: ${context.name}`);
    console.log(`   Type: ${context.type}`);
    console.log(`   Content length: ${context.content.length} chars`);
    
    if (context.ml) {
      console.log('\n🧠 ML Artifacts:');
      console.log(`   Summary: ${context.ml.summary.substring(0, 100)}...`);
      console.log(`   Topics: ${context.ml.topics.join(', ')}`);
      console.log(`   Code References: ${context.ml.codeRefs.length}`);
      console.log(`   Embedding: ${context.ml.embedding ? `${context.ml.embedding.length} dimensions` : 'not generated'}`);
      
      if (context.ml.codeRefs.length > 0) {
        console.log('\n💻 Code References:');
        context.ml.codeRefs.forEach((ref, i) => {
          console.log(`   ${i + 1}. ${ref.file || 'inline'} (${ref.startLine || 'N/A'}-${ref.endLine || 'N/A'})`);
        });
      }
    }
    
    console.log('\n✅ Dynamic context test PASSED!');
    return context;
  } catch (error) {
    console.error('❌ Dynamic context test FAILED:', error);
    throw error;
  }
}

testDynamicContext();

