from types import SimpleNamespace
from unittest.mock import patch

from django.test import SimpleTestCase
from rest_framework.test import APIRequestFactory, force_authenticate

from .views import TestFCMPushView


class PushTestStatusTests(SimpleTestCase):
    def setUp(self):
        self.request = APIRequestFactory().post('/api/marketplace/notifications/test-push/', {}, format='json')
        force_authenticate(self.request, user=SimpleNamespace(pk='test-user', is_authenticated=True))

    @patch('marketplace.views.NotificationService.send_fcm_push')
    @patch('marketplace.views.NotificationService.send_notification')
    @patch('marketplace.views.FCMDevice.objects.filter')
    @patch('marketplace.services.notification_service.get_firebase_app', return_value=True)
    def test_firebase_failure_is_not_reported_as_success(self, firebase, devices, notify, push):
        devices.return_value = [SimpleNamespace(id=1, device_type='WEB', device_name='Browser')]
        notify.return_value = SimpleNamespace(id=7)
        push.return_value = 0
        response = TestFCMPushView.as_view()(self.request)
        self.assertFalse(response.data['success'])
        self.assertEqual(response.data['accepted_devices_count'], 0)
        self.assertFalse(notify.call_args.kwargs['send_push'])

    @patch('marketplace.views.NotificationService.send_fcm_push')
    @patch('marketplace.views.NotificationService.send_notification')
    @patch('marketplace.views.FCMDevice.objects.filter')
    @patch('marketplace.services.notification_service.get_firebase_app', return_value=True)
    def test_firebase_acceptance_is_reported(self, firebase, devices, notify, push):
        devices.return_value = [SimpleNamespace(id=1, device_type='WEB', device_name='Browser')]
        notify.return_value = SimpleNamespace(id=7)
        push.return_value = 1
        response = TestFCMPushView.as_view()(self.request)
        self.assertTrue(response.data['success'])
        self.assertEqual(response.data['accepted_devices_count'], 1)
