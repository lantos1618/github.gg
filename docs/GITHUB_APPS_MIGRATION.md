# GitHub Apps Migration & Webhook Implementation

## 🎯 Why GitHub Apps Over OAuth?

### **Current OAuth Limitations**
- Rate limits: 5,000 requests/hour for authenticated users
- Limited to user's personal access
- Can't access organization repos without explicit permission
- No webhook capabilities
- No automated commenting

### **GitHub Apps Benefits**
- **Higher Rate Limits**: 5,000 requests/hour per installation (vs per user)
- **Granular Permissions**: Repository-level access control
- **Webhook Support**: Real-time event processing
- **Automated Actions**: Can comment, create status checks, etc.
- **Organization Support**: Can be installed on org repos
- **Better Security**: Scoped permissions, no personal token sharing

## 🏗️ Migration Strategy

### **Phase 1: GitHub App Setup**
1. **Create GitHub App**
   - Register app at https://github.com/settings/apps
   - Configure permissions:
     - `contents: read` - Access repository contents
     - `metadata: read` - Access repository metadata
     - `pull_requests: read` - Read PR information
     - `issues: read` - Read issues
     - `webhooks` - Receive webhook events

2. **Database Schema Updates**
   ```sql
   -- Add GitHub App installations table
   CREATE TABLE github_app_installations (
     id SERIAL PRIMARY KEY,
     installation_id INTEGER UNIQUE NOT NULL,
     account_id INTEGER NOT NULL,
     account_type VARCHAR(20) NOT NULL, -- 'User' or 'Organization'
     repository_selection VARCHAR(20) NOT NULL, -- 'all' or 'selected'
     created_at TIMESTAMP DEFAULT NOW(),
     updated_at TIMESTAMP DEFAULT NOW()
   );

   -- Add repositories table for selected repos
   CREATE TABLE installation_repositories (
     id SERIAL PRIMARY KEY,
     installation_id INTEGER REFERENCES github_app_installations(installation_id),
     repository_id INTEGER NOT NULL,
     full_name VARCHAR(255) NOT NULL,
     created_at TIMESTAMP DEFAULT NOW()
   );
   ```

### **Phase 2: Authentication Flow**
1. **Installation Flow**
   - User clicks "Install GitHub App"
   - Redirect to GitHub App installation page
   - Handle installation callback
   - Store installation details in database

2. **Token Management**
   - Generate installation access tokens
   - Cache tokens (they expire in 1 hour)
   - Implement token refresh logic

### **Phase 3: Webhook Infrastructure**
1. **Webhook Endpoint**
   ```typescript
   // /api/webhooks/github
   export async function POST(request: Request) {
     const payload = await request.text();
     const signature = request.headers.get('x-hub-signature-256');
     
     // Verify webhook signature
     if (!verifyWebhookSignature(payload, signature, process.env.GITHUB_WEBHOOK_SECRET)) {
       return new Response('Unauthorized', { status: 401 });
     }
     
     const event = JSON.parse(payload);
     const eventType = request.headers.get('x-github-event');
     
     // Process different event types
     switch (eventType) {
       case 'push':
         await handlePushEvent(event);
         break;
       case 'pull_request':
         await handlePullRequestEvent(event);
         break;
       case 'installation':
         await handleInstallationEvent(event);
         break;
     }
     
     return new Response('OK', { status: 200 });
   }
   ```

2. **Event Processing**
   - **Push Events**: Trigger code analysis on changed files
   - **PR Events**: Analyze PR changes and comment
   - **Installation Events**: Handle app installation/uninstallation

## 🤖 Automated Comments & PR Integration

### **Comment Types**
1. **Code Quality Comments**
   ```markdown
   ## 🔍 Code Quality Analysis
   
   **Complexity**: ⚠️ High complexity detected in `src/utils/helper.ts`
   - Function `processData()` has cyclomatic complexity of 15 (recommended: < 10)
   - Consider breaking into smaller functions
   
   **Maintainability**: ✅ Good overall maintainability score
   - Clear naming conventions
   - Proper error handling
   ```

2. **Security Alerts**
   ```markdown
   ## 🔒 Security Scan Results
   
   ⚠️ **Potential Security Issue**: Hardcoded API key detected
   - File: `config/database.js:15`
   - Recommendation: Use environment variables
   
   ✅ **Dependencies**: All dependencies are up to date
   ```

3. **Performance Suggestions**
   ```markdown
   ## ⚡ Performance Analysis
   
   **Bundle Impact**: 📦 +2.3KB added to bundle size
   - Consider lazy loading for `heavyComponent.js`
   
   **Runtime**: ✅ No performance regressions detected
   ```

### **Status Checks**
- **Code Quality Check**: Pass/Fail based on quality thresholds
- **Security Check**: Pass/Fail based on vulnerability scan
- **Performance Check**: Pass/Fail based on performance impact

## 📊 Implementation Timeline

### **Week 1-2: GitHub App Setup**
- [ ] Create GitHub App
- [ ] Update database schema
- [ ] Implement installation flow
- [ ] Basic token management

### **Week 3-4: Webhook Infrastructure**
- [ ] Webhook endpoint
- [ ] Event processing system
- [ ] Background job queue
- [ ] Error handling and retries

### **Week 5-6: Automated Analysis**
- [ ] Code quality analysis engine
- [ ] Security scanning
- [ ] Performance analysis
- [ ] Comment generation

### **Week 7-8: Integration & Testing**
- [ ] PR integration
- [ ] Status checks
- [ ] User feedback system
- [ ] Performance optimization

## 🔧 Technical Considerations

### **Rate Limiting**
- GitHub Apps: 5,000 requests/hour per installation
- Implement request queuing and throttling
- Cache analysis results to reduce API calls

### **Security**
- Verify webhook signatures
- Validate installation permissions
- Sanitize all user inputs
- Implement proper error handling

### **Performance**
- Process webhooks asynchronously
- Cache analysis results
- Implement incremental analysis
- Use background jobs for heavy processing

### **Scalability**
- Use message queues for event processing
- Implement horizontal scaling
- Monitor resource usage
- Optimize database queries

## 🎯 Success Metrics

- **Installation Rate**: % of users who install the GitHub App
- **Comment Engagement**: % of comments that receive responses
- **Analysis Accuracy**: % of suggestions that are accepted
- **Performance Impact**: Time to process webhook events
- **User Satisfaction**: Feedback on automated comments

## 🚀 Next Steps

1. **Create GitHub App** in GitHub Developer Settings
2. **Update database schema** for installations
3. **Implement installation flow** in the UI
4. **Build webhook endpoint** for event processing
5. **Develop analysis engine** for automated insights
6. **Test with real repositories** and gather feedback 