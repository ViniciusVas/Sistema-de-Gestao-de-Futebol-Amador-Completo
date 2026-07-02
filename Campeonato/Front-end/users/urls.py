from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import RegisterView, MeView, PasswordUpdateView, MyTokenObtainPairView

urlpatterns = [
    path('register', RegisterView.as_view(), name='register'),
    path('token', MyTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh', TokenRefreshView.as_view(), name='token_refresh'),
    path('me', MeView.as_view(), name='me'),
    path('auth/profile', MeView.as_view(), name='profile_update'),
    path('auth/password', PasswordUpdateView.as_view(), name='password_update'),
]
