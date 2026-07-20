# Deployment & Operations Guide

Production deployment checklist and operational procedures for Zero Purchase Control system.

## Pre-Deployment Checklist

### Code Quality
- [ ] All tests passing: `npm test`
- [ ] No TypeScript errors: `npm run metaos:typecheck`
- [ ] No lint warnings: `npm run lint`
- [ ] Build succeeds: `npm run build`

### Testing
- [ ] Unit tests coverage > 80%
- [ ] Integration tests pass
- [ ] Manual testing on staging
- [ ] Error scenarios tested
- [ ] Edge cases verified

### Performance
- [ ] Render time < 100ms (standard)
- [ ] Render time < 50ms (optimized)
- [ ] Bundle size checked
- [ ] Memory usage acceptable
- [ ] No memory leaks detected

### Documentation
- [ ] README.md updated
- [ ] ARCHITECTURE.md current
- [ ] Code comments present
- [ ] API documented
- [ ] Migration guide (if breaking changes)

### Security
- [ ] No XSS vulnerabilities
- [ ] No SQL injection vectors
- [ ] Input validation in place
- [ ] Error messages sanitized
- [ ] Sensitive data not logged

## Deployment Steps

### 1. Build for Production

```bash
# Clean build
rm -rf .next
npm run build

# Verify build
npm run lint
npm run metaos:typecheck
```

### 2. Deploy to Staging

```bash
# Deploy to staging environment
npm run deploy:staging

# Smoke tests
npm run test:smoke

# Monitor staging
npm run monitor:staging
```

### 3. Verify Staging

- [ ] Dashboard loads without errors
- [ ] Data displays correctly
- [ ] Threshold filtering works
- [ ] Copy operations work
- [ ] Row expansion works
- [ ] Error handling works
- [ ] Performance acceptable

### 4. Deploy to Production

```bash
# Create release tag
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0

# Deploy to production
npm run deploy:production

# Monitor production
npm run monitor:production
```

### 5. Post-Deployment

- [ ] Verify all endpoints responding
- [ ] Check error tracking (Sentry/similar)
- [ ] Review analytics (first hour)
- [ ] Monitor performance metrics
- [ ] Check user feedback channels
- [ ] Document any issues

## Monitoring & Operations

### Health Checks

```bash
# Check deployment health
curl https://api.example.com/health

# Expected response:
{
  "status": "ok",
  "version": "1.0.0",
  "uptime": 3600,
  "errors": 0
}
```

### Performance Monitoring

**Key Metrics:**

```
Dashboard Load Time:     < 100ms (target)
Data Processing Time:    < 200ms (target)
API Response Time:       < 500ms (target)
Error Rate:             < 0.1% (target)
Uptime:                 > 99.9% (target)
```

**Monitor with:**

```typescript
import { Analytics } from "@/lib/meta-v2/analytics";

// Get session summary
const summary = Analytics.getSummary();
console.log(`Session Performance: ${summary.avgPerformance}ms`);
console.log(`Errors: ${summary.errorCount}`);
```

### Error Tracking

```typescript
import { Analytics } from "@/lib/meta-v2/analytics";

// Track errors
Analytics.trackError(error, {
  context: "Dashboard Load",
  userId: user.id,
  dataSize: rows.length,
});

// Export for analysis
const report = Analytics.export();
console.log(report);
```

### Logging Strategy

**Debug logs** (development only):
```typescript
console.log("Debug info");
```

**Info logs** (track important events):
```typescript
Analytics.trackAction("user_action", { details });
```

**Error logs** (track failures):
```typescript
Analytics.trackError(error, { context });
```

**Performance logs** (track slow operations):
```typescript
Analytics.trackPerformance("operation", duration);
```

## Rollback Procedures

### Quick Rollback

```bash
# If deployment causes issues, revert immediately
git revert <commit-hash>
git push origin main

# Or use deployment tool
npm run deploy:production -- --version=v0.9.0
```

### Canary Deployment

Roll out to subset of users first:

```bash
# Deploy to 10% of users
npm run deploy:production -- --canary=0.1

# Monitor for errors
npm run monitor:production

# If successful, increase percentage
npm run deploy:production -- --canary=0.5
npm run deploy:production -- --canary=1.0
```

### Feature Flags

For safer deployments:

```typescript
if (isFeatureEnabled("zero_purchase_v2")) {
  return <ZeroPurchaseDashboard {...props} />;
}
```

## Incident Response

### If Dashboard is Down

