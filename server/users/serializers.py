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
        if not re.match(r'^[\w\.-]+@lpu\.in$', value.lower()):
            raise serializers.ValidationError("Only @lpu.in email addresses are allowed.")
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return value

class VerifyOTPSerializer(serializers.Serializer):
    email = serializers.EmailField()
    otp = serializers.CharField(max_length=6)

class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'})
    password_confirm = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'})

    class Meta:
        model = User
        fields = ('username', 'email', 'password', 'password_confirm', 'first_name', 'last_name', 'phone_number')

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
            
        phone_number = attrs.get('phone_number', '')
        if not phone_number.isdigit() or len(phone_number) != 10:
            raise serializers.ValidationError({"phone_number": "Phone number must be exactly 10 digits."})
            
        email = attrs.get('email', '')
        
        if not re.match(r'^[\w\.-]+@lpu\.in$', email.lower()):
            raise serializers.ValidationError({"email": "Only @lpu.in email addresses are allowed."})
            
        try:
            otp_record = OTPVerification.objects.get(email=email)
            if not otp_record.is_verified:
                raise serializers.ValidationError({"email": "Email must be verified with OTP before registering."})
        except OTPVerification.DoesNotExist:
            raise serializers.ValidationError({"email": "Email must be verified with OTP before registering."})
        if not re.match(r'^[\w\.-]+@lpu\.in$', email.lower()):
            raise serializers.ValidationError({"email": "Only @lpu.in email addresses are allowed."})
            
        return attrs

    def create(self, validated_data):
        validated_data.pop('password_confirm')
        
        # Basic college domain extraction
        email = validated_data.get('email', '')
        domain = email.split('@')[-1] if '@' in email else None
        
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
            phone_number=validated_data.get('phone_number', ''),
            college_domain=domain,
            is_verified_student=True # Auto-verify for now, normally would require email link
        )
        return user

class UserListSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name', 'phone_number', 'is_verified_student', 'college_domain', 'trust_score', 'date_joined', 'is_staff', 'is_superuser')
