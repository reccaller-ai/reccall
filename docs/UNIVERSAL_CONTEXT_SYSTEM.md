# Universal Context Management System

RecCall has been upgraded to a **Universal Context Management System** that provides a unified interface for managing contexts across AI development environments. This system introduces ML-powered context generation, semantic search, and a unified data model for static, dynamic, and hybrid contexts.

## 🎯 Overview

The Universal Context System extends RecCall beyond simple shortcuts to a comprehensive context management platform that:

- **Unifies Context Types**: Single `Context` entity for static, dynamic, and hybrid contexts
- **ML-Powered**: Automatically extracts insights from conversations (summaries, embeddings, topics, code references)
- **Semantic Search**: Hybrid search combining keyword and semantic similarity
- **Multi-Platform**: Available via CLI, MCP, REST API, and SDK
- **Versioned & Trackable**: Built-in versioning and usage analytics

## 📊 Context Types

### Static Contexts
Pre-defined contexts created manually. Perfect for templates, guidelines, and reference materials.

```bash
# Create a static context
reccall context create my-template \
  --content "# My Template\n\nThis is a template..." \
  --source global \
  --tags template \
  --category guidelines
```

### Dynamic Contexts
Automatically generated from conversations with ML processing. Ideal for capturing and reusing AI interactions.

```bash
# Create from conversation (via API/MCP)
# The system automatically:
# - Summarizes the conversation
# - Extracts key topics
# - Identifies code references
# - Generates semantic embeddings
```

### Hybrid Contexts
Static templates enhanced with ML insights from conversations. Combines structure with intelligence.

```typescript
// Example: Enhance a code review template with conversation insights
const hybrid = await contextEngine.enhanceContext({
  name: 'code-review-enhanced',
  templateName: 'code-review-template',
  messages: conversationMessages,
  source: 'local'
});
```

## 🧠 ML Intelligence Layer

The system includes local ML models (with placeholders for advanced models) that process conversations:

### Conversation Summarizer
- Extracts key points from conversations
- Generates structured summaries
- Formats context content with code references

### Code Extractor
- Identifies code blocks in conversations
- Extracts file references
- Captures code context

### Embedding Model
- Generates semantic embeddings (currently hash-based, ready for transformer models)
- Powers semantic search capabilities

### Topic Extractor
- Extracts keywords and topics from conversations
- Enables topic-based filtering and organization

## 🔍 Search Capabilities

### Hybrid Search
The system combines keyword and semantic search for best results:

```bash
# Keyword search (fast, exact matches)
reccall context search "testing"

# Semantic search (finds related concepts)
# Automatically enabled - finds contexts similar in meaning

# Filtered search
reccall context search "api" --type dynamic --source global
```

### Search Features
- **Keyword matching**: Fast text-based search
- **Semantic similarity**: Vector-based similarity search
- **Filtering**: By type, source, category, tags
- **Combined results**: Merges both approaches for comprehensive results

## 📝 Usage Examples

### CLI Usage

```bash
# Create a static context
reccall context create "my-context" \
  --content "$(cat my-file.md)" \
  --source global \
  --tags development \
  --category guides

# List all contexts
reccall context list

# List with filters
reccall context list --type static --source global

# Search contexts
reccall context search "API testing"

# Get a context
reccall context get "my-context"

# View statistics
reccall context stats
reccall context stats ctx_abc123

# Delete a context
reccall context delete ctx_abc123 --force
```

### MCP Usage (Cursor/VSCode)

The MCP server exposes these tools:

- `rec_context_create` - Create a static context
- `rec_context_get` - Get a context by ID or name
- `rec_context_search` - Search contexts
- `rec_context_list` - List contexts with filters
- `rec_context_delete` - Delete a context
- `rec_context_from_conversation` - Create dynamic context from conversation

### REST API Usage

