from flask import Flask, request, jsonify
from flask_cors import CORS
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
from sentence_transformers import SentenceTransformer, util
import torch
import json
import os

app = Flask(__name__)
CORS(app)

# ========== Step 1: Load AI Models ==========
print("🚀 Loading AI Models...")

# Text generation model (for summaries / answers)
gen_model_name = "facebook/bart-large-cnn"
tokenizer = AutoTokenizer.from_pretrained(gen_model_name)
gen_model = AutoModelForSeq2SeqLM.from_pretrained(gen_model_name)

# Embedding model for semantic search
embedder = SentenceTransformer("all-MiniLM-L6-v2")

# ========== Step 2: Load unified ITSM data ==========
data_path = "data.json"
if not os.path.exists(data_path):
    raise FileNotFoundError("❌ data.json not found in backend/python directory!")

with open(data_path, "r", encoding="utf-8") as f:
    data = json.load(f)

# Merge all datasets into one flat list for embeddings
knowledge_data = []

def add_section(records, prefix):
    for item in records:
        text = " ".join([str(v) for v in item.values()])
        knowledge_data.append({"source": prefix, "text": text, "raw": item})

add_section(data["knowledge_base"], "Knowledge")
add_section(data["incidents"], "Incident")
add_section(data["requests"], "Request")
add_section(data["users"], "User")

print(f"✅ Loaded {len(knowledge_data)} records across ITSM modules.")

# Precompute embeddings for retrieval
doc_texts = [item["text"] for item in knowledge_data]
doc_embeddings = embedder.encode(doc_texts, convert_to_tensor=True)

# ========== Step 3: Helper - Retrieve top relevant docs ==========
def retrieve_context(query, top_k=3):
    query_emb = embedder.encode(query, convert_to_tensor=True)
    hits = util.semantic_search(query_emb, doc_embeddings, top_k=top_k)[0]
    return [knowledge_data[hit["corpus_id"]] for hit in hits]

# ========== Step 4: API Routes ==========
@app.route("/")
def home():
    return jsonify({"message": "✅ AI ITSM Backend (RAG + Transformers) is running!"})

@app.route("/api/ask", methods=["POST"])
def ask():
    data = request.get_json()
    query = data.get("question", "")
    print(f"🧠 User asked: {query}")

    if not query.strip():
        return jsonify({"answer": "Please provide a valid question."})

    # Retrieve relevant docs
    contexts = retrieve_context(query)
    context_text = " ".join([ctx["text"] for ctx in contexts])

    # Generate response using BART
    input_text = f"Context: {context_text}\nQuestion: {query}\nAnswer:"
    inputs = tokenizer.encode(input_text, return_tensors="pt", truncation=True, max_length=512)
    outputs = gen_model.generate(inputs, max_length=180, num_beams=4, early_stopping=True)
    answer = tokenizer.decode(outputs[0], skip_special_tokens=True)

    # Attach top result source (optional)
    top_source = contexts[0]["source"] if contexts else "N/A"
    print(f"✅ Top Source: {top_source}")

    return jsonify({
        "answer": answer,
        "source": top_source,
        "matches": [c["raw"] for c in contexts]
    })

# ========== Step 5: Run the app ==========
if __name__ == "__main__":
    app.run(host="127.0.0.1", port=7000, debug=True)
