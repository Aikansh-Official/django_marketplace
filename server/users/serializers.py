from rest_framework import serializers
from django.db import models
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
import re
from .models import OTPVerification, PasswordResetToken, PasswordResetOTP, UserLoginHistory

User = get_user_model()

class ForgotPasswordRequestSerializer(serializers.Serializer):
    reg_no = serializers.CharField(max_length=64, required=True)
    email = serializers.EmailField(required=True)

    def validate_reg_no(self, value):
        reg = str(value).strip().lstrip('@')
        if not reg.isdigit() or len(reg) != 8:
            raise serializers.ValidationError("Registration number must be exactly 8 digits.")
        return reg

    def validate_email(self, value):
        return value.strip().lower()

    def validate(self, attrs):
        reg_no = attrs.get('reg_no')
        email = attrs.get('email')

        user = User.objects.filter(username__iexact=reg_no, email__iexact=email).first()
        if not user:
            raise serializers.ValidationError({
                "non_field_errors": ["No registered student account matches both this Registration Number and Email address. Please verify your credentials."]
            })

        if not user.is_active:
            raise serializers.ValidationError({
                "non_field_errors": ["This student account is currently suspended. Please contact campus support."]
            })

        attrs['user'] = user
        return attrs


class ForgotPasswordResetSerializer(serializers.Serializer):
    reg_no = serializers.CharField(max_length=64, required=True)
    email = serializers.EmailField(required=True)
    otp = serializers.CharField(max_length=6, required=True)
    password = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'})
    password_confirm = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'})

    def validate_reg_no(self, value):
        reg = str(value).strip().lstrip('@')
        if not reg.isdigit() or len(reg) != 8:
            raise serializers.ValidationError("Registration number must be exactly 8 digits.")
        return reg

    def validate_email(self, value):
        return value.strip().lower()

    def validate_otp(self, value):
        val = str(value).strip()
        if not val.isdigit() or len(val) != 6:
            raise serializers.ValidationError("OTP must be exactly 6 numeric digits.")
        return val

    def validate(self, attrs):
        reg_no = attrs.get('reg_no')
        email = attrs.get('email')
        otp = attrs.get('otp')

        user = User.objects.filter(username__iexact=reg_no, email__iexact=email).first()
        if not user:
            raise serializers.ValidationError({"non_field_errors": ["User account not found matching these credentials."]})

        if not user.is_active:
            raise serializers.ValidationError({"non_field_errors": ["This student account is currently suspended."]})

        # Retrieve active PasswordResetOTP record
        reset_otp_obj = PasswordResetOTP.objects.filter(
            reg_no__iexact=reg_no,
            email__iexact=email,
            is_verified=False
        ).order_by('-created_at').first()

        if not reset_otp_obj or not reset_otp_obj.is_valid():
            raise serializers.ValidationError({"otp": ["Password reset OTP has expired or is invalid. Please request a new OTP."]})

        if reset_otp_obj.is_locked():
            raise serializers.ValidationError({"otp": ["Too many failed attempts. This OTP is locked. Please request a new one."]})

        if reset_otp_obj.get_plain_otp() != otp:
            reset_otp_obj.attempts += 1
            reset_otp_obj.save(update_fields=['attempts'])
            remaining = reset_otp_obj.MAX_ATTEMPTS - reset_otp_obj.attempts
            if remaining > 0:
                raise serializers.ValidationError({"otp": [f"Invalid OTP code. {remaining} attempt(s) remaining."]})
            else:
                raise serializers.ValidationError({"otp": ["Too many invalid attempts. This OTP is now locked. Please request a new one."]})

        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({"password": ["Password fields didn't match."]})

        try:
            validate_password(attrs['password'])
        except DjangoValidationError as e:
            raise serializers.ValidationError({"password": list(e.messages)})

        attrs['user'] = user
        attrs['reset_otp_obj'] = reset_otp_obj
        return attrs

