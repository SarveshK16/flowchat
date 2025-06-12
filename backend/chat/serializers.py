from rest_framework import serializers
from .models import ChatMessage, ChatThread

class ChatMessageSerializer(serializers.ModelSerializer):
    thread_id = serializers.IntegerField(write_only=True)
    class Meta:
        model = ChatMessage
        fields = ["id", "model", "message", "response", "timestamp", "thread_id"]
        read_only_fields = ["response", "timestamp"]

class ChatThreadSearializer(serializers.ModelSerializer):
    class Meta:
        model = ChatThread
        fields = ["id", "title", "created_at"]