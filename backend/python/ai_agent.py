import json
import numpy as np
from sentence_transformers import SentenceTransformer
from transformers import AutoModelForCausalLM, AutoTokenizer
import faiss

class ServiceNowAIAgent:
    def __init__(self):
        self.embedder = SentenceTransformer('all-MiniLM-L6-v2')
        self.tokenizer = AutoTokenizer.from_pretrained('distilgpt2')
        self.model = AutoModelForCausalLM.from_pretrained('distilgpt2')
        self.index = None
        self.data = []
        self.load_itsm_data()

    def load_itsm_data(self):
        files = ['data/incidents.json', 'data/changes.json', 'data/problems.json', 'data/requests.json']
        for file in files:
            try:
                with open(file, 'r') as f:
                    self.data.extend(json.load(f))
            except Exception as e:
                print(f"Error loading {file}: {e}")

        texts = [d.get('description', '') for d in self.data]
        embeddings = self.embedder.encode(texts, show_progress_bar=True)
        dim = embeddings.shape[1]
        self.index = faiss.IndexFlatL2(dim)
        self.index.add(np.array(embeddings))
        print(f"✅ Loaded {len(self.data)} ITSM records into memory.")

    def query(self, question):
        q_embed = self.embedder.encode([question])
        _, I = self.index.search(np.array(q_embed), k=3)
        context = " ".join([self.data[i]['description'] for i in I[0] if i < len(self.data)])
        prompt = f"Context: {context}\n\nQuestion: {question}\nAnswer:"
        inputs = self.tokenizer(prompt, return_tensors='pt')
        outputs = self.model.generate(**inputs, max_length=120, do_sample=True)
        return self.tokenizer.decode(outputs[0], skip_special_tokens=True)