class SendOTPSerializer(serializers.Serializer):
    email = serializers.EmailField()
    purpose = serializers.ChoiceField(
        choices=['signup', 'upgrade'],
        default='signup',
        required=False
    )
    
    def validate_email(self, value):
        clean_email = value.strip().lower()
        if not re.match(r'^[\w\.-]+@gmail\.com$', clean_email):
            raise serializers.ValidationError("Only @gmail.com email addresses are allowed.")
        return clean_email

    def validate(self, attrs):
        email = attrs.get('email')
        purpose = attrs.get('purpose', 'signup')
        request = self.context.get('request')

        # Check if user is authenticated with this email
        is_authenticated_user = (
            request is not None and
            hasattr(request, 'user') and
            request.user.is_authenticated
        )
        is_matching_auth_user = (
            is_authenticated_user and
            request.user.email.strip().lower() == email
        )

        # Treat as upgrade/account verification if explicitly requested or authenticated account match
        if purpose == 'upgrade' or is_matching_auth_user:
            user = User.objects.filter(email__iexact=email).first()
            if not user:
                raise serializers.ValidationError({"email": "No registered account found with this email."})
            if user.role == 'SELLER':
                raise serializers.ValidationError({"email": "This account is already a verified Seller."})
            if is_authenticated_user and not is_matching_auth_user:
                raise serializers.ValidationError({"email": "Email does not match your logged-in account."})
        else:
            # Registration/signup flow
            if User.objects.filter(email__iexact=email).exists():
                raise serializers.ValidationError({"email": "An account with this email already exists."})

        return attrs

class VerifyOTPSerializer(serializers.Serializer):
    email = serializers.EmailField()
    otp = serializers.CharField(max_length=6)

    def validate_otp(self, value):
        val = str(value).strip()
        if not val.isdigit() or len(val) != 6:
            raise serializers.ValidationError("OTP must be exactly 6 numeric digits.")
        return val

class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'})
    password_confirm = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'})
    id_card_image = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    id_card_data = serializers.JSONField(required=False, default=dict)
    role = serializers.ChoiceField(choices=[('BUYER', 'Buyer'), ('SELLER', 'Seller')], default='BUYER', required=False)
    profile_photo = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    class Meta:
        model = User
        fields = ('username', 'email', 'password', 'password_confirm', 'full_name', 'phone_number', 'id_card_image', 'id_card_data', 'role', 'profile_photo')

    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({"password": "Password fields didn't match."})
            
        try:
            validate_password(attrs['password'])
        except DjangoValidationError as e:
            raise serializers.ValidationError({"password": list(e.messages)})

        full_name = attrs.get('full_name', '').strip()
        if not full_name or len(full_name) < 3:
            raise serializers.ValidationError({"full_name": "Full name must be at least 3 characters."})
        if len(full_name) > 50:
            raise serializers.ValidationError({"full_name": "Full name cannot exceed 50 characters."})
        if not re.match(r"^[a-zA-Z\s.'-]+$", full_name):
            raise serializers.ValidationError({"full_name": "Full name can only contain letters and spaces."})
            
        username = attrs.get('username', '')
        if not username.isdigit() or len(username) != 8:
            raise serializers.ValidationError({"username": "Registration number must be exactly 8 digits."})
        if User.objects.filter(username__iexact=username).exists():
            raise serializers.ValidationError({"username": "This registration number is already registered."})
            
        phone_number = attrs.get('phone_number', '')
        if not phone_number.isdigit() or len(phone_number) != 10:
            raise serializers.ValidationError({"phone_number": "Phone number must be exactly 10 digits."})
        if User.objects.filter(phone_number=phone_number).exists():
            raise serializers.ValidationError({"phone_number": "This phone number is already registered."})
            
        email = attrs.get('email', '')
        
        if not re.match(r'^[\w\.-]+@gmail\.com$', email.lower()):
            raise serializers.ValidationError({"email": "Only @gmail.com email addresses are allowed."})
        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError({"email": "This email address is already registered."})
            
        try:
            otp_record = OTPVerification.objects.get(email=email)
            if not otp_record.is_verified:
                raise serializers.ValidationError({"email": "Email must be verified with OTP before registering."})
        except OTPVerification.DoesNotExist:
            raise serializers.ValidationError({"email": "Email must be verified with OTP before registering."})

        # Require ID card photo and live selfie verification for Seller accounts
        role = attrs.get('role', 'BUYER')
        if role == 'SELLER':
            id_card_image = attrs.get('id_card_image')
            if not id_card_image or not isinstance(id_card_image, str) or len(id_card_image.strip()) < 100:
                raise serializers.ValidationError({"id_card_image": "Student ID card photo is required for Seller registration."})

            profile_photo = attrs.get('profile_photo')
            if not profile_photo or not isinstance(profile_photo, str) or len(profile_photo.strip()) < 100:
                raise serializers.ValidationError({"profile_photo": "Live selfie photo is required for Seller registration."})
            
        return attrs

    def create(self, validated_data):
        validated_data.pop('password_confirm')
        id_card_image = validated_data.pop('id_card_image', None)
        id_card_data = validated_data.pop('id_card_data', {})
        role = validated_data.pop('role', 'BUYER')
        profile_photo = validated_data.pop('profile_photo', None)

        is_id_verified = False
        if role == 'SELLER' and id_card_image and len(str(id_card_image).strip()) > 100:
            is_id_verified = True
        else:
            role = 'BUYER'
            is_id_verified = False
        
        # Basic college domain extraction
        email = validated_data.get('email', '')
        domain = email.split('@')[-1] if '@' in email else None
        full_name = validated_data.get('full_name', '')
        
        # Upload ID card and profile photo to Cloudinary in .webp format
        from marketplace.cloudinary_upload import upload_user_image_to_cloudinary

        cloudinary_id_card = None
        if is_id_verified and id_card_image:
            cloudinary_id_card = upload_user_image_to_cloudinary(
                id_card_image, folder="campxchange/id_cards"
            )

        cloudinary_profile_photo = None
        if profile_photo and len(str(profile_photo).strip()) > 100:
            cloudinary_profile_photo = upload_user_image_to_cloudinary(
                profile_photo, folder="campxchange/profiles"
            )

        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            full_name=full_name,
            first_name=full_name,
            phone_number=validated_data.get('phone_number', ''),
            college_domain=domain,
            role=role,
            is_verified_student=True, # Email verified via OTP
            is_id_verified=is_id_verified,
            id_card_image=cloudinary_id_card,
            id_card_data=id_card_data if is_id_verified else {},
            trust_score=10 if is_id_verified else 5, # Email (+5) + ID Card (+5)
            profile_photo=cloudinary_profile_photo
        )

        # Recalculate trust score with selfie bonus
        if user.profile_photo:
            user.trust_score = user.calculate_trust_score()
            user.save(update_fields=['trust_score'])

        # Invalidate OTP record upon successful registration to prevent reuse
        OTPVerification.objects.filter(email=validated_data['email']).delete()

        # Send welcome email asynchronously / gracefully via Resend with user's role
        try:
            from .email_service import send_welcome_email
            send_welcome_email(user.email, user.full_name or user.username, role=user.role)
        except Exception:
            pass

        return user