```bash
# List contexts
GET /api/reccall/contexts

# Get context
GET /api/reccall/contexts/{id}

# Create context
POST /api/reccall/contexts
{
  "name": "my-context",
  "content": "# My Context",
  "source": "global",
  "tags": ["dev"],
  "category": "guides"
}

# Search contexts
GET /api/reccall/contexts/search?q=testing

# Get statistics
GET /api/reccall/contexts/stats
GET /api/reccall/contexts/{id}/stats
```

## 🗂️ Data Model

### Context Structure

```typescript
interface Context {
  id: string;                    // Unique ID (ctx_*)
  name: string;                  // Human-readable name
  content: string;               // Markdown content
  type: 'static' | 'dynamic' | 'hybrid';
  source: 'local' | 'global' | 'remote';
  tags: string[];                // Tags for organization
  category?: string;             // Optional category
  description?: string;          // Optional description
  version: string;               // Semantic version
  syncStatus: 'local' | 'synced' | 'pending' | 'conflict';
  repository?: string;           // Repository URL
  ml?: MLArtifacts;             // ML processing results
  createdAt: Date;
  updatedAt: Date;
  lastUsedAt?: Date;
  usageCount: number;
  platforms: string[];          // Platforms where used
}
```

### ML Artifacts

```typescript
interface MLArtifacts {
  embedding: number[];          // Semantic embedding vector
  summary: string;              // Conversation summary
  topics: string[];             // Extracted topics
  codeRefs: CodeRef[];          // Code references
  originalMessages?: ConversationMessage[];
}
```

## 🚀 Migration from Shortcuts

Use the migration utility to convert existing shortcuts to contexts:

```typescript
import { migrateShortcutsToContexts } from '@reccaller-ai/core/migration';

const result = await migrateShortcutsToContexts(
  coreEngine,
  contextEngine,
  { source: 'local', dryRun: false }
);

console.log(`Migrated ${result.migrated} shortcuts`);
```

## 📊 Analytics & Statistics

Track context usage and get insights:

```bash
# System-wide stats
reccall context stats

# Context-specific stats
reccall context stats ctx_abc123
```

Statistics include:
- Total contexts by type and source
- Usage counts and platform distribution
- Most/least used contexts
- Repository sync status

## 🔄 Versioning

Contexts support versioning:

```typescript
// Create new version
await contextEngine.version(ctxId, "Added new section on testing");
```

Version history tracks:
- Version number
- Change description
- Timestamp
- Author (if available)

## 🏗️ Architecture

### Storage
- **Filesystem**: Primary storage with index for fast lookups
- **Structure**: `~/.reccall/contexts/{source}/{context-id}.json`
- **Index**: `~/.reccall/contexts/index.json` for metadata

### Search Engine
- **Vector Store**: In-memory vector store for semantic search
- **Hybrid Approach**: Combines keyword and semantic results
- **Extensible**: Ready for ChromaDB or similar backends

### ML Models
- **Local Processing**: All ML processing happens locally
- **Extensible**: Placeholder implementations ready for:
  - Sentence transformers for embeddings
  - ONNX.js for inference
  - Transformers.js for browser compatibility

## 🔐 Security & Privacy

- **Local Storage**: Default storage is local filesystem
- **No Cloud**: ML processing happens entirely locally
- **Optional Sync**: Repository sync is opt-in
- **Access Control**: Integrate with authentication in API deployments

## 📚 Next Steps

1. **Explore Contexts**: Create your first context
2. **Try Dynamic Contexts**: Capture conversations as contexts
3. **Use Hybrid Search**: Discover related contexts
4. **Review Analytics**: Understand usage patterns
5. **Customize ML**: Integrate advanced ML models if needed

## 🆘 Support

For questions and issues:
- Check the [API Reference](./API_REFERENCE.md)
- Review [Migration Guide](./MIGRATION_GUIDE.md) for shortcuts migration
- Open an issue on [GitHub](https://github.com/reccaller-ai/reccall/issues)

---

**Universal Context Management System** - Powered by RecCall v2.0

