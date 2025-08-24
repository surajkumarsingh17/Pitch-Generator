# app.py
import os
import google.generativeai as genai
from flask import Flask, render_template, request, jsonify
from dotenv import load_dotenv

# Load environment variables from the .env file
load_dotenv()

app = Flask(__name__)

# --- SECURE API KEY CONFIGURATION ---
try:
    # Get the API key from environment variables
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY not found. Please set it in your .env file.")

    genai.configure(api_key=api_key)
    model = genai.GenerativeModel('gemini-1.5-flash-latest')
    print("Gemini model configured successfully.")

except Exception as e:
    print(f"Error configuring Gemini API: {e}")
    model = None

# A dictionary to map section keys to friendly names for the prompt
PROMPT_SECTIONS = {
    "elevator_pitch": "Elevator Pitch",
    "slide_bullets": "Slide Bullets",
    "tagline": "Tagline",
    "value_proposition": "Value Proposition",
    "competitors": "Potential Competitors",
    "revenue_models": "Possible Revenue Models",
    "swot_analysis": "BONUS - SWOT Analysis"
}

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/generate', methods=['POST'])
def generate_pitch():
    # Check if the model was initialized correctly
    if model is None:
        return jsonify({'error': 'The generative model is not configured. Check your API key and server logs.'}), 500

    data = request.get_json()
    if not data:
        return jsonify({'error': 'Missing JSON in request.'}), 400

    startup_idea = data.get('idea')
    options = data.get('options', {})

    if not startup_idea or not startup_idea.strip():
        return jsonify({'error': 'Startup idea cannot be empty.'}), 400

    # --- DYNAMIC PROMPT BUILDING ---
    tone = options.get('tone', 'Professional')
    audience = options.get('audience', 'Investors')
    sections_to_include = options.get('sections', [])
    
    if not sections_to_include:
         return jsonify({'error': 'Please select at least one section to generate.'}), 400

    prompt_parts = [
        f"You are an expert business consultant. Analyze the following startup idea and generate the requested sections.",
        f"The tone of the output must be **{tone}**.",
        f"The content should be tailored for an audience of **{audience}**.\n",
        f"**Startup Idea:**\n{startup_idea}\n",
        "---",
        "**Requested Sections:**\n"
    ]

    for section_key in sections_to_include:
        if section_key in PROMPT_SECTIONS:
            # Add clean headers for the AI to follow, which script.js can parse
            prompt_parts.append(f"## {PROMPT_SECTIONS[section_key]}")

    final_prompt = "\n".join(prompt_parts)

    try:
        response = model.generate_content(final_prompt)
        return jsonify({'pitch': response.text})
    except Exception as e:
        print(f"An error occurred during content generation: {e}")
        return jsonify({'error': 'An error occurred while communicating with the AI model.'}), 500

if __name__ == '__main__':
    app.run(debug=True)
