# app.py
import os
import google.generativeai as genai
from flask import Flask, render_template, request, jsonify

app = Flask(__name__)

try:
    # IMPORTANT: Make sure your API key is correctly set here.
    api_key = "AIzaSyAexOI26gTlaUI_ywhxCSp5ievZBAW9iTI"
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel('gemini-1.5-flash-latest')
except Exception as e:
    print(f"Error configuring Gemini API: {e}")
    model = None

# A dictionary to map section keys to friendly names and descriptions for the prompt
PROMPT_SECTIONS = {
    "elevator_pitch": "*1. Elevator Pitch:* (A concise and persuasive speech, about 30-60 seconds long)",
    "slide_bullets": "*2. Slide Bullets:* (5-7 key bullet points for a presentation)",
    "tagline": "*3. Tagline:* (A short, memorable slogan)",
    "value_proposition": "*4. Value Proposition:* (A clear statement of the benefits you provide to customers)",
    "competitors": "*5. Potential Competitors:* (List 3-5 potential competitors in this space)",
    "revenue_models": "*6. Possible Revenue Models:* (Suggest 2-3 ways this business could make money)",
    "swot_analysis": "*7. BONUS - SWOT Analysis:* (Strengths, Weaknesses, Opportunities, and Threats for this business idea)"
}

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/generate', methods=['POST'])
def generate_pitch():
    if model is None:
        return jsonify({'error': 'The generative model is not configured correctly.'}), 500

    # Get the startup idea AND the new options object from the request
    startup_idea = request.json['idea']
    options = request.json.get('options', {}) # Use .get() for safety

    if not startup_idea:
        return jsonify({'error': 'Startup idea cannot be empty.'}), 400

    # --- DYNAMIC PROMPT BUILDING ---
    # Extract the custom options with default values
    tone = options.get('tone', 'Professional')
    audience = options.get('audience', 'Investors')
    sections_to_include = options.get('sections', [])

    # Start building the prompt with master instructions
    prompt_parts = [
        f"You are an expert business consultant and pitch writer.",
        f"Analyze the following startup idea and generate the requested sections.",
        f"The tone of the output must be **{tone}**.",
        f"The content should be tailored for an audience of **{audience}**.\n",
        f"*Startup Idea:*\n{startup_idea}\n",
        f"*Based on the startup idea above, generate the following sections:*\n"
    ]

    # Conditionally add the sections the user selected
    for section_key in sections_to_include:
        if section_key in PROMPT_SECTIONS:
            prompt_parts.append(PROMPT_SECTIONS[section_key])
    
    # Join all parts into the final prompt
    final_prompt = "\n".join(prompt_parts)

    try:
        response = model.generate_content(final_prompt)
        return jsonify({'pitch': response.text})
    except Exception as e:
        return jsonify({'error': f'An error occurred while generating content: {e}'}), 500

if __name__ == '__main__':
    app.run(debug=True)