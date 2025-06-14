from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from .models import CustomUser
from rest_framework import status
from django.http import JsonResponse

# Create your views here.

def health_check(request):
    return JsonResponse({"status": "ok"})

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def login(request):
    username = request.data.get("username")
    password = request.data.get("password")

    try:
        if CustomUser.objects.filter(username=username).exists():
            return Response({"message": "User logged in."}, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": f"Error signing you up: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
@api_view(["POST"])
@permission_classes([AllowAny])
def signup(request):
    username = request.data.get("username")
    password = request.data.get("password")
    
    if not username or not password:
        return Response({"error": "Username and password are required."}, status=status.HTTP_400_BAD_REQUEST)
    
    if CustomUser.objects.filter(username=username).exists():
        return Response({"error": "Username already exists."}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        new_user = CustomUser(username=username)
        new_user.set_password(password)
        new_user.save()
        return Response({"message": "User created successfully."}, status=status.HTTP_201_CREATED)
    except Exception as e: 
        return Response({"error": f"Error signing you up: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


