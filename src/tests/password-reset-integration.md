# Password Reset System - Integration Tests

## Test Cases

### 1. Request Creation
- [ ] User can request password reset with valid email
- [ ] Rate limiting prevents duplicate requests within 5 minutes
- [ ] Notification is created for secretaria
- [ ] Request appears in password reset dashboard

### 2. Notification Flow
- [ ] Secretaria receives toast notification
- [ ] Deep-link navigation works from notification
- [ ] Notification is marked as read when opened
- [ ] Badge count updates correctly

### 3. Request Management
- [ ] Secretaria can view all requests
- [ ] Status filtering works correctly
- [ ] Search functionality works
- [ ] Request details modal opens correctly

### 4. Status Updates
- [ ] Status can be changed from NEW → IN_PROGRESS
- [ ] Status can be changed to DONE with completion details
- [ ] Status can be changed to CANCELED with notes
- [ ] Audit trail is maintained

### 5. Edge Cases
- [ ] Invalid email handling
- [ ] Non-existent user handling
- [ ] Concurrent status updates
- [ ] Browser refresh preserves state

## Manual Testing Checklist

1. **Create Test Request**
   ```
   Email: test@example.com
   Expected: Toast appears, secretaria gets notification
   ```

2. **Navigate from Notification**
   ```
   Click notification → Should open request detail modal
   ```

3. **Process Request**
   ```
   Change status → Should update UI and create audit entry
   ```

4. **Verify Cleanup**
   ```
   Old archived requests should be cleaned automatically
   ```

## Performance Tests

- [ ] Page loads under 2s with 100+ requests
- [ ] Real-time updates work across browser tabs
- [ ] Memory usage remains stable during long sessions
- [ ] No memory leaks in notification subscriptions