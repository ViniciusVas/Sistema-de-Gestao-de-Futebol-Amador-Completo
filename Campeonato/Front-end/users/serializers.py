from rest_framework import serializers
from .models import User

class UserSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source='nome')
    class Meta:
        model = User
        fields = ('id', 'email', 'name', 'password', 'date_joined')
        extra_kwargs = {'password': {'write_only': True}}

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['email'],
            email=validated_data['email'],
            nome=validated_data.get('nome', ''),
            password=validated_data['password']
        )
        return user
