# Enterprise Deployment Guide

This guide covers enterprise deployment patterns for RecCall's universal AI context engine, including Docker, Kubernetes, cloud deployment, and team management features.

## Overview

RecCall's enterprise features include:

- **Multi-tenant Architecture**: Support for multiple teams and organizations
- **Scalable Storage**: Redis, PostgreSQL, and S3 backends
- **High Availability**: Kubernetes deployment with health checks
- **Security**: SSO/OAuth integration, audit logging, and compliance
- **Monitoring**: Comprehensive observability with metrics and tracing
- **CI/CD**: Automated deployment pipelines

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Load Balancer                           │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                 Kubernetes Cluster                         │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐          │
│  │   RecCall   │ │   RecCall   │ │   RecCall   │          │
│  │   Pod 1     │ │   Pod 2     │ │   Pod 3     │          │
│  └─────────────┘ └─────────────┘ └─────────────┘          │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐          │
│  │   Redis     │ │ PostgreSQL │ │   S3        │          │
│  │   Cache     │ │   Storage  │ │   Assets    │          │
│  └─────────────┘ └─────────────┘ └─────────────┘          │
└─────────────────────────────────────────────────────────────┘
```

## Docker Deployment

### 1. Dockerfile

```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

FROM node:18-alpine AS runtime

WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/starter-pack ./starter-pack

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S reccall -u 1001
USER reccall

EXPOSE 3000
CMD ["node", "dist/index.js"]
```

### 2. Docker Compose

```yaml
version: '3.8'

services:
  reccall:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - REDIS_URL=redis://redis:6379
      - POSTGRES_URL=postgresql://postgres:password@postgres:5432/reccall
      - S3_BUCKET=reccall-assets
      - S3_REGION=us-east-1
    depends_on:
      - redis
      - postgres
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes

  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=reccall
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - reccall

volumes:
  redis_data:
  postgres_data:
```

### 3. Environment Configuration

```bash
# .env.production
NODE_ENV=production
PORT=3000

# Database
POSTGRES_URL=postgresql://postgres:password@postgres:5432/reccall
REDIS_URL=redis://redis:6379

# Storage
S3_BUCKET=reccall-assets
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=your-access-key
S3_SECRET_ACCESS_KEY=your-secret-key

# Authentication
JWT_SECRET=your-jwt-secret
OAUTH_CLIENT_ID=your-oauth-client-id
OAUTH_CLIENT_SECRET=your-oauth-client-secret
OAUTH_REDIRECT_URI=https://reccall.company.com/auth/callback

# Monitoring
SENTRY_DSN=your-sentry-dsn
PROMETHEUS_ENDPOINT=http://prometheus:9090

# Security
ENABLE_TELEMETRY=true
ENABLE_AUDIT_LOGGING=true
RATE_LIMIT_REQUESTS=1000
RATE_LIMIT_WINDOW=3600000
```

## Kubernetes Deployment

### 1. Namespace

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: reccall
  labels:
    name: reccall
```

### 2. ConfigMap

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: reccall-config
  namespace: reccall
data:
  NODE_ENV: "production"
  PORT: "3000"
  ENABLE_TELEMETRY: "true"
  ENABLE_AUDIT_LOGGING: "true"
  RATE_LIMIT_REQUESTS: "1000"
  RATE_LIMIT_WINDOW: "3600000"
```

### 3. Secret

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: reccall-secrets
  namespace: reccall
type: Opaque
data:
  POSTGRES_URL: cG9zdGdyZXNxbDovL3Bvc3RncmVzOnBhc3N3b3JkQHBvc3RncmVzOjU0MzIvcmVjY2FsbA==
  REDIS_URL: cmVkaXM6Ly9yZWRpczozNjM5
  JWT_SECRET: eW91ci1qd3Qtc2VjcmV0
  OAUTH_CLIENT_SECRET: eW91ci1vYXV0aC1zZWNyZXQ=
```

### 4. Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: reccall
  namespace: reccall
spec:
  replicas: 3
  selector:
    matchLabels:
      app: reccall
  template:
    metadata:
      labels:
        app: reccall
    spec:
      containers:
      - name: reccall
        image: reccall:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          valueFrom:
            configMapKeyRef:
              name: reccall-config
              key: NODE_ENV
        - name: POSTGRES_URL
          valueFrom:
            secretKeyRef:
              name: reccall-secrets
              key: POSTGRES_URL
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: reccall-secrets
              key: REDIS_URL
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

### 5. Service

```yaml
apiVersion: v1
kind: Service
metadata:
  name: reccall-service
  namespace: reccall
spec:
  selector:
    app: reccall
  ports:
  - port: 80
    targetPort: 3000
  type: ClusterIP
```

### 6. Ingress

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: reccall-ingress
  namespace: reccall
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/rate-limit: "1000"
    nginx.ingress.kubernetes.io/rate-limit-window: "1m"
