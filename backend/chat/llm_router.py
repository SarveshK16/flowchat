import os
import openai
from openai import OpenAI
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def get_llm_response(model, prompt):
    if model.startswith("gemini"):
        gemini_model = genai.GenerativeModel(model_name=model)
        response = gemini_model.generate_content(prompt)
        return response.text
    
    elif model in ["gpt-4o", "gpt-o4"]:
        response = f"Simulated response from {model}"
        return response
    
    else:
        raise ValueError(f"Support for the {model} is on the way..")