# Security Best Practices

This document outlines security best practices for RecCall's universal AI context engine, including data protection, authentication, and compliance considerations.

## Overview

RecCall handles sensitive context data and must implement comprehensive security measures to protect user information and maintain system integrity.

## Security Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Security Layer                           │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐            │
│  │   Input     │ │   Data      │ │   Network   │            │
│  │ Validation  │ │ Encryption  │ │ Security    │            │
│  └─────────────┘ └─────────────┘ └─────────────┘            │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐            │
│  │   Access    │ │   Audit     │ │   Threat    │            │
│  │ Control     │ │   Logging   │ │ Detection   │            │
│  └─────────────┘ └─────────────┘ └─────────────┘            │
└─────────────────────────────────────────────────────────────┘
                                │
                    ┌───────────▼───────────┐
                    │     Core Engine       │
                    │   (Protected Data)    │
                    └───────────────────────┘
```

## Input Validation & Sanitization

### 1. Shortcut ID Validation

```typescript
import { z } from 'zod';

const ShortcutIdSchema = z.string()
  .min(1, 'Shortcut ID cannot be empty')
  .max(50, 'Shortcut ID too long')
  .regex(/^[a-zA-Z0-9-_]+$/, 'Invalid characters in shortcut ID')
  .refine(
    (id) => !RESERVED_KEYWORDS.includes(id.toLowerCase()),
    'Shortcut ID is reserved'
  );

export function validateShortcutId(id: string): ValidationResult {
  try {
    const validated = ShortcutIdSchema.parse(id);
    return { valid: true, value: validated as ShortcutId };
  } catch (error) {
    return { 
      valid: false, 
      errors: [error.message] 
    };
  }
}
```

### 2. Context Content Sanitization

```typescript
import DOMPurify from 'isomorphic-dompurify';
import { JSDOM } from 'jsdom';

const window = new JSDOM('').window;
const purify = DOMPurify(window);

export function sanitizeContext(context: string): string {
  // Remove potentially malicious content
  const sanitized = purify.sanitize(context, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: []
  });
  
  // Remove control characters
  const cleaned = sanitized.replace(/[\x00-\x1F\x7F]/g, '');
  
  // Limit length
  return cleaned.substring(0, 10000);
}
```

### 3. Repository URL Validation

```typescript
import { z } from 'zod';

const RepositoryUrlSchema = z.string()
  .url('Invalid URL format')
  .refine(
    (url) => {
      try {
        const parsed = new URL(url);
        return ['http:', 'https:'].includes(parsed.protocol);
      } catch {
        return false;
      }
    },
    'Only HTTP/HTTPS URLs allowed'
  )
  .refine(
    (url) => {
      const parsed = new URL(url);
      return !parsed.hostname.includes('localhost') && 
             !parsed.hostname.includes('127.0.0.1');
    },
    'Localhost URLs not allowed'
  );

export function validateRepositoryUrl(url: string): ValidationResult {
  try {
    const validated = RepositoryUrlSchema.parse(url);
    return { valid: true, value: validated as RepositoryUrl };
  } catch (error) {
    return { 
      valid: false, 
      errors: [error.message] 
    };
  }
}
```

## Data Encryption

### 1. At Rest Encryption

```typescript
import crypto from 'crypto';

export class EncryptedStorage implements IContextStorage {
  private readonly algorithm = 'aes-256-gcm';
  private readonly key: Buffer;

  constructor(encryptionKey: string) {
    this.key = crypto.scryptSync(encryptionKey, 'salt', 32);
  }

  private encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(this.algorithm, this.key);
    cipher.setAAD(Buffer.from('reccall-context'));
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  private decrypt(encryptedText: string): string {
    const [ivHex, authTagHex, encrypted] = encryptedText.split(':');
    
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    const decipher = crypto.createDecipher(this.algorithm, this.key);
    decipher.setAAD(Buffer.from('reccall-context'));
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  async record(shortcut: ShortcutId, context: string): Promise<void> {
    const encryptedContext = this.encrypt(context);
    await this.storage.record(shortcut, encryptedContext);
  }

  async call(shortcut: ShortcutId): Promise<string> {
    const encryptedContext = await this.storage.call(shortcut);
    return this.decrypt(encryptedContext);
  }
}
```

### 2. In Transit Encryption

```typescript
import https from 'https';
import { Agent } from 'https';

export class SecureHttpClient {
  private agent: Agent;

