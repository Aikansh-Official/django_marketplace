from rest_framework.exceptions import AuthenticationFailed


def require_active_session(user, token):
    """Reject revoked, legacy and suspended sessions on both token paths."""
    platform = token.get('client_type')
    session_id = token.get('session_id')
    if not user.is_active or platform not in ('web', 'android') or not session_id:
        raise AuthenticationFailed('Session is no longer valid. Please sign in again.')
    if session_id != getattr(user, f'{platform}_session_id', ''):
        raise AuthenticationFailed('Session is no longer valid. Please sign in again.')


def revoke_user_sessions(user):
    for platform in ('web', 'android'):
        setattr(user, f'{platform}_session_id', '')
        setattr(user, f'{platform}_session_device', '')
        setattr(user, f'{platform}_session_created_at', None)
