from rest_framework import serializers
from django.db import models
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
import re
from .models import OTPVerification, PasswordResetToken

User = get_user_model()

class ForgotPasswordRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        email = value.strip().lower()
        if not User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError("No registered student account was found with this email.")
        return email

class ForgotPasswordResetSerializer(serializers.Serializer):
    token = serializers.CharField(max_length=255)
    password = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'})
    password_confirm = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'})

    def validate(self, attrs):
        token_str = attrs.get('token', '').strip()
        try:
            token_obj = PasswordResetToken.objects.get(token=token_str)
        except PasswordResetToken.DoesNotExist:
            raise serializers.ValidationError({"token": "Invalid or expired password reset link."})

        if not token_obj.is_valid():
            raise serializers.ValidationError({"token": "This password reset link has expired or has already been used. Please request a new one."})

        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({"password": "Password fields didn't match."})

        try:
            validate_password(attrs['password'])
        except DjangoValidationError as e:
            raise serializers.ValidationError({"password": list(e.messages)})

        attrs['token_obj'] = token_obj
        return attrs

class SendOTPSerializer(serializers.Serializer):
    email = serializers.EmailField()
    
    def validate_email(self, value):
        if not re.match(r'^[\w\.-]+@gmail\.com$', value.lower()):
            raise serializers.ValidationError("Only @gmail.com email addresses are allowed.")
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return value

class VerifyOTPSerializer(serializers.Serializer):
    email = serializers.EmailField()
    otp = serializers.CharField(max_length=6)

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
        elif role != 'SELLER':
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
                id_card_image, folder="campusxchange/id_cards"
            )

        cloudinary_profile_photo = None
        if profile_photo and len(str(profile_photo).strip()) > 100:
            cloudinary_profile_photo = upload_user_image_to_cloudinary(
                profile_photo, folder="campusxchange/profiles"
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

        # Send welcome email asynchronously / gracefully via Resend
        try:
            from .email_service import send_welcome_email
            send_welcome_email(user.email, user.full_name or user.username)
        except Exception:
            pass

        return user

class UserListSerializer(serializers.ModelSerializer):
    trust_score = serializers.SerializerMethodField()
    completed_trades_count = serializers.SerializerMethodField()
    has_id_card = serializers.SerializerMethodField()
    profile_photo = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    effective_permissions = serializers.ListField(source='effective_admin_permissions', read_only=True)

    class Meta:
        model = User
        fields = (
            'id', 'username', 'email', 'full_name', 'phone_number', 'role',
            'is_active', 'is_verified_student', 'is_id_verified', 'has_id_card',
            'college_domain', 'trust_score', 'completed_trades_count', 'profile_photo',
            'date_joined', 'is_staff', 'is_superuser', 'admin_role', 'admin_permissions',
            'effective_permissions'
        )
        read_only_fields = (
            'id', 'username', 'email', 'role', 'is_active', 'is_verified_student',
            'is_id_verified', 'has_id_card', 'college_domain',
            'trust_score', 'completed_trades_count', 'date_joined',
            'is_staff', 'is_superuser', 'admin_role', 'admin_permissions',
            'effective_permissions'
        )

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