  constructor() {
    this.agent = new Agent({
      rejectUnauthorized: true,
      secureProtocol: 'TLSv1_2_method',
      ciphers: [
        'ECDHE-RSA-AES256-GCM-SHA384',
        'ECDHE-RSA-AES128-GCM-SHA256',
        'ECDHE-RSA-AES256-SHA384',
        'ECDHE-RSA-AES128-SHA256'
      ].join(':'),
      honorCipherOrder: true
    });
  }

  async secureRequest(url: string, options: RequestOptions): Promise<Response> {
    return fetch(url, {
      ...options,
      agent: this.agent
    });
  }
}
```

## Authentication & Authorization

### 1. JWT Token Management

```typescript
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

export class TokenManager {
  private readonly secret: string;
  private readonly algorithm = 'HS256';

  constructor(secret: string) {
    this.secret = secret;
  }

  generateToken(payload: TokenPayload): string {
    const token = jwt.sign(payload, this.secret, {
      algorithm: this.algorithm,
      expiresIn: '1h',
      issuer: 'reccall',
      audience: 'reccall-users'
    });
    
    return token;
  }

  verifyToken(token: string): TokenPayload {
    try {
      const decoded = jwt.verify(token, this.secret, {
        algorithms: [this.algorithm],
        issuer: 'reccall',
        audience: 'reccall-users'
      }) as TokenPayload;
      
      return decoded;
    } catch (error) {
      throw new SecurityError('Invalid token');
    }
  }

  refreshToken(token: string): string {
    const payload = this.verifyToken(token);
    return this.generateToken(payload);
  }
}
```

### 2. Role-Based Access Control

```typescript
export enum Role {
  USER = 'user',
  ADMIN = 'admin',
  SUPER_ADMIN = 'super_admin'
}

export enum Permission {
  READ_SHORTCUTS = 'read:shortcuts',
  WRITE_SHORTCUTS = 'write:shortcuts',
  DELETE_SHORTCUTS = 'delete:shortcuts',
  MANAGE_USERS = 'manage:users',
  MANAGE_SYSTEM = 'manage:system'
}

export class RBACManager {
  private readonly rolePermissions: Map<Role, Permission[]> = new Map([
    [Role.USER, [Permission.READ_SHORTCUTS, Permission.WRITE_SHORTCUTS]],
    [Role.ADMIN, [Permission.READ_SHORTCUTS, Permission.WRITE_SHORTCUTS, Permission.DELETE_SHORTCUTS, Permission.MANAGE_USERS]],
    [Role.SUPER_ADMIN, Object.values(Permission)]
  ]);

  hasPermission(userRole: Role, permission: Permission): boolean {
    const permissions = this.rolePermissions.get(userRole) || [];
    return permissions.includes(permission);
  }

  canAccessShortcut(userRole: Role, shortcut: ShortcutId, action: string): boolean {
    switch (action) {
      case 'read':
        return this.hasPermission(userRole, Permission.READ_SHORTCUTS);
      case 'write':
        return this.hasPermission(userRole, Permission.WRITE_SHORTCUTS);
      case 'delete':
        return this.hasPermission(userRole, Permission.DELETE_SHORTCUTS);
      default:
        return false;
    }
  }
}
```

### 3. Multi-Factor Authentication

```typescript
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';

export class MFAManager {
  generateSecret(userId: string): { secret: string; qrCode: string } {
    const secret = speakeasy.generateSecret({
      name: `RecCall (${userId})`,
      issuer: 'RecCall'
    });

    const qrCode = QRCode.toDataURL(secret.otpauth_url!);
    
    return {
      secret: secret.base32,
      qrCode
    };
  }

  verifyToken(secret: string, token: string): boolean {
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 2
    });
  }

  generateBackupCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < 10; i++) {
      codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
    }
    return codes;
  }
}
```

## Network Security

### 1. Rate Limiting

```typescript
import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';

