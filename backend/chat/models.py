from django.db import models
from users.models import CustomUser

# Create your models here.

class ChatThread(models.Model):
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    title = models.CharField(max_length=255, blank=True, null=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title or f"Thread {self.id}"

class ChatMessage(models.Model):
    MODEL_CHOICES = [
        ('gpt-4o', 'GPT 4o'),
        ('gemini-2.5-flash', 'Gemini 2.5 Flash'),
        ("gemini-2.0-flash", "Gemini 2.0 Flash")
    ]
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name="chat_messages")
    model = models.CharField(max_length=100, choices=MODEL_CHOICES, default="gemini-2.0-flash")
    thread = models.ForeignKey(ChatThread, on_delete=models.CASCADE, related_name="messages")
    message = models.TextField()
    response = models.TextField(blank=True, null=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username} ({self.model}): {self.message[:30]}"