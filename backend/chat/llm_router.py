import os
from openai import OpenAI
from openai.types.chat import ChatCompletion
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def get_llm_response(model: str, prompt: str) -> str:
    if os.getenv("LLM_ENABLED", "True").lower() != "true":
        raise Exception("LLM usage is currently disabled by admin.")
    
    if not model:
        model = "gemini-2.0-flash" 

    if model.startswith("gemini"):
        try:
            gemini_model = genai.GenerativeModel(model_name=model)
            response = gemini_model.generate_content(prompt)
            return response.text
        except Exception as e: 
            return f"[Gemini error: {str(e)}]"
    
    elif model.startswith("gpt"):
        try:
            response: ChatCompletion = openai_client.chat.completions.create(
                model=model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.7,
            )
            return response.choices[0].message.content
        except Exception as e:
            return f"[OpenAI error: {str(e)}]"
    
    else:
        raise ValueError(f"Support for the {model} is on the way..")