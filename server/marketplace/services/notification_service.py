import os
import json
import base64
import logging
from django.conf import settings
from django.utils import timezone
from marketplace.models import Notification, FCMDevice

logger = logging.getLogger(__name__)

# Singleton state for Firebase Admin SDK initialization
_firebase_initialized = False
_firebase_init_error = None


def get_firebase_app():
    """
    Safely initialize and retrieve the default Firebase App instance.
    Supports:
    1. Direct Service Account JSON filepath in settings.FIREBASE_SERVICE_ACCOUNT_KEY
    2. Raw JSON string or base64-encoded JSON string in settings.FIREBASE_SERVICE_ACCOUNT_KEY
    3. GOOGLE_APPLICATION_CREDENTIALS environment variable
    4. Graceful Fallback Mode if credentials are not yet configured.
    """
    global _firebase_initialized, _firebase_init_error
    if _firebase_initialized:
        return True

    try:
        import firebase_admin
        from firebase_admin import credentials

        # If already initialized elsewhere
        if firebase_admin._apps:
            _firebase_initialized = True
            return True

        cred_source = getattr(settings, 'FIREBASE_SERVICE_ACCOUNT_KEY', '').strip()
        project_id = getattr(settings, 'FIREBASE_PROJECT_ID', '').strip()

        cred = None
        if cred_source:
            resolved_file = cred_source
            if not os.path.isfile(resolved_file) and not os.path.isabs(resolved_file):
                base_dir = getattr(settings, 'BASE_DIR', '')
                candidate = os.path.join(base_dir, resolved_file)
                if os.path.isfile(candidate):
                    resolved_file = candidate

            if os.path.isfile(resolved_file):
                cred = credentials.Certificate(resolved_file)
            else:
                # Try raw JSON string or base64 string
                try:
                    raw_str = cred_source
                    if not raw_str.startswith('{'):
                        # Check base64
                        try:
                            raw_str = base64.b64decode(raw_str).decode('utf-8')
                        except Exception:
                            pass
                    cert_dict = json.loads(raw_str)
                    cred = credentials.Certificate(cert_dict)
                except Exception as parse_err:
                    logger.warning(f"Could not parse FIREBASE_SERVICE_ACCOUNT_KEY: {parse_err}")

        if not cred:
            google_app_cred = os.environ.get('GOOGLE_APPLICATION_CREDENTIALS', '').strip()
            if google_app_cred and os.path.isfile(google_app_cred):
                cred = credentials.ApplicationDefault()

        if cred:
            options = {'projectId': project_id} if project_id else None
            firebase_admin.initialize_app(cred, options=options)
            _firebase_initialized = True
            logger.info("✅ Firebase Admin SDK successfully initialized for FCM.")
            return True
        else:
            reason = _firebase_init_error or ("FIREBASE_SERVICE_ACCOUNT_KEY not set" if not cred_source else "Could not load credentials from provided source")
            logger.warning(f"ℹ️ Firebase credentials not initialized. FCM NotificationService running in Fallback/Simulated mode. Details: {reason}")
            _firebase_init_error = reason
            return False

    except Exception as e:
        logger.warning(f"⚠️ Failed to initialize Firebase Admin SDK: {e}")
        _firebase_init_error = str(e)
        return False