class UserListSerializer(serializers.ModelSerializer):
    trust_score = serializers.SerializerMethodField()
    completed_trades_count = serializers.SerializerMethodField()
    has_id_card = serializers.SerializerMethodField()
    profile_photo = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    effective_permissions = serializers.ListField(source='effective_admin_permissions', read_only=True)
    is_google_linked = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            'id', 'username', 'email', 'full_name', 'phone_number', 'role',
            'is_active', 'is_verified_student', 'is_id_verified', 'has_id_card',
            'college_domain', 'trust_score', 'completed_trades_count', 'profile_photo',
            'last_login_method', 'last_login', 'is_google_linked',
            'date_joined', 'is_staff', 'is_superuser', 'admin_role', 'admin_permissions',
            'effective_permissions'
        )
        read_only_fields = (
            'id', 'username', 'email', 'role', 'is_active', 'is_verified_student',
            'is_id_verified', 'has_id_card', 'college_domain',
            'trust_score', 'completed_trades_count', 'profile_photo',
            'last_login_method', 'last_login', 'is_google_linked', 'date_joined',
            'is_staff', 'is_superuser', 'admin_role', 'admin_permissions',
            'effective_permissions'
        )

    def get_is_google_linked(self, obj):
        return bool(getattr(obj, 'google_id', None))

    def get_trust_score(self, obj):
        return getattr(obj, 'trust_score', 0) or 0

    def get_completed_trades_count(self, obj):
        if hasattr(obj, 'annotated_completed_trades'):
            return obj.annotated_completed_trades
        return getattr(obj, '_completed_trades_count', 0)

    def get_has_id_card(self, obj):
        return bool(getattr(obj, 'id_card_image', None))

    def to_representation(self, instance):
        data = super().to_representation(instance)
        from marketplace.media_security import generate_secure_image_url
        if data.get('profile_photo'):
            data['profile_photo'] = generate_secure_image_url(data['profile_photo'])
        if 'id_card_image' in data and data.get('id_card_image'):
            data['id_card_image'] = generate_secure_image_url(data['id_card_image'])
        return data


