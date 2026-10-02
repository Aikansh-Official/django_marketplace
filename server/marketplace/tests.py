from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from django.conf import settings
from .models import Listing, Category, Offer, PlatformSetting, HandoverSession, AdminAuditLog, Notification, FCMDevice
from .services.notification_service import NotificationService

User = get_user_model()

class MarketplaceSecurityTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        security_key = getattr(settings, 'DATA_SECURITY_KEY', '')
        if security_key:
            self.client.credentials(HTTP_X_APP_SECURITY_KEY=security_key)
        self.seller = User.objects.create_user(
            username='11111111',
            email='seller@lpu.in',
            password='Password123!',
            full_name='Seller Person',
            phone_number='9876543211'
        )
        self.buyer = User.objects.create_user(
            username='22222222',
            email='buyer@lpu.in',
            password='Password123!',
            full_name='Buyer Person',
            phone_number='9876543222'
        )
        self.admin = User.objects.create_superuser(
            username='99999999',
            email='admin@lpu.in',
            password='AdminPassword123!'
        )
        self.category = Category.objects.create(name='Electronics', slug='electronics')
        self.listing = Listing.objects.create(
            title='Scientific Calculator',
            description='Casio fx-991EX in great condition',
            price=800,
            condition='LIKE_NEW',
            location='BH-1',
            seller=self.seller,
            category=self.category,
            status='ACTIVE'
        )

    def test_admin_listings_forbidden_for_anonymous(self):
        res = self.client.get('/api/marketplace/admin/listings/')
        self.assertIn(res.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])

    def test_admin_listings_forbidden_for_regular_user(self):
        self.client.force_authenticate(user=self.buyer)
        res = self.client.get('/api/marketplace/admin/listings/')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_listings_allowed_for_admin(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.get('/api/marketplace/admin/listings/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_buyer_cannot_create_listing(self):
        self.buyer.role = 'BUYER'
        self.buyer.save(update_fields=['role'])
        self.client.force_authenticate(user=self.buyer)
        res = self.client.post('/api/marketplace/listings/', {
            'title': 'Unauthorized Buyer Listing',
            'description': 'Buyer should not be able to sell.',
            'price': '100.00',
            'category': self.category.id,
            'condition': 'GOOD',
            'location': 'BH-1'
        })
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
        msg = res.data.get('error') or res.data.get('detail') or ''
        self.assertIn('Buyers are not', msg)

    def test_admin_reports_forbidden_for_anonymous(self):
        res = self.client.get('/api/marketplace/admin/reports/')
        self.assertIn(res.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])

    def test_admin_settings_forbidden_for_anonymous(self):
        res = self.client.get('/api/marketplace/admin/settings/')
        self.assertIn(res.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])

    def test_public_listing_hides_seller_pii_for_anonymous(self):
        res = self.client.get(f'/api/marketplace/listings/{self.listing.id}/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        seller_data = res.data.get('seller', {})
        # Anonymous users must NOT see phone number or email
        self.assertNotIn('email', seller_data)
        self.assertNotIn('phone_number', seller_data)
        # But should see public fields
        self.assertIn('full_name', seller_data)

    def test_listing_shows_seller_pii_for_authenticated_users(self):
        self.client.force_authenticate(user=self.buyer)
        res = self.client.get(f'/api/marketplace/listings/{self.listing.id}/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        seller_data = res.data.get('seller', {})
        self.assertIn('email', seller_data)
        self.assertIn('phone_number', seller_data)

    def test_cannot_buy_own_listing(self):
        self.client.force_authenticate(user=self.seller)
        res = self.client.post(f'/api/marketplace/listings/{self.listing.id}/offer/', {'message': 'Buying my own item'})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('cannot buy your own listing', res.data.get('error', '').lower())


class MarketplaceHandoverTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        security_key = getattr(settings, 'DATA_SECURITY_KEY', '')
        if security_key:
            self.client.credentials(HTTP_X_APP_SECURITY_KEY=security_key)
        self.seller = User.objects.create_user(
            username='12345678',
            email='rahul@lpu.in',
            password='Password123!',
            full_name='Rahul Sharma',
            phone_number='9876543210'
        )
        self.buyer = User.objects.create_user(
            username='87654321',
            email='aman@lpu.in',
            password='Password123!',
            full_name='Aman Verma',
            phone_number='9876543219'
        )
        self.admin = User.objects.create_superuser(
            username='99999991',
            email='handoveradmin@lpu.in',
            password='AdminPassword123!'
        )
        self.category = Category.objects.create(name='Phones', slug='phones')
        self.listing = Listing.objects.create(
            title='iPhone 12',
            description='Good condition, 128GB',
            price=25000,
            condition='GOOD',
            location='Uni-Mall',
            seller=self.seller,
            category=self.category,
            status='ACTIVE'
        )

    def test_complete_handover_flow(self):
        # 1. Buyer creates buy request
        self.client.force_authenticate(user=self.buyer)
        offer_res = self.client.post(f'/api/marketplace/listings/{self.listing.id}/offer/', {'message': 'Ready to meet at Uni-Mall'})
        self.assertEqual(offer_res.status_code, status.HTTP_201_CREATED)
        offer_id = offer_res.data['id']

        # 2. Seller accepts request
        self.client.force_authenticate(user=self.seller)
        accept_res = self.client.patch(f'/api/marketplace/offers/{offer_id}/respond/', {'action': 'ACCEPT'})
        self.assertEqual(accept_res.status_code, status.HTTP_200_OK)
        self.listing.refresh_from_db()
        self.assertEqual(self.listing.status, 'PENDING')

        # 3. Seller generates QR code and PIN
        qr_res = self.client.post(f'/api/marketplace/offers/{offer_id}/generate-qr/')
        self.assertEqual(qr_res.status_code, status.HTTP_201_CREATED)
        token = qr_res.data['token']
        pin_code = qr_res.data['pin_code']
        self.assertEqual(len(pin_code), 6)

        # 4. Buyer verifies using 6-digit PIN
        self.client.force_authenticate(user=self.buyer)
        verify_pin_res = self.client.post('/api/marketplace/handover/verify/', {'pin_code': pin_code})
        self.assertEqual(verify_pin_res.status_code, status.HTTP_200_OK)
        self.assertTrue(verify_pin_res.data['verified'])
        self.assertEqual(verify_pin_res.data['listing_title'], 'iPhone 12')

        # 5. Buyer confirms handover
        confirm_res = self.client.post('/api/marketplace/handover/confirm/', {'token': token})
        self.assertEqual(confirm_res.status_code, status.HTTP_200_OK)

        # 6. Verify atomic state updates
        self.listing.refresh_from_db()
        self.assertEqual(self.listing.status, 'SOLD')

        offer = Offer.objects.get(pk=offer_id)
        self.assertEqual(offer.status, 'COMPLETED')

        # Token is now used and cannot be reused
        reverify_res = self.client.post('/api/marketplace/handover/verify/', {'token': token})
        self.assertEqual(reverify_res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_cancel_deal_restores_listing_active(self):
        # Setup accepted offer
        self.client.force_authenticate(user=self.buyer)
        offer_res = self.client.post(f'/api/marketplace/listings/{self.listing.id}/offer/', {'message': 'Test'})
        offer_id = offer_res.data['id']

        self.client.force_authenticate(user=self.seller)
        self.client.patch(f'/api/marketplace/offers/{offer_id}/respond/', {'action': 'ACCEPT'})
        self.listing.refresh_from_db()
        self.assertEqual(self.listing.status, 'PENDING')

        # Seller generates QR
        self.client.post(f'/api/marketplace/offers/{offer_id}/generate-qr/')

        # Buyer decides to cancel
        self.client.force_authenticate(user=self.buyer)
        cancel_res = self.client.post(f'/api/marketplace/offers/{offer_id}/cancel/')
        self.assertEqual(cancel_res.status_code, status.HTTP_200_OK)

        self.listing.refresh_from_db()
        self.assertEqual(self.listing.status, 'ACTIVE')
        offer = Offer.objects.get(pk=offer_id)
        self.assertEqual(offer.status, 'CANCELLED')

    def test_admin_deals_permissions_and_actions(self):
        # 1. Buyer creates offer
        self.client.force_authenticate(user=self.buyer)
        offer_res = self.client.post(f'/api/marketplace/listings/{self.listing.id}/offer/', {'message': 'Deal test', 'offer_amount': 750})
        offer_id = offer_res.data['id']

        # Seller accepts
        self.client.force_authenticate(user=self.seller)
        self.client.patch(f'/api/marketplace/offers/{offer_id}/respond/', {'action': 'ACCEPT'})

        # Regular user cannot access admin deals
        self.client.force_authenticate(user=self.buyer)
        res = self.client.get('/api/marketplace/admin/deals/')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

        # Admin can access admin deals
        self.client.force_authenticate(user=self.admin)
        res = self.client.get('/api/marketplace/admin/deals/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(any(d['id'] == offer_id for d in res.data))

        # Admin force completes deal
        complete_res = self.client.post(f'/api/marketplace/admin/deals/{offer_id}/action/', {
            'action': 'FORCE_COMPLETE',
            'reason': 'Manual verification by admin'
        })
        self.assertEqual(complete_res.status_code, status.HTTP_200_OK)
        self.listing.refresh_from_db()
        self.assertEqual(self.listing.status, 'SOLD')
        offer = Offer.objects.get(pk=offer_id)
        self.assertEqual(offer.status, 'COMPLETED')

    def test_admin_broadcast_and_direct_messaging(self):
        # 1. Non-admin blocked
        self.client.force_authenticate(user=self.buyer)
        res = self.client.post('/api/marketplace/admin/broadcasts/', {
            'title': 'Hackathon Alert',
            'message': 'Coding contest tonight',
            'priority': 'URGENT'
        })
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

        # 2. Admin sends campus-wide broadcast
        self.client.force_authenticate(user=self.admin)
        res = self.client.post('/api/marketplace/admin/broadcasts/', {
            'title': 'Semester End Clearance',
            'message': 'Hostel clearance sale starts now!',
            'target_audience': 'ALL',
            'priority': 'URGENT',
            'link': '/my-listings'
        })
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertGreater(res.data['broadcast']['recipients_count'], 0)

        # 3. Buyer checks urgent notification endpoint
        self.client.force_authenticate(user=self.buyer)
        urgent_res = self.client.get('/api/marketplace/notifications/urgent/')
        self.assertEqual(urgent_res.status_code, status.HTTP_200_OK)
        self.assertIsNotNone(urgent_res.data.get('urgent'))
        self.assertEqual(urgent_res.data['urgent']['title'], 'Semester End Clearance')
        self.assertEqual(urgent_res.data['urgent']['priority'], 'URGENT')

        # 4. Admin sends direct warning to seller
        self.client.force_authenticate(user=self.admin)
        direct_res = self.client.post('/api/marketplace/admin/direct-notice/', {
            'recipient_id': self.seller.id,
            'title': 'ID Verification Request',
            'message': 'Please re-upload your ID card.',
            'priority': 'HIGH',
            'link': '/profile'
        })
        self.assertEqual(direct_res.status_code, status.HTTP_201_CREATED)

        # Seller sees the direct notice
        self.client.force_authenticate(user=self.seller)
        notifs_res = self.client.get('/api/marketplace/notifications/')
        self.assertEqual(notifs_res.status_code, status.HTTP_200_OK)
        self.assertTrue(any(n['title'] == 'ID Verification Request' for n in notifs_res.data))

    def test_admin_analytics_endpoint(self):
        # 1. Non-admin student access forbidden
        self.client.force_authenticate(user=self.buyer)
        res_forbidden = self.client.get('/api/marketplace/admin/analytics/')
        self.assertEqual(res_forbidden.status_code, status.HTTP_403_FORBIDDEN)

        # 2. Admin access granted
        self.client.force_authenticate(user=self.admin)
        res = self.client.get('/api/marketplace/admin/analytics/?timeframe=30d')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        data = res.data
        self.assertEqual(data['timeframe'], '30d')

        # Check KPIs
        self.assertIn('kpis', data)
        kpis = data['kpis']
        self.assertIn('total_gmv', kpis)
        self.assertIn('total_completed_deals', kpis)
        self.assertIn('avg_deal_value', kpis)
        self.assertIn('total_students', kpis)
        self.assertIn('verified_students', kpis)
        self.assertIn('active_listings', kpis)

        # Check Timeline
        self.assertIn('timeline', data)
        self.assertIsInstance(data['timeline'], list)
        self.assertGreater(len(data['timeline']), 0)
        point = data['timeline'][-1]
        self.assertIn('date', point)
        self.assertIn('deals', point)
        self.assertIn('turnover', point)
        self.assertIn('signups', point)

        # Check Category Breakdown
        self.assertIn('category_breakdown', data)
        self.assertIsInstance(data['category_breakdown'], list)

        # Check Sell vs Donation
        self.assertIn('sell_vs_donation', data)
        self.assertIn('sell_count', data['sell_vs_donation'])
        self.assertIn('donate_count', data['sell_vs_donation'])

        # Check Top Sellers
        self.assertIn('top_sellers', data)
        self.assertIsInstance(data['top_sellers'], list)

        # Check Campus Hotspots
        self.assertIn('campus_hotspots', data)

        # 3. Test different timeframes
        for tf in ['7d', '90d', 'all']:
            tf_res = self.client.get(f'/api/marketplace/admin/analytics/?timeframe={tf}')
            self.assertEqual(tf_res.status_code, status.HTTP_200_OK)
            self.assertEqual(tf_res.data['timeframe'], tf)

    def test_admin_audit_logs_and_system_health(self):
        """Phase 7: Verify Admin Audit Logging and System Health Diagnostics."""
        # 1. Non-admin forbidden
        self.client.force_authenticate(user=self.buyer)
        audit_res_forbidden = self.client.get('/api/marketplace/admin/audit-logs/')
        self.assertEqual(audit_res_forbidden.status_code, status.HTTP_403_FORBIDDEN)
        health_res_forbidden = self.client.get('/api/marketplace/admin/system-health/')
        self.assertEqual(health_res_forbidden.status_code, status.HTTP_403_FORBIDDEN)

        # 2. Admin performs an action (Update Settings)
        self.client.force_authenticate(user=self.admin)
        settings_res = self.client.post('/api/marketplace/admin/settings/', {
            'maintenance_mode': 'false',
            'announcement_enabled': 'true',
            'announcement_text': 'System Health Check Test'
        })
        self.assertEqual(settings_res.status_code, status.HTTP_200_OK)

        # 3. Verify audit log was recorded
        audit_res = self.client.get('/api/marketplace/admin/audit-logs/')
        self.assertEqual(audit_res.status_code, status.HTTP_200_OK)
        audit_data = audit_res.data
        self.assertIn('logs', audit_data)
        self.assertIn('total_count', audit_data)
        self.assertIn('count_24h', audit_data)
        self.assertGreaterEqual(audit_data['total_count'], 1)

        # Ensure the setting update action is present
        latest_log = audit_data['logs'][0]
        self.assertEqual(latest_log['action'], 'SETTINGS_UPDATE')
        self.assertEqual(latest_log['admin_username'], self.admin.username)
        self.assertEqual(latest_log['target_type'], 'SETTING')

        # 4. Verify System Health diagnostics
        health_res = self.client.get('/api/marketplace/admin/system-health/')
        self.assertEqual(health_res.status_code, status.HTTP_200_OK)
        health_data = health_res.data

        self.assertIn(health_data['status'], ['HEALTHY', 'DEGRADED', 'CRITICAL'])
        self.assertIn('database', health_data)
        self.assertTrue(health_data['database']['healthy'])
        self.assertGreaterEqual(health_data['database']['latency_ms'], 0)
        self.assertIn('cache', health_data)
        self.assertTrue(health_data['cache']['healthy'])
        self.assertIn('security', health_data)
        self.assertIn('environment', health_data)
        self.assertIn('metrics', health_data)

    def test_phase_8_operational_constraints_and_staff_rbac(self):
        """Phase 8: Test Operational Constraints, Staff RBAC, and Handover Expiry Configuration."""
        # 1. Non-admin cannot view or modify staff
        self.client.force_authenticate(user=self.buyer)
        staff_forbidden = self.client.get('/api/auth/staff/')
        self.assertEqual(staff_forbidden.status_code, status.HTTP_403_FORBIDDEN)

        # 2. Super Admin can view staff list
        self.client.force_authenticate(user=self.admin)
        staff_res = self.client.get('/api/auth/staff/')
        self.assertEqual(staff_res.status_code, status.HTTP_200_OK)
        self.assertIn('staff', staff_res.data)
        self.assertIn('stats', staff_res.data)

        # 3. Super Admin promotes buyer to staff with ID_VERIFIER role
        promote_res = self.client.post('/api/auth/staff/', {
            'user_id': self.buyer.id,
            'admin_role': 'ID_VERIFIER'
        })
        self.assertEqual(promote_res.status_code, status.HTTP_201_CREATED)
        self.buyer.refresh_from_db()
        self.assertTrue(self.buyer.is_staff)
        self.assertEqual(self.buyer.admin_role, 'ID_VERIFIER')

        # 4. Super Admin updates buyer's staff role to MODERATOR
        role_update_res = self.client.patch(f'/api/auth/staff/{self.buyer.id}/', {
            'admin_role': 'MODERATOR'
        })
        self.assertEqual(role_update_res.status_code, status.HTTP_200_OK)
        self.buyer.refresh_from_db()
        self.assertEqual(self.buyer.admin_role, 'MODERATOR')

        # 5. Moderator has categories permission by default, but lacks 'students' permission
        self.client.force_authenticate(user=self.buyer)
        cat_ok = self.client.get('/api/marketplace/admin/categories/')
        self.assertEqual(cat_ok.status_code, status.HTTP_200_OK)

        students_fail = self.client.get('/api/auth/users/')
        self.assertEqual(students_fail.status_code, status.HTTP_403_FORBIDDEN)

        # 5b. Superadmin updates buyer's permissions to custom ['dashboard', 'students']
        self.client.force_authenticate(user=self.admin)
        perm_update_res = self.client.patch(f'/api/auth/staff/{self.buyer.id}/', {
            'admin_permissions': ['dashboard', 'students']
        }, format='json')
        self.assertEqual(perm_update_res.status_code, status.HTTP_200_OK)
        self.buyer.refresh_from_db()
        self.assertEqual(self.buyer.admin_permissions, ['dashboard', 'students'])

        # 5c. Buyer now CAN access 'students' but CANNOT access 'categories'
        self.client.force_authenticate(user=self.buyer)
        students_ok = self.client.get('/api/auth/users/')
        self.assertEqual(students_ok.status_code, status.HTTP_200_OK)

        cat_fail = self.client.get('/api/marketplace/admin/categories/')
        self.assertEqual(cat_fail.status_code, status.HTTP_403_FORBIDDEN)

        # 5d. Moderator cannot modify platform settings (RBAC check)
        settings_fail = self.client.post('/api/marketplace/admin/settings/', {'maintenance_mode': 'true'})
        self.assertEqual(settings_fail.status_code, status.HTTP_403_FORBIDDEN)

        # 6. Super Admin revokes staff access
        self.client.force_authenticate(user=self.admin)
        revoke_res = self.client.delete(f'/api/auth/staff/{self.buyer.id}/')
        self.assertEqual(revoke_res.status_code, status.HTTP_200_OK)
        self.buyer.refresh_from_db()
        self.assertFalse(self.buyer.is_staff)

        # 7. Self-revocation prevention
        self_revoke = self.client.delete(f'/api/auth/staff/{self.admin.id}/')
        self.assertEqual(self_revoke.status_code, status.HTTP_400_BAD_REQUEST)

        # 8. Operational Constraints: Max Active Listings
        self.seller.role = 'SELLER'
        self.seller.is_id_verified = True
        self.seller.save(update_fields=['role', 'is_id_verified'])

        PlatformSetting.objects.update_or_create(
            key='max_active_listings_per_student',
            defaults={'value': '1'}
        )
        self.client.force_authenticate(user=self.seller)
        # self.seller already has self.listing with status='ACTIVE'
        post_res = self.client.post('/api/marketplace/listings/', {
            'title': 'Second Active Listing',
            'description': 'Attempting to exceed max limit of 1 active listing.',
            'price': '500.00',
            'category': self.category.id,
            'condition': 'GOOD',
            'location': 'BH-1'
        })
        self.assertEqual(post_res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('maximum active listings limit', post_res.data.get('error', ''))

        # 9. Operational Constraints: Minimum Trust Score
        PlatformSetting.objects.update_or_create(
            key='max_active_listings_per_student',
            defaults={'value': '10'}
        )
        PlatformSetting.objects.update_or_create(
            key='min_trust_score_to_sell',
            defaults={'value': '80'}
        )
        self.seller.trust_score = 10
        self.seller.save(update_fields=['trust_score'])
        post_res2 = self.client.post('/api/marketplace/listings/', {
            'title': 'High Trust Needed Item',
            'description': 'This item requires 80 trust score.',
            'price': '300.00',
            'category': self.category.id,
            'condition': 'GOOD',
            'location': 'BH-1'
        })
        self.assertEqual(post_res2.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('minimum trust score of 80', post_res2.data.get('error', ''))

        # 10. Operational Constraints: Maintenance Mode
        PlatformSetting.objects.update_or_create(
            key='min_trust_score_to_sell',
            defaults={'value': '0'}
        )
        PlatformSetting.objects.update_or_create(
            key='maintenance_mode',
            defaults={'value': 'true'}
        )
        post_res3 = self.client.post('/api/marketplace/listings/', {
            'title': 'During Maintenance Item',
            'description': 'Item during maintenance.',
            'price': '100.00',
            'category': self.category.id,
            'condition': 'GOOD',
            'location': 'BH-1'
        })
        self.assertEqual(post_res3.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertTrue(post_res3.data.get('maintenance_mode'))

        # Reset maintenance mode for cleanliness
        PlatformSetting.objects.update_or_create(
            key='maintenance_mode',
            defaults={'value': 'false'}
        )
class MarketplaceClientParityTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        security_key = getattr(settings, 'DATA_SECURITY_KEY', '')
        if security_key:
            self.client.credentials(HTTP_X_APP_SECURITY_KEY=security_key)
        self.seller = User.objects.create_user(
            username='77777777',
            email='star.seller@lpu.in',
            password='Password123!',
            first_name='Star',
            last_name='Seller',
            full_name='Star Seller',
            phone_number='9876543277',
            trust_score=95,
            is_id_verified=True
        )
        self.category = Category.objects.create(name='Books', slug='books')
        self.listing = Listing.objects.create(
            title='Engineering Physics',
            description='Textbook for 1st year',
            price=350,
            condition='LIKE_NEW',
            location='BH-3',
            seller=self.seller,
            status='ACTIVE'
        )
        self.buyer = User.objects.create_user(
            username='88888888',
            email='test.buyer@lpu.in',
            password='Password123!',
            full_name='Test Buyer',
            phone_number='9876543288'
        )

    def test_public_platform_config_endpoint(self):
        PlatformSetting.objects.update_or_create(
            key='maintenance_mode',
            defaults={'value': 'false'}
        )
        PlatformSetting.objects.update_or_create(
            key='maintenance_message',
            defaults={'value': 'Scheduled maintenance window'}
        )
        PlatformSetting.objects.update_or_create(
            key='allow_registrations',
            defaults={'value': 'true'}
        )
        PlatformSetting.objects.update_or_create(
            key='max_active_listings_per_student',
            defaults={'value': '5'}
        )
        PlatformSetting.objects.update_or_create(
            key='min_trust_score_to_sell',
            defaults={'value': '25'}
        )
        PlatformSetting.objects.update_or_create(
            key='allowed_domains',
            defaults={'value': 'lpu.in,thapar.edu'}
        )
        PlatformSetting.objects.update_or_create(
            key='otp_daily_limit',
            defaults={'value': '7'}
        )

        res = self.client.get('/api/marketplace/config/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.data
        self.assertIn('maintenance_mode', data)
        self.assertFalse(data['maintenance_mode'])
        self.assertEqual(data['maintenance_message'], 'Scheduled maintenance window')
        self.assertTrue(data['allow_registrations'])
        self.assertEqual(data['max_active_listings_per_student'], 5)
        self.assertEqual(data['min_trust_score_to_sell'], 25)
        self.assertEqual(data['allowed_domains'], 'lpu.in,thapar.edu')
        self.assertEqual(data['otp_daily_limit'], 7)

    def test_community_hub_endpoint(self):
        res = self.client.get('/api/marketplace/community-hub/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.data

        self.assertIn('top_sellers', data)
        self.assertIsInstance(data['top_sellers'], list)
        self.assertGreaterEqual(len(data['top_sellers']), 1)
        top = data['top_sellers'][0]
        self.assertEqual(top['id'], self.seller.id)
        self.assertEqual(top['full_name'], 'Star Seller')
        self.assertEqual(top['trust_score'], 95)
        self.assertIn('completed_deals', top)

        self.assertIn('hotspots', data)
        self.assertIsInstance(data['hotspots'], list)
        self.assertTrue(any(h['location'] == 'BH-3' for h in data['hotspots']))

        self.assertIn('stats', data)
        self.assertIn('active_listings', data['stats'])
        self.assertGreaterEqual(data['stats']['active_listings'], 1)

    def test_student_report_seller_and_my_reports(self):
        student = User.objects.create_user(
            username='66666666',
            email='reporter@lpu.in',
            password='Password123!',
            full_name='Student Reporter',
            phone_number='9876543266'
        )
        self.client.force_authenticate(user=student)

        # 1. Report a listing
        listing_report_res = self.client.post('/api/marketplace/reports/', {
            'listing': str(self.listing.id),
            'reason': 'Item Overpriced / Fake Condition',
            'details': 'Item condition was not as described.'
        })
        self.assertEqual(listing_report_res.status_code, status.HTTP_201_CREATED)

        # 2. Report a seller directly
        seller_report_res = self.client.post('/api/marketplace/reports/', {
            'reported_user': str(self.seller.id),
            'reason': 'Suspicious Activity / Harassment',
            'details': 'Seller demanded advance offline transfer.'
        })
        self.assertEqual(seller_report_res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(seller_report_res.data['reported_user_id'], str(self.seller.id))

        # 3. Retrieve student's my-reports list
        my_reports_res = self.client.get('/api/marketplace/my-reports/')
        self.assertEqual(my_reports_res.status_code, status.HTTP_200_OK)
        reports = my_reports_res.data
        self.assertEqual(len(reports), 2)
        self.assertTrue(all(r['status'] == 'PENDING' for r in reports))

    def test_fcm_device_registration_and_unregistration(self):
        self.client.force_authenticate(user=self.buyer)

        # 1. Register Web Push FCM token
        reg_res = self.client.post('/api/marketplace/notifications/register-device/', {
            'registration_id': 'test_fcm_web_token_abc123',
            'device_type': 'WEB',
            'device_name': 'Chrome on Windows'
        })
        self.assertEqual(reg_res.status_code, status.HTTP_201_CREATED)
        self.assertTrue(reg_res.data['success'])

        device = FCMDevice.objects.get(registration_id='test_fcm_web_token_abc123')
        self.assertEqual(device.user, self.buyer)
        self.assertTrue(device.is_active)
        self.assertEqual(device.device_type, 'WEB')

        # 2. Re-register (update existing token)
        reg_res2 = self.client.post('/api/marketplace/fcm-token/', {
            'fcm_token': 'test_fcm_web_token_abc123',
            'device_model': 'Chrome v120'
        })
        self.assertEqual(reg_res2.status_code, status.HTTP_200_OK)
        device.refresh_from_db()
        self.assertEqual(device.device_name, 'Chrome v120')

        # 3. Unregister device (logout simulation)
        unreg_res = self.client.post('/api/marketplace/notifications/unregister-device/', {
            'registration_id': 'test_fcm_web_token_abc123'
        })
        self.assertEqual(unreg_res.status_code, status.HTTP_200_OK)
        device.refresh_from_db()
        self.assertFalse(device.is_active)

    def test_notification_unread_count_and_tab_filtering(self):
        self.client.force_authenticate(user=self.buyer)

        # Create notifications
        Notification.objects.create(
            recipient=self.buyer,
            title='Buy Request Update',
            message='Your request was accepted',
            notification_type='REQUEST_ACCEPTED',
            is_read=False
        )
        Notification.objects.create(
            recipient=self.buyer,
            title='Campus Broadcast',
            message='Library hours extended',
            notification_type='BROADCAST',
            is_read=False
        )
        Notification.objects.create(
            recipient=self.buyer,
            title='Old Chat Message',
            message='Hey is this available?',
            notification_type='NEW_CHAT_MESSAGE',
            is_read=True
        )

        # 1. Test unread count endpoint
        count_res = self.client.get('/api/marketplace/notifications/unread-count/')
        self.assertEqual(count_res.status_code, status.HTTP_200_OK)
        self.assertEqual(count_res.data['unread_count'], 2)

        # 2. Test tab=UNREAD
        unread_res = self.client.get('/api/marketplace/notifications/?tab=UNREAD')
        self.assertEqual(unread_res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(unread_res.data), 2)

        # 3. Test tab=OFFERS
        offers_res = self.client.get('/api/marketplace/notifications/?tab=OFFERS')
        self.assertEqual(offers_res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(offers_res.data), 1)
        self.assertEqual(offers_res.data[0]['notification_type'], 'REQUEST_ACCEPTED')

        # 4. Test tab=BROADCAST
        bc_res = self.client.get('/api/marketplace/notifications/?tab=BROADCAST')
        self.assertEqual(bc_res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(bc_res.data), 1)
        self.assertEqual(bc_res.data[0]['notification_type'], 'BROADCAST')

    def test_notification_service_dispatcher(self):
        # Register an active device for the buyer
        FCMDevice.objects.create(
            user=self.buyer,
            registration_id='test_device_push_token_999',
            device_type='ANDROID',
            is_active=True
        )

        # Send notification via NotificationService
        notif = NotificationService.send_notification(
            recipient=self.buyer,
            sender=self.seller,
            notification_type='HANDOVER_READY',
            priority='URGENT',
            title='Handover OTP Generated',
            message='Please meet seller at BH-3 to scan QR.',
            link='/handover/123'
        )

        self.assertIsNotNone(notif)
        self.assertEqual(notif.recipient, self.buyer)
        self.assertEqual(notif.priority, 'URGENT')
        self.assertEqual(notif.link, '/handover/123')

