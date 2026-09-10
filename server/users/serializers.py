from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
import re
from .models import OTPVerification

User = get_user_model()

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
            id_card_image=id_card_image if is_id_verified else None,
            id_card_data=id_card_data if is_id_verified else {},
            trust_score=10 if is_id_verified else 5, # Email (+5) + ID Card (+5)
            profile_photo=profile_photo if (role == 'SELLER' and profile_photo and len(str(profile_photo).strip()) > 100) else None
        )

        # Recalculate trust score with selfie bonus
        if user.profile_photo:
            user.trust_score = user.calculate_trust_score()
            user.save(update_fields=['trust_score'])

        # Invalidate OTP record upon successful registration to prevent reuse
        OTPVerification.objects.filter(email=validated_data['email']).delete()

        return user

class UserListSerializer(serializers.ModelSerializer):
    trust_score = serializers.SerializerMethodField()
    completed_trades_count = serializers.SerializerMethodField()
    has_id_card = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            'id', 'username', 'email', 'full_name', 'phone_number', 'role',
            'is_active', 'is_verified_student', 'is_id_verified', 'has_id_card',
            'college_domain', 'trust_score', 'completed_trades_count', 'profile_photo',
            'date_joined', 'is_staff', 'is_superuser', 'admin_role'
        )
        read_only_fields = (
            'id', 'username', 'email', 'role', 'is_active', 'is_verified_student',
            'is_id_verified', 'has_id_card', 'college_domain',
            'trust_score', 'completed_trades_count', 'date_joined',
            'is_staff', 'is_superuser', 'admin_role'
        )

    def get_trust_score(self, obj):
        return getattr(obj, 'trust_score', 0) or 0

    def get_completed_trades_count(self, obj):
        if hasattr(obj, 'annotated_completed_trades'):
            return obj.annotated_completed_trades
        return getattr(obj, '_completed_trades_count', 0)

    def get_has_id_card(self, obj):
        return bool(getattr(obj, 'id_card_image', None))


class UserAdminDetailSerializer(serializers.ModelSerializer):
    """Full detail serializer with physical ID card image and OCR data for a single student."""
    trust_score = serializers.SerializerMethodField()
    completed_trades_count = serializers.SerializerMethodField()
    has_id_card = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            'id', 'username', 'email', 'full_name', 'phone_number', 'role',
            'is_active', 'is_verified_student', 'is_id_verified', 'has_id_card',
            'id_card_image', 'id_card_data',
            'college_domain', 'trust_score', 'completed_trades_count', 'profile_photo',
            'date_joined', 'is_staff', 'is_superuser', 'admin_role'
        )
        read_only_fields = (
            'id', 'username', 'email', 'role', 'is_active', 'is_verified_student',
            'is_id_verified', 'has_id_card', 'college_domain',
            'trust_score', 'completed_trades_count', 'date_joined',
            'is_staff', 'is_superuser', 'admin_role'
        )

    def get_trust_score(self, obj):
        return getattr(obj, 'trust_score', 0) or 0

    def get_completed_trades_count(self, obj):
        if hasattr(obj, 'annotated_completed_trades'):
            return obj.annotated_completed_trades
        return getattr(obj, '_completed_trades_count', 0)

    def get_has_id_card(self, obj):
        return bool(getattr(obj, 'id_card_image', None))


class UserDashboardSummarySerializer(serializers.ModelSerializer):
    """Ultra lightweight serializer for dashboard recent students preview."""
    class Meta:
        model = User
        fields = ('id', 'username', 'full_name', 'email', 'is_verified_student', 'trust_score', 'profile_photo')


class AdminUserUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = (
            'id', 'username', 'email', 'full_name', 'phone_number', 'role',
            'is_active', 'is_verified_student', 'is_id_verified', 'trust_score',
            'id_card_image', 'id_card_data', 'profile_photo', 'admin_role'
        )
        read_only_fields = ('id', 'username')


class StaffUserSerializer(serializers.ModelSerializer):
    effective_role = serializers.CharField(source='effective_admin_role', read_only=True)

    class Meta:
        model = User
        fields = (
            'id', 'username', 'email', 'full_name', 'phone_number',
            'admin_role', 'effective_role', 'is_staff', 'is_superuser',
            'is_active', 'date_joined', 'last_login', 'profile_photo'
        )