class UserAdminDetailSerializer(UserListSerializer):
    """Full detail serializer with physical ID card image and OCR data for a single student."""
    class Meta(UserListSerializer.Meta):
        fields = UserListSerializer.Meta.fields + ('id_card_image', 'id_card_data')
        read_only_fields = UserListSerializer.Meta.read_only_fields + ('id_card_image', 'id_card_data')


class UserLoginHistorySerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='user.full_name', read_only=True, default='')
    reg_no = serializers.CharField(source='user.username', read_only=True, default='')

    class Meta:
        model = UserLoginHistory
        fields = (
            'id', 'student_name', 'reg_no', 'email_attempted', 'reg_no_attempted',
            'login_method', 'client_type', 'ip_address', 'device_info',
            'status', 'failure_reason', 'created_at'
        )
        read_only_fields = fields


class UserDashboardSummarySerializer(serializers.ModelSerializer):
    """Ultra lightweight serializer for dashboard recent students preview."""
    profile_photo = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ('id', 'username', 'full_name', 'email', 'is_verified_student', 'trust_score', 'profile_photo')

    def get_profile_photo(self, obj):
        from marketplace.media_security import generate_secure_image_url
        return generate_secure_image_url(getattr(obj, 'profile_photo', None))


class AdminUserUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = (
            'id', 'username', 'email', 'full_name', 'phone_number', 'role',
            'is_active', 'is_verified_student', 'is_id_verified', 'trust_score',
            'id_card_image', 'id_card_data', 'profile_photo', 'admin_role', 'admin_permissions'
        )
        read_only_fields = ('id', 'username')


class StaffUserSerializer(serializers.ModelSerializer):
    effective_role = serializers.CharField(source='effective_admin_role', read_only=True)
    effective_permissions = serializers.ListField(source='effective_admin_permissions', read_only=True)

    class Meta:
        model = User
        fields = (
            'id', 'username', 'email', 'full_name', 'phone_number',
            'admin_role', 'effective_role', 'admin_permissions', 'effective_permissions',
            'is_staff', 'is_superuser', 'is_active', 'date_joined', 'last_login', 'profile_photo'
        )


class PublicSellerProfileSerializer(serializers.ModelSerializer):
    """
    DPDP Act (2023) Compliant Public Seller Profile Serializer.
    Enforces strict Data Minimization & Privacy Protection:
    - Never exposes Registration Number (username), raw email, or phone number.
    - Never exposes Physical ID Card images or OCR metadata.
    - Exposes only sanitized display name, verified reputation, trust score, and trade stats.
    """
    display_name = serializers.SerializerMethodField()
    member_since = serializers.SerializerMethodField()
    avg_rating = serializers.SerializerMethodField()
    reviews_count = serializers.SerializerMethodField()
    completed_trades_count = serializers.SerializerMethodField()
    trust_score = serializers.SerializerMethodField()
    profile_photo = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            'id', 'display_name', 'profile_photo',
            'is_verified_student', 'is_id_verified',
            'college_domain', 'trust_score', 'completed_trades_count',
            'member_since', 'avg_rating', 'reviews_count'
        )
        read_only_fields = fields

    def get_profile_photo(self, obj):
        from marketplace.media_security import generate_secure_image_url
        raw = getattr(obj, 'profile_photo', None) or getattr(obj, 'profile_picture_url', None)
        return generate_secure_image_url(raw)

    def get_display_name(self, obj):
        name = (getattr(obj, 'full_name', '') or getattr(obj, 'first_name', '')).strip()
        if not name:
            return f"Campus Trader #{obj.id}"
        # Keep student privacy intact: e.g. "Rahul S." or single name
        parts = name.split()
        if len(parts) >= 2:
            return f"{parts[0]} {parts[1][0]}."
        return parts[0]

    def get_member_since(self, obj):
        if obj.date_joined:
            return obj.date_joined.strftime('%B %Y')
        return 'Campus Member'

    def get_trust_score(self, obj):
        return getattr(obj, 'trust_score', 0) or 0

    def get_completed_trades_count(self, obj):
        if hasattr(obj, 'annotated_completed_trades'):
            return obj.annotated_completed_trades
        return getattr(obj, '_completed_trades_count', 0)

    def get_avg_rating(self, obj):
        try:
            from marketplace.models import Review
            avg = Review.objects.filter(reviewed_user=obj).aggregate(models.Avg('rating'))['rating__avg']
            return round(avg, 1) if avg is not None else None
        except Exception:
            return None

    def get_reviews_count(self, obj):
        try:
            from marketplace.models import Review
            return Review.objects.filter(reviewed_user=obj).count()
        except Exception:
            return 0