spec:
  tls:
  - hosts:
    - reccall.company.com
    secretName: reccall-tls
  rules:
  - host: reccall.company.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: reccall-service
            port:
              number: 80
```

## Helm Chart

### 1. Chart Structure

```
reccall-helm/
├── Chart.yaml
├── values.yaml
├── templates/
│   ├── deployment.yaml
│   ├── service.yaml
│   ├── ingress.yaml
│   ├── configmap.yaml
│   ├── secret.yaml
│   └── hpa.yaml
└── README.md
```

### 2. Chart.yaml

```yaml
apiVersion: v2
name: reccall
description: RecCall Universal AI Context Engine
type: application
version: 1.0.0
appVersion: "1.0.0"
keywords:
  - ai
  - context
  - shortcuts
  - enterprise
home: https://reccaller.ai
sources:
  - https://github.com/reccaller-ai/reccall
maintainers:
  - name: RecCall Team
    email: team@reccaller.ai
```

### 3. values.yaml

```yaml
replicaCount: 3

image:
  repository: reccall
  tag: latest
  pullPolicy: IfNotPresent

service:
  type: ClusterIP
  port: 80
  targetPort: 3000

ingress:
  enabled: true
  className: nginx
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/rate-limit: "1000"
  hosts:
    - host: reccall.company.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: reccall-tls
      hosts:
        - reccall.company.com

resources:
  limits:
    cpu: 500m
    memory: 512Mi
  requests:
    cpu: 250m
    memory: 256Mi

autoscaling:
  enabled: true
  minReplicas: 3
  maxReplicas: 10
  targetCPUUtilizationPercentage: 80
  targetMemoryUtilizationPercentage: 80

nodeSelector: {}

tolerations: []

affinity: {}

postgresql:
  enabled: true
  auth:
    postgresPassword: password
    database: reccall
  primary:
    persistence:
      size: 10Gi

redis:
  enabled: true
  auth:
    enabled: false
  master:
    persistence:
      size: 5Gi
```

### 4. Installation

```bash
# Add Helm repository
helm repo add reccall https://charts.reccaller.ai
helm repo update

# Install RecCall
helm install reccall reccall/reccall \
  --namespace reccall \
  --create-namespace \
  --values values.yaml
```

## Cloud Deployment

### AWS EKS

```bash
# Create EKS cluster
eksctl create cluster --name reccall-cluster --region us-east-1 --nodes 3

# Install RecCall
helm install reccall reccall/reccall \
  --namespace reccall \
  --create-namespace \
  --set postgresql.enabled=false \
  --set redis.enabled=false \
  --set postgresql.auth.postgresPassword=password \
  --set redis.auth.enabled=false
```

### Google GKE

```bash
# Create GKE cluster
gcloud container clusters create reccall-cluster \
  --zone us-central1-a \
  --num-nodes 3

# Install RecCall
helm install reccall reccall/reccall \
  --namespace reccall \
  --create-namespace
```

### Azure AKS

```bash
# Create AKS cluster
az aks create \
  --resource-group reccall-rg \
  --name reccall-cluster \
  --node-count 3 \
  --enable-addons monitoring

# Install RecCall
helm install reccall reccall/reccall \
  --namespace reccall \
  --create-namespace
```

## Enterprise Storage Backends

### PostgreSQL Storage

```typescript
import { PostgreSQLStorage } from 'reccall/storage-backends/postgresql';

// Configure PostgreSQL storage
const storage = new PostgreSQLStorage({
  connectionString: process.env.POSTGRES_URL,
  tableName: 'reccall_shortcuts',
  enableSSL: true
});

// Register with DI container
diContainer.register(TOKENS.CONTEXT_STORAGE, PostgreSQLStorage);
```

### Redis Storage

```typescript
import { RedisStorage } from 'reccall/storage-backends/redis';

// Configure Redis storage
const storage = new RedisStorage({
  url: process.env.REDIS_URL,
  keyPrefix: 'reccall:',
  ttl: 3600
});

// Register with DI container
diContainer.register(TOKENS.CONTEXT_STORAGE, RedisStorage);
```

### S3 Storage

```typescript
import { S3Storage } from 'reccall/storage-backends/s3';

// Configure S3 storage
const storage = new S3Storage({
  bucket: process.env.S3_BUCKET,
  region: process.env.S3_REGION,
  accessKeyId: process.env.S3_ACCESS_KEY_ID,
  secretAccessKey: process.env.S3_SECRET_ACCESS_KEY
});

// Register with DI container
diContainer.register(TOKENS.CONTEXT_STORAGE, S3Storage);
```

## Authentication & Authorization

### SSO Integration

```typescript
import { SSOProvider } from 'reccall/auth/sso';

