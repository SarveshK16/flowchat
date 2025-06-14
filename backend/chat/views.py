from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from .models import ChatMessage, ChatThread
from .serializers import ChatMessageSerializer, ChatThreadSearializer
from .utils import generate_title_for_thread, check_user_quota, increment_user_tokens
from .llm_router import get_llm_response

# Create your views here.

@api_view(["GET","POST"])
@permission_classes([IsAuthenticated])
def chat_view(request):
    if request.method == "POST":
        serializer = ChatMessageSerializer(data = request.data)
        if serializer.is_valid():
            model = serializer.validated_data["model"]
            prompt = serializer.validated_data["message"]
            thread_id = serializer.validated_data.get("thread_id")

            thread = None

            if thread_id:
                try:
                    thread = ChatThread.objects.get(id=thread_id, user=request.user)
                except:
                    thread = ChatThread.objects.create(user=request.user)
                    thread_id = thread.id
            else:
                thread = ChatThread.objects.create(user=request.user)
                thread_id = thread.id
                
            try:
                if not check_user_quota(request.user):
                    return Response({"error": "Daily quota exceeded."}, status=429)
                
                llm_response = get_llm_response(model, prompt)

                tokens_used = len(prompt.split()) + len(llm_response.split())
                increment_user_tokens(request.user, tokens_used)

                print(f"[LLM CALL] user={request.user.username} model={model} prompt={prompt[:50]}...")
            except Exception as e:
                return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            chat = ChatMessage.objects.create(
                user = request.user,
                model = model,
                message = prompt,
                response = llm_response,
                thread = thread
            )
            if not thread.title and thread.messages.count() == 1:
                generate_title_for_thread(thread.id)

            return Response(ChatMessageSerializer(chat).data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    elif request.method == "GET":
        messages = ChatMessage.objects.filter(user = request.user).order_by("-timestamp")
        serializer = ChatMessageSerializer(messages, many=True)
        return Response(serializer.data)

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def list_threads(request):
    if request.method == "GET":
        threads = ChatThread.objects.filter(user=request.user).order_by("-created_at")
        serializer = ChatThreadSearializer(threads, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    elif request.method == "POST":
        new_thread = ChatThread.objects.create(user=request.user)
        serializer = ChatThreadSearializer(new_thread)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def messages_by_thread(request, thread_id):
    try:
        thread = ChatThread.objects.get(id=thread_id, user=request.user)
    except ChatThread.DoesNotExist:
        return Response({"error": "Thread not found"}, status=status.HTTP_404_NOT_FOUND)
    
    messages = ChatMessage.objects.filter(thread=thread).order_by("timestamp")
    serializer = ChatMessageSerializer(messages, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)

@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def delete_thread(request, thread_id):
    try:
        thread = ChatThread.objects.get(id=thread_id, user=request.user)
    except ChatThread.DoesNotExist:
        return Response({"error": "Thread not found"}, status=status.HTTP_404_NOT_FOUND)
    
    thread.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_thread_title(request, thread_id):
    try:
        thread = ChatThread.objects.get(id=thread_id, user=request.user)
        return Response({"id": thread.id, "title": thread.title}, status=status.HTTP_200_OK)
    except ChatThread.DoesNotExist:
        return Response({"error":"Thread not found"}, status=status.HTTP_404_NOT_FOUND)