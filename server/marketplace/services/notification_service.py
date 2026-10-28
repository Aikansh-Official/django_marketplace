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


def _resilient_create_certificate(source):
    """
    Safely creates a firebase_admin credentials.Certificate instance.
    Handles:
    - Standard JSON file path
    - Render Secret Files with unescaped control characters / newlines
    - Files / strings where private_key has literal '\\n' instead of actual newlines
    - Base64 encoded or raw JSON strings
    - Dictionary with automatic PEM newline normalization
    """
    import firebase_admin
    from firebase_admin import credentials

    # 1. If source is an existing file path
    if isinstance(source, str) and os.path.isfile(source):
        try:
            cred = credentials.Certificate(source)
            logger.info(f"✅ Firebase certificate loaded directly from file: {source}")
            return cred
        except Exception as direct_err:
            logger.info(f"Direct parse of {source} failed ({direct_err}), attempting resilient JSON recovery...")
            try:
                with open(source, 'r', encoding='utf-8') as f:
                    raw_text = f.read()
                cert_dict = json.loads(raw_text, strict=False)
                if 'private_key' in cert_dict and isinstance(cert_dict['private_key'], str):
                    cert_dict['private_key'] = cert_dict['private_key'].replace('\\r\\n', '\n').replace('\\n', '\n')
                cred = credentials.Certificate(cert_dict)
                logger.info(f"✅ Firebase credentials recovered and loaded from file: {source}")
                return cred
            except Exception as recover_err:
                logger.warning(f"Resilient recovery failed for file {source}: {recover_err}")

    # 2. If source is a JSON or Base64 string
    if isinstance(source, str) and source.strip():
        raw = source.strip()
        if not raw.startswith('{'):
            try:
                raw = base64.b64decode(raw).decode('utf-8')
            except Exception:
                pass
        if raw.startswith('{'):
            try:
                cert_dict = json.loads(raw, strict=False)
                if 'private_key' in cert_dict and isinstance(cert_dict['private_key'], str):
                    cert_dict['private_key'] = cert_dict['private_key'].replace('\\r\\n', '\n').replace('\\n', '\n')
                cred = credentials.Certificate(cert_dict)
                logger.info("✅ Firebase credentials successfully loaded from raw/base64 JSON string.")
                return cred
            except Exception as parse_err:
                logger.warning(f"Could not parse string credentials: {parse_err}")

    # 3. If source is a dict
    if isinstance(source, dict):
        try:
            cert_dict = dict(source)
            if 'private_key' in cert_dict and isinstance(cert_dict['private_key'], str):
                cert_dict['private_key'] = cert_dict['private_key'].replace('\\r\\n', '\n').replace('\\n', '\n')
            cred = credentials.Certificate(cert_dict)
            logger.info("✅ Firebase credentials loaded from dictionary.")
            return cred
        except Exception as dict_err:
            logger.warning(f"Could not load certificate from dict: {dict_err}")

    return None

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
        base_dir = str(getattr(settings, 'BASE_DIR', ''))

        cred = None

        # 1. Discover credential file candidates across Render Secret Files, BASE_DIR, and repo root
        candidate_paths = []
        if cred_source and not cred_source.startswith('{'):
            candidate_paths.append(cred_source)
            if base_dir:
                candidate_paths.append(os.path.join(base_dir, cred_source))
                candidate_paths.append(os.path.join(os.path.dirname(base_dir), cred_source))

        # Render Secret File standard path and conventions
        candidate_paths.extend([
            '/etc/secrets/serviceAccountKey.json',
            os.path.join('/etc/secrets', os.path.basename(cred_source) if cred_source else 'serviceAccountKey.json'),
            os.path.join(base_dir, 'serviceAccountKey.json') if base_dir else '',
            os.path.join(os.path.dirname(base_dir), 'serviceAccountKey.json') if base_dir else '',
        ])

        for path in candidate_paths:
            if path and os.path.isfile(path):
                cred = _resilient_create_certificate(path)
                if cred:
                    break

        # 2. If no valid file was found, attempt parsing cred_source as raw or base64 JSON
        if not cred and cred_source:
            cred = _resilient_create_certificate(cred_source)

        # 3. Check GOOGLE_APPLICATION_CREDENTIALS environment variable
        if not cred:
            google_app_cred = os.environ.get('GOOGLE_APPLICATION_CREDENTIALS', '').strip()
            if google_app_cred and os.path.isfile(google_app_cred):
                try:
                    cred = credentials.ApplicationDefault()
                    logger.info(f"✅ Firebase credentials loaded from GOOGLE_APPLICATION_CREDENTIALS: {google_app_cred}")
                except Exception as g_err:
                    logger.warning(f"Failed to load GOOGLE_APPLICATION_CREDENTIALS: {g_err}")

        if cred:
            # Let credentials define project_id automatically; only use options if missing from cert
            options = None
            cred_proj = getattr(cred, 'project_id', None)
            if not cred_proj and project_id:
                options = {'projectId': project_id.strip()}
            firebase_admin.initialize_app(cred, options=options)
            _firebase_initialized = True
            active_proj = getattr(cred, 'project_id', project_id or 'default')
            logger.info(f"✅ Firebase Admin SDK successfully initialized for FCM (Project: {active_proj}).")
            return True
        else:
            reason = _firebase_init_error or (
                "Neither FIREBASE_SERVICE_ACCOUNT_KEY env var nor /etc/secrets/serviceAccountKey.json could be resolved to valid credentials."
            )
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

        # Check user notification preferences if configured
        try:
            pref = getattr(recipient, 'notification_preferences', None)
            if pref:
                if notification_type in ['BUY_REQUEST', 'REQUEST_ACCEPTED', 'REQUEST_REJECTED', 'OFFER_COUNTERED', 'HANDOVER_READY', 'ITEM_SOLD', 'DEAL_CANCELLED'] and not pref.notify_offers:
                    send_push = False
                elif notification_type in ['NEW_CHAT_MESSAGE', 'CHAT_MESSAGE'] and not pref.notify_chats:
                    send_push = False
                elif notification_type == 'BROADCAST' and not pref.notify_broadcasts:
                    send_push = False
        except Exception as pref_err:
            logger.debug(f"Preference check skipped: {pref_err}")

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
                link=link or '',
                extra_data=extra_data or {}
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
    def send_campus_broadcast(
        cls,
        title,
        message,
        priority='NORMAL',
        link='',
        sender=None,
        extra_data=None
    ):
        """
        Single-Row Global Announcement:
        Creates a single Notification record with recipient=None and dispatches
        an instant FCM push to the 'campus_broadcasts' topic.
        Saves 99.9% database space and avoids multicast chunking bottlenecks.
        """
        payload_data = {
            'type': 'BROADCAST',
            'notification_type': 'BROADCAST',
            'priority': str(priority),
            'link': str(link or '/notifications'),
            'route': str(link or '/notifications'),
            'title': str(title),
            'body': str(message),
            'message': str(message),
            'is_global': 'true'
        }
        if sender:
            payload_data['sender_id'] = str(sender.id)
            payload_data['sender_name'] = str(getattr(sender, 'full_name', '') or sender.username)
        if extra_data and isinstance(extra_data, dict):
            for k, v in extra_data.items():
                payload_data[str(k)] = str(v)

        # 1. Create single Global Notification (recipient=None)
        try:
            notif = Notification.objects.create(
                recipient=None,
                sender=sender,
                notification_type='BROADCAST',
                priority=priority,
                title=title,
                message=message,
                link=link or '/notifications',
                extra_data=payload_data
            )
            payload_data['notification_id'] = str(notif.id)
        except Exception as e:
            logger.error(f"Failed to create global campus broadcast: {e}")
            return None

        # 2. Dispatch FCM to topic 'campus_broadcasts'
        cls.send_topic_push(
            topic='campus_broadcasts',
            title=title,
            message=message,
            link=link or '/notifications',
            priority=priority,
            data=payload_data
        )

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
        Dispatches broadcast notification to specified recipients.
        If audience is all students, delegates to send_campus_broadcast for efficiency.
        """
        if not recipients:
            return 0

        # 1. Bulk create database notifications for targeted subsets
        notif_objects = [
            Notification(
                recipient=user,
                sender=sender,
                notification_type='BROADCAST',
                priority=priority,
                title=title,
                message=message,
                link=link or '',
                extra_data=extra_data or {}
            )
            for user in recipients
        ]
        created = Notification.objects.bulk_create(notif_objects, batch_size=500)

        # 2. Multicast FCM push to active registered devices of these recipients
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
    def send_topic_push(cls, topic, title, message, link='', priority='NORMAL', data=None):
        """
        Dispatches a topic-based FCM notification.
        Instantly broadcasts to all devices subscribed to the topic (e.g. 'campus_broadcasts').
        """
        is_ready = get_firebase_app()
        if not is_ready:
            logger.warning(f"FCM Topic push skipped for '{topic}': Firebase Admin SDK not initialized.")
            return False

        try:
            from firebase_admin import messaging

            clean_data = {}
            if data and isinstance(data, dict):
                for k, v in data.items():
                    clean_data[str(k)] = str(v)

            clean_data['topic'] = str(topic)
            clean_data['link'] = str(link or '/notifications')
            clean_data['title'] = str(title)
            clean_data['body'] = str(message)
            clean_data['channel_id'] = 'cxc_broadcast_channel'

            base_frontend = getattr(settings, 'FRONTEND_URL', 'https://cxc.anshuman892494.online')
            if ',' in base_frontend:
                base_frontend = base_frontend.split(',')[0].strip()
            base_frontend = base_frontend.rstrip('/')
            if not base_frontend.startswith('http'):
                base_frontend = f"https://{base_frontend}"

            web_link = link if (link.startswith('http://') or link.startswith('https://')) else f"{base_frontend}/{link.lstrip('/')}"

            msg = messaging.Message(
                topic=topic,
                notification=messaging.Notification(
                    title=str(title),
                    body=str(message)
                ),
                data=clean_data,
                android=messaging.AndroidConfig(
                    priority='high',
                    notification=messaging.AndroidNotification(
                        title=title,
                        body=message,
                        channel_id='cxc_broadcast_channel',
                        icon='ic_cxc_notification',
                        click_action='CXC_NOTIFICATION_CLICK',
                        default_sound=True,
                        default_vibrate_timings=True
                    ),
                    data=clean_data
                ),
                webpush=messaging.WebpushConfig(
                    headers={"Urgency": "high"},
                    notification=messaging.WebpushNotification(
                        title=title,
                        body=message,
                        icon=f"{base_frontend}/favicon.png",
                        badge=f"{base_frontend}/favicon.png",
                        data={'link': web_link}
                    ),
                    fcm_options=messaging.WebpushFCMOptions(link=web_link),
                    data=clean_data
                )
            )

            response = messaging.send(msg)
            logger.info(f"✅ FCM Topic Push sent to '{topic}': {response}")
            return True
        except Exception as e:
            logger.warning(f"Error executing FCM topic send to '{topic}': {e}")
            return False

    @classmethod
    def subscribe_device_to_topic(cls, token, topic='campus_broadcasts'):
        """
        Subscribes an FCM device registration token to a Firebase topic.
        """
        is_ready = get_firebase_app()
        if not is_ready or not token:
            return False
        try:
            from firebase_admin import messaging
            response = messaging.subscribe_to_topic([token], topic)
            if response.success_count > 0:
                logger.info(f"Subscribed device token to topic '{topic}'")
                # Record topic in FCMDevice record if present
                device = FCMDevice.objects.filter(registration_id=token).first()
                if device:
                    current_topics = set(device.topics or [])
                    current_topics.add(topic)
                    device.topics = list(current_topics)
                    device.save(update_fields=['topics'])
                return True
            else:
                logger.warning(f"Failed to subscribe token to topic '{topic}': {response.errors}")
                return False
        except Exception as e:
            logger.warning(f"Exception subscribing device token to topic '{topic}': {e}")
            return False

    @classmethod
    def unsubscribe_device_from_topic(cls, token, topic='campus_broadcasts'):
        """
        Unsubscribes an FCM device registration token from a Firebase topic.
        """
        is_ready = get_firebase_app()
        if not is_ready or not token:
            return False
        try:
            from firebase_admin import messaging
            response = messaging.unsubscribe_from_topic([token], topic)
            if response.success_count > 0:
                device = FCMDevice.objects.filter(registration_id=token).first()
                if device and device.topics:
                    current_topics = [t for t in device.topics if t != topic]
                    device.topics = current_topics
                    device.save(update_fields=['topics'])
                return True
            return False
        except Exception as e:
            logger.warning(f"Exception unsubscribing device token from topic '{topic}': {e}")
            return False

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
            logger.warning(
                f"⚠️ FCM Push Skipped: Firebase Admin SDK is in Fallback/Simulated mode. "
                f"Cannot deliver push notification to {len(tokens)} registered device token(s). "
                f"Reason: {_firebase_init_error}"
            )
            return 0


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
                    icon=f"{base_frontend}/favicon.png",
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
                    notification=messaging.Notification(
                        title=str(title),
                        body=str(message)
                    ),
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
                            err_code = getattr(err, 'code', str(err))
                            logger.warning(f"⚠️ FCM Device Delivery Failed [{idx+1}/{len(token_chunk)}]: code={err_code} err={err}")
                            err_str = str(err_code).lower()
                            if any(sub in err_str for sub in ['unregistered', 'invalid-registration', 'mismatch', 'not-found', 'notregistered']):
                                dead_tokens.append(token_chunk[idx])

            # Prune dead/unregistered tokens (auto-purge invalid registrations)
            if dead_tokens:
                deleted_count, _ = FCMDevice.objects.filter(registration_id__in=dead_tokens).delete()
                logger.info(f"Purged {deleted_count} dead/unregistered FCM token(s) from database.")

            return total_success

        except Exception as e:
            logger.warning(f"Error executing FCM multicast send: {e}")
            return 0