export class RateLimiter {
  private limiter: rateLimit.RateLimit;

  constructor(redisClient: Redis) {
    this.limiter = rateLimit({
      store: new RedisStore({
        client: redisClient,
        prefix: 'reccall:rate_limit:'
      }),
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      message: 'Too many requests from this IP',
      standardHeaders: true,
      legacyHeaders: false
    });
  }

  middleware() {
    return this.limiter;
  }
}
```

### 2. CORS Configuration

```typescript
import cors from 'cors';

export const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      'https://reccaller.ai',
      'https://contexts.reccaller.ai',
      'https://app.reccaller.ai'
    ];
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  maxAge: 86400 // 24 hours
};
```

### 3. Security Headers

```typescript
import helmet from 'helmet';

export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
});
```

## Audit Logging

### 1. Security Event Logging

```typescript
export class SecurityAuditLogger {
  private logger: pino.Logger;

  constructor() {
    this.logger = pino({
      level: 'info',
      formatters: {
        level: (label) => ({ level: label }),
      },
      timestamp: pino.stdTimeFunctions.isoTime,
    });
  }

  logAuthenticationEvent(event: AuthenticationEvent): void {
    this.logger.info({
      event: 'authentication',
      timestamp: Date.now(),
      userId: event.userId,
      action: event.action,
      success: event.success,
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
      riskScore: event.riskScore
    });
  }

  logAuthorizationEvent(event: AuthorizationEvent): void {
    this.logger.info({
      event: 'authorization',
      timestamp: Date.now(),
      userId: event.userId,
      resource: event.resource,
      action: event.action,
      allowed: event.allowed,
      reason: event.reason
    });
  }

  logDataAccessEvent(event: DataAccessEvent): void {
    this.logger.info({
      event: 'data_access',
      timestamp: Date.now(),
      userId: event.userId,
      resource: event.resource,
      action: event.action,
      dataType: event.dataType,
      sensitive: event.sensitive
    });
  }
}
```

### 2. Threat Detection

```typescript
export class ThreatDetector {
  private auditLogger: SecurityAuditLogger;
  private riskThreshold = 0.7;

  constructor(auditLogger: SecurityAuditLogger) {
    this.auditLogger = auditLogger;
  }

  analyzeAuthenticationAttempt(event: AuthenticationEvent): number {
    let riskScore = 0;

    // Failed attempts
    if (!event.success) {
      riskScore += 0.3;
    }

    // Unusual IP
    if (this.isUnusualIP(event.ipAddress)) {
      riskScore += 0.2;
    }

    // Unusual time
    if (this.isUnusualTime(event.timestamp)) {
      riskScore += 0.1;
    }

    // Suspicious user agent
    if (this.isSuspiciousUserAgent(event.userAgent)) {
      riskScore += 0.2;
    }

    if (riskScore >= this.riskThreshold) {
      this.triggerSecurityAlert(event, riskScore);
    }

    return riskScore;
  }

  private isUnusualIP(ipAddress: string): boolean {
    // Implement IP analysis logic
    return false;
  }

  private isUnusualTime(timestamp: number): boolean {
    const hour = new Date(timestamp).getHours();
    return hour < 6 || hour > 22;
  }

  private isSuspiciousUserAgent(userAgent: string): boolean {
    const suspiciousPatterns = [
      /bot/i,
      /crawler/i,
      /scraper/i,
      /curl/i,
      /wget/i
    ];
    
    return suspiciousPatterns.some(pattern => pattern.test(userAgent));
  }

  private triggerSecurityAlert(event: AuthenticationEvent, riskScore: number): void {
    this.auditLogger.logSecurityAlert({
      event: 'security_alert',
      timestamp: Date.now(),
      alertType: 'high_risk_authentication',
      riskScore,
      userId: event.userId,
      ipAddress: event.ipAddress,
      details: 'High risk authentication attempt detected'
    });
  }
}
```

## Data Privacy & Compliance

### 1. GDPR Compliance

```typescript
export class GDPRCompliance {
  async exportUserData(userId: string): Promise<UserDataExport> {
    const shortcuts = await this.getUserShortcuts(userId);
    const auditLogs = await this.getUserAuditLogs(userId);
    
    return {
      userId,
      shortcuts,
      auditLogs,
      exportedAt: new Date().toISOString()
    };
  }

