from django.urls import path
from . import views
from rest_framework_simplejwt.views import (TokenObtainPairView, TokenRefreshView)
from django.views.decorators.csrf import csrf_exempt

urlpatterns = [
    path("health/", views.healthCheck, name="health_check"),
    path("token/", csrf_exempt(TokenObtainPairView.as_view()), name="token_obtain_pair"),
    path("token/refresh/", csrf_exempt(TokenRefreshView.as_view()), name="token_refresh"),
    path("login/", csrf_exempt(views.login), name="login"),
    path("signup/", views.signup, name="signup")
]