class NotificationService:
    """
    Centralized Notification Service for CampXChange.
    Handles:
    - In-App Notification persistence in database (Notification model)
    - Real-time Multi-platform Push delivery via Firebase Cloud Messaging (Web + Android)
    - Multi-recipient Broadcast Dispatching
    - Automatic token pruning on invalid/unregistered devices
    """

    @classmethod
    def send_notification(
        cls,
        recipient,
        title,
        message,
        notification_type='GENERAL',
        priority='NORMAL',
        link='',
        listing=None,
        sender=None,
        extra_data=None,
        send_push=True
    ):
        """
        Creates an in-app database notification and dispatches an FCM push notification.
        """
        if not recipient:
            return None

        # 1. Create in-app notification in DB
        try:
            notif = Notification.objects.create(
                recipient=recipient,
                sender=sender,
                notification_type=notification_type,
                priority=priority,
                title=title,
                message=message,
                listing=listing,
                link=link or ''
            )
        except Exception as db_err:
            logger.error(f"Error creating in-app notification for {recipient}: {db_err}")
            return None

        # 2. Dispatch FCM push notification
        if send_push:
            try:
                push_data = {
                    'notification_id': str(notif.id),
                    'type': str(notification_type),
                    'notification_type': str(notification_type),
                    'priority': str(priority),
                    'link': str(link or ''),
                    'route': str(link or ''),
                    'title': str(title),
                    'body': str(message),
                    'message': str(message),
                }
                if listing:
                    push_data['listing_id'] = str(listing.id)
                    push_data['listing_title'] = str(getattr(listing, 'title', ''))
                if sender:
                    push_data['sender_id'] = str(sender.id)
                    push_data['sender_name'] = str(getattr(sender, 'full_name', '') or sender.username)

                if extra_data and isinstance(extra_data, dict):
                    for k, v in extra_data.items():
                        push_data[str(k)] = str(v)

                cls.send_fcm_push(
                    user=recipient,
                    title=title,
                    message=message,
                    link=link or '',
                    priority=priority,
                    data=push_data
                )
            except Exception as push_err:
                logger.warning(f"Error dispatching FCM push to {recipient.email}: {push_err}")

        return notif

    @classmethod
    def send_broadcast(
        cls,
        recipients,
        title,
        message,
        priority='NORMAL',
        link='',
        sender=None,
        extra_data=None
    ):
        """
        Bulk creates database notifications and dispatches multicast FCM push to multiple recipients.
        """
        if not recipients:
            return 0

        # 1. Bulk create database notifications
        notif_objects = [
            Notification(
                recipient=user,
                sender=sender,
                notification_type='BROADCAST',
                priority=priority,
                title=title,
                message=message,
                link=link or ''
            )
            for user in recipients
        ]
        created = Notification.objects.bulk_create(notif_objects, batch_size=500)

        # 2. Multicast FCM push to all registered devices of these recipients
        try:
            active_devices = FCMDevice.objects.filter(
                user__in=recipients,
                is_active=True
            ).values_list('registration_id', flat=True)

            tokens = list(set(active_devices))
            if tokens:
                push_data = {
                    'type': 'BROADCAST',
                    'notification_type': 'BROADCAST',
                    'priority': str(priority),
                    'link': str(link or ''),
                    'route': str(link or ''),
                    'title': str(title),
                    'body': str(message),
                    'message': str(message),
                }
                if sender:
                    push_data['sender_id'] = str(sender.id)
                if extra_data and isinstance(extra_data, dict):
                    for k, v in extra_data.items():
                        push_data[str(k)] = str(v)

                cls._send_multicast_fcm(tokens, title, message, link, priority, push_data)
        except Exception as e:
            logger.warning(f"Broadcast push notification failed: {e}")

        return len(created)

    @classmethod
    def send_fcm_push(cls, user, title, message, link='', priority='NORMAL', data=None):
        """
        Dispatches FCM push message to all active registered devices of a given user.
        """
        devices = list(FCMDevice.objects.filter(user=user, is_active=True))
        if not devices:
            logger.debug(f"No active FCM devices registered for user {user.email}")
            return 0

        tokens = [d.registration_id for d in devices]
        return cls._send_multicast_fcm(tokens, title, message, link, priority, data)

    @classmethod
    def _send_multicast_fcm(cls, tokens, title, message, link='', priority='NORMAL', data=None):
        """
        Internal engine that handles FCM MulticastMessage delivery and pruning dead tokens.
        """
        if not tokens:
            return 0

        is_ready = get_firebase_app()
        if not is_ready:
            logger.info(f"FCM Fallback Mode: Notification dispatched to {len(tokens)} token(s) [Simulated]")
            return len(tokens)

        try:
            from firebase_admin import messaging

            # Ensure all values in data payload are strings
            clean_data = {}
            if data and isinstance(data, dict):
                for k, v in data.items():
                    clean_data[str(k)] = str(v)

            if 'link' not in clean_data:
                clean_data['link'] = str(link or '')
            if 'route' not in clean_data:
                clean_data['route'] = str(link or '')
            if 'title' not in clean_data:
                clean_data['title'] = str(title)
            if 'body' not in clean_data:
                clean_data['body'] = str(message)
            if 'message' not in clean_data:
                clean_data['message'] = str(message)

            notif_type = clean_data.get('type') or clean_data.get('notification_type') or 'GENERAL'

            # Channel mapping for Android (matching CampXChangeMessagingService)
            # Use 'high' priority to wake device even when in Doze / background
            android_priority = 'high'
            if priority == 'URGENT':
                channel_id = 'cxc_urgent_channel'
            elif notif_type in [
                'CHAT_MESSAGE', 'NEW_CHAT_MESSAGE', 'PRODUCT_INQUIRY', 'OFFER_MESSAGE'
            ]:
                channel_id = 'cxc_messages_channel'
            elif notif_type in [
                'HANDOVER_READY', 'BUY_REQUEST', 'OFFER_RECEIVED', 'OFFER_ACCEPTED',
                'OFFER_DECLINED', 'COUNTER_OFFER', 'ITEM_SOLD', 'DEAL_CANCELLED',
                'REQUEST_ACCEPTED', 'REQUEST_REJECTED', 'OFFER_COUNTERED'
            ]:
                channel_id = 'cxc_trade_channel'
            else:
                channel_id = 'cxc_broadcast_channel'

            # Ensure routing keys match both Android and Web expectations
            clean_data['deep_link_type'] = str(notif_type)
            clean_data['notification_type'] = str(notif_type)
            clean_data['channel_id'] = str(channel_id)

            # Android specific config: Use clean monochrome notification drawable
            android_config = messaging.AndroidConfig(
                priority=android_priority,
                notification=messaging.AndroidNotification(
                    title=title,
                    body=message,
                    channel_id=channel_id,
                    icon='ic_cxc_notification',
                    click_action='CXC_NOTIFICATION_CLICK',
                    default_sound=True,
                    default_vibrate_timings=True
                ),
                data=clean_data
            )

            # Web Push specific config: WebpushFCMOptions requires an absolute HTTPS URL
            base_frontend = getattr(settings, 'FRONTEND_URL', 'https://cxc.anshuman892494.online')
            if ',' in base_frontend:
                base_frontend = base_frontend.split(',')[0].strip()
            base_frontend = base_frontend.rstrip('/')
            if not base_frontend.startswith('http'):
                base_frontend = f"https://{base_frontend}"

            if link and (link.startswith('https://') or link.startswith('http://')):
                web_link = link.replace('http://', 'https://', 1)
            elif link and link.strip():
                web_link = f"{base_frontend}/{link.lstrip('/')}"
            else:
                web_link = f"{base_frontend}/notifications"

            webpush_config = messaging.WebpushConfig(
                headers={"Urgency": "high"},
                notification=messaging.WebpushNotification(
                    title=title,
                    body=message,
                    icon=f"{base_frontend}/CampusXChange_Logo.webp",
                    badge=f"{base_frontend}/favicon.png",
                    data={'link': web_link}
                ),
                fcm_options=messaging.WebpushFCMOptions(link=web_link),
                data=clean_data
            )

            # Multicast delivery in chunks of 500 (Firebase API batch limit)
            total_success = 0
            dead_tokens = []
            chunk_size = 500

            for i in range(0, len(tokens), chunk_size):
                token_chunk = tokens[i:i + chunk_size]
                multicast_msg = messaging.MulticastMessage(
                    tokens=token_chunk,
                    data=clean_data,
                    android=android_config,
                    webpush=webpush_config
                )

                response = messaging.send_each_for_multicast(multicast_msg)
                total_success += response.success_count
                logger.info(
                    f"FCM batch {i // chunk_size + 1}: {response.success_count} success, "
                    f"{response.failure_count} failures out of {len(token_chunk)}"
                )

                if response.failure_count > 0:
                    for idx, resp in enumerate(response.responses):
                        if not resp.success:
                            err = resp.exception
                            err_code = getattr(err, 'code', str(err)).lower()
                            if any(sub in err_code for sub in ['unregistered', 'invalid-registration', 'mismatch', 'not-found']):
                                dead_tokens.append(token_chunk[idx])

            # Prune dead/unregistered tokens
            if dead_tokens:
                FCMDevice.objects.filter(registration_id__in=dead_tokens).update(is_active=False)
                logger.info(f"Pruned {len(dead_tokens)} inactive/unregistered FCM token(s).")

            return total_success

        except Exception as e:
            logger.warning(f"Error executing FCM multicast send: {e}")
            return 0