  async deleteUserData(userId: string): Promise<void> {
    // Delete user shortcuts
    await this.deleteUserShortcuts(userId);
    
    // Delete audit logs
    await this.deleteUserAuditLogs(userId);
    
    // Anonymize remaining data
    await this.anonymizeUserData(userId);
  }

  async anonymizeUserData(userId: string): Promise<void> {
    // Replace user ID with hash
    const anonymizedId = crypto.createHash('sha256').update(userId).digest('hex');
    
    // Update all references
    await this.updateUserReferences(userId, anonymizedId);
  }
}
```

### 2. Data Retention

```typescript
export class DataRetentionManager {
  private readonly retentionPolicies = {
    shortcuts: 365 * 24 * 60 * 60 * 1000, // 1 year
    auditLogs: 90 * 24 * 60 * 60 * 1000,  // 90 days
    tempData: 24 * 60 * 60 * 1000         // 24 hours
  };

  async cleanupExpiredData(): Promise<void> {
    const now = Date.now();
    
    // Clean up expired shortcuts
    await this.cleanupExpiredShortcuts(now - this.retentionPolicies.shortcuts);
    
    // Clean up expired audit logs
    await this.cleanupExpiredAuditLogs(now - this.retentionPolicies.auditLogs);
    
    // Clean up temporary data
    await this.cleanupTempData(now - this.retentionPolicies.tempData);
  }

  private async cleanupExpiredShortcuts(cutoffTime: number): Promise<void> {
    // Implement cleanup logic
  }

  private async cleanupExpiredAuditLogs(cutoffTime: number): Promise<void> {
    // Implement cleanup logic
  }

  private async cleanupTempData(cutoffTime: number): Promise<void> {
    // Implement cleanup logic
  }
}
```

## Vulnerability Management

### 1. Dependency Scanning

```typescript
import { execSync } from 'child_process';

