import google.generativeai as genai
from .models import ChatMessage, ChatThread, UserUsage
from .llm_router import get_llm_response
from django.utils import timezone

def generate_title_for_thread(thread_id):
    thread = ChatThread.objects.get(id=thread_id)
    if thread.title:
        return
    
    messages = ChatMessage.objects.filter(thread=thread).order_by("timestamp")[:2]
    conversation = "\n".join([f"User: {msg.message}\nAssistant: {msg.response}" for msg in messages])

    prompt = f"""
Given the following conversation, Generate a short, natural, and engaging title summarizing the main topic of this conversation thread. The title should be 3 to 5 words, avoid punctuation like colons or commas unless absolutely necessary, and sound like a human wrote it. Example: "Understanding Docker Basics", "World Capitals Overview", "Introduction to Machine Learning".


Conversation:
{conversation}

Title:"""
    
    try:
        title = get_llm_response("gemini-2.0-flash", prompt)
        print(title)
        thread.title = title.strip().replace('"', '')
        thread.save()
    except Exception as e:
        print(f"Title generation failed: {e}")

def check_user_quota(user):
    usage, _ = UserUsage.objects.get_or_create(user=user)
    
    # Reset daily
    if usage.last_reset != timezone.now().date():
        usage.tokens_used = 0
        usage.last_reset = timezone.now().date()
        usage.save()

    # Enforce quota
    if usage.tokens_used > 10000:
        return False
    return True

def increment_user_tokens(user, tokens_used):
    usage, _ = UserUsage.objects.get_or_create(user=user)
    usage.tokens_used += tokens_used
    usage.save()