// Configure SSO
const ssoProvider = new SSOProvider({
  clientId: process.env.OAUTH_CLIENT_ID,
  clientSecret: process.env.OAUTH_CLIENT_SECRET,
  redirectUri: process.env.OAUTH_REDIRECT_URI,
  scopes: ['openid', 'profile', 'email']
});

// Register with DI container
diContainer.register(TOKENS.AUTH_PROVIDER, SSOProvider);
```

### Team Management

```typescript
import { TeamManager } from 'reccall/auth/teams';

// Configure team management
const teamManager = new TeamManager({
  enableTeams: true,
  maxTeamSize: 100,
  enableAuditLogging: true
});

// Register with DI container
diContainer.register(TOKENS.TEAM_MANAGER, TeamManager);
```

## Monitoring & Observability

### Prometheus Metrics

```typescript
import { PrometheusMetrics } from 'reccall/monitoring/prometheus';

// Configure Prometheus metrics
const metrics = new PrometheusMetrics({
  endpoint: process.env.PROMETHEUS_ENDPOINT,
  interval: 15000
});

// Register with DI container
diContainer.register(TOKENS.METRICS_COLLECTOR, PrometheusMetrics);
```

### Health Checks

```typescript
import { HealthChecker } from 'reccall/monitoring/health';

// Configure health checks
const healthChecker = new HealthChecker({
  checks: [
    'database',
    'redis',
    's3',
    'external-apis'
  ],
  timeout: 5000
});

// Register with DI container
diContainer.register(TOKENS.HEALTH_CHECKER, HealthChecker);
```

### Audit Logging

```typescript
import { AuditLogger } from 'reccall/monitoring/audit';

// Configure audit logging
const auditLogger = new AuditLogger({
  enableAuditLogging: true,
  logLevel: 'info',
  retentionDays: 90
});

// Register with DI container
diContainer.register(TOKENS.AUDIT_LOGGER, AuditLogger);
```

## CI/CD Pipeline

### GitHub Actions

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test
      - run: npm run build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
      - name: Deploy to EKS
        run: |
          aws eks update-kubeconfig --name reccall-cluster
          helm upgrade reccall reccall/reccall \
            --namespace reccall \
            --set image.tag=${{ github.sha }}
```

## Security Best Practices

### 1. Network Security

- Use TLS/SSL for all communications
- Implement rate limiting
- Use network policies in Kubernetes
- Enable firewall rules

### 2. Data Security

- Encrypt data at rest and in transit
- Use secure secrets management
- Implement data retention policies
- Enable audit logging

### 3. Access Control

- Implement RBAC (Role-Based Access Control)
- Use SSO/OAuth for authentication
- Enable multi-factor authentication
- Regular access reviews

### 4. Compliance

- SOC 2 Type II compliance
- GDPR compliance for EU users
- HIPAA compliance for healthcare
- Regular security audits

## Backup & Disaster Recovery

### 1. Database Backups

```bash
# PostgreSQL backup
pg_dump $POSTGRES_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# Redis backup
redis-cli --rdb backup_$(date +%Y%m%d_%H%M%S).rdb
```

### 2. S3 Backups

```bash
# S3 backup
aws s3 sync s3://reccall-assets s3://reccall-backups/$(date +%Y%m%d)
```

### 3. Disaster Recovery Plan

1. **RTO (Recovery Time Objective)**: 4 hours
2. **RPO (Recovery Point Objective)**: 1 hour
3. **Backup Frequency**: Daily
4. **Test Frequency**: Monthly

## Performance Optimization

### 1. Caching Strategy

- **L1 Cache**: In-memory LRU cache
- **L2 Cache**: Redis distributed cache
- **L3 Cache**: CDN for static assets

### 2. Database Optimization

- Connection pooling
- Query optimization
- Index optimization
- Read replicas

### 3. Load Balancing

- Round-robin load balancing
- Health check-based routing
- Session affinity
- Geographic load balancing

## Troubleshooting

### Common Issues

1. **High Memory Usage**
   - Check cache configuration
   - Monitor memory leaks
   - Adjust resource limits

2. **Database Connection Issues**
   - Check connection pool settings
   - Monitor database performance
   - Verify network connectivity

3. **Authentication Failures**
   - Check SSO configuration
   - Verify JWT secrets
   - Monitor audit logs

### Monitoring Commands

```bash
# Check pod status
kubectl get pods -n reccall

# Check logs
kubectl logs -f deployment/reccall -n reccall

# Check metrics
kubectl top pods -n reccall

# Check health
curl http://reccall.company.com/health
```

## Support

- **Documentation**: [Enterprise Guide](./ENTERPRISE_DEPLOYMENT.md)
- **Support**: enterprise@reccaller.ai
- **Slack**: #enterprise-support
- **Phone**: +1-800-RECCALL