export class VulnerabilityScanner {
  async scanDependencies(): Promise<VulnerabilityReport> {
    try {
      const output = execSync('npm audit --json', { encoding: 'utf8' });
      const audit = JSON.parse(output);
      
      return {
        vulnerabilities: audit.vulnerabilities,
        summary: audit.metadata,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error('Failed to scan dependencies');
    }
  }

  async checkForUpdates(): Promise<UpdateReport> {
    try {
      const output = execSync('npm outdated --json', { encoding: 'utf8' });
      const outdated = JSON.parse(output);
      
      return {
        outdatedPackages: outdated,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error('Failed to check for updates');
    }
  }
}
```

### 2. Security Testing

```typescript
import { execSync } from 'child_process';

export class SecurityTester {
  async runSecurityTests(): Promise<SecurityTestReport> {
    const results = {
      dependencyScan: await this.scanDependencies(),
      codeAnalysis: await this.runCodeAnalysis(),
      penetrationTest: await this.runPenetrationTest(),
      timestamp: new Date().toISOString()
    };
    
    return results;
  }

  private async runCodeAnalysis(): Promise<CodeAnalysisReport> {
    try {
      const output = execSync('npm run security:scan', { encoding: 'utf8' });
      return JSON.parse(output);
    } catch (error) {
      throw new Error('Code analysis failed');
    }
  }

  private async runPenetrationTest(): Promise<PenetrationTestReport> {
    // Implement penetration testing logic
    return {
      vulnerabilities: [],
      score: 100,
      timestamp: new Date().toISOString()
    };
  }
}
```

## Incident Response

### 1. Security Incident Handler

```typescript
export class SecurityIncidentHandler {
  private auditLogger: SecurityAuditLogger;
  private notificationService: NotificationService;

  constructor(auditLogger: SecurityAuditLogger, notificationService: NotificationService) {
    this.auditLogger = auditLogger;
    this.notificationService = notificationService;
  }

  async handleSecurityIncident(incident: SecurityIncident): Promise<void> {
    // Log the incident
    this.auditLogger.logSecurityIncident(incident);
    
    // Notify security team
    await this.notificationService.notifySecurityTeam(incident);
    
    // Take immediate action
    await this.takeImmediateAction(incident);
    
    // Escalate if necessary
    if (incident.severity === 'critical') {
      await this.escalateIncident(incident);
    }
  }

  private async takeImmediateAction(incident: SecurityIncident): Promise<void> {
    switch (incident.type) {
      case 'brute_force':
        await this.blockIP(incident.ipAddress);
        break;
      case 'data_breach':
        await this.quarantineAffectedData(incident);
        break;
      case 'malware':
        await this.isolateAffectedSystems(incident);
        break;
    }
  }

  private async escalateIncident(incident: SecurityIncident): Promise<void> {
    // Notify CISO
    await this.notificationService.notifyCISO(incident);
    
    // Create incident ticket
    await this.createIncidentTicket(incident);
    
    // Initiate forensic analysis
    await this.initiateForensicAnalysis(incident);
  }
}
```

## Security Monitoring

### 1. Real-time Monitoring

```typescript
export class SecurityMonitor {
  private metrics: Map<string, number> = new Map();
  private alerts: SecurityAlert[] = [];

  async monitorSecurityEvents(): Promise<void> {
    setInterval(async () => {
      await this.checkSecurityMetrics();
      await this.checkAnomalies();
      await this.checkThreats();
    }, 60000); // Check every minute
  }

  private async checkSecurityMetrics(): Promise<void> {
    const metrics = {
      failedLogins: await this.getFailedLoginCount(),
      suspiciousActivity: await this.getSuspiciousActivityCount(),
      dataAccess: await this.getDataAccessCount()
    };

    for (const [metric, value] of Object.entries(metrics)) {
      this.metrics.set(metric, value);
      
      if (this.isMetricAnomalous(metric, value)) {
        await this.triggerSecurityAlert(metric, value);
      }
    }
  }

  private isMetricAnomalous(metric: string, value: number): boolean {
    const thresholds = {
      failedLogins: 10,
      suspiciousActivity: 5,
      dataAccess: 1000
    };

    return value > (thresholds[metric] || 0);
  }

  private async triggerSecurityAlert(metric: string, value: number): Promise<void> {
    const alert: SecurityAlert = {
      type: 'metric_anomaly',
      metric,
      value,
      timestamp: Date.now(),
      severity: 'medium'
    };

    this.alerts.push(alert);
    await this.notifySecurityTeam(alert);
  }
}
```

## Best Practices Summary

### 1. Development

- **Input Validation**: Validate and sanitize all inputs
- **Output Encoding**: Encode outputs to prevent injection
- **Error Handling**: Don't expose sensitive information in errors
- **Dependency Management**: Keep dependencies updated and scan for vulnerabilities

### 2. Deployment

- **HTTPS Only**: Use TLS/SSL for all communications
- **Security Headers**: Implement comprehensive security headers
- **Rate Limiting**: Implement rate limiting to prevent abuse
- **Monitoring**: Monitor for security events and anomalies

### 3. Operations

- **Access Control**: Implement least privilege access
- **Audit Logging**: Log all security-relevant events
- **Incident Response**: Have a plan for security incidents
- **Regular Updates**: Keep systems and dependencies updated

### 4. Compliance

- **Data Protection**: Implement data encryption and privacy controls
- **Retention Policies**: Implement data retention and deletion policies
- **User Rights**: Support user data export and deletion
- **Regular Audits**: Conduct regular security audits and assessments

## Security Checklist

- [ ] Input validation and sanitization implemented
- [ ] Data encryption at rest and in transit
- [ ] Authentication and authorization configured
- [ ] Rate limiting implemented
- [ ] Security headers configured
- [ ] Audit logging enabled
- [ ] Vulnerability scanning automated
- [ ] Incident response plan documented
- [ ] Security monitoring implemented
- [ ] Compliance requirements met
- [ ] Regular security training conducted
- [ ] Penetration testing performed
- [ ] Security policies documented
- [ ] Access controls reviewed regularly
- [ ] Backup and recovery tested
