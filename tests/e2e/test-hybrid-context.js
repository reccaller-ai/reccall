#!/usr/bin/env node
/**
 * Test script for hybrid context enhancement
 */

import { createContextEngine } from './dist/src/core/container.js';

async function testHybridContext() {
  try {
    console.log('🧪 Testing Hybrid Context Enhancement...\n');
    
    const contextEngine = await createContextEngine();
    await contextEngine.initialize();
    
    // First create a static template
    console.log('📝 Step 1: Creating static template...');
    const template = await contextEngine.createStatic({
      name: 'e2e-code-review-template',
      content: `# Code Review Template

## Checklist
- [ ] Code follows project style guide
- [ ] Error handling is implemented
- [ ] Tests are included
- [ ] Documentation is updated`,
      source: 'local',
      tags: ['template', 'code-review'],
      category: 'guidelines',
      description: 'Template for code reviews'
    });
    
    console.log(`   ✅ Template created: ${template.id}\n`);
    
    // Enhance with conversation
    console.log('📝 Step 2: Enhancing template with conversation insights...');
    const conversation = [
      {
        role: 'user',
        content: 'During code review, I found that the error handling in the API endpoint needs improvement.'
      },
      {
        role: 'assistant',
        content: 'You should add try-catch blocks around database queries and include proper error responses:\n\n```typescript\n// src/api/users.ts\ntry {\n  const users = await db.query(\'SELECT * FROM users\');\n  return res.json(users);\n} catch (error) {\n  console.error(\'Database error:\', error);\n  return res.status(500).json({ error: \'Internal server error\' });\n}\n```'
      }
    ];
    
    const hybrid = await contextEngine.enhanceContext({
      name: 'e2e-enhanced-code-review',
      templateName: 'e2e-code-review-template',
      messages: conversation,
      source: 'local',
      tags: ['enhanced', 'code-review', 'e2e']
    });
    
    console.log('\n✅ Hybrid Context Created!');
    console.log(`   ID: ${hybrid.id}`);
    console.log(`   Name: ${hybrid.name}`);
    console.log(`   Type: ${hybrid.type}`);
    console.log(`   Content includes template: ${hybrid.content.includes('Code Review Template')}`);
    console.log(`   Content includes ML insights: ${hybrid.content.includes('Enhanced with Conversation Insights')}`);
    
    if (hybrid.ml) {
      console.log('\n🧠 ML Artifacts:');
      console.log(`   Summary: ${hybrid.ml.summary.substring(0, 80)}...`);
      console.log(`   Topics: ${hybrid.ml.topics.join(', ')}`);
    }
    
    console.log('\n✅ Hybrid context test PASSED!');
    return hybrid;
  } catch (error) {
    console.error('❌ Hybrid context test FAILED:', error);
    throw error;
  }
}

testHybridContext();

