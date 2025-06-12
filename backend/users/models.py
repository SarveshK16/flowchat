from django.db import models
from django.contrib.auth.models import AbstractUser

# Create your models here.

class CustomUser(AbstractUser):
    preferred_model = models.CharField(
        max_length=100,
        choices=[
            ('gpt-4', 'GPT-4'),
            ('gemini-2.5-flash', 'Gemini 2.5 Flash'),
        ],
        default="gemini-2.5-flash"
    )

    def __str__(self):
        return self.username
