# 🚀 Deployment Checklist - Theme Architecture

**Quick reference checklist for deploying to production**

---

## Pre-Deployment (5 minutes)

- [x] Code committed to `main`
- [x] Code pushed to GitHub
- [x] Lint passed (all files)
- [x] Build successful (TypeScript + Next.js)
- [x] No console errors
- [x] Light mode tested and working
- [x] Dark mode tested and working
- [x] Theme switching verified

---

## Choose Deployment Method

### If using **Vercel**:
```bash
vercel --prod
# Wait 2-3 minutes for build and deployment
# Verify at: https://yourdomain.com
```

### If using **Docker/Kubernetes**:
```bash
docker build -t metaos:latest .
docker push your-registry/metaos:latest
kubectl set image deployment/metaos metaos=your-registry/metaos:latest
kubectl rollout status deployment/metaos
```

### If using **Traditional Server**:
```bash
ssh user@server.com
cd /var/www/metaos
git pull origin main
npm ci && npm run build
systemctl restart metaos
```

### If using **AWS/GitHub Actions**:
1. Push to `main` branch
2. GitHub Actions automatically builds and deploys
3. Monitor: AWS CloudWatch → Logs

---

## Post-Deployment Verification (10 minutes)

### Step 1: Application Load
- [ ] Visit production URL: `https://yourdomain.com`
- [ ] Page loads without errors
- [ ] No 500 errors in console
- [ ] No missing CSS or images

### Step 2: Light Mode Test
- [ ] Navigate to Zero Purchase dashboard
- [ ] Click theme toggle to "Light"
- [ ] Text is **dark and readable** on light background
- [ ] Metric values are visible
- [ ] Buttons are clickable
- [ ] No invisible text
- [ ] **Check**: Contrast ratios are good

### Step 3: Dark Mode Test
- [ ] Click theme toggle to "Dark"
- [ ] Text is **light and readable** on dark background
- [ ] All colors updated (no flashing)
- [ ] Sidebar colors updated
- [ ] Table rows visible
- [ ] Status indicators visible
- [ ] **Check**: Contrast ratios still good

### Step 4: Theme Switching
- [ ] Light → Dark transition is instant
- [ ] Dark → Light transition is instant
- [ ] Switch 5 times: no degradation
- [ ] Refresh page: theme persists
- [ ] Close/reopen browser: theme remembered (if implemented)

### Step 5: Accessibility Audit
- [ ] Run Lighthouse audit
- [ ] Accessibility score: 90+
- [ ] No WCAG AA violations
- [ ] Color contrast passes
- [ ] No missing alt text (existing state)

### Step 6: Error Monitoring
- [ ] Check Sentry/DataDog: 0 new errors
- [ ] CloudWatch logs: 0 theme errors
- [ ] Browser console: No errors
- [ ] Network tab: All resources loading

---

## Rollback (if needed)

If issues occur, rollback immediately:

```bash
# Revert both commits
git revert 5a8dba7
git revert 08d1b66
git push origin main

# Redeploy (Vercel)
vercel --prod

# OR restart (traditional server)
systemctl restart metaos
```

**Expected rollback time**: 2 minutes

---

## Monitoring (24 hours)

### Automated Alerts (Set these up)
- [ ] Error rate spike
- [ ] Page load time increase
- [ ] CSS variable not loading
- [ ] Theme attribute not set
- [ ] Console errors > 0

### Manual Checks (Every 4 hours)
- [ ] Dark mode text readable
- [ ] Light mode text readable
- [ ] Theme switching works
- [ ] No user complaints
- [ ] Performance metrics normal

### Support Contacts
- If issues: Page the on-call engineer
- If critical: Page the team lead
- Rollback authority: Engineering manager

---

## Success Criteria ✅

**Deployment is successful when ALL of these are true:**

- [ ] App loads without errors
- [ ] Light mode working perfectly
- [ ] Dark mode working perfectly
- [ ] Theme switching instant and smooth
- [ ] No new error rate increase
- [ ] WCAG AA compliance maintained
- [ ] All text readable in both modes
- [ ] No user complaints within 2 hours
- [ ] Performance metrics unchanged
- [ ] Monitoring shows no anomalies

---

## Deployment Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Engineer | _ | _ | _ |
| QA | _ | _ | _ |
| Product | _ | _ | _ |
| Ops | _ | _ | _ |

---

## Key Contacts

**For questions about theme system:**
- See: `THEMING_GUIDE.md`
- Contact: Engineering team

**For deployment issues:**
- See: `DEPLOYMENT_GUIDE.md`
- Contact: DevOps team

**For accessibility concerns:**
- See: `THEME_MIGRATION_STATUS.md`
- Contact: Accessibility team

---

## Quick Reference

**What changed**: 26 hardcoded colors → semantic theme system  
**Files changed**: 12 (6 new, 6 modified)  
**Breaking changes**: None  
**Rollback time**: 2 minutes  
**Risk level**: Very Low  
**Go/No-Go decision**: ✅ **GO**

---

## Timeline

```
Pre-deployment checks -----> 5 min
      ↓
Build & deploy -----------> 5-10 min
      ↓
Verification tests --------> 10 min
      ↓
24-hour monitoring --------> Ongoing
      ↓
Success! 🎉 ----------> Production live
```

**Total time to production**: ~30 minutes

---

## Status Tracker

```
[x] Code ready
[x] Tests passing
[x] Build successful
[ ] Deployed to production
[ ] Light mode verified
[ ] Dark mode verified
[ ] Monitoring active
[ ] Success confirmed
```

---

**Last Updated**: 2026-07-20  
**Status**: Ready for immediate deployment  
**Approval**: ✅ Approved by development team