1. Check monitoring dashboard
2. Review recent deployments
3. Check error logs
4. If recent deploy → rollback
5. If infrastructure → escalate to ops
6. Notify users if > 5 minutes

### If Performance Degrades

1. Check data size (might need optimization)
2. Review database queries
3. Check browser DevTools
4. Run: `npm run test:performance`
5. If threshold exceeded:
   - Switch to optimized component
   - Reduce page size
   - Scale infrastructure

### If Errors Spike

1. Get error report: `Analytics.export()`
2. Identify common errors
3. Check error boundaries
4. Review recent changes
5. Roll back if necessary
6. Fix and redeploy

## Maintenance Tasks

### Daily

```bash
# Monitor key metrics
npm run monitor:metrics

# Check error rates
npm run monitor:errors

# Verify backups
npm run verify:backups
```

### Weekly

```bash
# Run full test suite
npm test

# Performance audit
npm run audit:performance

# Security scan
npm run audit:security

# Update dependencies
npm update
npm audit fix
```

### Monthly

```bash
# Clean old logs
npm run cleanup:logs

# Analyze usage patterns
npm run analyze:usage

# Update documentation
npm run docs:build

# Plan capacity needs
npm run capacity:planning
```

## Scaling Strategies

### When to Scale Up

- Response time > 500ms
- Error rate > 1%
- CPU usage > 80%
- Memory usage > 90%
- Concurrent users > 1000

### Horizontal Scaling

```bash
# Add more servers
npm run scale:horizontal --replicas=3

# Configure load balancer
npm run config:loadbalancer
```

### Vertical Scaling

```bash
# Increase server resources
npm run scale:vertical --cpu=2 --memory=4GB

# Update component to optimized
# ZeroPurchaseDashboard → ZeroPurchaseDashboardOptimized
```

### Data Optimization

```bash
# If dataset too large, implement filtering
npm run optimize:data

# Consider archiving old data
npm run archive:data --before="2026-01-01"
```

## Version Management

### Semantic Versioning

```
MAJOR.MINOR.PATCH
v1.2.3
│  │  │
│  │  └─ Patch: bug fixes
│  └────  Minor: new features
└─────    Major: breaking changes
```

### Release Process

```bash
# Tag release
git tag -a v1.2.3 -m "Release v1.2.3"

# Push tag
git push origin v1.2.3

# Create changelog
npm run changelog:generate

# Deploy
npm run deploy:production
```

### Deprecation Policy

Old versions supported for:
- **Patch releases**: Indefinitely
- **Minor releases**: 6 months
- **Major releases**: 12 months

Notify users 2 releases before deprecation.

## Disaster Recovery

### Backup Strategy

```bash
# Daily backups
0 2 * * * npm run backup:data

# Weekly full backups
0 3 * * 0 npm run backup:full

# Verify backups
0 4 * * * npm run verify:backups
```

### Recovery Procedures

```bash
# Restore from backup
npm run restore:data --backup=2026-07-20-latest

# Verify restored data
npm run validate:restore

# Resume operations
npm run restart:service
```

### Disaster Testing

Monthly disaster recovery drills:

```bash
# Simulate data loss
npm run test:disaster-recovery

# Measure recovery time
# Target: < 15 minutes
```

## Cost Optimization

### Monitor Costs

```bash
# Analyze infrastructure costs
npm run cost:analysis

# Identify optimizations
npm run cost:optimize

# Budget alerts
npm run cost:alerts --threshold=10000
```

### Optimization Techniques

1. **Use Optimized Component** for large datasets
2. **Implement Pagination** to reduce rendering
3. **Cache API Responses** when possible
4. **Compress Data** before transmission
5. **Archive Old Data** to cheaper storage

## Success Metrics

Track after deployment:

```
✅ Uptime: > 99.9%
✅ Response Time: < 500ms (p95)
✅ Error Rate: < 0.1%
✅ User Satisfaction: > 4.0/5
✅ Performance Score: > 90/100
```

## Support & Escalation

### Support Tiers

1. **Tier 1** (User): Browser console, error boundaries
2. **Tier 2** (Engineer): Analytics export, logs review
3. **Tier 3** (DevOps): Infrastructure, deployments

### Escalation Path

```
User Issue
    ↓
Check Monitoring
    ↓
Review Logs
    ↓
Consult Runbook
    ↓
If Unresolved → Escalate to Tier 2/3
```

## Contact & Resources

- **On-call Engineer**: Check PagerDuty
- **Deployment Lead**: #ops channel
- **Documentation**: See ARCHITECTURE.md
- **Status Page**: https://status.example.com
